import type { Metadata } from "next";
import MesaLookupClient from "./MesaLookupClient";

export const metadata: Metadata = {
  title: "¿Dónde me toca votar? · Local y Mesa de Sufragio 2026 — Ahora Nación",
  description:
    "Consulta tu local de votación, número de mesa, orden y si fuiste elegido miembro de mesa para las Elecciones 2026 en Madre de Dios. Simón Horna · Ahora Nación.",
};

export default function Page() {
  return <MesaLookupClient />;
}
