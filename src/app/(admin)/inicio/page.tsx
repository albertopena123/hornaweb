import { prisma } from "@/lib/prisma";
import { requireUser, userHas } from "@/lib/auth/server";
import { districtLabel, type DistrictId } from "@/lib/districts";
import { DashboardView } from "./DashboardView";
import type {
  ActivityItem,
  DashboardData,
  DistrictSlice,
  QuickAction,
} from "./types";

export const metadata = { title: "Inicio · Simón Horna | Ahora Nación" };
export const dynamic = "force-dynamic";

function greetingFor(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function Page() {
  const me = await requireUser();

  const canUsers = userHas(me, "users.read");
  const canRoles = userHas(me, "roles.read");
  const canSupporters = userHas(me, "supporters.read");

  // Local time in Lima for greeting + date, independent of server TZ.
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("es-PE", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Lima",
    }).format(now),
  );
  const dateLabel = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(now);

  // ── Users ──────────────────────────────────────────────────────────────
  const usersBlock = canUsers
    ? await prisma.user
        .findMany({ select: { active: true } })
        .then((rows) => ({
          total: rows.length,
          active: rows.filter((r) => r.active).length,
          suspended: rows.filter((r) => !r.active).length,
        }))
    : null;

  const recentUsers = canUsers
    ? await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, createdAt: true },
      })
    : [];

  // ── Roles ──────────────────────────────────────────────────────────────
  const rolesBlock = canRoles
    ? await prisma.role
        .findMany({
          orderBy: [{ system: "desc" }, { name: "asc" }],
          select: { name: true, system: true, _count: { select: { users: true } } },
        })
        .then((rows) => ({
          total: rows.length,
          distribution: rows.map((r) => ({
            name: r.name,
            count: r._count.users,
            system: r.system,
          })),
        }))
    : null;

  // ── Simpatizantes ────────────────────────────────────────────────────────
  let supportersBlock: DashboardData["supporters"] = null;
  let recentSupporters: {
    id: string;
    name: string;
    district: string;
    createdAt: Date;
  }[] = [];

  if (canSupporters) {
    const [byStatusRaw, byDistrictRaw, total] = await Promise.all([
      prisma.supporter.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.supporter.groupBy({ by: ["district"], _count: { _all: true } }),
      prisma.supporter.count(),
    ]);

    const statusCount = new Map<string, number>(
      byStatusRaw.map((r) => [String(r.status), r._count._all]),
    );

    const byDistrict: DistrictSlice[] = byDistrictRaw
      .map((r) => ({
        key: String(r.district),
        label: districtLabel(r.district as DistrictId),
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    supportersBlock = {
      total,
      pending: statusCount.get("pending") ?? 0,
      approved: statusCount.get("approved") ?? 0,
      rejected: statusCount.get("rejected") ?? 0,
      byDistrict,
    };

    recentSupporters = await prisma.supporter.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, district: true, createdAt: true },
    });
  }

  // ── Activity feed (merge + sort) ─────────────────────────────────────────
  const activity: ActivityItem[] = [
    ...recentUsers.map(
      (u): ActivityItem => ({
        id: `u-${u.id}`,
        icon: "user",
        tone: "blue",
        title: u.name,
        sub: "Nuevo usuario",
        at: u.createdAt.toISOString(),
      }),
    ),
    ...recentSupporters.map(
      (s): ActivityItem => ({
        id: `s-${s.id}`,
        icon: "heart",
        tone: "green",
        title: s.name,
        sub: `Nuevo apoyo · ${districtLabel(s.district as DistrictId)}`,
        at: s.createdAt.toISOString(),
      }),
    ),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  // ── Quick actions (permission-gated) ─────────────────────────────────────
  const quickActions: QuickAction[] = [];
  if (userHas(me, "users.write"))
    quickActions.push({
      label: "Crear usuario",
      desc: "Da de alta una cuenta del equipo",
      href: "/usuarios",
      icon: "user",
    });
  if (canRoles)
    quickActions.push({
      label: "Gestionar roles",
      desc: "Revisa permisos y miembros",
      href: "/roles",
      icon: "shield",
    });
  if (canSupporters)
    quickActions.push({
      label: "Ver simpatizantes",
      desc: "Apoyos registrados y pendientes",
      href: "/simpatizantes",
      icon: "heart",
    });

  const data: DashboardData = {
    firstName: me.name.split(/\s+/)[0] ?? me.name,
    greeting: greetingFor(hour),
    dateLabel,
    users: usersBlock,
    roles: rolesBlock,
    supporters: supportersBlock,
    activity,
    quickActions,
  };

  return <DashboardView data={data} nowMs={now.getTime()} />;
}
