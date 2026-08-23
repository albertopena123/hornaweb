import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/server";
import { MensajesTabs } from "./MensajesTabs";
import "./mensajes.css";

export const dynamic = "force-dynamic";

export default async function MensajesLayout({ children }: { children: ReactNode }) {
  await requirePermission("mensajes.read");
  return (
    <div className="mensajes">
      <header className="mensajes__head">
        <div>
          <h1>Mensajería</h1>
          <p className="mensajes__sub">Contactos por DNI y campañas de WhatsApp</p>
        </div>
      </header>
      <MensajesTabs />
      {children}
    </div>
  );
}
