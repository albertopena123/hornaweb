export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type PersoneroRow = {
  id: string;
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  phone: string | null;
  source: "admin" | "public";
  district: string | null;
  localName: string;
  localAddress: string | null;
  mesa: string;
  aula: string | null;
  role: string; // "titular" | "suplente" | "general"
  isSuplente: boolean;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes: string | null;
  whatsappNotifiedAt: string | null;
  credentialToken: string | null;
  isMesaMember: boolean;
  createdAt: string; // ISO
  createdByName: string | null;
};

export type PersoneroInput = {
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  phone?: string;
  district?: string;
  localName: string;
  localAddress?: string;
  mesa: string;
  aula?: string;
  role?: string;
  isSuplente?: boolean;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes?: string;
  sendWhatsAppImmediately?: boolean;
};

export type PermFlags = {
  canRead: boolean;
  canWrite: boolean;
  canReadPersoneros: boolean;
  canWritePersoneros: boolean;
  canReadLocales: boolean;
  canWriteLocales: boolean;
  canReadMesas: boolean;
  canWriteMesas: boolean;
  canReadActas: boolean;
  canWriteActas: boolean;
  canVerifyActas: boolean;
  canReadCandidatos: boolean;
};

export type LocalOption = {
  id: string;
  name: string;
  address: string | null;
  locality: string | null;
  district: string;
};

export type PersoneroMini = {
  id: string;
  name: string;
  phone: string | null;
  aula: string | null;
  role: string;
  isSuplente?: boolean;
  whatsappNotifiedAt: string | null;
};

export type ElectoralMesaData = {
  id: string;
  number: string;
  localId: string;
  aula: string | null;
  onpePresidente: string | null;
  onpeSecretario: string | null;
  onpeSuplentes: string | null;
  titular?: PersoneroMini | null;
  suplente?: PersoneroMini | null;
  personero?: PersoneroMini | null; // For backwards compatibility
};

export type ElectoralLocalData = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  district: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  totalMesas: number;
  coordinatorName: string | null;
  coordinatorPhone: string | null;
  coordinatorDni?: string | null;
  mesas: ElectoralMesaData[];
  cubiertasCount: number;
  cubiertasSuplenteCount?: number;
};
