import type { IconName } from "@/components/admin/Icon";

const MAP: Record<string, IconName> = {
  Usuarios: "users",
  Roles: "shield",
  Simpatizantes: "heart",
  Personeros: "id-card",
  Mensajería: "message",
  Actas: "camera",
  "Locales y Mesas": "home",
  "Cómputo y Resultados": "chart",
};

export function categoryIcon(category: string): IconName {
  return MAP[category] ?? "folder";
}
