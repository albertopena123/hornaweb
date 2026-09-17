"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/components/admin/Icon";
import { avatarColor, initialsFor } from "@/lib/ui/avatar";
import { formatDateOnly, formatFullDate } from "@/lib/ui/dates";
import { ConfirmDialog } from "../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../usuarios/Toasts";
import {
  createRole,
  deleteRole,
  removeUserFromRole,
  setRolePermissions,
  updateRole,
} from "./actions";
import { CreateRoleModal } from "./CreateRoleModal";
import { categoryIcon } from "./category-icons";
import type {
  AvailablePermission,
  PermFlags,
  RoleRow,
} from "./types";
import "./roles.css";

type Tab = "permisos" | "usuarios" | "detalles";
type ListFilter = "all" | "system" | "custom";

function getRoleVisual(key: string, system: boolean): {
  icon: IconName;
  color: string;
  bg: string;
  badgeLabel: string;
  badgeClass: string;
} {
  if (key === "superadmin") {
    return {
      icon: "shield",
      color: "#e11d48",
      bg: "rgba(225, 29, 72, 0.12)",
      badgeLabel: "Superadmin",
      badgeClass: "badge badge--red",
    };
  }
  if (key === "admin") {
    return {
      icon: "settings",
      color: "#d97706",
      bg: "rgba(217, 119, 6, 0.12)",
      badgeLabel: "Administrador",
      badgeClass: "badge badge--amber",
    };
  }
  if (key === "coordinador_local_1") {
    return {
      icon: "home",
      color: "#059669",
      bg: "rgba(5, 150, 105, 0.12)",
      badgeLabel: "Colegio Titular",
      badgeClass: "badge badge--green",
    };
  }
  if (key === "coordinador_local_2") {
    return {
      icon: "home",
      color: "#0284c7",
      bg: "rgba(2, 132, 199, 0.12)",
      badgeLabel: "Colegio Adjunto",
      badgeClass: "badge badge--blue",
    };
  }
  if (key === "coordinador_distrital") {
    return {
      icon: "rules",
      color: "#7c3aed",
      bg: "rgba(124, 58, 237, 0.12)",
      badgeLabel: "Distrital",
      badgeClass: "badge badge--purple",
    };
  }
  if (key === "coordinador_departamental") {
    return {
      icon: "apps",
      color: "#be185d",
      bg: "rgba(190, 24, 93, 0.12)",
      badgeLabel: "Departamental",
      badgeClass: "badge badge--pink",
    };
  }
  if (key === "coordinador_provincial") {
    return {
      icon: "cloud",
      color: "#4f46e5",
      bg: "rgba(79, 70, 229, 0.12)",
      badgeLabel: "Provincial",
      badgeClass: "badge badge--indigo",
    };
  }
  if (key === "coordinador_territorial") {
    return {
      icon: "sparkle",
      color: "#0d9488",
      bg: "rgba(13, 148, 136, 0.12)",
      badgeLabel: "Territorial",
      badgeClass: "badge badge--teal",
    };
  }
  if (key === "personero") {
    return {
      icon: "id-card",
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.12)",
      badgeLabel: "Personero",
      badgeClass: "badge badge--green",
    };
  }
  if (key === "verificador") {
    return {
      icon: "eye",
      color: "#2563eb",
      bg: "rgba(37, 99, 235, 0.12)",
      badgeLabel: "Verificador",
      badgeClass: "badge badge--blue",
    };
  }
  if (key.includes("digitador")) {
    return {
      icon: "clock",
      color: "#ea580c",
      bg: "rgba(234, 88, 12, 0.12)",
      badgeLabel: "Digitador",
      badgeClass: "badge badge--amber",
    };
  }
  return {
    icon: system ? "shield" : "tag",
    color: system ? "var(--accent)" : "#6366f1",
    bg: system ? "var(--accent-soft)" : "rgba(99, 102, 241, 0.12)",
    badgeLabel: system ? "Sistema" : "Personalizado",
    badgeClass: system ? "badge badge--neutral" : "badge badge--blue",
  };
}

type Props = {
  rows: RoleRow[];
  available: AvailablePermission[];
  totalUsers: number;
  perms: PermFlags;
};

