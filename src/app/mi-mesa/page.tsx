import type { Metadata } from "next";
import MesaLookupClient from "./MesaLookupClient";

export const metadata: Metadata = {
  title: "Consultor de Mesa · Personeros — Ahora Nación",
  description: "Personeros de Ahora Nación: consulta tu local, número de mesa y coordinador ingresando tu DNI.",
};

export default function Page() {
  return <MesaLookupClient />;
}
