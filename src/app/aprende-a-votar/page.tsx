import type { Metadata } from "next";
import { AprendeAVotarClient } from "./AprendeAVotarClient";

export const metadata: Metadata = {
  title: "Cédula Electoral y Capacitación — Simón Horna | Ahora Nación Madre de Dios",
  description:
    "Simulador oficial interactivo de la cédula de votación física de la ONPE para Madre de Dios. Aprende a votar válidamente por Simón Horna y Ahora Nación.",
  openGraph: {
    title: "Cédula Electoral y Capacitación — Ahora Nación Madre de Dios",
    description: "Practica tu voto con la cédula oficial de sufragio interactiva para Madre de Dios 2026.",
    images: ["/preview_og.png"]
  }
};

export default function AprendeAVotarPage() {
  return <AprendeAVotarClient />;
}
