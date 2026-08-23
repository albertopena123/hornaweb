"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { getSessionAction, getQrAction, startSessionAction, logoutSessionAction } from "./actions";
import type { SessionInfo, PermFlags, ActionResult } from "../types";

const STATUS_LABEL: Record<SessionInfo["status"], { text: string; badge: string }> = {
  STOPPED: { text: "Desconectado", badge: "badge--neutral" },
  STARTING: { text: "Iniciando…", badge: "badge--amber" },
  SCAN_QR_CODE: { text: "Escanea el código QR", badge: "badge--amber" },
  WORKING: { text: "Conectado", badge: "badge--green" },
  FAILED: { text: "Error en la sesión", badge: "badge--red" },
  UNKNOWN: { text: "Sin conexión con WAHA", badge: "badge--red" },
};

export function ConexionClient({ initial, perms }: { initial: SessionInfo; perms: PermFlags }) {
  const [info, setInfo] = useState<SessionInfo>(initial);
  const [qr, setQr] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  // Sondeo: cada 3 s mientras no esté conectado (para refrescar el QR), cada 15 s si está WORKING.
  useEffect(() => {
    let cancelled = false;
    const delay = info.status === "WORKING" ? 15_000 : 3_000;
    const t = setTimeout(async () => {
      const s = await getSessionAction();
      if (cancelled) return;
      if (s.status === "SCAN_QR_CODE") {
        const q = await getQrAction();
        if (!cancelled) setQr(q.ok ? (q.data?.dataUrl ?? null) : null);
      } else {
        setQr(null);
      }
      if (!cancelled) setInfo(s);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [info]);

  function run(action: () => Promise<ActionResult>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
      setInfo(await getSessionAction());
    });
  }

  const st = STATUS_LABEL[info.status];
  const canConnect = info.status === "STOPPED" || info.status === "FAILED" || info.status === "UNKNOWN";
  const canLogout = info.status === "WORKING" || info.status === "SCAN_QR_CODE" || info.status === "STARTING";

  return (
    <div className="mensajes__conn">
      <section className="mensajes__card">
        <div className="mensajes__status">
          <span className={`badge ${st.badge}`}>{st.text}</span>
          {info.me && (
            <span className="mensajes__muted">
              {info.me.pushName ? `${info.me.pushName} · ` : ""}+{info.me.id.replace(/@.*$/, "")}
            </span>
          )}
        </div>
        {info.error && (
          <div className="login__error" role="alert">
            <Icon name="info" size={16} />
            <span>{info.error}</span>
          </div>
        )}

        {info.status === "SCAN_QR_CODE" && (
          <div className="mensajes__qrbox">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL generada por WAHA
              <img className="mensajes__qr" src={qr} alt="Código QR para vincular WhatsApp" />
            ) : (
              <div className="mensajes__qr" aria-busy="true" />
            )}
            <p className="mensajes__muted">
              En el celular de campaña: WhatsApp → Menú (⋮) → <strong>Dispositivos vinculados</strong> →{" "}
              <strong>Vincular un dispositivo</strong> y escanea este código. Se actualiza solo.
            </p>
          </div>
        )}

        {info.status === "WORKING" && (
          <p className="mensajes__muted">El número está listo para enviar. Las campañas en curso continúan automáticamente.</p>
        )}

        {perms.canWrite && (
          <div className="mensajes__actions">
            {canConnect && (
              <button className="btn btn--primary" disabled={pending} onClick={() => run(startSessionAction, "Sesión iniciada. Escanea el QR.")}>
                <Icon name="plus" size={16} /> Conectar WhatsApp
              </button>
            )}
            {canLogout && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => setConfirmLogout(true)}>
                Cerrar sesión
              </button>
            )}
            <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(async () => setInfo(await getSessionAction()))}>
              Actualizar
            </button>
          </div>
        )}
      </section>

      <aside className="mensajes__card mensajes__warn">
        <strong>Riesgo de bloqueo del número</strong>
        <p className="mensajes__sub" style={{ margin: 0 }}>
          Este envío usa un cliente no oficial. Meta puede suspender el número aunque se respeten los límites.
        </p>
        <ul>
          <li>Usa un número dedicado a la campaña, con chip peruano y perfil completo (foto y nombre).</li>
          <li>«Caliéntalo» 1–2 semanas con conversaciones reales antes de la primera campaña.</li>
          <li>Tope diario bajo (≤150), pausas de 45–120 s y horario de 8:00 a 20:00.</li>
          <li>Si muchos destinatarios bloquean o reportan, pausa la campaña.</li>
        </ul>
      </aside>

      {confirmLogout && (
        <ConfirmDialog
          title="Cerrar sesión de WhatsApp"
          description="El número dejará de estar vinculado y las campañas en curso se pausarán. Tendrás que escanear el QR de nuevo."
          confirmLabel="Cerrar sesión"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            const res = await logoutSessionAction();
            if (res.ok) toast("success", "Sesión cerrada.");
            else toast("error", res.error);
            setConfirmLogout(false);
            setInfo(await getSessionAction());
          }}
          onClose={() => setConfirmLogout(false)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
