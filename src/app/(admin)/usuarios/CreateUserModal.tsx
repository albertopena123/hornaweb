"use client";

import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import { RolePicker } from "./RolePicker";
import { DISTRICTS } from "@/lib/districts";
import type { ActionResult, RoleOption, ScopeType, LocalSummary } from "./types";

type Props = {
  roles: RoleOption[];
  locales?: LocalSummary[];
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    email: string;
    password: string;
    dni?: string | null;
    phone?: string | null;
    roleIds: string[];
    scopeType: ScopeType;
    assignedProvince?: string | null;
    assignedDistrict?: string | null;
    assignedLocalId?: string | null;
  }) => Promise<ActionResult<{ id: string }>>;
};

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PROVINCES = ["Tambopata", "Manu", "Tahuamanu"] as const;

export function CreateUserModal({ roles, locales = [], onClose, onSubmit }: Props) {
  const [dni, setDni] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dniStatus, setDniStatus] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [topError, setTopError] = useState<string | null>(null);

  // Ámbito territorial
  const [scopeType, setScopeType] = useState<ScopeType>("departamental");
  const [assignedProvince, setAssignedProvince] = useState<string>("Tambopata");
  const [assignedDistrict, setAssignedDistrict] = useState<string>("tambopata");
  const [assignedLocalId, setAssignedLocalId] = useState<string>(locales[0]?.id || "");
  const [localSearch, setLocalSearch] = useState<string>("");

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

  // Si se selecciona un rol de coordinación específico, sugerir el scope automáticamente
  const handleRoleChange = (newRoleIds: string[]) => {
    setRoleIds(newRoleIds);
    const selectedRoles = roles.filter((r) => newRoleIds.includes(r.id));
    if (selectedRoles.some((r) => r.key === "coordinador_local")) {
      setScopeType("local");
    } else if (selectedRoles.some((r) => r.key === "coordinador_distrital")) {
      setScopeType("distrital");
    } else if (selectedRoles.some((r) => r.key === "coordinador_provincial")) {
      setScopeType("provincial");
    }
  };

  // Filtrado de colegios para búsqueda rápida
  const filteredLocales = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    let list = locales;
    if (q) {
      list = locales.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.district.toLowerCase().includes(q) ||
          l.province.toLowerCase().includes(q)
      );
    }
    if (assignedLocalId && !list.some((l) => l.id === assignedLocalId)) {
      const found = locales.find((l) => l.id === assignedLocalId);
      if (found) list = [found, ...list];
    }
    return list.slice(0, 50);
  }, [locales, localSearch, assignedLocalId]);

  const valid =
    name.trim().length >= 2 &&
    EMAIL_RE.test(email.trim().toLowerCase()) &&
    password.length >= 6 &&
    (scopeType !== "local" || !!assignedLocalId);

  const onSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setTopError(null);
    setFieldErrors({});

    const cleanDni = dni.trim().replace(/\D/g, "");
    const cleanPhone = phone.trim();

    const res = await onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      dni: cleanDni.length === 8 ? cleanDni : null,
      phone: cleanPhone ? cleanPhone : null,
      roleIds,
      scopeType,
      assignedProvince: scopeType === "provincial" ? assignedProvince : null,
      assignedDistrict: scopeType === "distrital" ? assignedDistrict : null,
      assignedLocalId: scopeType === "local" ? assignedLocalId : null,
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
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmitForm} style={{ maxWidth: 540 }}>
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
        <div className="modal__body" style={{ maxHeight: "calc(85vh - 120px)", overflowY: "auto" }}>
          <p className="modal__intro">
            Ingresa los datos del usuario. Puedes buscarlo por su DNI para autocompletar su nombre, y asignar su jurisdicción territorial.
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

          {/* Campo Teléfono / Celular */}
          <label className="field">
            <span className="field__label">
              Teléfono / WhatsApp (opcional)
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="p. ej. 987654321"
            />
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

          {/* ──────────────── SECCIÓN: ÁMBITO TERRITORIAL ──────────────── */}
          <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div className="field__label" style={{ marginBottom: 6, fontWeight: 600 }}>
              Ámbito Territorial / Responsabilidad
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
              Define qué colegios, mesas y personeros podrá ver y gestionar este usuario.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                className={`usr-filter ${scopeType === "departamental" ? "is-on" : ""}`}
                style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                onClick={() => setScopeType("departamental")}
              >
                🏛️ Departamental (Todo)
              </button>
              <button
                type="button"
                className={`usr-filter ${scopeType === "provincial" ? "is-on" : ""}`}
                style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                onClick={() => setScopeType("provincial")}
              >
                🗺️ Provincial
              </button>
              <button
                type="button"
                className={`usr-filter ${scopeType === "distrital" ? "is-on" : ""}`}
                style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                onClick={() => setScopeType("distrital")}
              >
                📍 Distrital
              </button>
              <button
                type="button"
                className={`usr-filter ${scopeType === "local" ? "is-on" : ""}`}
                style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                onClick={() => setScopeType("local")}
              >
                🏫 Colegio / Local
              </button>
            </div>

            {/* Sub-selector según el Scope */}
            {scopeType === "provincial" && (
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field__label">Provincia asignada</span>
                <select
                  value={assignedProvince}
                  onChange={(e) => setAssignedProvince(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      Provincia de {p}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {scopeType === "distrital" && (
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field__label">Distrito asignado</span>
                <select
                  value={assignedDistrict}
                  onChange={(e) => setAssignedDistrict(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.province})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {scopeType === "local" && (
              <div>
                <label className="field" style={{ marginBottom: 6 }}>
                  <span className="field__label">Buscar colegio / local</span>
                  <input
                    type="text"
                    placeholder="Filtrar por nombre o distrito…"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    style={{ fontSize: 12.5 }}
                  />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="field__label">Colegio seleccionado<span className="field__req">*</span></span>
                  <select
                    value={assignedLocalId}
                    onChange={(e) => setAssignedLocalId(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 12.5 }}
                  >
                    {filteredLocales.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {l.district.toUpperCase()} ({l.totalMesas} mesas)
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Selector de Roles */}
          <div style={{ marginTop: 12 }}>
            <div className="field__label" style={{ marginBottom: 8 }}>
              Roles asignados
            </div>
            <RolePicker
              roles={roles}
              selected={roleIds}
              onChange={handleRoleChange}
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
