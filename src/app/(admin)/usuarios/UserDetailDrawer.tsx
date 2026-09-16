"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/admin/Icon";
import { avatarColor, initialsFor } from "@/lib/ui/avatar";
import {
  formatDateOnly,
  formatFullDate,
  formatRelative,
} from "@/lib/ui/dates";
import { DISTRICTS, districtLabel } from "@/lib/districts";
import { useEscClose } from "@/lib/ui/useEscClose";
import { ConfirmDialog } from "./ConfirmDialog";
import { RolePicker } from "./RolePicker";
import type { ActionResult, PermFlags, RoleOption, UserRow, ScopeType, LocalSummary } from "./types";

type Tab = "profile" | "territorio" | "roles" | "security";

type Props = {
  user: UserRow;
  roles: RoleOption[];
  locales?: LocalSummary[];
  perms: PermFlags;
  isSelf: boolean;
  onClose: () => void;
  onUpdateProfile: (input: {
    name: string;
    email?: string;
    dni?: string | null;
    phone?: string | null;
  }) => Promise<ActionResult>;
  onToggleActive: (active: boolean) => Promise<ActionResult>;
  onSetRoles: (roleIds: string[]) => Promise<ActionResult>;
  onSetScope?: (input: {
    scopeType: ScopeType;
    assignedProvince?: string | null;
    assignedDistrict?: string | null;
    assignedLocalId?: string | null;
  }) => Promise<ActionResult>;
  onSetPassword: (
    password: string,
  ) => Promise<ActionResult<{ sessionsRevoked: number }>>;
  onRevokeSessions: () => Promise<ActionResult<{ count: number }>>;
  onDelete: () => Promise<ActionResult>;
};

