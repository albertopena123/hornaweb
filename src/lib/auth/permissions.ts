// Single source of truth for all permission keys in the app.
// Used by the seed AND by ui/server-side checks.
//
// Cada categoría DEBE corresponder a un módulo real (UI o API).
// - "Usuarios"       → /usuarios
// - "Roles"          → /roles
// - "Simpatizantes"  → /simpatizantes (mapa de apoyos)
// - "Avisos"         → /anuncios

export type PermissionDef = {
  key: string;
  name: string;
  description: string;
  category: string;
};

export const PERMISSIONS: PermissionDef[] = [
  {
    key: "users.read",
    name: "Ver usuarios",
    description: "Listar y consultar usuarios del sistema",
    category: "Usuarios",
  },
  {
    key: "users.write",
    name: "Gestionar usuarios",
    description: "Crear, editar y eliminar usuarios",
    category: "Usuarios",
  },
  {
    key: "users.assign-roles",
    name: "Asignar roles",
    description: "Cambiar los roles asignados a un usuario",
    category: "Usuarios",
  },
  {
    key: "roles.read",
    name: "Ver roles",
    description: "Consultar roles y permisos",
    category: "Roles",
  },
  {
    key: "roles.write",
    name: "Gestionar roles",
    description: "Crear, editar y eliminar roles personalizados",
    category: "Roles",
  },
  {
    key: "supporters.read",
    name: "Ver simpatizantes",
    description: "Ver el listado de simpatizantes y sus estados",
    category: "Simpatizantes",
  },
  {
    key: "supporters.write",
    name: "Gestionar simpatizantes",
    description: "Registrar, editar, aprobar/rechazar y eliminar simpatizantes",
    category: "Simpatizantes",
  },
  {
    key: "personeros.read",
    name: "Ver personeros",
    description: "Consultar el listado de personeros y sus asignaciones de mesa",
    category: "Personeros",
  },
  {
    key: "personeros.write",
    name: "Gestionar personeros",
    description: "Crear, editar, activar/desactivar y eliminar personeros",
    category: "Personeros",
  },
  {
    key: "anuncios.read",
    name: "Ver avisos",
    description: "Consultar los avisos publicados en la página principal",
    category: "Avisos",
  },
  {
    key: "anuncios.write",
    name: "Gestionar avisos",
    description: "Crear, editar, publicar y eliminar avisos de la página principal",
    category: "Avisos",
  },
];

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ROLE_DEFS = [
  {
    key: "superadmin",
    name: "Superadministrador",
    description: "Acceso total al sistema. No editable.",
    system: true,
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    key: "admin",
    name: "Administrador",
    description: "Gestiona usuarios, roles y simpatizantes del sistema.",
    system: true,
    permissions: [
      "users.read",
      "users.write",
      "users.assign-roles",
      "roles.read",
      "supporters.read",
      "supporters.write",
      "personeros.read",
      "personeros.write",
      "anuncios.read",
      "anuncios.write",
    ],
  },
  {
    key: "viewer",
    name: "Consulta",
    description: "Solo lectura sobre usuarios, roles y simpatizantes.",
    system: true,
    permissions: [
      "users.read",
      "roles.read",
      "supporters.read",
      "personeros.read",
      "anuncios.read",
    ],
  },
] as const;
