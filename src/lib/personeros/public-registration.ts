// Validación de la inscripción pública de personeros (formulario flotante del landing).
// Módulo puro: se usa en la API y se prueba con node:test.
import { isDistrictId, type DistrictId } from "@/lib/districts";

export type PublicPersoneroData = {
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  phone: string;
  district: DistrictId;
  localName: string;
  localAddress: string | null;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
};

const PHONE_RE = /^[0-9+\s-]{6,15}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validatePublicPersonero(
  body: Record<string, unknown>,
): { data?: PublicPersoneroData; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};

  const docType = body.docType === "ce" || body.docType === "passport" ? body.docType : "dni";
  const docNumber = str(body.docNumber).toUpperCase();
  if (docType === "dni") {
    if (!/^\d{8}$/.test(docNumber)) fe.docNumber = "El DNI debe tener 8 dígitos.";
  } else if (!/^[A-Z0-9]{6,12}$/.test(docNumber)) {
    fe.docNumber = "Documento inválido (6 a 12 letras o números).";
  }

  const name = str(body.name);
  if (name.length < 2 || name.length > 120) fe.name = "Escribe tu nombre completo.";

  const phone = str(body.phone);
  if (!PHONE_RE.test(phone)) fe.phone = "Celular inválido.";

  const district = str(body.district);
  if (!isDistrictId(district)) fe.district = "Elige tu distrito.";

  const localName = str(body.localName);
  if (localName.length < 2 || localName.length > 120) fe.localName = "Escribe tu local de votación.";

  const localAddress = str(body.localAddress).slice(0, 200) || null;

  // Opcionales: se validan solo si vienen con contenido.
  const mesa = str(body.mesa);
  if (mesa.length > 10) fe.mesa = "Número de mesa de máximo 10 caracteres.";

  const coordinatorName = str(body.coordinatorName);
  if (coordinatorName.length > 120) fe.coordinatorName = "Nombre de coordinador demasiado largo.";

  const coordinatorPhone = str(body.coordinatorPhone);
  if (coordinatorPhone !== "" && !PHONE_RE.test(coordinatorPhone)) {
    fe.coordinatorPhone = "Teléfono del coordinador inválido.";
  }

  if (Object.keys(fe).length > 0 || !isDistrictId(district)) return { fieldErrors: fe };
  return {
    data: { docType, docNumber, name, phone, district, localName, localAddress, mesa, coordinatorName, coordinatorPhone },
  };
}
