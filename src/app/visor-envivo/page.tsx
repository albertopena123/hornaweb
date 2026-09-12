import { Metadata } from "next";
import { getLiveResultsData } from "@/lib/actas/live-query";
import { VisorTvClient } from "./VisorTvClient";

export const metadata: Metadata = {
  title: "Conteo Rápido en Vivo Madre de Dios · Ahora Nación",
  description:
    "Transmisión en tiempo real del conteo rápido de actas de escrutinio para la Región Madre de Dios. Elecciones Regionales 2026.",
};

export const dynamic = "force-dynamic";

export default async function VisorEnvivoPage() {
  const initialData = await getLiveResultsData();
  return <VisorTvClient initialData={initialData} />;
}
