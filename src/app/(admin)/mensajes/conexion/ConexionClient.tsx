"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { SessionModal } from "./SessionModal";
import {
  getSessionsAction,
  getQrAction,
  startSessionAction,
  logoutSessionAction,
  relinkSessionAction,
  createSessionAction,
  updateSessionAction,
  setSessionActiveAction,
  deleteSessionAction,
} from "./actions";
import type { SessionRow, SessionsView, PermFlags, ActionResult } from "../types";

const STATUS_LABEL: Record<SessionRow["status"], { text: string; badge: string }> = {
  STOPPED: { text: "Desconectado", badge: "badge--neutral" },
  STARTING: { text: "Iniciando…", badge: "badge--amber" },
  SCAN_QR_CODE: { text: "Escanea el código QR", badge: "badge--amber" },
  WORKING: { text: "Conectado", badge: "badge--green" },
  FAILED: { text: "Error en la sesión", badge: "badge--red" },
  UNKNOWN: { text: "Sin conexión con WAHA", badge: "badge--red" },
};

type Dialog =
  | { kind: "logout" | "relink" | "delete" | "deactivate"; session: SessionRow }
  | null;

export function ConexionClient({ initial, perms }: { initial: SessionsView; perms: PermFlags }) {
  const [view, setView] = useState<SessionsView>(initial);
  const [qrs, setQrs] = useState<Record<string, string | null>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const reload = useCallback(async () => {
    const v = await getSessionsAction();
    setView(v);
    return v;
  }, []);

  // Sondeo: cada 3 s si algún número está a medio vincular (para refrescar su QR), cada 15 s si no.
  useEffect(() => {
    let cancelled = false;
    // Solo hace falta sondear rápido si algún número está a medio vincular o reconectando.
    const settled = view.rows.every((r) => !r.active || r.status === "WORKING" || r.status === "STOPPED" || r.status === "FAILED");
    const delay = settled ? 15_000 : 3_000;
    const t = setTimeout(async () => {
      const v = await getSessionsAction();
      if (cancelled) return;
      const next: Record<string, string | null> = {};
      for (const row of v.rows.filter((r) => r.status === "SCAN_QR_CODE")) {
        const q = await getQrAction(row.id);
        if (cancelled) return;
        next[row.id] = q.ok ? (q.data?.dataUrl ?? null) : null;
      }
      if (!cancelled) {
        setQrs(next);
        setView(v);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [view]);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
      await reload();
    });
  }

  async function confirmDialog() {
    if (!dialog) return;
    const { kind, session } = dialog;
    const res =
      kind === "logout"
        ? await logoutSessionAction(session.id)
        : kind === "relink"
          ? await relinkSessionAction(session.id)
          : kind === "delete"
            ? await deleteSessionAction(session.id)
            : await setSessionActiveAction(session.id, false);
    if (res.ok) {
      toast(
        "success",
        kind === "logout"
          ? "Sesión cerrada."
          : kind === "relink"
            ? "Sesión reiniciada. Escanea el QR nuevo."
            : kind === "delete"
              ? "Número eliminado."
              : "Número desactivado.",
      );
    } else toast("error", res.error);
    setDialog(null);
    await reload();
  }

  const dialogProps = {
    logout: {
      title: "Cerrar sesión de WhatsApp",
      description: "El número dejará de estar vinculado y sus campañas en curso se pausarán. Tendrás que escanear el QR de nuevo.",
      confirmLabel: "Cerrar sesión",
    },
    relink: {
      title: "Volver a vincular WhatsApp",
      description: "Se descartan las credenciales actuales y se genera un QR nuevo. Sus campañas en curso se pausarán hasta que vuelvas a escanear.",
      confirmLabel: "Generar QR nuevo",
    },
    delete: {
      title: "Eliminar número",
      description: "Se borra el número y sus credenciales de WhatsApp. Solo se puede si ninguna campaña lo usa.",
      confirmLabel: "Eliminar",
    },
    deactivate: {
      title: "Desactivar número",
      description: "El motor dejará de usarlo y sus campañas en curso se pausarán. Puedes reactivarlo cuando quieras.",
      confirmLabel: "Desactivar",
    },
  } as const;

  return (
    <div className="mensajes__conn">
      {view.error && (
        <div className="login__error" role="alert">
          <Icon name="info" size={16} />
          <span>{view.error}</span>
        </div>
      )}

      <div className="mensajes__actions" style={{ justifyContent: "space-between" }}>
        <span className="mensajes__muted">
          {view.rows.length === 0
            ? "Todavía no hay números registrados."
            : `${view.rows.length} número${view.rows.length === 1 ? "" : "s"} · ${view.rows.filter((r) => r.status === "WORKING").length} conectado${view.rows.filter((r) => r.status === "WORKING").length === 1 ? "" : "s"}`}
        </span>
        <span style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(async () => void (await reload()))}>
            Actualizar
          </button>
          {perms.canWrite && (
            <button
              className="btn btn--primary"
              disabled={pending}
              title="Crea la tarjeta y muestra el QR al instante; el número y el nombre se rellenan solos al escanear"
              onClick={() => run(createSessionAction, "Número añadido: escanea el QR con el celular.")}
            >
              <Icon name="plus" size={16} /> Añadir número
            </button>
          )}
        </span>
      </div>

      {view.rows.map((row) => {
        const st = STATUS_LABEL[row.status];
        const canConnect = row.status === "STOPPED" || row.status === "UNKNOWN";
        // En FAILED "Conectar" reutiliza las credenciales que WhatsApp acaba de rechazar y vuelve a
        // fallar: la salida es volver a vincular (logout + start → QR nuevo).
        const isFailed = row.status === "FAILED";
        const canLogout = row.status === "WORKING" || row.status === "SCAN_QR_CODE" || row.status === "STARTING" || isFailed;
        const qr = qrs[row.id];

        return (
          <section className="mensajes__card" key={row.id}>
            <div className="mensajes__status">
              <strong>{row.label}</strong>
              <span className={`badge ${st.badge}`}>{st.text}</span>
              {!row.active && <span className="badge badge--neutral">Desactivado</span>}
              {row.phone && <span className="mensajes__muted">{row.phone}</span>}
              {row.me?.pushName && <span className="mensajes__muted">{row.me.pushName}</span>}
            </div>
            <p className="mensajes__muted" style={{ margin: 0 }}>
              Tope diario {row.dailyCap}/día
              {row.runningCampaigns > 0 && ` · ${row.runningCampaigns} campaña${row.runningCampaigns === 1 ? "" : "s"} en curso`}
              {!row.active && row.status === "STOPPED" && " · Se reactiva solo al escanear el QR"}
            </p>

            {row.status === "SCAN_QR_CODE" && (
              <div className="mensajes__qrbox">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL generada por WAHA
                  <img className="mensajes__qr" src={qr} alt={`Código QR para vincular ${row.label}`} />
                ) : (
                  <div className="mensajes__qr" aria-busy="true" />
                )}
                <p className="mensajes__muted">
                  En ese celular: WhatsApp → Menú (⋮) → <strong>Dispositivos vinculados</strong> →{" "}
                  <strong>Vincular un dispositivo</strong> y escanea este código. Se actualiza solo.
                </p>
              </div>
            )}

            {row.status === "WORKING" && row.active && (
              <p className="mensajes__muted">Listo para enviar. Sus campañas en curso continúan automáticamente.</p>
            )}

            {isFailed && (
              <div className="login__error" role="alert">
                <Icon name="alert" size={16} />
                {row.phone ? (
                  <span>
                    WhatsApp rechazó las credenciales guardadas de {row.phone}. Suele pasar cuando el número se abrió en otro WhatsApp
                    Web o se desvinculó desde el celular. Reintentar no sirve: pulsa <strong>Volver a vincular</strong> para generar un
                    QR nuevo.
                  </span>
                ) : (
                  <span>
                    El código QR caducó sin ser escaneado (WhatsApp lo retira pasados 2–3 minutos). Pulsa{" "}
                    <strong>Volver a vincular</strong> y escanéalo enseguida con el celular.
                  </span>
                )}
              </div>
            )}

            {perms.canWrite && (
              <div className="mensajes__actions">
                {canConnect && (
                  <button className="btn btn--primary" disabled={pending} onClick={() => run(() => startSessionAction(row.id), "Sesión iniciada. Escanea el QR.")}>
                    <Icon name="plus" size={16} /> Conectar
                  </button>
                )}
                {isFailed && (
                  <>
                    <button className="btn btn--primary" disabled={pending} onClick={() => setDialog({ kind: "relink", session: row })}>
                      <Icon name="plus" size={16} /> Volver a vincular (QR nuevo)
                    </button>
                    <button className="btn btn--ghost" disabled={pending} onClick={() => run(() => startSessionAction(row.id), "Reintentando la conexión…")}>
                      Reintentar con la sesión actual
                    </button>
                  </>
                )}
                {canLogout && (
                  <button className="btn btn--ghost" disabled={pending} onClick={() => setDialog({ kind: "logout", session: row })}>
                    Cerrar sesión
                  </button>
                )}
                <button className="btn btn--ghost" disabled={pending} onClick={() => setEditing(row)}>
                  Editar
                </button>
                {row.active ? (
                  <button className="btn btn--ghost" disabled={pending} onClick={() => setDialog({ kind: "deactivate", session: row })}>
                    Desactivar
                  </button>
                ) : (
                  <button className="btn btn--ghost" disabled={pending} onClick={() => run(() => setSessionActiveAction(row.id, true), "Número reactivado.")}>
                    Activar
                  </button>
                )}
                <button
                  className="btn btn--ghost"
                  disabled={pending || row.campaigns > 0}
                  title={row.campaigns > 0 ? `${row.campaigns} campaña${row.campaigns === 1 ? "" : "s"} usa${row.campaigns === 1 ? "" : "n"} este número: desactívalo en su lugar` : undefined}
                  onClick={() => setDialog({ kind: "delete", session: row })}
                >
                  Eliminar
                </button>
              </div>
            )}
          </section>
        );
      })}

      <aside className="mensajes__card mensajes__warn">
        <strong>Riesgo de bloqueo del número</strong>
        <p className="mensajes__sub" style={{ margin: 0 }}>
          Este envío usa un cliente no oficial. Meta puede suspender el número aunque se respeten los límites.
        </p>
        <ul>
          <li>Usa números dedicados a la campaña, con chip peruano y perfil completo (foto y nombre).</li>
          <li>
            «Caliéntalos» 1–2 semanas con conversaciones reales antes de la primera campaña: un chip nuevo sin historial cae con 1–2
            mensajes, aunque el tope sea bajo.
          </li>
          <li>Cuando WhatsApp desvincula un número, aquí se limpia y se aparta solo de las campañas; vuelve a escanear cuando el celular esté listo.</li>
          <li>Tope diario bajo por número (≤150), pausas de 45–120 s y horario de 8:00 a 20:00.</li>
          <li>Repartir entre varios números baja el riesgo por número, pero no lo elimina: WhatsApp correlaciona envíos parecidos desde el mismo servidor.</li>
          <li>Si muchos destinatarios bloquean o reportan, pausa la campaña.</li>
          <li>
            Mientras un número esté conectado aquí, <strong>no lo abras en otro WhatsApp Web ni lo vincules a otro sistema</strong>:
            WhatsApp corta la sesión por conflicto y hay que volver a escanear el QR.
          </li>
        </ul>
      </aside>

      {dialog && (
        <ConfirmDialog
          title={dialogProps[dialog.kind].title}
          description={`${dialogProps[dialog.kind].description} (${dialog.session.label})`}
          confirmLabel={dialogProps[dialog.kind].confirmLabel}
          tone="danger"
          busy={pending}
          onConfirm={confirmDialog}
          onClose={() => setDialog(null)}
        />
      )}

      {editing && (
        <SessionModal
          session={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            const res = await updateSessionAction(editing.id, input);
            if (res.ok) {
              setEditing(null);
              toast("success", "Cambios guardados.");
              await reload();
            }
            return res;
          }}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
