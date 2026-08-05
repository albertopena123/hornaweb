export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type SupporterRow = {
  id: string;
  name: string;
  phone: string | null;
  district: string;
  source: "admin" | "public";
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  createdAt: string; // ISO
  createdByName: string | null;
  reviewedByName: string | null;
};

export type SupporterInput = {
  name: string;
  district: string;
  phone?: string;
  notes?: string;
};

export type PermFlags = { canRead: boolean; canWrite: boolean };