export function RolesView({ rows, available, totalUsers, perms }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // URL state
  const roleId = params.get("role");
  const tab: Tab =
    (params.get("tab") as Tab) === "usuarios"
      ? "usuarios"
      : (params.get("tab") as Tab) === "detalles"
        ? "detalles"
        : "permisos";

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [permSearch, setPermSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  type CreateInitial = {
    name?: string;
    key?: string;
    description?: string;
    permissionKeys?: string[];
    title?: string;
    subtitle?: string;
  };
  const [creating, setCreating] = useState<false | CreateInitial>(false);
  const [deletingRole, setDeletingRole] = useState<RoleRow | null>(null);
  const [removingUser, setRemovingUser] = useState<{
    role: RoleRow;
    userId: string;
    userName: string;
  } | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [busy, setBusy] = useState(false);

  // Inline permission editing state
  const [pendingPerms, setPendingPerms] = useState<Set<string> | null>(null);
  const isEditingPerms = pendingPerms !== null;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Mounted gate for hydration-safe date rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Filter + search the list
  const filtered = useMemo(() => {
    let out = rows;
    if (filter === "system") out = out.filter((r) => r.system);
    else if (filter === "custom") out = out.filter((r) => !r.system);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.key.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, search, filter]);

  // Resolve the active role; prefer the URL param, fallback to first.
  const active = useMemo(() => {
    if (roleId) {
      const found = rows.find((r) => r.id === roleId);
      if (found) return found;
    }
    return filtered[0] ?? rows[0] ?? null;
  }, [roleId, rows, filtered]);

  // Reset inline edits when switching role
  useEffect(() => {
    setPendingPerms(null);
    setEditingMeta(false);
    setPermSearch("");
    setUserSearch("");
  }, [active?.id]);

  // Sync draft meta with active role
  useEffect(() => {
    if (active) {
      setDraftName(active.name);
      setDraftDesc(active.description ?? "");
    }
  }, [active?.id, active?.name, active?.description]);

  const filteredRoleUsers = useMemo(() => {
    if (!active) return [];
    const q = userSearch.toLowerCase().trim();
    if (!q) return active.users;
    return active.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [active, userSearch]);

  const activeVisual = active ? getRoleVisual(active.key, active.system) : null;

  const totals = useMemo(
    () => ({
      total: rows.length,
      system: rows.filter((r) => r.system).length,
      custom: rows.filter((r) => !r.system).length,
    }),
    [rows],
  );

  // Group available permissions by category for the editor view
  const groupedAvailable = useMemo(() => {
    const map = new Map<string, AvailablePermission[]>();
    for (const p of available) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return [...map.entries()].map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.name.localeCompare(b.name, "es")),
    }));
  }, [available]);

  // Filter permissions by search term (in editor or view mode)
  const filterPerm = useCallback(
    (p: AvailablePermission) => {
      const q = permSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    },
    [permSearch],
  );

  // Which permission keys are currently granted (either committed or pending)
  const activeGranted = useMemo(() => {
    if (!active) return new Set<string>();
    if (pendingPerms) return pendingPerms;
    return new Set(active.permissions.map((p) => p.key));
  }, [active, pendingPerms]);

  const togglePerm = (key: string) => {
    if (!active || !perms.canWrite) return;
    setPendingPerms((prev) => {
      const current = prev ?? new Set(active.permissions.map((p) => p.key));
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    if (!active || !perms.canWrite) return;
    const items = groupedAvailable.find((g) => g.category === cat)?.items ?? [];
    const visibleItems = items.filter(filterPerm);
    if (visibleItems.length === 0) return;
    const allSelected = visibleItems.every((p) => activeGranted.has(p.key));
    setPendingPerms((prev) => {
      const current = prev ?? new Set(active.permissions.map((p) => p.key));
      const next = new Set(current);
      visibleItems.forEach((p) => {
        if (allSelected) next.delete(p.key);
        else next.add(p.key);
      });
      return next;
    });
  };

  const savePerms = async () => {
    if (!active || !pendingPerms || busy) return;
    setBusy(true);
    const res = await setRolePermissions(active.id, [...pendingPerms]);
    setBusy(false);
    if (res.ok) {
      pushToast("success", "Permisos actualizados.");
      setPendingPerms(null);
      startTransition(() => router.refresh());
    } else {
      pushToast("error", res.error);
    }
  };

  const cancelPerms = () => setPendingPerms(null);

  const saveMeta = async () => {
    if (!active || busy) return;
    if (draftName.trim() === active.name && draftDesc.trim() === (active.description ?? "")) {
      setEditingMeta(false);
      return;
    }
    setBusy(true);
    const res = await updateRole(active.id, {
      name: draftName.trim(),
      description: draftDesc.trim(),
    });
    setBusy(false);
    if (res.ok) {
      pushToast("success", "Rol actualizado.");
      setEditingMeta(false);
      startTransition(() => router.refresh());
    } else {
      pushToast("error", res.error);
    }
  };

  const onCreateSubmit = async (input: {
    name: string;
    key: string;
    description: string;
    permissionKeys: string[];
  }) => {
    const res = await createRole(input);
    if (res.ok) {
      pushToast("success", `Rol "${input.name}" creado.`);
      // Select the new role
      setParams({ role: res.data?.id ?? null });
      startTransition(() => router.refresh());
    }
    return res;
  };

  const confirmDeleteRole = async () => {
    if (!deletingRole) return;
    setBusy(true);
    const res = await deleteRole(deletingRole.id);
    setBusy(false);
    if (res.ok) {
      pushToast("success", `Rol "${deletingRole.name}" eliminado.`);
      setDeletingRole(null);
      setParams({ role: null });
      startTransition(() => router.refresh());
    } else {
      pushToast("error", res.error);
    }
  };

  const confirmRemoveUser = async () => {
    if (!removingUser) return;
    setBusy(true);
    const res = await removeUserFromRole(
      removingUser.role.id,
      removingUser.userId,
    );
    setBusy(false);
    if (res.ok) {
      pushToast(
        "success",
        `${removingUser.userName} ya no tiene este rol.`,
      );
      setRemovingUser(null);
      startTransition(() => router.refresh());
    } else {
      pushToast("error", res.error);
    }
  };

  const canEdit = perms.canWrite && !!active;
  const hasNoCustomRoles = rows.filter((r) => !r.system).length === 0;

  const onDuplicate = () => {
    if (!active || !perms.canWrite) return;
    setCreating({
      name: `Copia de ${active.name}`,
      key: `${active.key}-copia`,
      description: active.description ?? "",
      permissionKeys: active.permissions.map((p) => p.key),
      title: "Duplicar rol como personalizado",
      subtitle: `Se creará un nuevo rol personalizado con los mismos permisos que "${active.name}". Podrás editar nombre, identificador y permisos antes de guardar.`,
    });
  };

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__title">
          <h1>Roles administrativos</h1>
          <span className="page__sub">
            {totals.total} rol{totals.total !== 1 ? "es" : ""} ·{" "}
            {totals.system} del sistema · {totals.custom} personalizado
            {totals.custom !== 1 ? "s" : ""} · {totalUsers} usuario
            {totalUsers !== 1 ? "s" : ""}
            {(isPending || busy) && (
              <span style={{ marginLeft: 12, color: "var(--accent)" }}>
                · actualizando…
              </span>
            )}
          </span>
        </div>
        <div className="page__actions">
          <button
            className="btn--cta"
            disabled={!perms.canWrite}
            onClick={() => setCreating({})}
          >
            <Icon name="plus" size={16} />
            <span>Crear rol</span>
          </button>
        </div>
      </div>

      {hasNoCustomRoles && perms.canWrite && (
        <div className="banner" style={{ marginBottom: 16 }}>
          <Icon name="info" size={16} className="banner__icon" />
          <p>
            <b>Roles del sistema disponibles.</b> Puedes ajustar los permisos de cualquier rol (incluidos los roles del sistema como Personero o Administrador) directamente marcando o desmarcando casillas, o{" "}
            <button
              type="button"
              className="linkbtn"
              onClick={() => setCreating({})}
              style={{ padding: "0 4px", verticalAlign: "baseline" }}
            >
              crear un rol personalizado
            </button>{" "}
            para tu equipo.
          </p>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="roles__stats-strip">
        <div className="roles__stat-card">
          <div className="roles__stat-icon" style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}>
            <Icon name="shield" size={20} />
          </div>
          <div className="roles__stat-data">
            <span className="roles__stat-value">{totals.total}</span>
            <span className="roles__stat-label">Roles en Total</span>
          </div>
        </div>

        <div className="roles__stat-card">
          <div className="roles__stat-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <Icon name="rules" size={20} />
          </div>
          <div className="roles__stat-data">
            <span className="roles__stat-value">{totals.system}</span>
            <span className="roles__stat-label">Roles del Sistema</span>
          </div>
        </div>

        <div className="roles__stat-card">
          <div className="roles__stat-icon" style={{ background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed" }}>
            <Icon name="sparkle" size={20} />
          </div>
          <div className="roles__stat-data">
            <span className="roles__stat-value">{totals.custom}</span>
            <span className="roles__stat-label">Personalizados</span>
          </div>
        </div>

        <div className="roles__stat-card">
          <div className="roles__stat-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
            <Icon name="users" size={20} />
          </div>
          <div className="roles__stat-data">
            <span className="roles__stat-value">{totalUsers}</span>
            <span className="roles__stat-label">Usuarios con Rol</span>
          </div>
        </div>
      </div>

      <div className="roles">
        {/* ─────────────── LEFT LIST ─────────────── */}
        <div className="roles__list">
          <div className="roles__list-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="Buscar rol…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                aria-label="Limpiar"
                onClick={() => setSearch("")}
                className="iconbtn iconbtn--small"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          <div className="roles__list-filters">
            {(["all", "system", "custom"] as const).map((f) => (
              <button
                key={f}
                className={`usr-filter ${filter === f ? "is-on" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all"
                  ? `Todos · ${totals.total}`
                  : f === "system"
                    ? `Sistema · ${totals.system}`
                    : `Personalizados · ${totals.custom}`}
              </button>
            ))}
          </div>

          <div className="roles__list-items">
            {filtered.map((r) => {
              const visual = getRoleVisual(r.key, r.system);
              return (
                <button
                  key={r.id}
                  className={`roles__list-item ${
                    r.id === active?.id ? "is-active" : ""
                  }`}
                  onClick={() => setParams({ role: r.id })}
                >
                  <span
                    className="roles__list-item-icon"
                    style={{
                      background: visual.bg,
                      color: visual.color,
                    }}
                  >
                    <Icon name={visual.icon} size={16} />
                  </span>
                  <div className="roles__list-item-body">
                    <span className="roles__list-item-name">
                      {r.name}
                      <span className={visual.badgeClass}>{visual.badgeLabel}</span>
                    </span>
                    <span className="roles__list-item-meta">
                      {r.userCount} usuario{r.userCount !== 1 ? "s" : ""} ·{" "}
                      {r.permissions.length} permiso
                      {r.permissions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Icon
                    name="chevron-right"
                    size={16}
                    className="roles__list-item-chev"
                  />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="empty" style={{ padding: 24 }}>
                <Icon name="search" size={28} />
                <h3 style={{ fontSize: 14 }}>Sin coincidencias</h3>
                <p style={{ fontSize: 12.5 }}>
                  Ningún rol coincide con la búsqueda o el filtro.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────── RIGHT DETAIL ─────────────── */}
        <div className="roles__detail">
          {active ? (
            <>
              <div className="roles__detail-head">
                <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "flex-start", gap: 16 }}>
                  {activeVisual && (
                    <div
                      className="roles__detail-avatar"
                      style={{
                        background: activeVisual.bg,
                        color: activeVisual.color,
                      }}
                    >
                      <Icon name={activeVisual.icon} size={26} />
                    </div>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    {editingMeta ? (
                      <div className="roles__edit-meta-card">
                        <div className="roles__edit-meta-title">
                          <Icon name="edit" size={16} />
                          <span>Editar Detalles del Rol</span>
                        </div>
                        <div className="field">
                          <label className="field__label">Nombre del Rol</label>
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            placeholder="Nombre del rol (ej. Coordinador 1 de Colegio)"
                            className="roles__edit-name"
                            autoFocus
                          />
                        </div>
                        <div className="field">
                          <label className="field__label">Descripción y Funciones</label>
                          <textarea
                            value={draftDesc}
                            onChange={(e) => setDraftDesc(e.target.value)}
                            placeholder="Descripción de funciones y responsabilidades del rol..."
                            rows={2}
                            className="roles__edit-desc"
                            maxLength={200}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="roles__detail-title-row">
                          <h2>{active.name}</h2>
                          {activeVisual && (
                            <span className={activeVisual.badgeClass}>{activeVisual.badgeLabel}</span>
                          )}
                          {active.key === "superadmin" && (
                            <span className="badge badge--red">Acceso Total</span>
                          )}
                        </div>
                        <p className="roles__detail-desc">
                          {active.description ?? "Sin descripción configurada."}
                        </p>
                        <div className="roles__detail-tags">
                          <span className="roles__tag-chip">
                            <code>ID: {active.key}</code>
                          </span>
                          <span className="roles__tag-chip">
                            <Icon name="users" size={12} />
                            {active.userCount} usuario{active.userCount !== 1 ? "s" : ""}
                          </span>
                          <span className="roles__tag-chip">
                            <Icon name="check" size={12} />
                            {active.permissions.length} permiso{active.permissions.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="roles__detail-actions">
                  {editingMeta ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          setEditingMeta(false);
                          setDraftName(active.name);
                          setDraftDesc(active.description ?? "");
                        }}
                        disabled={busy}
                      >
                        <Icon name="close" size={14} />
                        <span>Cancelar</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={saveMeta}
                        disabled={busy || draftName.trim().length < 2}
                      >
                        <Icon name="check" size={14} />
                        <span>{busy ? "Guardando…" : "Guardar cambios"}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {perms.canWrite && (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={onDuplicate}
                          title="Crear un rol personalizado duplicando los permisos de este rol"
                        >
                          <Icon name="copy" size={14} />
                          <span>Duplicar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setEditingMeta(true)}
                        disabled={!canEdit || isEditingPerms}
                        title={
                          !perms.canWrite
                            ? "Necesitas el permiso roles.write para editar este rol"
                            : "Editar nombre y descripción de este rol"
                        }
                      >
                        <Icon name="edit" size={14} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger-outline btn--sm"
                        onClick={() => setDeletingRole(active)}
                        disabled={!perms.canWrite || active.system || active.userCount > 0}
                        title={
                          active.system
                            ? "Los roles del sistema no se pueden eliminar para proteger la integridad del sistema electoral, pero puedes personalizar su nombre, descripción y permisos."
                            : active.userCount > 0
                              ? `Este rol tiene ${active.userCount} usuario(s) asignado(s). Reasigna a los usuarios antes de eliminar.`
                              : "Eliminar este rol personalizado"
                        }
                      >
                        <Icon name="trash" size={14} />
                        <span>Eliminar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* TABS */}
              <div className="usr-drawer-tabs roles-tabs">
                <button
                  className={`usr-drawer-tab ${tab === "permisos" ? "is-active" : ""}`}
                  onClick={() => setParams({ tab: null })}
                >
                  Permisos
                  <span className="roles-tabs__count">
                    {active.permissions.length}
                  </span>
                </button>
                <button
                  className={`usr-drawer-tab ${tab === "usuarios" ? "is-active" : ""}`}
                  onClick={() => setParams({ tab: "usuarios" })}
                >
                  Usuarios
                  <span className="roles-tabs__count">{active.userCount}</span>
                </button>
                <button
                  className={`usr-drawer-tab ${tab === "detalles" ? "is-active" : ""}`}
                  onClick={() => setParams({ tab: "detalles" })}
                >
                  Detalles
                </button>
              </div>

              {/* PERMISSIONS TAB */}
              {tab === "permisos" && (
                <div className="roles__tab-body">
                  <div className="banner banner--accent" style={{ marginBottom: 16 }}>
                    <Icon
                      name="sparkle"
                      size={16}
                      className="banner__icon"
                    />
                    <p>
                      <strong>Configuración dinámica ({active.name}):</strong> Puedes marcar o desmarcar permisos libremente; pulsa <em>Guardar permisos</em> para aplicar los cambios en tiempo real a los usuarios con este rol.
                    </p>
                  </div>

                  <div className="roles__perm-toolbar">
                    <div className="roles__list-search" style={{ flex: 1 }}>
                      <Icon name="search" size={16} />
                      <input
                        type="text"
                        placeholder="Buscar permiso…"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                      />
                      {permSearch && (
                        <button
                          aria-label="Limpiar"
                          onClick={() => setPermSearch("")}
                          className="iconbtn iconbtn--small"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                    <span className="roles__perm-count">
                      {activeGranted.size} / {available.length}
                    </span>
                  </div>

                  {groupedAvailable.map(({ category, items }) => {
                    const visible = items.filter(filterPerm);
                    if (visible.length === 0) return null;
                    const grantedInCat = visible.filter((p) =>
                      activeGranted.has(p.key),
                    ).length;
                    const allInCat = visible.every((p) =>
                      activeGranted.has(p.key),
                    );
                    return (
                      <div key={category} className="roles-perm-cat">
                        <div className="roles-perm-cat__hd">
                          <button
                            type="button"
                            className="roles-perm-cat__toggle"
                            onClick={() => toggleCategory(category)}
                            disabled={!perms.canWrite}
                          >
                            <span
                              className={`checkbox__box ${
                                allInCat
                                  ? "is-on"
                                  : grantedInCat > 0
                                    ? "is-mixed"
                                    : ""
                              }`}
                            >
                              {allInCat && <Icon name="check" size={14} />}
                              {!allInCat && grantedInCat > 0 && (
                                <span className="checkbox__dash" />
                              )}
                            </span>
                            <Icon
                              name={categoryIcon(category)}
                              size={16}
                            />
                            <span>{category}</span>
                            <span className="roles-perm-cat__count">
                              {grantedInCat}/{visible.length}
                            </span>
                          </button>
                        </div>
                        <ul className="roles-perm-cat__list">
                          {visible.map((p) => {
                            const isOn = activeGranted.has(p.key);
                            return (
                              <li
                                key={p.key}
                                className={`roles-perm-cat__item ${
                                  isOn ? "is-on" : ""
                                } ${!perms.canWrite ? "is-readonly" : ""}`}
                                onClick={() => togglePerm(p.key)}
                              >
                                <span
                                  className={`checkbox__box ${isOn ? "is-on" : ""}`}
                                >
                                  {isOn && <Icon name="check" size={14} />}
                                </span>
                                <div className="roles-perm-cat__item-body">
                                  <div className="roles-perm-cat__item-name">
                                    {p.name}
                                    <code>{p.key}</code>
                                  </div>
                                  {p.description && (
                                    <div className="roles-perm-cat__item-desc">
                                      {p.description}
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* USERS TAB */}
              {tab === "usuarios" && (
                <div className="roles__tab-body">
                  {active.users.length === 0 ? (
                    <div className="empty">
                      <Icon name="users" size={32} />
                      <h3>Sin usuarios asignados</h3>
                      <p>
                        Aún ningún usuario tiene este rol.{" "}
                        <a href="/usuarios" className="linkbtn linkbtn--primary">
                          Ir a usuarios
                        </a>{" "}
                        para asignarlo.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="roles__perm-toolbar">
                        <div className="roles__list-search" style={{ flex: 1 }}>
                          <Icon name="search" size={16} />
                          <input
                            type="text"
                            placeholder="Buscar usuario por nombre o email…"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                          {userSearch && (
                            <button
                              aria-label="Limpiar"
                              onClick={() => setUserSearch("")}
                              className="iconbtn iconbtn--small"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          )}
                        </div>
                        <span className="roles__perm-count">
                          {filteredRoleUsers.length} de {active.users.length} usuario{active.users.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <ul className="roles__users">
                        {filteredRoleUsers.map((u) => (
                          <li key={u.id} className="roles__user-row">
                            <span
                              className="usr-avatar"
                              style={{ background: avatarColor(u.id) }}
                            >
                              {initialsFor(u.name)}
                            </span>
                            <div className="roles__user-info">
                              <div className="roles__user-name">
                                <a
                                  href={`/usuarios?detail=${u.id}`}
                                  className="rowlink"
                                >
                                  {u.name}
                                </a>
                                {!u.active && (
                                  <span className="badge badge--neutral">
                                    Suspendido
                                  </span>
                                )}
                              </div>
                              <div className="roles__user-email">{u.email}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <a
                                href={`/usuarios?detail=${u.id}`}
                                className="btn btn--secondary btn--xs"
                                title="Ver ficha en el módulo de usuarios"
                              >
                                <Icon name="external" size={12} />
                                <span>Ver ficha</span>
                              </a>
                              {perms.canWrite && active.key !== "superadmin" && (
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--xs"
                                  style={{ color: "#dc2626" }}
                                  onClick={() =>
                                    setRemovingUser({
                                      role: active,
                                      userId: u.id,
                                      userName: u.name,
                                    })
                                  }
                                  title="Quitar rol a este usuario"
                                >
                                  <Icon name="trash" size={12} />
                                  <span>Quitar</span>
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* DETAILS TAB */}
              {tab === "detalles" && (
                <div className="roles__tab-body">
                  <dl className="roles__detail-meta">
                    <div>
                      <dt>Identificador</dt>
                      <dd>
                        <code>{active.key}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Tipo</dt>
                      <dd>{active.system ? "Sistema" : "Personalizado"}</dd>
                    </div>
                    <div>
                      <dt>Usuarios</dt>
                      <dd>{active.userCount}</dd>
                    </div>
                    <div>
                      <dt>Permisos</dt>
                      <dd>{active.permissions.length}</dd>
                    </div>
                    <div>
                      <dt>Creado</dt>
                      <dd>
                        {mounted
                          ? formatFullDate(active.createdAt)
                          : formatDateOnly(active.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt>Última actualización</dt>
                      <dd>
                        {mounted
                          ? formatFullDate(active.updatedAt)
                          : formatDateOnly(active.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </>
          ) : (
            <div className="empty">
              <Icon name="shield" size={36} />
              <h3>Selecciona un rol</h3>
              <p>Elige un rol de la lista para ver sus permisos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky save bar when editing permissions */}
      {isEditingPerms && (
        <div className="roles__savebar">
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <Icon name="sparkle" size={18} />
            <span>Tienes cambios pendientes en los permisos de este rol</span>
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={cancelPerms}
              disabled={busy}
            >
              <Icon name="close" size={14} />
              <span>Descartar</span>
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={savePerms}
              disabled={busy}
            >
              <Icon name="check" size={14} />
              <span>{busy ? "Guardando…" : "Guardar permisos"}</span>
            </button>
          </div>
        </div>
      )}

      {creating && (
        <CreateRoleModal
          available={available}
          initial={creating}
          onClose={() => setCreating(false)}
          onSubmit={onCreateSubmit}
        />
      )}

      {deletingRole && (
        <ConfirmDialog
          title={`Eliminar rol "${deletingRole.name}"`}
          description={
            <>
              Esta acción es <b>irreversible</b>. El rol y sus asignaciones de
              permisos se eliminarán definitivamente.
            </>
          }
          confirmLabel="Eliminar rol"
          tone="danger"
          busy={busy}
          onConfirm={confirmDeleteRole}
          onClose={() => setDeletingRole(null)}
        />
      )}

      {removingUser && (
        <ConfirmDialog
          title={`Quitar el rol a ${removingUser.userName}`}
          description={
            <>
              El usuario perderá el rol{" "}
              <b>{removingUser.role.name}</b> y todos sus permisos asociados,
              salvo los que reciba por otros roles.
            </>
          }
          confirmLabel="Quitar rol"
          tone="danger"
          busy={busy}
          onConfirm={confirmRemoveUser}
          onClose={() => setRemovingUser(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={dismissToast} />
    </div>
  );
}
