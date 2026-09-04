"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { districtLabel, type DistrictId } from "@/lib/districts";
import { formatDateOnly } from "@/lib/ui/dates";
import { NewCampaignModal } from "./NewCampaignModal";
import { createCampaign, deleteCampaign } from "./actions";
import { CAMPAIGN_STATUS_LABEL, AUDIENCE_LABEL, PAUSED_REASON_LABEL, type CampaignRow, type PermFlags, type SessionOption } from "../types";

const STATUS_BADGE: Record<CampaignRow["status"], string> = {
  draft: "badge--neutral",
  running: "badge--green",
  paused: "badge--amber",
  finished: "badge--neutral",
  cancelled: "badge--red",
};

function fmtDate(iso: string | null): string {
  return iso ? formatDateOnly(iso) : "—";
}

export function CampanasClient({ rows, sessions, perms }: { rows: CampaignRow[]; sessions: SessionOption[]; perms: PermFlags }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<CampaignRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  return (
    <div className="mensajes__section">
      <header className="mensajes__head">
        <div>
          <h2>Campañas</h2>
          <p className="mensajes__sub">Cada campaña congela su lista de destinatarios al crearse y se envía de forma pausada.</p>
        </div>
        {perms.canWrite && (
          <button
            className="btn btn--primary"
            onClick={() => setCreating(true)}
            disabled={sessions.length === 0}
            title={sessions.length === 0 ? "Añade y conecta un número en la pestaña Conexión" : undefined}
          >
            <Icon name="plus" size={16} /> Nueva campaña
          </button>
        )}
      </header>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Números</th>
                <th>Estado</th>
                <th>Audiencia</th>
                <th>Destinatarios</th>
                <th>Enviados</th>
                <th>Fallidos</th>
                <th>Creada</th>
                {perms.canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={perms.canWrite ? 9 : 8} className="mensajes__empty">
                    <Icon name="message" size={22} />
                    <span>Aún no hay campañas.</span>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="mensajes__linkrow" onClick={() => router.push(`/mensajes/campanas/${r.id}`)}>
                  <td>
                    <div className="mensajes__name">{r.name}</div>
                    {r.pausedReason && r.status === "paused" && (
                      <div className="mensajes__muted">{PAUSED_REASON_LABEL[r.pausedReason] ?? r.pausedReason}</div>
                    )}
                  </td>
                  <td>
                    {r.sessions.map((m) => (
                      <div key={m.id}>
                        {m.label}
                        {r.sessions.length > 1 && <span className="mensajes__muted"> · {m.sentCount}</span>}
                      </div>
                    ))}
                    {r.sessions.length > 1 && (
                      <div className="mensajes__muted">{r.rotationBatch > 0 ? `turnos de ${r.rotationBatch}` : "todos a la vez"}</div>
                    )}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{CAMPAIGN_STATUS_LABEL[r.status]}</span></td>
                  <td>
                    {AUDIENCE_LABEL[r.audience]}
                    {r.district && <div className="mensajes__muted">{districtLabel(r.district as DistrictId)}</div>}
                  </td>
                  <td className="mensajes__mono">{r.totalRecipients}</td>
                  <td className="mensajes__mono">{r.sentCount}</td>
                  <td className="mensajes__mono">{r.failedCount}</td>
                  <td>
                    {fmtDate(r.createdAt)}
                    {r.createdByName && <div className="mensajes__muted">{r.createdByName}</div>}
                  </td>
                  {perms.canWrite && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="mensajes__rowactions">
                        {(r.status === "draft" || r.status === "cancelled" || r.status === "finished") && (
                          <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>{rows.length} campaña{rows.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {creating && (
        <NewCampaignModal
          sessions={sessions}
          onClose={() => setCreating(false)}
          onSubmit={async (input) => {
            const res = await createCampaign(input);
            if (res.ok) {
              toast("success", "Campaña creada en borrador.");
              setCreating(false);
              router.push(`/mensajes/campanas/${res.data!.id}`);
            }
            return res;
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar campaña"
          description={<>Se eliminará <strong>{toDelete.name}</strong> y su historial de destinatarios.</>}
          confirmLabel="Eliminar"
          tone="danger"
          onConfirm={async () => {
            const res = await deleteCampaign(toDelete.id);
            if (res.ok) toast("success", "Campaña eliminada.");
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
