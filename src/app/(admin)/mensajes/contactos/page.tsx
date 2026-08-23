import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ContactosClient } from "./ContactosClient";
import type { ContactRow, PermFlags } from "../types";

export const metadata: Metadata = { title: "Contactos · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requirePermission("mensajes.read");
  const { q } = await searchParams;

  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
  const rows: ContactRow[] = contacts.map((c) => ({
    id: c.id,
    docNumber: c.docNumber,
    name: c.name,
    phone: c.phone,
    district: c.district,
    source: c.source,
    whatsappStatus: c.whatsappStatus,
    optedOut: c.optedOut,
    optedOutAt: c.optedOutAt?.toISOString() ?? null,
    lastMessagedAt: c.lastMessagedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };

  return <ContactosClient rows={rows} perms={perms} initialQuery={q ?? ""} />;
}
