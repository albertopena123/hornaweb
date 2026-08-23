"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import "./anuncios.css";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../usuarios/Toasts";
import { useEscClose } from "@/lib/ui/useEscClose";
import { formatFullDate } from "@/lib/ui/dates";
import { STATUS_LABEL, type AnnouncementPublic, type AnnouncementStatus } from "@/lib/announcements";
import AnnouncementModal from "@/components/landing/ui/AnnouncementModal";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  setAnnouncementPublished,
} from "./actions";
import type { AnnouncementRow, PermFlags, ActionResult } from "./types";

const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  live: "badge--green",
  scheduled: "badge--amber",
  expired: "badge--gray",
  draft: "badge--neutral",
};

// formatFullDate fija la zona America/Lima, así el SSR y el navegador coinciden.
// Aquí una fecha vacía significa "sin límite", no el "Nunca" que devuelve el helper.
function fmtDate(iso: string | null): string {
  return iso ? formatFullDate(iso) : "—";
}

// ISO (UTC) → valor para <input type="datetime-local"> en hora local.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// datetime-local (hora local del admin) → ISO-8601 en UTC, lo único que acepta el servidor.
function toIso(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function AnunciosClient({ rows, perms }: { rows: AnnouncementRow[]; perms: PermFlags }) {
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; row: AnnouncementRow }>(null);
  const [preview, setPreview] = useState<AnnouncementPublic | null>(null);
  const [toDelete, setToDelete] = useState<AnnouncementRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  return (
    <div className="anuncios">
      <header className="anuncios__head">
        <div>
          <h1>Avisos</h1>
          <p className="anuncios__sub">
            Se muestran en un modal al entrar a la página principal. Solo se muestra el aviso vigente más reciente.
          </p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setModal({ mode: "create" })}>
            <Icon name="plus" size={16} /> Nuevo aviso
          </button>
        )}
      </header>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th></th>
                <th>Aviso</th>
                <th>Estado</th>
                <th>Vigencia</th>
                <th>Creado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="anuncios__empty">
                    <Icon name="bell" size={22} />
                    <span>Aún no hay avisos. Crea el primero.</span>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="anuncios__thumb" src={r.imageUrl} alt="" />
                    ) : (
                      <div className="anuncios__thumb anuncios__thumb--empty">
                        <Icon name="bell" size={18} />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="anuncios__title">{r.title}</div>
                    <div className="anuncios__body">{r.body}</div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className="anuncios__dates">
                    <div>Desde: {fmtDate(r.startsAt)}</div>
                    <div>Hasta: {fmtDate(r.endsAt)}</div>
                  </td>
                  <td>{r.createdByName ?? <span className="dtable__muted">—</span>}</td>
                  <td>
                    <div className="anuncios__actions">
                      <button
                        className="iconbtn"
                        title="Vista previa"
                        onClick={() =>
                          setPreview({
                            id: r.id,
                            title: r.title,
                            body: r.body,
                            imageUrl: r.imageUrl,
                            ctaLabel: r.ctaLabel,
                            ctaUrl: r.ctaUrl,
                          })
                        }
                      >
                        <Icon name="eye" size={16} />
                      </button>
                      {perms.canWrite && (
                        <>
                          <button
                            className="btn btn--ghost btn--sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setAnnouncementPublished(r.id, !r.published),
                                r.published ? "Aviso despublicado." : "Aviso publicado.",
                              )
                            }
                          >
                            {r.published ? "Despublicar" : "Publicar"}
                          </button>
                          <button className="iconbtn" title="Editar" onClick={() => setModal({ mode: "edit", row: r })}>
                            <Icon name="settings" size={16} />
                          </button>
                          <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                            <Icon name="trash" size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>
            {rows.length} aviso{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {modal && (
        <AnuncioModal
          initial={modal.mode === "edit" ? modal.row : null}
          onClose={() => setModal(null)}
          onPreview={setPreview}
          previewOpen={preview !== null}
          onSubmit={async (fd) => {
            const res =
              modal.mode === "edit" ? await updateAnnouncement(modal.row.id, fd) : await createAnnouncement(fd);
            if (res.ok) {
              toast("success", modal.mode === "edit" ? "Aviso actualizado." : "Aviso creado.");
              setModal(null);
            }
            return res;
          }}
        />
      )}

      {preview && <AnnouncementModal preview={preview} onClose={() => setPreview(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar aviso"
          description={
            <>
              Se eliminará <strong>{toDelete.title}</strong> y su imagen. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            const res = await deleteAnnouncement(toDelete.id);
            if (res.ok) toast("success", "Aviso eliminado.");
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

function AnuncioModal({
  initial,
  onClose,
  onPreview,
  previewOpen,
  onSubmit,
}: {
  initial: AnnouncementRow | null;
  onClose: () => void;
  onPreview: (a: AnnouncementPublic) => void;
  previewOpen: boolean;
  onSubmit: (fd: FormData) => Promise<ActionResult<unknown>>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt ?? null));
  const [published, setPublished] = useState(initial?.published ?? true);
  // Imagen elegida en este formulario, junto a su object URL para la miniatura.
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  // Con la vista previa encima, Escape debe cerrarla a ella y no descartar el formulario.
  useEscClose(!previewOpen, onClose, busy);

  // El object URL vivo se libera al reemplazarlo y al cerrar el modal.
  const pickedUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (pickedUrl.current) URL.revokeObjectURL(pickedUrl.current);
    },
    [],
  );

  function pickImage(file: File | null) {
    if (pickedUrl.current) URL.revokeObjectURL(pickedUrl.current);
    pickedUrl.current = file ? URL.createObjectURL(file) : null;
    setPicked(file && pickedUrl.current ? { file, url: pickedUrl.current } : null);
    setRemoveImage(false);
  }

  function clearImage() {
    if (pickedUrl.current) URL.revokeObjectURL(pickedUrl.current);
    pickedUrl.current = null;
    setPicked(null);
    setRemoveImage(true);
  }

  const shownImage = picked?.url ?? (removeImage ? null : initial?.imageUrl ?? null);
  const errStyle = { color: "#b91c1c", fontSize: 12, marginTop: 4 } as const;
  const hintMuted = { color: "#7a8699", fontSize: 12, marginTop: 4 } as const;

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("ctaLabel", ctaLabel);
    fd.set("ctaUrl", ctaUrl);
    fd.set("startsAt", toIso(startsAt));
    fd.set("endsAt", toIso(endsAt));
    if (published) fd.set("published", "1");
    if (picked) fd.set("image", picked.file);
    else if (removeImage) fd.set("removeImage", "1");
    return fd;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    try {
      const res = await onSubmit(buildFormData());
      if (!res.ok) {
        setTopError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    } catch (err) {
      // Una Server Action puede lanzar (p. ej. cuerpo mayor al límite configurado de 4 MB).
      console.error("AnuncioModal submit", err);
      setTopError("No se pudo guardar. Si subiste una imagen, prueba con una más liviana (máx. 3 MB).");
    }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && !previewOpen && onClose()}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>{initial ? "Editar aviso" : "Nuevo aviso"}</h2>
          <button type="button" className="iconbtn" onClick={onClose} disabled={busy} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal__body">
          {topError && (
            <div className="login__error" role="alert" style={{ marginBottom: 16 }}>
              <Icon name="info" size={16} />
              <span>{topError}</span>
            </div>
          )}

          <label className="field">
            <span className="field__label">
              Título<span className="field__req">*</span>
            </span>
            <input
              type="text"
              autoFocus
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!fieldErrors.title}
            />
            {fieldErrors.title && <span style={errStyle}>{fieldErrors.title}</span>}
          </label>

          <label className="field">
            <span className="field__label">
              Texto<span className="field__req">*</span>
            </span>
            <textarea
              value={body}
              maxLength={1000}
              rows={4}
              onChange={(e) => setBody(e.target.value)}
              aria-invalid={!!fieldErrors.body}
            />
            <span style={hintMuted}>{body.length}/1000</span>
            {fieldErrors.body && <span style={errStyle}>{fieldErrors.body}</span>}
          </label>

          <div className="field">
            <span className="field__label">Imagen (afiche)</span>
            <div className="anuncios__imgfield">
              {shownImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="anuncios__imgprev" src={shownImage} alt="" />
              ) : (
                <div className="anuncios__imgprev anuncios__thumb--empty">
                  <Icon name="bell" size={22} />
                </div>
              )}
              <div className="anuncios__imgbtns">
                <label className="btn btn--ghost btn--sm">
                  {shownImage ? "Cambiar imagen" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="anuncios__file"
                    onChange={(e) => {
                      pickImage(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {shownImage && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={clearImage}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <span style={hintMuted}>JPG, PNG o WebP, máximo 3 MB. Recomendado: vertical o cuadrada.</span>
            {fieldErrors.image && <span style={errStyle}>{fieldErrors.image}</span>}
          </div>

          <div className="anuncios__row">
            <label className="field">
              <span className="field__label">Texto del botón</span>
              <input
                type="text"
                value={ctaLabel}
                maxLength={40}
                placeholder="Ej. Cómo llegar"
                onChange={(e) => setCtaLabel(e.target.value)}
                aria-invalid={!!fieldErrors.ctaLabel}
              />
              {fieldErrors.ctaLabel && <span style={errStyle}>{fieldErrors.ctaLabel}</span>}
            </label>
            <label className="field">
              <span className="field__label">Enlace del botón</span>
              {/* type="text": el servidor también acepta rutas internas como /personeros, que un type="url" bloquearía. */}
              <input
                type="text"
                inputMode="url"
                value={ctaUrl}
                placeholder="https://… o /personeros"
                onChange={(e) => setCtaUrl(e.target.value)}
                aria-invalid={!!fieldErrors.ctaUrl}
              />
              {fieldErrors.ctaUrl && <span style={errStyle}>{fieldErrors.ctaUrl}</span>}
            </label>
          </div>

          <div className="anuncios__row">
            <label className="field">
              <span className="field__label">Mostrar desde</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                aria-invalid={!!fieldErrors.startsAt}
              />
              {fieldErrors.startsAt && <span style={errStyle}>{fieldErrors.startsAt}</span>}
            </label>
            <label className="field">
              <span className="field__label">Mostrar hasta</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                aria-invalid={!!fieldErrors.endsAt}
              />
              {fieldErrors.endsAt && <span style={errStyle}>{fieldErrors.endsAt}</span>}
            </label>
          </div>
          <span style={hintMuted}>Si dejas las fechas vacías, el aviso se muestra mientras esté publicado.</span>

          <label className="field field--check">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span>Publicado (visible en la página principal)</span>
          </label>
        </div>
        <footer className="modal__foot">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy || title.trim().length < 3}
            onClick={() =>
              onPreview({
                id: initial?.id ?? "preview",
                title,
                body,
                imageUrl: shownImage,
                ctaLabel: ctaLabel || null,
                ctaUrl: ctaUrl || null,
              })
            }
          >
            <Icon name="eye" size={16} /> Vista previa
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || title.trim().length < 3 || body.trim() === ""}
          >
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Crear aviso"}
          </button>
        </footer>
      </form>
    </div>
  );
}
