"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { setPublicRegistration } from "./actions";
import type { PermFlags } from "./types";

type Props = {
  perms: PermFlags;
  publicRegistration: boolean;
};

export function PersonerosHeaderActions({ perms, publicRegistration }: Props) {
  const [pubReg, setPubReg] = useState(publicRegistration);
  const [isPending, startTransition] = useTransition();

  function togglePublic() {
    startTransition(async () => {
      const next = !pubReg;
      setPubReg(next);
      const res = await setPublicRegistration(next);
      if (!res.ok) {
        setPubReg(!next); // revert
      }
    });
  }

  return (
    <div className="personeros-header-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {perms.canWritePersoneros && (
        <div
          className="pub-reg-toggle-wrap"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            borderRadius: "var(--radius-md, 8px)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>Inscripción pública:</span>
          <button
            type="button"
            role="switch"
            aria-checked={pubReg}
            aria-label="Activar inscripción pública de personeros"
            className={`personeros__switch ${pubReg ? "is-on" : ""}`}
            disabled={isPending}
            onClick={togglePublic}
            title={pubReg ? "Inscripción pública habilitada en la web" : "Inscripción pública deshabilitada"}
          />
        </div>
      )}

      <Link
        href="/personeros/directorio?wa=1"
        className="btn btn--secondary"
      >
        <Icon name="message" size={16} />
        <span>Notificar WhatsApp</span>
      </Link>

      {perms.canWritePersoneros && (
        <Link
          href="/personeros/directorio?new=1"
          className="btn btn--primary"
        >
          <Icon name="plus" size={16} />
          <span>Registrar personero</span>
        </Link>
      )}
    </div>
  );
}
