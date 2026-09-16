import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  signSession,
  verifySession,
} from "./cookie";
import type { PermissionKey } from "./permissions";

export type ScopeType = "departamental" | "provincial" | "distrital" | "local";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  active: boolean;
  sessionId: string;
  roles: { id: string; key: string; name: string }[];
  permissions: Set<string>;
  scopeType: ScopeType;
  assignedProvince: string | null;
  assignedDistrict: string | null;
  assignedLocalId: string | null;
  assignedLocal: {
    id: string;
    code: string;
    name: string;
    district: string;
    province: string;
  } | null;
};

export async function createSessionFor(
  userId: string,
  meta?: { userAgent?: string | null; ip?: string | null },
  opts?: { clientType?: "web" | "mobile"; returnToken?: boolean },
): Promise<{ token: string; expiresAt: Date } | void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  const clientType = opts?.clientType ?? "web";

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
      userAgent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
      clientType,
    },
  });

  const signed = await signSession({
    sid: session.id,
    uid: userId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });

  // Mobile clients carry the token in Authorization header — no cookie needed.
  if (clientType !== "mobile") {
    const jar = await cookies();
    jar.set(SESSION_COOKIE, signed, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
  }

  if (opts?.returnToken) return { token: signed, expiresAt };
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const payload = await verifySession(raw);
  if (payload) {
    await prisma.session
      .delete({ where: { id: payload.sid } })
      .catch(() => undefined);
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Mobile clients send the session token via `Authorization: Bearer …`.
  // Web clients send it via the HttpOnly cookie. Same signed payload, same
  // Session row, different transport. Bearer takes precedence so a stale
  // cookie can't override an explicit mobile header.
  const h = await headers();
  const authz = h.get("authorization");
  const bearer =
    authz && /^bearer\s+/i.test(authz) ? authz.replace(/^bearer\s+/i, "").trim() : null;

  const jar = await cookies();
  const cookieToken = jar.get(SESSION_COOKIE)?.value;

  const raw = bearer || cookieToken;
  const payload = await verifySession(raw);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: {
      user: {
        include: {
          assignedLocal: {
            select: { id: true, code: true, name: true, district: true, province: true },
          },
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }

  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    active: session.user.active,
    sessionId: session.id,
    roles: session.user.roles.map((ur) => ({
      id: ur.role.id,
      key: ur.role.key,
      name: ur.role.name,
    })),
    permissions,
    scopeType: (session.user.scopeType as ScopeType) || "departamental",
    assignedProvince: session.user.assignedProvince,
    assignedDistrict: session.user.assignedDistrict,
    assignedLocalId: session.user.assignedLocalId,
    assignedLocal: session.user.assignedLocal,
  };
}

/**
 * Retorna las condiciones de filtrado territorial según el ámbito del usuario.
 */
export function getTerritoryFilter(user: CurrentUser) {
  // Superadmin o acceso departamental/regional ve todo sin restricciones
  if (
    user.roles.some((r) => r.key === "superadmin") ||
    user.scopeType === "departamental"
  ) {
    return {
      isRestricted: false,
      scopeType: "departamental" as const,
      localFilter: {},
      personeroFilter: {},
    };
  }

  if (user.scopeType === "local" && user.assignedLocalId) {
    return {
      isRestricted: true,
      scopeType: "local" as const,
      localFilter: { id: user.assignedLocalId },
      personeroFilter: user.assignedLocal?.name
        ? { localName: user.assignedLocal.name }
        : {},
    };
  }

  if (user.scopeType === "distrital" && user.assignedDistrict) {
    return {
      isRestricted: true,
      scopeType: "distrital" as const,
      localFilter: { district: user.assignedDistrict as any },
      personeroFilter: { district: user.assignedDistrict as any },
    };
  }

  if (user.scopeType === "provincial" && user.assignedProvince) {
    return {
      isRestricted: true,
      scopeType: "provincial" as const,
      localFilter: { province: { equals: user.assignedProvince, mode: "insensitive" as const } },
      personeroFilter: {},
    };
  }

  return {
    isRestricted: false,
    scopeType: "departamental" as const,
    localFilter: {},
    personeroFilter: {},
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(
  key: PermissionKey,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.permissions.has(key)) {
    redirect("/403");
  }
  return user;
}

export function userHas(
  user: CurrentUser | null,
  key: PermissionKey,
): boolean {
  return !!user && user.permissions.has(key);
}

export async function clientMeta(): Promise<{
  userAgent: string | null;
  ip: string | null;
}> {
  const h = await headers();
  return {
    userAgent: h.get("user-agent"),
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
  };
}
