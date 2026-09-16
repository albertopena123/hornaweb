export type ScopeType = "departamental" | "provincial" | "distrital" | "local";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  dni: string | null;
  phone: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: { id: string; key: string; name: string }[];
  scopeType: ScopeType;
  assignedProvince: string | null;
  assignedDistrict: string | null;
  assignedLocalId: string | null;
  assignedLocalName: string | null;
};

export type LocalSummary = {
  id: string;
  name: string;
  district: string;
  province: string;
  totalMesas: number;
};

export type RoleOption = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  system: boolean;
};

export type PermFlags = {
  canRead: boolean;
  canWrite: boolean;
  canAssignRoles: boolean;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<string, string>>;
    };
