"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import { RolePicker } from "./RolePicker";
import type { ActionResult, RoleOption } from "./types";

type Props = {
  roles: RoleOption[];
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    email: string;
    password: string;
    roleIds: string[];
  }) => Promise<ActionResult<{ id: string }>>;
};

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function CreateUserModal({ roles, onClose, onSubmit }: Props) {
  const [dni, setDni] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dniStatus, setDniStatus] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [topError, setTopError] = useState<string | null>(null);

  const autoFilledNameRef = useRef<string>("");

  useEscClose(true, onClose, submitting);

  // Consulta automática de DNI al ingresar 8 dígitos
  useEffect(() => {
    const cleanDni = dni.trim().replace(/\D/g, "");
    if (cleanDni.length !== 8) {
      setDniStatus("idle");
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setDniStatus("loading");
      try {
        const res = await fetch(`/api/dni/${cleanDni}`, { signal: ctrl.signal });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.ok && typeof json.name === "string" && json.name) {
          const resolvedName = json.name;
          setDniStatus("found");
          // Si el nombre no ha sido editado manualmente, auto-llenarlo
          setName((prev) => (!prev.trim() || prev === autoFilledNameRef.current ? resolvedName : prev));
          autoFilledNameRef.current = resolvedName;

          // Sugerir la contraseña predeterminada como el DNI si aún no se ha escrito una
          setPassword((prev) => (!prev.trim() ? cleanDni : prev));

          // Si el correo está vacío, sugerir correo predeterminado del DNI
          setEmail((prev) => (!prev.trim() ? `${cleanDni}@ahoranacion.pe` : prev));
        } else if (res.status === 404) {
          setDniStatus("notfound");
        } else {
          setDniStatus("error");
        }
      } catch (err: unknown) {
        if (!ctrl.signal.aborted) {
          setDniStatus("error");
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [dni]);

  const valid =
    name.trim().length >= 2 &&
    EMAIL_RE.test(email.trim().toLowerCase()) &&
    password.length >= 6;

  const onSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setTopError(null);
    setFieldErrors({});

    const res = await onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      roleIds,
    });

    if (!res.ok) {
      setTopError(res.error ?? "No se pudo crear el usuario.");
      setFieldErrors(res.fieldErrors ?? {});
      setSubmitting(false);
      return;
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmitForm}>
        <header className="modal__head">
          <h2>Crear usuario</h2>
          <button
            type="button"
            className="iconbtn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal__body">
          <p className="modal__intro">
            Ingresa los datos del usuario. Puedes buscarlo por su DNI para autocompletar su nombre, y asignar cualquier correo electrónico personal o institucional.
          </p>

          {topError && (
            <div
              className="login__error"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              <Icon name="info" size={16} />
              <span>{topError}</span>
            </div>
          )}

          {/* Campo DNI con consulta en tiempo real */}
          <label className="field">
            <span
              className="field__label"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>DNI (8 dígitos) — Consulta rápida</span>
              {dniStatus === "loading" && (
                <span style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                  Consultando padrón…
                </span>
              )}
              {dniStatus === "found" && (
                <span style={{ fontSize: 12, color: "#15803d", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="check" size={14} /> Persona identificada
                </span>
              )}
              {dniStatus === "notfound" && (
                <span style={{ fontSize: 12, color: "#b45309" }}>
                  DNI no encontrado en padrón
                </span>
              )}
              {dniStatus === "error" && (
                <span style={{ fontSize: 12, color: "#b91c1c" }}>
                  Servicio de DNI no disponible
                </span>
              )}
            </span>
            <input
              type="text"
              autoFocus
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Ingresa 8 dígitos para autocompletar el nombre"
            />
          </label>

          {/* Campo Nombre completo */}
          <label className="field">
            <span className="field__label">
              Nombre completo<span className="field__req">*</span>
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. María Salas Yáñez"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <span style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
                {fieldErrors.name}
              </span>
            )}
          </label>

          {/* Campo Correo electrónico libre */}
          <label className="field">
            <span className="field__label">
              Correo electrónico<span className="field__req">*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="p. ej. persona@gmail.com o maria@ahoranacion.pe"
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <span style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
                {fieldErrors.email}
              </span>
            )}
          </label>

          {/* Campo Contraseña inicial */}
          <label className="field">
            <span
              className="field__label"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                Contraseña inicial<span className="field__req">*</span>
              </span>
              <button
                type="button"
                className="linkbtn"
                onClick={() => setShowPassword((v) => !v)}
                style={{ padding: "2px 6px", fontSize: 11.5 }}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              aria-invalid={!!fieldErrors.password}
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <span style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
                {fieldErrors.password}
              </span>
            )}
          </label>

          {/* Selector de Roles */}
          <div style={{ marginTop: 8 }}>
            <div className="field__label" style={{ marginBottom: 8 }}>
              Roles asignados
            </div>
            <RolePicker
              roles={roles}
              selected={roleIds}
              onChange={setRoleIds}
              disabled={submitting}
            />
          </div>
        </div>
        <footer className="modal__foot">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!valid || submitting}
          >
            {submitting ? "Creando…" : "Crear usuario"}
          </button>
        </footer>
      </form>
    </div>
  );
}
