export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type PersoneroRow = {
  id: string;
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  district: string | null;
  localName: string;
  localAddress: string | null;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes: string | null;
  createdAt: string; // ISO
  createdByName: string | null;
};

export type PersoneroInput = {
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  district?: string;
  localName: string;
  localAddress?: string;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes?: string;
};

export type PermFlags = { canRead: boolean; canWrite: boolean };

// Local educativo del padrón MINEDU, para autocompletar el local de votación.
export type LocalOption = {
  id: string;
  name: string;
  address: string | null;
  locality: string | null;
  district: string;
};
