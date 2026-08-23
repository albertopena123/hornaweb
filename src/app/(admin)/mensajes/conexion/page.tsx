import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { ConexionClient } from "./ConexionClient";
import { getSessionAction } from "./actions";
import type { PermFlags } from "../types";

export const metadata: Metadata = { title: "Conexión WhatsApp · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("mensajes.read");
  const initial = await getSessionAction();
  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };
  return <ConexionClient initial={initial} perms={perms} />;
}