export function UserDetailDrawer({
  user,
  roles,
  locales = [],
  perms,
  isSelf,
  onClose,
  onUpdateProfile,
  onToggleActive,
  onSetRoles,
  onSetScope,
  onSetPassword,
  onRevokeSessions,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<Tab>("profile");

  // Profile
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [dni, setDni] = useState(user.dni || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [nameDirty, setNameDirty] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [profileSaving, setProfileSaving] = useState(false);

  // DNI Lookup
  const [dniStatus, setDniStatus] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [dniFoundName, setDniFoundName] = useState<string | null>(null);

  // Roles
  const [roleIds, setRoleIds] = useState<string[]>(user.roles.map((r) => r.id));
  const [rolesDirty, setRolesDirty] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesSaving, setRolesSaving] = useState(false);

  // Territorial Scope
  const [scopeType, setScopeType] = useState<ScopeType>(user.scopeType || "departamental");
  const [assignedProvince, setAssignedProvince] = useState<string>(user.assignedProvince || "Tambopata");
  const [assignedDistrict, setAssignedDistrict] = useState<string>(user.assignedDistrict || "tambopata");
  const [assignedLocalId, setAssignedLocalId] = useState<string>(user.assignedLocalId || locales[0]?.id || "");
  const [scopeDirty, setScopeDirty] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [localSearch, setLocalSearch] = useState<string>("");

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

  // Security
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySaving, setSecuritySaving] = useState(false);

  // Active toggle
  const [activeBusy, setActiveBusy] = useState(false);

  // Delete (with confirm dialog)
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const busy =
    profileSaving ||
    rolesSaving ||
    scopeSaving ||
    securitySaving ||
    activeBusy ||
    deleting ||
    confirmingDelete;
  useEscClose(true, onClose, busy);

  // H8: hydration-safe dates — only render relative after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // H5: only resync when the *user identity* changes. Pending edits survive
  // a router.refresh() triggered by sibling mutations.
  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setDni(user.dni || "");
    setPhone(user.phone || "");
    setRoleIds(user.roles.map((r) => r.id));
    setScopeType(user.scopeType || "departamental");
    setAssignedProvince(user.assignedProvince || "Tambopata");
    setAssignedDistrict(user.assignedDistrict || "tambopata");
    setAssignedLocalId(user.assignedLocalId || locales[0]?.id || "");
    setNameDirty(false);
    setRolesDirty(false);
    setScopeDirty(false);
    setPassword("");
    setShowPassword(false);
    setProfileError(null);
    setFieldErrors({});
    setDniStatus("idle");
    setDniFoundName(null);
    setRolesError(null);
    setScopeError(null);
    setSecurityError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.name, user.email, user.dni, user.phone, user.scopeType, user.assignedProvince, user.assignedDistrict, user.assignedLocalId]);

  const canEdit = perms.canWrite;
  const canAssignRoles = perms.canAssignRoles;
  const cannotTouchSelf = isSelf;

  const isProfileChanged =
    name.trim() !== user.name.trim() ||
    email.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
    (dni.trim() || null) !== (user.dni || null) ||
    (phone.trim() || null) !== (user.phone || null);

  const handleLookupDni = async () => {
    const cleanDni = dni.trim().replace(/\D/g, "");
    if (cleanDni.length !== 8) {
      setDniStatus("error");
      return;
    }
    setDniStatus("loading");
    setDniFoundName(null);
    try {
      const res = await fetch(`/api/dni/${cleanDni}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.name) {
        setDniStatus("found");
        setDniFoundName(json.name);
      } else if (res.status === 404) {
        setDniStatus("notfound");
      } else {
        setDniStatus("error");
      }
    } catch {
      setDniStatus("error");
    }
  };

  const saveProfile = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    setFieldErrors({});
    const cleanDni = dni.trim() ? dni.trim().replace(/\D/g, "") : null;
    const cleanPhone = phone.trim() ? phone.trim() : null;
    const res = await onUpdateProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      dni: cleanDni,
      phone: cleanPhone,
    });
    if (!res.ok) {
      setProfileError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    } else {
      setNameDirty(false);
    }
    setProfileSaving(false);
  };

  const saveRoles = async () => {
    if (rolesSaving) return;
    setRolesSaving(true);
    setRolesError(null);
    const res = await onSetRoles(roleIds);
    if (!res.ok) {
      setRolesError(res.error);
    } else {
      setRolesDirty(false);
    }
    setRolesSaving(false);
  };

  const saveScope = async () => {
    if (!onSetScope || scopeSaving) return;
    setScopeSaving(true);
    setScopeError(null);
    const res = await onSetScope({
      scopeType,
      assignedProvince: scopeType === "provincial" ? assignedProvince : null,
      assignedDistrict: scopeType === "distrital" ? assignedDistrict : null,
      assignedLocalId: scopeType === "local" ? assignedLocalId : null,
    });
    if (!res.ok) {
      setScopeError(res.error);
    } else {
      setScopeDirty(false);
    }
    setScopeSaving(false);
  };

  const setPasswordNow = async () => {
    if (securitySaving) return;
    if (password.length < 6) {
      setSecurityError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSecuritySaving(true);
    setSecurityError(null);
    const res = await onSetPassword(password);
    if (!res.ok) setSecurityError(res.error);
    else setPassword("");
    setSecuritySaving(false);
  };

  const toggleActive = async () => {
    if (activeBusy) return;
    setActiveBusy(true);
    await onToggleActive(!user.active);
    setActiveBusy(false);
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const res = await onDelete();
    setDeleting(false);
    setConfirmingDelete(false);
    if (res.ok) onClose();
  };

  const handleRevokeSessions = async () => {
    await onRevokeSessions();
  };

  const lastLoginAbs = user.lastLoginAt
    ? formatFullDate(user.lastLoginAt)
    : "";
  const createdAbs = formatFullDate(user.createdAt);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 480 }}
      >
        <header className="drawer__head">
          <div style={{ display: "flex", gap: 14, minWidth: 0, flex: 1 }}>
            <div
              className="usr-avatar"
              style={{
                width: 48,
                height: 48,
                fontSize: 16,
                background: avatarColor(user.id),
              }}
            >
              {initialsFor(user.name)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="drawer__eyebrow">Usuario</div>
              <h2 style={{ margin: "0 0 4px" }}>{user.name}</h2>
              <div className="drawer__email">
                <Icon name="mail" size={14} />
                {user.email}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span
                  className={`badge ${
                    user.active ? "badge--green" : "badge--neutral"
                  }`}
                >
                  {user.active ? "Activo" : "Suspendido"}
                </span>
                {user.dni && (
                  <span className="badge badge--neutral" style={{ fontWeight: 600 }}>
                    🪪 {user.dni}
                  </span>
                )}
                {user.phone && (
                  <span className="badge badge--neutral">
                    📞 {user.phone}
                  </span>
                )}
                {isSelf && (
                  <span className="badge badge--accent">Tú</span>
                )}
              </div>
            </div>
          </div>
          <button
            className="iconbtn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="drawer__stats">
          <div className="stat">
            <div className="stat__v">{user.roles.length}</div>
            <div className="stat__l">Roles</div>
          </div>
          <div className="stat" title={mounted ? lastLoginAbs : undefined}>
            <div className="stat__v" style={{ fontSize: 14 }}>
              {mounted
                ? formatRelative(user.lastLoginAt)
                : formatDateOnly(user.lastLoginAt)}
            </div>
            <div className="stat__l">Último acceso</div>
          </div>
          <div className="stat" title={mounted ? createdAbs : undefined}>
            <div className="stat__v" style={{ fontSize: 14 }}>
              {mounted
                ? formatRelative(user.createdAt)
                : formatDateOnly(user.createdAt)}
            </div>
            <div className="stat__l">Creado</div>
          </div>
        </div>

        <div className="usr-drawer-tabs">
          <button
            className={`usr-drawer-tab ${tab === "profile" ? "is-active" : ""}`}
            onClick={() => setTab("profile")}
          >
            Perfil
          </button>
          <button
            className={`usr-drawer-tab ${tab === "territorio" ? "is-active" : ""}`}
            onClick={() => setTab("territorio")}
          >
            Jurisdicción
          </button>
          <button
            className={`usr-drawer-tab ${tab === "roles" ? "is-active" : ""}`}
            onClick={() => setTab("roles")}
          >
            Roles
          </button>
          <button
            className={`usr-drawer-tab ${tab === "security" ? "is-active" : ""}`}
            onClick={() => setTab("security")}
          >
            Seguridad
          </button>
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
          {tab === "profile" && (
            <div className="usr-formgrid">
              {profileError && (
                <div className="login__error">
                  <Icon name="info" size={16} />
                  <span>{profileError}</span>
                </div>
              )}

              {/* DNI */}
              <label className="field" style={{ margin: 0 }}>
                <span className="field__label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>DNI (8 dígitos)</span>
                  {dniStatus === "loading" && (
                    <span style={{ fontSize: 12, color: "var(--accent)" }}>Consultando padrón…</span>
                  )}
                  {dniStatus === "notfound" && (
                    <span style={{ fontSize: 12, color: "#b45309" }}>No encontrado en padrón</span>
                  )}
                  {dniStatus === "error" && (
                    <span style={{ fontSize: 12, color: "#b91c1c" }}>Error al consultar</span>
                  )}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    maxLength={8}
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
                      setNameDirty(true);
                      setDniStatus("idle");
                      setDniFoundName(null);
                    }}
                    placeholder="8 dígitos numéricos"
                    disabled={!canEdit || profileSaving}
                    aria-invalid={!!fieldErrors.dni}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: 12 }}
                    onClick={handleLookupDni}
                    disabled={!canEdit || profileSaving || dni.trim().replace(/\D/g, "").length !== 8 || dniStatus === "loading"}
                  >
                    <Icon name="search" size={14} />
                    <span>Consultar</span>
                  </button>
                </div>
                {fieldErrors.dni && (
                  <span style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
                    {fieldErrors.dni}
                  </span>
                )}
                {dniStatus === "found" && dniFoundName && (
                  <div style={{
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    fontSize: 12.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}>
                    <span style={{ color: "#166534" }}>
                      Padrón: <b>{dniFoundName}</b>
                    </span>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      style={{ fontSize: 11, padding: "2px 8px", height: 26 }}
                      onClick={() => {
                        setName(dniFoundName);
                        setNameDirty(true);
                      }}
                    >
                      Usar nombre
                    </button>
                  </div>
                )}
              </label>

              {/* Nombre completo */}
              <label className="field" style={{ margin: 0 }}>
                <span className="field__label">
                  Nombre completo<span className="field__req">*</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameDirty(true);
                  }}
                  disabled={!canEdit || profileSaving}
                  aria-invalid={!!fieldErrors.name}
                />
                {fieldErrors.name && (
                  <span style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
                    {fieldErrors.name}
                  </span>
                )}
              </label>

              {/* Correo electrónico */}
              <label className="field" style={{ margin: 0 }}>
                <span className="field__label">
                  Correo electrónico<span className="field__req">*</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setNameDirty(true);
                  }}
                  disabled={!canEdit || profileSaving}
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && (
                  <span style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
                    {fieldErrors.email}
                  </span>
                )}
              </label>

              {/* Teléfono / WhatsApp */}
              <label className="field" style={{ margin: 0 }}>
                <span className="field__label">Teléfono / WhatsApp</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setNameDirty(true);
                  }}
                  placeholder="p. ej. 987654321"
                  disabled={!canEdit || profileSaving}
                />
              </label>

              {/* Switch cuenta activa */}
              <div className="usr-toggle">
                <div>
                  <div className="usr-toggle__label">Cuenta activa</div>
                  <div className="usr-toggle__sub">
                    {user.active
                      ? "Puede iniciar sesión y recibir correos."
                      : "El acceso está suspendido."}
                    {cannotTouchSelf && " No puedes suspender tu propia cuenta."}
                  </div>
                </div>
                <button
                  className={`usr-switch ${user.active ? "is-on" : ""}`}
                  onClick={toggleActive}
                  disabled={!canEdit || cannotTouchSelf || activeBusy}
                  aria-label="Activar/Suspender"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn--primary"
                  onClick={saveProfile}
                  disabled={
                    !canEdit ||
                    profileSaving ||
                    !isProfileChanged ||
                    name.trim().length < 2 ||
                    !email.trim().includes("@") ||
                    (dni.trim().length > 0 && dni.trim().replace(/\D/g, "").length !== 8)
                  }
                >
                  {profileSaving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}

          {tab === "territorio" && (
            <div className="usr-formgrid">
              {scopeError && (
                <div className="login__error">
                  <Icon name="info" size={16} />
                  <span>{scopeError}</span>
                </div>
              )}

              <div style={{ padding: "14px 16px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <div className="field__label" style={{ marginBottom: 6, fontWeight: 600 }}>
                  Ámbito Territorial Asignado
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  Controla qué colegios, mesas electorales, actas y personeros puede ver y gestionar este usuario.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 14 }}>
                  <button
                    type="button"
                    className={`usr-filter ${scopeType === "departamental" ? "is-on" : ""}`}
                    style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                    onClick={() => { setScopeType("departamental"); setScopeDirty(true); }}
                    disabled={!canEdit}
                  >
                    🏛️ Departamental (Todo)
                  </button>
                  <button
                    type="button"
                    className={`usr-filter ${scopeType === "provincial" ? "is-on" : ""}`}
                    style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                    onClick={() => { setScopeType("provincial"); setScopeDirty(true); }}
                    disabled={!canEdit}
                  >
                    🗺️ Provincial
                  </button>
                  <button
                    type="button"
                    className={`usr-filter ${scopeType === "distrital" ? "is-on" : ""}`}
                    style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                    onClick={() => { setScopeType("distrital"); setScopeDirty(true); }}
                    disabled={!canEdit}
                  >
                    📍 Distrital
                  </button>
                  <button
                    type="button"
                    className={`usr-filter ${scopeType === "local" ? "is-on" : ""}`}
                    style={{ justifyContent: "center", height: 32, fontSize: 12 }}
                    onClick={() => { setScopeType("local"); setScopeDirty(true); }}
                    disabled={!canEdit}
                  >
                    🏫 Colegio / Local
                  </button>
                </div>

                {scopeType === "provincial" && (
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span className="field__label">Provincia asignada</span>
                    <select
                      value={assignedProvince}
                      onChange={(e) => { setAssignedProvince(e.target.value); setScopeDirty(true); }}
                      disabled={!canEdit}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}
                    >
                      {["Tambopata", "Manu", "Tahuamanu"].map((p) => (
                        <option key={p} value={p}>Provincia de {p}</option>
                      ))}
                    </select>
                  </label>
                )}

                {scopeType === "distrital" && (
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span className="field__label">Distrito asignado</span>
                    <select
                      value={assignedDistrict}
                      onChange={(e) => { setAssignedDistrict(e.target.value); setScopeDirty(true); }}
                      disabled={!canEdit}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>{d.label} ({d.province})</option>
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
                      <span className="field__label">Colegio seleccionado</span>
                      <select
                        value={assignedLocalId}
                        onChange={(e) => { setAssignedLocalId(e.target.value); setScopeDirty(true); }}
                        disabled={!canEdit}
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

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn--primary"
                  onClick={saveScope}
                  disabled={!canEdit || scopeSaving || !scopeDirty}
                >
                  {scopeSaving ? "Guardando…" : "Guardar jurisdicción"}
                </button>
              </div>
            </div>
          )}

          {tab === "roles" && (
            <div className="usr-formgrid">
              {rolesError && (
                <div className="login__error">
                  <Icon name="info" size={16} />
                  <span>{rolesError}</span>
                </div>
              )}
              {!canAssignRoles && (
                <div
                  style={{
                    background: "var(--bg-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: "var(--text-muted)",
                  }}
                >
                  Solo puedes ver los roles asignados — necesitas el permiso{" "}
                  <code>users.assign-roles</code> para modificarlos.
                </div>
              )}
              <RolePicker
                roles={roles}
                selected={roleIds}
                onChange={(next) => {
                  setRoleIds(next);
                  setRolesDirty(true);
                }}
                disabled={!canAssignRoles || rolesSaving}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn--primary"
                  onClick={saveRoles}
                  disabled={
                    !canAssignRoles ||
                    rolesSaving ||
                    !rolesDirty ||
                    sameSet(
                      roleIds,
                      user.roles.map((r) => r.id),
                    )
                  }
                >
                  {rolesSaving ? "Guardando…" : "Guardar roles"}
                </button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="usr-formgrid">
              {securityError && (
                <div className="login__error">
                  <Icon name="info" size={16} />
                  <span>{securityError}</span>
                </div>
              )}
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Establecer nueva contraseña</span>
                  <button
                    className="linkbtn"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{ padding: "2px 6px", fontSize: 11.5 }}
                    disabled={securitySaving}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <label className="field" style={{ margin: 0 }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="mínimo 6 caracteres"
                    disabled={!canEdit || securitySaving}
                    autoComplete="new-password"
                  />
                </label>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 6,
                  }}
                >
                  Al cambiar la contraseña se cerrarán todas las sesiones
                  activas {isSelf ? "(excepto la actual)" : "del usuario"}.
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn btn--primary"
                    onClick={setPasswordNow}
                    disabled={!canEdit || securitySaving || password.length < 6}
                  >
                    {securitySaving ? "Aplicando…" : "Aplicar contraseña"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 16,
                  marginTop: 4,
                }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}
                >
                  Sesiones activas
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Cerrar todas las sesiones obliga al usuario a iniciar sesión de
                  nuevo en todos sus dispositivos
                  {isSelf ? " (la actual se preserva)" : ""}.
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn btn--ghost"
                    onClick={handleRevokeSessions}
                    disabled={!canEdit}
                  >
                    Cerrar todas las sesiones
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="drawer__foot">
          <button
            className="btn btn--ghost"
            style={{ color: "#b91c1c" }}
            onClick={() => setConfirmingDelete(true)}
            disabled={!canEdit || cannotTouchSelf || deleting}
            title={
              cannotTouchSelf
                ? "No puedes eliminar tu propia cuenta"
                : undefined
            }
          >
            {deleting ? "Eliminando…" : "Eliminar usuario"}
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </aside>

      {confirmingDelete && (
        <ConfirmDialog
          title={`Eliminar a ${user.name}`}
          description={
            <>
              Esta acción es <b>irreversible</b>. Se eliminarán las sesiones del
              usuario, sus asignaciones de rol y su cuenta. Esta acción no se
              puede deshacer.
            </>
          }
          confirmLabel="Eliminar definitivamente"
          tone="danger"
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onClose={() => !deleting && setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}
