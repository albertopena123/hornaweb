import type { IconName } from "@/components/admin/Icon";

const MAP: Record<string, IconName> = {
  Usuarios: "users",
  Roles: "shield",
  Simpatizantes: "users",
  Personeros: "id-card",
  Mensajería: "message",
};

export function categoryIcon(category: string): IconName {
  return MAP[category] ?? "folder";
}
