// Los 11 distritos de Madre de Dios. El id coincide con el enum District de Prisma.
export const DISTRICTS = [
  { id: "tambopata", label: "Tambopata", province: "Tambopata" },
  { id: "inambari", label: "Inambari", province: "Tambopata" },
  { id: "las_piedras", label: "Las Piedras", province: "Tambopata" },
  { id: "laberinto", label: "Laberinto", province: "Tambopata" },
  { id: "manu", label: "Manu", province: "Manu" },
  { id: "fitzcarrald", label: "Fitzcarrald", province: "Manu" },
  { id: "madre_de_dios", label: "Madre de Dios", province: "Manu" },
  { id: "huepetuhe", label: "Huepetuhe", province: "Manu" },
  { id: "inapari", label: "Iñapari", province: "Tahuamanu" },
  { id: "iberia", label: "Iberia", province: "Tahuamanu" },
  { id: "tahuamanu", label: "Tahuamanu", province: "Tahuamanu" },
] as const

export type DistrictId = (typeof DISTRICTS)[number]["id"]

export const DISTRICT_IDS: DistrictId[] = DISTRICTS.map((d) => d.id)

export function districtLabel(id: DistrictId): string {
  return DISTRICTS.find((d) => d.id === id)?.label ?? id
}

export function isDistrictId(v: unknown): v is DistrictId {
  return typeof v === "string" && (DISTRICT_IDS as string[]).includes(v)
}
