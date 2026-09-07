import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { districtLabel, isDistrictId } from "@/lib/districts";
import { CredencialCard, type CredencialData } from "./CredencialCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const p = await prisma.personero.findFirst({
    where: {
      OR: [{ credentialToken: token }, { id: token }, { docNumber: token }],
    },
    select: { name: true, mesa: true, localName: true },
  });

  if (!p) return { title: "Credencial no encontrada · Ahora Nación" };

  return {
    title: `Credencial de Personero · ${p.name} — Ahora Nación`,
    description: `Credencial oficial de personero para la mesa ${p.mesa} en ${p.localName}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const personero = await prisma.personero.findFirst({
    where: {
      OR: [{ credentialToken: token }, { id: token }, { docNumber: token }],
    },
  });

  if (!personero) notFound();

  // Buscar información adicional del local si existe
  const local = await prisma.electoralLocal.findFirst({
    where: {
      name: { contains: personero.localName, mode: "insensitive" },
    },
  });

  // Generar código QR dinámico
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${origin.replace(/\/+$/, "")}/credencial/${personero.credentialToken || personero.id}`;
  const qrCodeUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 240,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const data: CredencialData = {
    id: personero.id,
    name: personero.name,
    docNumber: personero.docNumber,
    role: personero.role || "mesa",
    isSuplente: personero.isSuplente || personero.role === "suplente",
    mesa: personero.mesa,
    aula: personero.aula,
    localName: personero.localName,
    localAddress: personero.localAddress || local?.address || null,
    district: isDistrictId(personero.district)
      ? districtLabel(personero.district)
      : local?.district
      ? districtLabel(local.district)
      : "Tambopata",
    province: local?.province || "Tambopata",
    coordinatorName: local?.coordinatorName || personero.coordinatorName || "Coordinación Central Ahora Nación",
    coordinatorPhone: local?.coordinatorPhone || personero.coordinatorPhone || "982136949",
    qrCodeUrl,
    token: personero.credentialToken || personero.id,
    isMesaMember: personero.isMesaMember,
  };

  return <CredencialCard data={data} />;
}
