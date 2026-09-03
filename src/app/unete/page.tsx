import type { Metadata } from "next";
import UneteClient from "./UneteClient";

export const metadata: Metadata = {
  title: "Únete a la Campaña · Simón Horna — Ahora Nación",
  description:
    "Súmate como simpatizante, voluntario o personero de mesa en Madre de Dios. Defendamos y construyamos el futuro de nuestra región junto a Simón Horna.",
  openGraph: {
    title: "Únete a la Campaña · Simón Horna (Ahora Nación)",
    description:
      "Regístrate como voluntario o personero de mesa. ¡Juntos por Madre de Dios!",
    images: ["/assets/images/logo/logo-an.webp"],
  },
};

export default function UnetePage() {
  return <UneteClient />;
}
