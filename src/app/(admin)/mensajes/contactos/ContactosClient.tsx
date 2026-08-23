"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { districtLabel, type DistrictId } from "@/lib/districts";
import { foldText } from "@/lib/text";
import { formatDateOnly } from "@/lib/ui/dates";
import { ImportModal } from "./ImportModal";
import { setContactOptedOut, deleteContact } from "./actions";
import type { ContactRow, PermFlags, ActionResult } from "../types";

const PAGE_SIZE = 50;

// formatDateOnly fija America/Lima y normaliza espacios ICU: SSR y navegador coinciden (sin error de hidratación).
function fmtDate(iso: string | null): string {
  return iso ? formatDateOnly(iso) : "—";
}

export function ContactosClient({ rows, perms, initialQuery }: { rows: ContactRow[]; perms: PermFlags; initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [wa, setWa] = useState<"" | "yes" | "no" | "unknown">("");
  const [baja, setBaja] = useState<"" | "yes" | "no">("");
  const [contacted, setContacted] = useState<"" | "yes" | "no">("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [toDelete, setToDelete] = useState<ContactRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const stats = useMemo(
    () => ({
      total: rows.length,
      yes: rows.filter((r) => r.whatsappStatus === "yes").length,
      no: rows.filter((r) => r.whatsappStatus === "no").length,
      optedOut: rows.filter((r) => r.optedOut).length,
      never: rows.filter((r) => !r.lastMessagedAt).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const term = foldText(q);
    const digits = q.replace(/\D/g, "");
    return rows.filter(
      (r) =>
        (wa === "" || r.whatsappStatus === wa) &&
        (baja === "" || (baja === "yes") === r.optedOut) &&
        (contacted === "" || (contacted === "yes") === !!r.lastMessagedAt) &&
        (term === "" ||
          foldText(r.name).includes(term) ||
          r.docNumber.includes(term) ||
          (digits.length >= 4 && r.phone.replace(/\D/g, "").includes(digits))),
    );
  }, [rows, q, wa, baja, contacted]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  return (
    <div className="mensajes__section">
      <header className="mensajes__head">
        <div>
          <h2>Contactos</h2>
          <p className="mensajes__sub">Base única por DNI. Importar de nuevo un DNI actualiza sus datos, nunca lo duplica.</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setImporting(true)}>
            <Icon name="download" size={16} /> Importar Excel
          </button>
        )}
      </header>

      <div className="mensajes__stats">
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.total}</div><div className="stat__l">Contactos</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.yes}</div><div className="stat__l">Con WhatsApp</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.no}</div><div className="stat__l">Sin WhatsApp</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.optedOut}</div><div className="stat__l">Bajas</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.never}</div><div className="stat__l">Nunca contactados</div></div>
      </div>

      <div className="mensajes__filters">
        <input className="mensajes__search" placeholder="Buscar por DNI, nombre o celular…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="mensajes__select" value={wa} onChange={(e) => { setWa(e.target.value as typeof wa); setPage(1); }}>
          <option value="">WhatsApp: todos</option>
          <option value="yes">Con WhatsApp</option>
          <option value="no">Sin WhatsApp</option>
          <option value="unknown">Sin verificar</option>
        </select>
        <select className="mensajes__select" value={baja} onChange={(e) => { setBaja(e.target.value as typeof baja); setPage(1); }}>
          <option value="">Baja: todos</option>
          <option value="yes">Solo bajas</option>
          <option value="no">Sin baja</option>
        </select>
        <select className="mensajes__select" value={contacted} onChange={(e) => { setContacted(e.target.value as typeof contacted); setPage(1); }}>
          <option value="">Contactados: todos</option>
          <option value="yes">Ya contactados</option>
          <option value="no">Nunca contactados</option>
        </select>
      </div>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Celular</th>
                <th>Distrito</th>
                <th>WhatsApp</th>
                <th>Último envío</th>
                <th>Baja</th>
                <th>Origen</th>
                {perms.canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 && (
                <tr>
                  <td colSpan={perms.canWrite ? 9 : 8} className="mensajes__empty">
                    <Icon name="users" size={22} />
                    <span>{rows.length === 0 ? "Aún no hay contactos. Importa un Excel para empezar." : "No hay contactos con estos filtros."}</span>
                  </td>
                </tr>
              )}
              {slice.map((r) => (
                <tr key={r.id}>
                  <td className="mensajes__mono">{r.docNumber}</td>
                  <td><div className="mensajes__name">{r.name}</div></td>
                  <td className="mensajes__mono">{r.phone}</td>
                  <td>{r.district ? districtLabel(r.district as DistrictId) : <span className="dtable__muted">—</span>}</td>
                  <td>
                    {r.whatsappStatus === "yes" && <span className="badge badge--green">Sí</span>}
                    {r.whatsappStatus === "no" && <span className="badge badge--red">No</span>}
                    {r.whatsappStatus === "unknown" && <span className="badge badge--neutral">?</span>}
                  </td>
                  <td>{fmtDate(r.lastMessagedAt)}</td>
                  <td>{r.optedOut ? <span className="badge badge--amber">Baja</span> : <span className="dtable__muted">—</span>}</td>
                  <td><span className="mensajes__muted">{r.source}</span></td>
                  {perms.canWrite && (
                    <td>
                      <div className="mensajes__rowactions">
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={pending}
                          onClick={() => run(() => setContactOptedOut(r.id, !r.optedOut), r.optedOut ? "Contacto reactivado." : "Contacto dado de baja.")}
                        >
                          {r.optedOut ? "Reactivar" : "Dar de baja"}
                        </button>
                        <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>{visible.length} de {rows.length} contacto{rows.length === 1 ? "" : "s"}</span>
          <div className="mensajes__pager">
            <button className="btn btn--ghost btn--sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>‹</button>
            <span className="mensajes__muted">Página {current} de {pages}</span>
            <button className="btn btn--ghost btn--sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>›</button>
          </div>
        </div>
      </div>

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onDone={(s, err) => {
            if (err) toast("error", `Importación incompleta: ${err}`);
            else toast("success", `${s.inserted} nuevos · ${s.updated} actualizados · ${s.invalid} inválidos · ${s.duplicatedInFile} repetidos`);
            router.refresh();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar contacto"
          description={<>Se eliminará <strong>{toDelete.name}</strong> ({toDelete.docNumber}) y su historial de envíos. Esta acción no se puede deshacer.</>}
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            const res = await deleteContact(toDelete.id);
            if (res.ok) toast("success", "Contacto eliminado.");
            else toast("error", res.error);
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
