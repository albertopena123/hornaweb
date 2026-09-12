import type { IconName } from "./Icon";

export type AdminNotification = {
  id: string;
  title: string;
  sub: string;
  icon: IconName;
  href: string;
};

export type SidebarChild = {
  id: string;
  label: string;
  href: string;
  permission?: string;
};

export type SidebarItem = {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  expandable?: boolean;
  dot?: boolean;
  permission?: string;
  children?: SidebarChild[];
};

export type NavSection = {
  id: string;
  title: string;
  items: SidebarItem[];
};

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    id: "general",
    title: "General",
    items: [
      {
        id: "inicio",
        label: "Inicio",
        icon: "home",
        href: "/inicio",
      },
      {
        id: "usuarios",
        label: "Usuarios",
        icon: "users",
        href: "/usuarios",
        permission: "users.read",
      },
      {
        id: "roles",
        label: "Roles",
        icon: "shield",
        href: "/roles",
        permission: "roles.read",
      },
      {
        id: "simpatizantes",
        label: "Simpatizantes",
        icon: "heart",
        href: "/simpatizantes",
        permission: "supporters.read",
      },
    ],
  },
  {
    id: "electoral",
    title: "Gestión Electoral",
    items: [
      {
        id: "personeros",
        label: "Personeros",
        icon: "id-card",
        href: "/personeros",
        expandable: true,
        permission: "personeros.read",
        children: [
          { id: "personeros/mesas", label: "Padrón de Mesas", href: "/personeros/mesas", permission: "mesas.read" },
          { id: "personeros/mapa", label: "Mapa de Cobertura", href: "/personeros/mapa", permission: "locales.read" },
          { id: "personeros/directorio", label: "Directorio", href: "/personeros/directorio", permission: "personeros.read" },
        ],
      },
      {
        id: "candidatos",
        label: "Candidatos",
        icon: "card",
        href: "/candidatos",
        permission: "candidatos.read",
      },
    ],
  },
  {
    id: "actas",
    title: "Cómputo y Actas",
    items: [
      {
        id: "actas",
        label: "Subir Acta",
        icon: "camera",
        href: "/actas",
        permission: "actas.write",
      },
      {
        id: "verificacion",
        label: "Verificación Actas",
        icon: "check",
        href: "/verificacion",
        permission: "actas.verify",
      },
      {
        id: "visor-envivo",
        label: "Cómputo en Vivo",
        icon: "device",
        href: "/visor-envivo",
        permission: "actas.read",
      },
    ],
  },
  {
    id: "comunicacion",
    title: "Comunicación",
    items: [
      {
        id: "mensajes",
        label: "Mensajería",
        icon: "message",
        href: "/mensajes",
        expandable: true,
        permission: "mensajes.read",
        children: [
          { id: "mensajes/campanas", label: "Campañas", href: "/mensajes/campanas", permission: "mensajes.read" },
          { id: "mensajes/contactos", label: "Contactos", href: "/mensajes/contactos", permission: "mensajes.read" },
          { id: "mensajes/conexion", label: "Conexión", href: "/mensajes/conexion", permission: "mensajes.read" },
        ],
      },
      {
        id: "anuncios",
        label: "Avisos",
        icon: "bell",
        href: "/anuncios",
        permission: "anuncios.read",
      },
    ],
  },
];

export const SIDEBAR_NAV: SidebarItem[] = SIDEBAR_SECTIONS.flatMap((s) => s.items);
