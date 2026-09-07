// Single source of truth for all permission keys in the app.
// Used by the seed AND by ui/server-side checks.
//
// Cada categoría DEBE corresponder a un módulo real (UI o API).
// - "Usuarios"       → /usuarios
// - "Roles"          → /roles
// - "Simpatizantes"  → /simpatizantes (mapa de apoyos)
// - "Avisos"         → /anuncios
// - "Mensajería"     → /mensajes (contactos, campañas WhatsApp)

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
  {
    key: "mensajes.read",
    name: "Ver mensajería",
    description: "Consultar contactos, campañas y estado de la conexión de WhatsApp",
    category: "Mensajería",
  },
  {
    key: "mensajes.write",
    name: "Gestionar mensajería",
    description:
      "Importar contactos, crear y controlar campañas, conectar WhatsApp y dar de baja contactos",
    category: "Mensajería",
  },
  {
    key: "candidatos.read",
    name: "Ver candidatos",
    description: "Consultar el listado de candidatos, partidos y fotos oficiales",
    category: "Candidatos",
  },
  {
    key: "candidatos.write",
    name: "Gestionar candidatos",
    description: "Crear, editar nombres, fotos, logos, colores y activar/desactivar candidatos",
    category: "Candidatos",
  },
  {
    key: "locales.read",
    name: "Ver locales de votación",
    description: "Consultar colegios y locales de votación en mapa y padrón",
    category: "Locales y Mesas",
  },
  {
    key: "locales.write",
    name: "Gestionar locales de votación",
    description: "Editar nombres, códigos, direcciones y coordenadas GPS de colegios",
    category: "Locales y Mesas",
  },
  {
    key: "mesas.read",
    name: "Ver mesas de sufragio",
    description: "Consultar las 511 mesas de sufragio y su estado de cobertura",
    category: "Locales y Mesas",
  },
  {
    key: "mesas.write",
    name: "Gestionar mesas y asignaciones",
    description: "Asignar y reasignar personeros titulares y suplentes, y editar aulas",
    category: "Locales y Mesas",
  },
  {
    key: "actas.read",
    name: "Ver actas y cómputo",
    description: "Consultar actas electorales y resultados en tiempo real",
    category: "Cómputo Electoral",
  },
  {
    key: "actas.write",
    name: "Registrar actas",
    description: "Subir fotografías y registrar votos de actas de escrutinio",
    category: "Cómputo Electoral",
  },
  {
    key: "actas.verify",
    name: "Verificar y aprobar actas",
    description: "Revisar, cotejar lado a lado y aprobar u observar actas electorales",
    category: "Cómputo Electoral",
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
    description: "Gestiona todos los módulos electorales, usuarios, roles y actas.",
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
      "mensajes.read",
      "mensajes.write",
      "candidatos.read",
      "candidatos.write",
      "locales.read",
      "locales.write",
      "mesas.read",
      "mesas.write",
      "actas.read",
      "actas.write",
      "actas.verify",
    ],
  },
  {
    key: "verificador",
    name: "Verificador de Cómputo",
    description: "Operador del centro de cómputo para validar, contrastar y aprobar actas de escrutinio.",
    system: true,
    permissions: [
      "actas.read",
      "actas.verify",
      "candidatos.read",
      "locales.read",
      "personeros.read",
    ],
  },
  {
    key: "personero",
    name: "Personero de Mesa",
    description: "Acceso para personeros acreditados para subir y consultar actas de escrutinio.",
    system: true,
    permissions: [
      "actas.read",
      "actas.write",
    ],
  },
  {
    key: "viewer",
    name: "Consulta",
    description: "Solo lectura sobre usuarios, roles, personeros y resultados.",
    system: true,
    permissions: [
      "users.read",
      "roles.read",
      "supporters.read",
      "personeros.read",
      "anuncios.read",
      "mensajes.read",
      "actas.read",
    ],
  },
] as const;
