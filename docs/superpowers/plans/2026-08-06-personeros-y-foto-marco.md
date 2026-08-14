# Consultor de Mesa para Personeros + Generador de Foto con Marco — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir dos módulos públicos a la web de campaña: una consulta de mesa por DNI para personeros (con CRUD admin) y un generador de foto con marco oficial que corre 100% en el navegador.

**Architecture:** El Consultor reutiliza el patrón existente admin (Prisma + RBAC + server actions + tabla) y expone una API pública `GET /api/personeros/:dni` consumida por la página `/mi-mesa`. El generador `/mi-foto` es una página cliente que compone foto + marco en `<canvas>` sin backend. Ambas páginas públicas viven fuera del grupo `(admin)` y no cargan los scripts de la plantilla Politicly.

**Tech Stack:** Next.js (App Router, versión del repo — leer `node_modules/next/dist/docs/` antes de usar APIs nuevas), React, Prisma + Postgres (driver adapter `@prisma/adapter-pg`, `db push`), TypeScript, canvas nativo. Sin dependencias nuevas.

## Global Constraints

- **Next.js del repo NO es el estándar** (ver `AGENTS.md`): leer la guía relevante en `node_modules/next/dist/docs/` antes de escribir APIs de Next que no aparezcan ya usadas en el repo. Seguir patrones existentes.
- **No hay framework de tests** (solo `npm run build`, `eslint`, `npx prisma validate`). La verificación de cada tarea es build + lint + navegador, no un test runner.
- **DB por `prisma db push`** (no hay carpeta `prisma/migrations/`). Cliente Prisma generado en `src/generated/prisma` (`npx prisma generate`).
- **Marca:** rojo principal `#e90305` (alt `#C0392B`), logo `/assets/images/logo/logo-an.webp` (color) y `/assets/images/logo/logo-white.png` (blanco). Candidato: **"Simón Horna Alpaca"**. Partido: **"Ahora Nación"**. Lema corto del marco: **"#AhoraNación"**.
- **Idioma:** todo el texto de UI y mensajes en español.
- **Distritos:** usar `DISTRICTS`/`isDistrictId`/`districtLabel` de `@/lib/districts` (11 distritos de Madre de Dios). Nunca hardcodear.
- **Validación de documento (consistente en actions y API):** DNI = `^\d{8}$`; CE/pasaporte = `^[A-Z0-9]{6,12}$` (guardado en mayúsculas). Teléfono = `^[0-9+\s-]{6,15}$`.
- **Helpers de respuesta API:** `ok(data, status?)` / `fail(error, status?, fieldErrors?)` de `@/app/api/v1/_lib/response`. `ok` hace spread de `data` en la raíz (`{ ok: true, ...data }`).
- **Rate-limit:** `rateLimit(scope, key, max, windowMs)` de `@/lib/rate-limit` → `{ allowed, retryAfterSec }`.

---

## File Structure

**Nuevos:**
- `src/app/(admin)/personeros/types.ts` — tipos compartidos del módulo admin.
- `src/app/(admin)/personeros/actions.ts` — server actions CRUD.
- `src/app/(admin)/personeros/PersonerosClient.tsx` — tabla + modal + acciones (client).
- `src/app/(admin)/personeros/page.tsx` — server page (permiso + fetch).
- `src/app/(admin)/personeros/personeros.css` — estilos del módulo (con padding correcto).
- `src/app/api/personeros/[dni]/route.ts` — API pública de consulta.
- `src/app/mi-mesa/page.tsx` + `MesaLookupClient.tsx` + `mi-mesa.css` — consulta pública.
- `src/app/mi-foto/page.tsx` + `PhotoFrameClient.tsx` + `mi-foto.css` — generador de foto.

**Modificados:**
- `prisma/schema.prisma` — modelo `Personero` + relaciones inversas en `User`.
- `src/lib/auth/permissions.ts` — permisos `personeros.read/write` + asignación a roles.
- `src/components/admin/Icon.tsx` — ícono `id-card`.
- `src/components/admin/data.ts` — ítem de navegación.
- `src/components/landing/layout/Header.jsx` — enlaces a `/mi-mesa` y `/mi-foto`.

---

## Task 1: Modelo de datos `Personero` + permisos RBAC

**Files:**
- Modify: `prisma/schema.prisma` (añadir modelo `Personero` y 2 relaciones en `model User`)
- Modify: `src/lib/auth/permissions.ts` (añadir 2 permisos + asignarlos a roles)

**Interfaces:**
- Produces: modelo Prisma `Personero` con campos `{ id, docType, docNumber, name, district?, localName, localAddress?, mesa, coordinatorName, coordinatorPhone, active, notes?, createdById?, updatedById?, createdAt, updatedAt }`; permisos `"personeros.read"` y `"personeros.write"` (ahora válidos como `PermissionKey`).

- [ ] **Step 1: Añadir el modelo `Personero` al final de `prisma/schema.prisma`**

```prisma
// ─────────────────────────── Personeros (consultor de mesa) ───────────────────────────

model Personero {
  id               String       @id @default(cuid())
  docType          DocumentType @default(dni)
  docNumber        String
  name             String
  district         District?
  localName        String       // colegio / local de votación
  localAddress     String?
  mesa             String       // número de mesa (string: permite ceros a la izquierda)
  coordinatorName  String
  coordinatorPhone String
  active           Boolean      @default(true)
  notes            String?
  createdById      String?
  updatedById      String?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  createdBy User? @relation("PersoneroCreator", fields: [createdById], references: [id], onDelete: SetNull)
  updatedBy User? @relation("PersoneroUpdater", fields: [updatedById], references: [id], onDelete: SetNull)

  @@unique([docType, docNumber])
  @@index([district])
  @@index([active])
}
```

- [ ] **Step 2: Añadir las relaciones inversas en `model User`**

En `prisma/schema.prisma`, dentro de `model User { ... }`, junto a las otras relaciones (después de `reviewedSupporters Supporter[] @relation("SupporterReviewer")`), añadir:

```prisma
  createdPersoneros  Personero[] @relation("PersoneroCreator")
  updatedPersoneros  Personero[] @relation("PersoneroUpdater")
```

- [ ] **Step 3: Validar el esquema**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 4: Añadir los permisos en `src/lib/auth/permissions.ts`**

En el array `PERMISSIONS`, después del bloque `supporters.write`, añadir:

```ts
  {
    key: "personeros.read",
    name: "Ver personeros",
    description: "Consultar el listado de personeros y sus asignaciones de mesa",
    category: "Personeros",
  },
  {
    key: "personeros.write",
    name: "Gestionar personeros",
    description: "Crear, editar, activar/desactivar y eliminar personeros",
    category: "Personeros",
  },
```

- [ ] **Step 5: Asignar los permisos a los roles en el mismo archivo**

En `ROLE_DEFS`:
- `admin.permissions`: añadir `"personeros.read"`, `"personeros.write"` al final del array.
- `editor.permissions`: añadir `"personeros.read"`.
- `viewer.permissions`: añadir `"personeros.read"`.

(`superadmin` usa `PERMISSIONS.map((p) => p.key)`, así que los incluye automáticamente.)

- [ ] **Step 6: Aplicar el esquema a la base y regenerar el cliente**

Run: `npx prisma db push && npx prisma generate`
Expected: push aplica la tabla `Personero`; generate crea el cliente sin errores.

- [ ] **Step 7: Sincronizar permisos/roles (seed idempotente)**

Run: `npx tsx prisma/seed.ts`
Expected: log "→ Sincronizando permisos…" y "→ Sincronizando roles…" sin errores. (El seed hace upsert; es seguro re-ejecutarlo.)

- [ ] **Step 8: Verificar que compila el tipado nuevo**

Run: `npm run build`
Expected: build OK (el cliente Prisma ya conoce `prisma.personero` y `PermissionKey` incluye los nuevos permisos).

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma src/lib/auth/permissions.ts
git commit -m "feat(personeros): modelo Personero y permisos RBAC"
```

---

## Task 2: Módulo admin `/personeros` (CRUD)

**Files:**
- Create: `src/app/(admin)/personeros/types.ts`
- Create: `src/app/(admin)/personeros/actions.ts`
- Create: `src/app/(admin)/personeros/PersonerosClient.tsx`
- Create: `src/app/(admin)/personeros/page.tsx`
- Create: `src/app/(admin)/personeros/personeros.css`
- Modify: `src/components/admin/Icon.tsx`
- Modify: `src/components/admin/data.ts`

**Interfaces:**
- Consumes: `Personero` (Task 1), `ActionResult`, permisos `personeros.*`, helpers `getCurrentUser`/`requirePermission`, `DISTRICTS`/`isDistrictId`/`districtLabel`, `Icon`, `ConfirmDialog`, `Toasts`, `useEscClose`, `formatFullDate`.
- Produces: rutas admin `/personeros`; server actions `createPersonero`, `updatePersonero`, `deletePersonero`, `setPersoneroActive`.

- [ ] **Step 1: Crear `src/app/(admin)/personeros/types.ts`**

```ts
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type PersoneroRow = {
  id: string;
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  district: string | null;
  localName: string;
  localAddress: string | null;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes: string | null;
  createdAt: string; // ISO
  createdByName: string | null;
};

export type PersoneroInput = {
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  district?: string;
  localName: string;
  localAddress?: string;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes?: string;
};

export type PermFlags = { canRead: boolean; canWrite: boolean };
```

- [ ] **Step 2: Crear `src/app/(admin)/personeros/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import type { ActionResult, PersoneroInput } from "./types";

class Denied extends Error {}

async function authorize(perm: "personeros.read" | "personeros.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh() {
  revalidatePath("/personeros");
}

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
}

type Validated = {
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  district: DistrictId | null;
  localName: string;
  localAddress: string | null;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes: string | null;
};

function validate(input: PersoneroInput): { data?: Validated; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};

  const docType =
    input.docType === "ce" || input.docType === "passport" ? input.docType : "dni";
  const docNumber = (input.docNumber ?? "").trim().toUpperCase();
  if (docType === "dni") {
    if (!/^\d{8}$/.test(docNumber)) fe.docNumber = "El DNI debe tener 8 dígitos.";
  } else if (!/^[A-Z0-9]{6,12}$/.test(docNumber)) {
    fe.docNumber = "Documento inválido (6 a 12 letras o números).";
  }

  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) fe.name = "Nombre de 2 a 120 caracteres.";

  const localName = (input.localName ?? "").trim();
  if (localName.length < 2 || localName.length > 120) fe.localName = "Local de 2 a 120 caracteres.";

  const mesa = (input.mesa ?? "").trim();
  if (mesa.length < 1 || mesa.length > 10) fe.mesa = "Número de mesa requerido (máx. 10).";

  const coordinatorName = (input.coordinatorName ?? "").trim();
  if (coordinatorName.length < 2 || coordinatorName.length > 120)
    fe.coordinatorName = "Coordinador de 2 a 120 caracteres.";

  const coordinatorPhone = (input.coordinatorPhone ?? "").trim();
  if (!/^[0-9+\s-]{6,15}$/.test(coordinatorPhone))
    fe.coordinatorPhone = "Teléfono del coordinador inválido.";

  let district: DistrictId | null = null;
  if (input.district && input.district.trim() !== "") {
    if (!isDistrictId(input.district)) fe.district = "Distrito inválido.";
    else district = input.district;
  }

  const localAddress =
    input.localAddress && input.localAddress.trim() !== ""
      ? input.localAddress.trim().slice(0, 200)
      : null;
  const notes =
    input.notes && input.notes.trim() !== "" ? input.notes.trim().slice(0, 500) : null;

  if (Object.keys(fe).length > 0) return { fieldErrors: fe };
  return {
    data: {
      docType,
      docNumber,
      name,
      district,
      localName,
      localAddress,
      mesa,
      coordinatorName,
      coordinatorPhone,
      active: !!input.active,
      notes,
    },
  };
}

export async function createPersonero(
  input: PersoneroInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("personeros.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    const p = await prisma.personero.create({
      data: { ...v.data, createdById: me.id, updatedById: me.id },
    });
    refresh();
    return { ok: true, data: { id: p.id } };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    if (isUniqueViolation(e))
      return fail("Ya existe un personero con ese documento.", {
        docNumber: "Documento ya registrado.",
      });
    console.error("createPersonero", e);
    return fail("Error inesperado al registrar.");
  }
}

export async function updatePersonero(id: string, input: PersoneroInput): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    await prisma.personero.update({
      where: { id },
      data: { ...v.data, updatedById: me.id },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    if (isUniqueViolation(e))
      return fail("Ya existe un personero con ese documento.", {
        docNumber: "Documento ya registrado.",
      });
    console.error("updatePersonero", e);
    return fail("Error inesperado al guardar.");
  }
}

export async function setPersoneroActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    await prisma.personero.update({ where: { id }, data: { active, updatedById: me.id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    console.error("setPersoneroActive", e);
    return fail("Error inesperado al cambiar el estado.");
  }
}

export async function deletePersonero(id: string): Promise<ActionResult> {
  try {
    await authorize("personeros.write");
    await prisma.personero.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    console.error("deletePersonero", e);
    return fail("Error inesperado al eliminar.");
  }
}
```

- [ ] **Step 3: Crear `src/app/(admin)/personeros/PersonerosClient.tsx`**

```tsx
"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import "./personeros.css";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../usuarios/Toasts";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS, districtLabel, type DistrictId } from "@/lib/districts";
import {
  createPersonero,
  updatePersonero,
  deletePersonero,
  setPersoneroActive,
} from "./actions";
import type { PersoneroRow, PersoneroInput, PermFlags, ActionResult } from "./types";

const DOC_TYPES = [
  { id: "dni", label: "DNI" },
  { id: "ce", label: "Carné de Extranjería" },
  { id: "passport", label: "Pasaporte" },
] as const;

const DOC_LABEL: Record<PersoneroRow["docType"], string> = {
  dni: "DNI",
  ce: "CE",
  passport: "Pasaporte",
};

export function PersonerosClient({ rows, perms }: { rows: PersoneroRow[]; perms: PermFlags }) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; row: PersoneroRow }>(null);
  const [toDelete, setToDelete] = useState<PersoneroRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (district === "" || r.district === district) &&
        (term === "" ||
          r.name.toLowerCase().includes(term) ||
          r.docNumber.toLowerCase().includes(term)),
    );
  }, [rows, q, district]);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  return (
    <div className="personeros">
      <header className="personeros__head">
        <div>
          <h1>Personeros</h1>
          <p className="personeros__sub">Asignaciones de mesa para el día de la elección</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setModal({ mode: "create" })}>
            <Icon name="plus" size={16} /> Registrar personero
          </button>
        )}
      </header>

      <div className="personeros__filters">
        <input
          className="personeros__search"
          placeholder="Buscar por nombre o documento…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="personeros__district"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          <option value="">Todos los distritos</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Distrito</th>
                <th>Local</th>
                <th>Mesa</th>
                <th>Coordinador</th>
                <th>Estado</th>
                {perms.canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={perms.canWrite ? 8 : 7} className="personeros__empty">
                    <Icon name="id-card" size={22} />
                    <span>No hay personeros con estos filtros.</span>
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="personeros__name">{r.name}</div>
                    {r.notes && <div className="personeros__notes">{r.notes}</div>}
                  </td>
                  <td>
                    <span className="personeros__doc">
                      <span className="badge badge--neutral">{DOC_LABEL[r.docType]}</span>
                      <span className="personeros__doc-num">{r.docNumber}</span>
                    </span>
                  </td>
                  <td>{r.district ? districtLabel(r.district as DistrictId) : <span className="dtable__muted">—</span>}</td>
                  <td>
                    <div>{r.localName}</div>
                    {r.localAddress && <div className="personeros__notes">{r.localAddress}</div>}
                  </td>
                  <td className="personeros__mesa">{r.mesa}</td>
                  <td>
                    <div>{r.coordinatorName}</div>
                    <div className="personeros__notes">{r.coordinatorPhone}</div>
                  </td>
                  <td>
                    <span className={`badge ${r.active ? "badge--green" : "badge--red"}`}>
                      {r.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {perms.canWrite && (
                    <td>
                      <div className="personeros__actions">
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => setPersoneroActive(r.id, !r.active),
                              r.active ? "Personero desactivado." : "Personero activado.",
                            )
                          }
                        >
                          {r.active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          className="iconbtn"
                          title="Editar"
                          onClick={() => setModal({ mode: "edit", row: r })}
                        >
                          <Icon name="settings" size={16} />
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
          <span>
            {visible.length} de {rows.length} personero{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {modal && (
        <PersoneroModal
          initial={modal.mode === "edit" ? modal.row : null}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            const res =
              modal.mode === "edit"
                ? await updatePersonero(modal.row.id, input)
                : await createPersonero(input);
            if (res.ok) {
              toast("success", modal.mode === "edit" ? "Personero actualizado." : "Personero registrado.");
              setModal(null);
            }
            return res;
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar personero"
          description={
            <>
              Se eliminará <strong>{toDelete.name}</strong>. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            await deletePersonero(toDelete.id);
            toast("success", "Personero eliminado.");
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

function PersoneroModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: PersoneroRow | null;
  onClose: () => void;
  onSubmit: (input: PersoneroInput) => Promise<ActionResult<unknown>>;
}) {
  const [docType, setDocType] = useState<PersoneroInput["docType"]>(initial?.docType ?? "dni");
  const [docNumber, setDocNumber] = useState(initial?.docNumber ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [localName, setLocalName] = useState(initial?.localName ?? "");
  const [localAddress, setLocalAddress] = useState(initial?.localAddress ?? "");
  const [mesa, setMesa] = useState(initial?.mesa ?? "");
  const [coordinatorName, setCoordinatorName] = useState(initial?.coordinatorName ?? "");
  const [coordinatorPhone, setCoordinatorPhone] = useState(initial?.coordinatorPhone ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  useEscClose(true, onClose, busy);

  const errStyle = { color: "#b91c1c", fontSize: 12, marginTop: 4 } as const;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await onSubmit({
      docType,
      docNumber,
      name,
      district: district || undefined,
      localName,
      localAddress: localAddress || undefined,
      mesa,
      coordinatorName,
      coordinatorPhone,
      active,
      notes: notes || undefined,
    });
    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>{initial ? "Editar personero" : "Registrar personero"}</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">
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

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">Tipo de documento</span>
              <select value={docType} onChange={(e) => setDocType(e.target.value as PersoneroInput["docType"])}>
                {DOC_TYPES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">
                N° de documento<span className="field__req">*</span>
              </span>
              <input
                type="text"
                inputMode={docType === "dni" ? "numeric" : "text"}
                maxLength={docType === "dni" ? 8 : 12}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                aria-invalid={!!fieldErrors.docNumber}
              />
              {fieldErrors.docNumber && <span style={errStyle}>{fieldErrors.docNumber}</span>}
            </label>
          </div>

          <label className="field">
            <span className="field__label">
              Nombre completo<span className="field__req">*</span>
            </span>
            <input type="text" autoFocus value={name} maxLength={120} onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name && <span style={errStyle}>{fieldErrors.name}</span>}
          </label>

          <label className="field">
            <span className="field__label">Distrito</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-invalid={!!fieldErrors.district}>
              <option value="">Sin distrito</option>
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} ({d.province})
                </option>
              ))}
            </select>
            {fieldErrors.district && <span style={errStyle}>{fieldErrors.district}</span>}
          </label>

          <label className="field">
            <span className="field__label">
              Local / Colegio<span className="field__req">*</span>
            </span>
            <input type="text" value={localName} maxLength={120} onChange={(e) => setLocalName(e.target.value)} aria-invalid={!!fieldErrors.localName} />
            {fieldErrors.localName && <span style={errStyle}>{fieldErrors.localName}</span>}
          </label>

          <label className="field">
            <span className="field__label">Dirección del local</span>
            <input type="text" value={localAddress} maxLength={200} onChange={(e) => setLocalAddress(e.target.value)} />
          </label>

          <label className="field">
            <span className="field__label">
              Número de mesa<span className="field__req">*</span>
            </span>
            <input type="text" value={mesa} maxLength={10} onChange={(e) => setMesa(e.target.value)} aria-invalid={!!fieldErrors.mesa} />
            {fieldErrors.mesa && <span style={errStyle}>{fieldErrors.mesa}</span>}
          </label>

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">
                Coordinador de local<span className="field__req">*</span>
              </span>
              <input type="text" value={coordinatorName} maxLength={120} onChange={(e) => setCoordinatorName(e.target.value)} aria-invalid={!!fieldErrors.coordinatorName} />
              {fieldErrors.coordinatorName && <span style={errStyle}>{fieldErrors.coordinatorName}</span>}
            </label>
            <label className="field">
              <span className="field__label">
                Teléfono coordinador<span className="field__req">*</span>
              </span>
              <input type="tel" inputMode="tel" value={coordinatorPhone} maxLength={15} onChange={(e) => setCoordinatorPhone(e.target.value)} aria-invalid={!!fieldErrors.coordinatorPhone} />
              {fieldErrors.coordinatorPhone && <span style={errStyle}>{fieldErrors.coordinatorPhone}</span>}
            </label>
          </div>

          <label className="field field--check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Activo (visible en la consulta pública)</span>
          </label>

          <label className="field">
            <span className="field__label">Notas (internas)</span>
            <textarea value={notes} maxLength={500} rows={2} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || name.trim().length < 2 || localName.trim().length < 2 || mesa.trim() === "" || coordinatorName.trim().length < 2 || coordinatorPhone.trim() === "" || docNumber.trim() === ""}
          >
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Registrar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Crear `src/app/(admin)/personeros/page.tsx`**

```tsx
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { PersonerosClient } from "./PersonerosClient";
import type { PersoneroRow, PermFlags } from "./types";

export const metadata: Metadata = { title: "Personeros · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("personeros.read");

  const personeros = await prisma.personero.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const rows: PersoneroRow[] = personeros.map((p) => ({
    id: p.id,
    docType: p.docType,
    docNumber: p.docNumber,
    name: p.name,
    district: p.district,
    localName: p.localName,
    localAddress: p.localAddress,
    mesa: p.mesa,
    coordinatorName: p.coordinatorName,
    coordinatorPhone: p.coordinatorPhone,
    active: p.active,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    createdByName: p.createdBy?.name ?? null,
  }));

  const perms: PermFlags = {
    canRead: me.permissions.has("personeros.read"),
    canWrite: me.permissions.has("personeros.write"),
  };

  return <PersonerosClient rows={rows} perms={perms} />;
}
```

- [ ] **Step 5: Crear `src/app/(admin)/personeros/personeros.css`**

```css
/* Módulo Personeros — complementa las clases globales del admin */
.personeros {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* Mismo encuadre horizontal que .page en el resto del admin */
  padding: 0 24px 80px;
  max-width: 1600px;
}
@media (max-width: 1024px) {
  .personeros { padding: 0 16px 80px; }
}
@media (max-width: 900px) {
  .personeros { padding: 0 12px 64px; }
}
.personeros__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.personeros__head h1 { margin: 0; font-size: 22px; }
.personeros__sub { margin: 4px 0 0; color: var(--text-muted, #7a8699); font-size: 13px; }
.personeros__filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.personeros__search {
  flex: 1 1 240px; max-width: 360px; height: 36px; padding: 0 14px;
  border: 1px solid var(--border-strong, #c9d1dc); border-radius: 18px;
  background: transparent; color: inherit; font-size: 13px;
  font-family: "Google Sans Text", sans-serif; outline: none;
  transition: border-color 0.12s, background 0.12s;
}
.personeros__search:focus { border-color: var(--accent); background: var(--surface); }
.personeros__district {
  height: 36px; padding: 0 12px; border: 1px solid var(--border-strong, #c9d1dc);
  border-radius: 18px; background: transparent; color: var(--text-muted, #7a8699);
  font-size: 13px; font-family: "Google Sans Text", sans-serif; cursor: pointer; outline: none;
}
.personeros__district:focus { border-color: var(--accent); }
.personeros__name { font-weight: 500; color: var(--text, #16232f); }
.personeros__notes { color: var(--text-muted, #7a8699); font-size: 12px; margin-top: 2px; }
.personeros__doc { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.personeros__doc-num { font-variant-numeric: tabular-nums; }
.personeros__mesa { font-weight: 700; font-variant-numeric: tabular-nums; }
.personeros__actions { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
.personeros .btn--sm { padding: 5px 10px; font-size: 13px; }
.personeros__empty { text-align: center; color: var(--text-muted, #7a8699); padding: 40px 0 !important; }
.personeros__empty svg { display: block; margin: 0 auto 8px; opacity: 0.6; }
.personeros__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .personeros__row { grid-template-columns: 1fr; } }
.field--check { flex-direction: row; align-items: center; gap: 8px; }
.field--check input { width: 16px; height: 16px; }
```

- [ ] **Step 6: Añadir el ícono `id-card` en `src/components/admin/Icon.tsx`**

En el tipo `IconName` añadir `| "id-card"` (antes de `| "logo"`). En el `switch`, añadir un caso (junto a los demás):

```tsx
    case "id-card":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="11" r="2" />
          <path d="M5.3 16c.5-1.4 1.8-2.2 3.2-2.2s2.7.8 3.2 2.2M14 10h4M14 13.5h4" />
        </svg>
      );
```

- [ ] **Step 7: Añadir el ítem de navegación en `src/components/admin/data.ts`**

En `SIDEBAR_NAV`, después del ítem `simpatizantes`, añadir:

```ts
  { id: "personeros", label: "Personeros", icon: "id-card", href: "/personeros" },
```

- [ ] **Step 8: Verificar build + lint**

Run: `npm run build && npx eslint src/app/\(admin\)/personeros src/components/admin/Icon.tsx src/components/admin/data.ts`
Expected: build OK, sin errores de lint.

- [ ] **Step 9: Verificación en navegador**

Con el dev server en `http://localhost:3000`, iniciar sesión como admin y abrir `/personeros`. Verificar:
- La tabla carga con padding correcto (no pegada al borde) en escritorio y móvil (viewport 375px).
- "Registrar personero" abre el modal; crear uno con DNI de 8 dígitos guarda y aparece en la tabla.
- Editar, Activar/Desactivar (badge cambia) y Eliminar (con confirmación) funcionan.
- Crear otro con el mismo DNI muestra el error "Documento ya registrado." en el campo.
- El ítem "Personeros" aparece en el sidebar con su ícono.

- [ ] **Step 10: Commit**

```bash
git add "src/app/(admin)/personeros" src/components/admin/Icon.tsx src/components/admin/data.ts
git commit -m "feat(personeros): módulo admin CRUD con tabla, modal y navegación"
```

---

## Task 3: API pública `/api/personeros/:dni` + página `/mi-mesa`

**Files:**
- Create: `src/app/api/personeros/[dni]/route.ts`
- Create: `src/app/mi-mesa/page.tsx`
- Create: `src/app/mi-mesa/MesaLookupClient.tsx`
- Create: `src/app/mi-mesa/mi-mesa.css`

**Interfaces:**
- Consumes: `prisma.personero` (Task 1), `ok`/`fail`, `rateLimit`, `districtLabel`/`isDistrictId`.
- Produces: `GET /api/personeros/:dni` → `200 { ok:true, name, district, localName, localAddress, mesa, coordinatorName, coordinatorPhone }` | `400` DNI inválido | `404` no asignado | `429` rate-limit. Página pública `/mi-mesa`.

- [ ] **Step 1: Crear `src/app/api/personeros/[dni]/route.ts`**

```ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/app/api/v1/_lib/response";
import { rateLimit } from "@/lib/rate-limit";
import { districtLabel, isDistrictId } from "@/lib/districts";

// GET /api/personeros/:dni — consulta pública de asignación de mesa para personeros.
// Solo devuelve registros activos. Rate-limited para evitar scraping por enumeración.

const MAX_PER_IP = 20;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dni: string }> },
) {
  const { dni } = await params;
  if (!/^\d{8}$/.test(dni)) {
    return fail("DNI inválido. Debe tener 8 dígitos.", 400);
  }

  const rl = rateLimit("personero-lookup", clientIp(req), MAX_PER_IP, WINDOW_MS);
  if (!rl.allowed) {
    const res = fail("Demasiadas consultas. Intenta más tarde.", 429);
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  const p = await prisma.personero.findFirst({
    where: { docType: "dni", docNumber: dni, active: true },
  });

  if (!p) {
    return fail("Aún no apareces asignado. Contacta a tu coordinador de local.", 404);
  }

  return ok({
    name: p.name,
    district: isDistrictId(p.district) ? districtLabel(p.district) : null,
    localName: p.localName,
    localAddress: p.localAddress,
    mesa: p.mesa,
    coordinatorName: p.coordinatorName,
    coordinatorPhone: p.coordinatorPhone,
  });
}
```

- [ ] **Step 2: Crear `src/app/mi-mesa/MesaLookupClient.tsx`**

```tsx
"use client";

import { useState } from "react";
import "./mi-mesa.css";

type Result = {
  name: string;
  district: string | null;
  localName: string;
  localAddress: string | null;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
};

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.startsWith("51") ? digits : `51${digits}`;
  return `https://wa.me/${withCc}`;
}

function mapsLink(r: Result): string {
  const query = encodeURIComponent(r.localAddress || `${r.localName} Madre de Dios`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default function MesaLookupClient() {
  const [dni, setDni] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{8}$/.test(dni)) {
      setState("error");
      setMessage("El DNI debe tener 8 dígitos.");
      return;
    }
    setState("loading");
    setResult(null);
    try {
      const res = await fetch(`/api/personeros/${dni}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setResult(json as Result);
        setState("found");
      } else if (res.status === 404) {
        setState("notfound");
        setMessage(json?.error ?? "Aún no apareces asignado.");
      } else {
        setState("error");
        setMessage(json?.error ?? "No se pudo consultar. Intenta de nuevo.");
      }
    } catch {
      setState("error");
      setMessage("Sin conexión. Intenta de nuevo.");
    }
  }

  return (
    <main className="mm">
      <div className="mm__card">
        <header className="mm__brand">
          <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" />
          <div>
            <strong>Consultor de Mesa</strong>
            <span>Personeros · Ahora Nación</span>
          </div>
        </header>

        <h1 className="mm__title">¿Dónde me toca cuidar los votos?</h1>
        <p className="mm__lead">Ingresa tu DNI y te decimos tu local, tu número de mesa y el teléfono de tu coordinador.</p>

        <form className="mm__form" onSubmit={consultar} noValidate>
          <input
            className="mm__dni"
            inputMode="numeric"
            maxLength={8}
            placeholder="Tu DNI (8 dígitos)"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
          />
          <button className="mm__btn" type="submit" disabled={state === "loading"}>
            {state === "loading" ? "Consultando…" : "Consultar mi mesa"}
          </button>
        </form>

        {(state === "error" || state === "notfound") && (
          <div className={`mm__alert ${state === "notfound" ? "info" : "error"}`}>{message}</div>
        )}

        {state === "found" && result && (
          <div className="mm__result">
            <p className="mm__hi">Hola, <strong>{result.name}</strong></p>

            <div className="mm__mesa">
              <span>Mesa</span>
              <strong>{result.mesa}</strong>
            </div>

            <div className="mm__local">
              <div className="mm__local-name">{result.localName}</div>
              {result.district && <div className="mm__local-dist">{result.district}</div>}
              {result.localAddress && <div className="mm__local-addr">{result.localAddress}</div>}
              <a className="mm__link" href={mapsLink(result)} target="_blank" rel="noopener noreferrer">
                📍 Cómo llegar
              </a>
            </div>

            <div className="mm__coord">
              <div className="mm__coord-label">Coordinador de local</div>
              <div className="mm__coord-name">{result.coordinatorName}</div>
              <div className="mm__coord-actions">
                <a className="mm__call" href={`tel:${result.coordinatorPhone.replace(/\s/g, "")}`}>📞 Llamar</a>
                <a className="mm__wa" href={waLink(result.coordinatorPhone)} target="_blank" rel="noopener noreferrer">
                  💬 WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Crear `src/app/mi-mesa/page.tsx`**

```tsx
import type { Metadata } from "next";
import MesaLookupClient from "./MesaLookupClient";

export const metadata: Metadata = {
  title: "Consultor de Mesa · Personeros — Ahora Nación",
  description: "Personeros de Ahora Nación: consulta tu local, número de mesa y coordinador ingresando tu DNI.",
};

export default function Page() {
  return <MesaLookupClient />;
}
```

- [ ] **Step 4: Crear `src/app/mi-mesa/mi-mesa.css`**

```css
.mm {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: linear-gradient(160deg, #e90305 0%, #b0060c 100%);
  font-family: "Google Sans Text", system-ui, sans-serif;
}
.mm__card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 20px;
  padding: 28px 24px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}
.mm__brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.mm__brand img { width: 46px; height: 46px; object-fit: contain; }
.mm__brand strong { display: block; font-size: 15px; color: #b0060c; text-transform: uppercase; letter-spacing: 0.5px; }
.mm__brand span { font-size: 11px; color: #777; text-transform: uppercase; }
.mm__title { font-size: 22px; font-weight: 800; color: #16232f; margin: 0 0 6px; line-height: 1.2; }
.mm__lead { font-size: 14px; color: #5a6472; margin: 0 0 20px; }
.mm__form { display: flex; flex-direction: column; gap: 10px; }
.mm__dni {
  height: 52px; border: 2px solid #e3e8ef; border-radius: 12px; padding: 0 16px;
  font-size: 20px; font-variant-numeric: tabular-nums; letter-spacing: 2px; text-align: center; outline: none;
  transition: border-color 0.15s;
}
.mm__dni:focus { border-color: #e90305; }
.mm__btn {
  height: 52px; border: none; border-radius: 12px; background: #e90305; color: #fff;
  font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.15s;
}
.mm__btn:hover:not(:disabled) { background: #c40204; }
.mm__btn:disabled { opacity: 0.6; cursor: default; }
.mm__alert { margin-top: 16px; padding: 12px 14px; border-radius: 10px; font-size: 14px; }
.mm__alert.error { background: #fef2f2; color: #b91c1c; }
.mm__alert.info { background: #fffbeb; color: #92600a; }
.mm__result { margin-top: 22px; border-top: 1px solid #eef2f6; padding-top: 20px; }
.mm__hi { font-size: 15px; color: #16232f; margin: 0 0 14px; }
.mm__mesa {
  display: flex; align-items: baseline; justify-content: center; gap: 12px;
  background: #fff5f5; border: 2px solid #fed7d7; border-radius: 14px; padding: 14px; margin-bottom: 16px;
}
.mm__mesa span { font-size: 14px; color: #b0060c; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
.mm__mesa strong { font-size: 44px; color: #e90305; font-variant-numeric: tabular-nums; line-height: 1; }
.mm__local { background: #f7f9fc; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
.mm__local-name { font-weight: 700; color: #16232f; }
.mm__local-dist { font-size: 13px; color: #5a6472; margin-top: 2px; }
.mm__local-addr { font-size: 13px; color: #5a6472; margin-top: 2px; }
.mm__link { display: inline-block; margin-top: 8px; color: #e90305; font-weight: 600; font-size: 14px; text-decoration: none; }
.mm__coord { background: #f7f9fc; border-radius: 12px; padding: 14px; }
.mm__coord-label { font-size: 12px; color: #7a8699; text-transform: uppercase; letter-spacing: 0.5px; }
.mm__coord-name { font-weight: 700; color: #16232f; margin: 2px 0 10px; }
.mm__coord-actions { display: flex; gap: 10px; }
.mm__call, .mm__wa {
  flex: 1; text-align: center; padding: 11px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none;
}
.mm__call { background: #eef2f6; color: #16232f; }
.mm__wa { background: #25d366; color: #fff; }
```

- [ ] **Step 5: Verificar build + lint**

Run: `npm run build && npx eslint src/app/mi-mesa src/app/api/personeros`
Expected: build OK, sin errores de lint.

- [ ] **Step 6: Verificación en navegador (móvil y escritorio)**

Abrir `http://localhost:3000/mi-mesa`. Verificar:
- DNI del personero creado en Task 2 → muestra tarjeta con mesa grande, local, "Cómo llegar", y botones Llamar/WhatsApp con el teléfono correcto.
- DNI válido no registrado → mensaje amable "Aún no apareces asignado…".
- DNI con menos de 8 dígitos → validación "El DNI debe tener 8 dígitos.".
- Personero marcado como inactivo en el admin → devuelve 404 (no aparece).
- Comprobar `https://wa.me/51…` y `tel:` en los enlaces.

- [ ] **Step 7: Commit**

```bash
git add src/app/mi-mesa src/app/api/personeros
git commit -m "feat(mi-mesa): consulta pública de mesa por DNI para personeros"
```

---

## Task 4: Generador de foto con marco `/mi-foto`

**Files:**
- Create: `src/app/mi-foto/page.tsx`
- Create: `src/app/mi-foto/PhotoFrameClient.tsx`
- Create: `src/app/mi-foto/mi-foto.css`

**Interfaces:**
- Consumes: assets `/assets/images/logo/logo-white.png`. Sin backend.
- Produces: página pública `/mi-foto` que genera y descarga/compartre PNG 1080×1080 y 1080×1920.

- [ ] **Step 1: Crear `src/app/mi-foto/PhotoFrameClient.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./mi-foto.css";

type Format = "square" | "story";
const DIMENSIONS: Record<Format, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Cuadrado" },
  story: { w: 1080, h: 1920, label: "Historia" },
};

const RED = "#e90305";

// Dibuja el marco oficial sobre el canvas ya pintado con la foto.
// Aislada a propósito: para usar un PNG oficial luego, reemplazar el cuerpo
// por ctx.drawImage(framePng, 0, 0, w, h).
function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, logo: HTMLImageElement | null) {
  const bandH = Math.round(h * 0.17);
  const y = h - bandH;

  // Franja inferior con degradado rojo.
  const grad = ctx.createLinearGradient(0, y, 0, h);
  grad.addColorStop(0, "rgba(233,3,5,0.0)");
  grad.addColorStop(0.28, "rgba(176,6,12,0.92)");
  grad.addColorStop(1, RED);
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, bandH);

  // Borde superior de la franja.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, y + Math.round(bandH * 0.28), w, 3);

  const pad = Math.round(w * 0.05);
  const textX = pad;
  const baseY = h - Math.round(bandH * 0.30);

  // Logo (si cargó) a la derecha.
  if (logo) {
    const logoH = Math.round(bandH * 0.42);
    const logoW = logoH * (logo.width / logo.height || 1);
    ctx.drawImage(logo, w - pad - logoW, h - Math.round(bandH * 0.52), logoW, logoH);
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(w * 0.052)}px "Google Sans", system-ui, sans-serif`;
  ctx.fillText("Simón Horna Alpaca", textX, baseY);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${Math.round(w * 0.034)}px "Google Sans Text", system-ui, sans-serif`;
  ctx.fillText("#AhoraNación", textX, baseY + Math.round(w * 0.045));
}

export default function PhotoFrameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [format, setFormat] = useState<Format>("square");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0.5, y: 0.5 }); // 0..1 punto focal
  const [hasImage, setHasImage] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Precargar el logo blanco.
  useEffect(() => {
    const l = new Image();
    l.onload = () => {
      logoRef.current = l;
      setLogoReady(true);
    };
    l.src = "/assets/images/logo/logo-white.png";
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = DIMENSIONS[format];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#20242c";
    ctx.fillRect(0, 0, w, h);

    const img = imgRef.current;
    if (img) {
      // Escalado "cover" con punto focal (offset) y zoom.
      const scale = Math.max(w / img.width, h / img.height) * zoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) * offset.x;
      const dy = (h - dh) * offset.y;
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    drawFrame(ctx, w, h, logoRef.current);
  }, [format, zoom, offset, logoReady]);

  useEffect(() => {
    render();
  }, [render]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setOffset({ x: 0.5, y: 0.5 });
      setZoom(1);
      setHasImage(true);
      render();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Arrastrar para reencuadrar.
  function pointerDown(e: React.PointerEvent) {
    if (!hasImage) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function pointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = d.ox - (e.clientX - d.x) / rect.width;
    const ny = d.oy - (e.clientY - d.y) / rect.height;
    setOffset({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
  }
  function pointerUp() {
    dragRef.current = null;
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ahora-nacion-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `ahora-nacion-${format}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: "¡Ahora Nación! #SimónHorna" });
          return;
        } catch {
          /* usuario canceló: cae a descarga */
        }
      }
      download();
    }, "image/png");
  }

  return (
    <main className="mf">
      <div className="mf__card">
        <header className="mf__brand">
          <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" />
          <div>
            <strong>Tu foto de campaña</strong>
            <span>Ahora Nación · Simón Horna</span>
          </div>
        </header>

        <h1 className="mf__title">Ponle el marco oficial a tu foto</h1>
        <p className="mf__lead">Sube tu foto, ajústala y compártela en WhatsApp, Facebook e Instagram. Tu foto no se sube a ningún servidor.</p>

        <div
          className={`mf__stage mf__stage--${format}`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
        >
          <canvas ref={canvasRef} className="mf__canvas" />
          {!hasImage && <div className="mf__placeholder">Sube una foto para empezar</div>}
        </div>

        <div className="mf__formats">
          {(Object.keys(DIMENSIONS) as Format[]).map((f) => (
            <button
              key={f}
              className={`mf__chip ${format === f ? "is-active" : ""}`}
              onClick={() => setFormat(f)}
              type="button"
            >
              {DIMENSIONS[f].label}
            </button>
          ))}
        </div>

        {hasImage && (
          <label className="mf__zoom">
            <span>Zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
        )}

        <div className="mf__actions">
          <label className="mf__upload">
            {hasImage ? "Cambiar foto" : "Subir foto"}
            <input type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
          </label>
          <button className="mf__download" type="button" onClick={download} disabled={!hasImage}>
            Descargar
          </button>
          <button className="mf__share" type="button" onClick={share} disabled={!hasImage}>
            Compartir
          </button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Crear `src/app/mi-foto/page.tsx`**

```tsx
import type { Metadata } from "next";
import PhotoFrameClient from "./PhotoFrameClient";

export const metadata: Metadata = {
  title: "Tu foto con marco · Ahora Nación",
  description: "Súmate a la campaña: ponle el marco oficial de Ahora Nación a tu foto y compártela.",
};

export default function Page() {
  return <PhotoFrameClient />;
}
```

- [ ] **Step 3: Crear `src/app/mi-foto/mi-foto.css`**

```css
.mf {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: linear-gradient(160deg, #16232f 0%, #20242c 100%);
  font-family: "Google Sans Text", system-ui, sans-serif;
}
.mf__card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 20px;
  padding: 24px 22px 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.mf__brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.mf__brand img { width: 44px; height: 44px; object-fit: contain; }
.mf__brand strong { display: block; font-size: 14px; color: #b0060c; text-transform: uppercase; letter-spacing: 0.5px; }
.mf__brand span { font-size: 11px; color: #777; text-transform: uppercase; }
.mf__title { font-size: 21px; font-weight: 800; color: #16232f; margin: 0 0 6px; line-height: 1.2; }
.mf__lead { font-size: 13.5px; color: #5a6472; margin: 0 0 18px; }
.mf__stage {
  position: relative;
  margin: 0 auto 14px;
  border-radius: 14px;
  overflow: hidden;
  background: #20242c;
  touch-action: none;
  cursor: grab;
  width: 100%;
}
.mf__stage--square { aspect-ratio: 1 / 1; max-width: 360px; }
.mf__stage--story { aspect-ratio: 9 / 16; max-width: 260px; }
.mf__canvas { width: 100%; height: 100%; display: block; }
.mf__placeholder {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #9aa4b2; font-size: 14px; pointer-events: none;
}
.mf__formats { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; }
.mf__chip {
  border: 1.5px solid #e3e8ef; background: #fff; color: #5a6472; border-radius: 999px;
  padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.mf__chip.is-active { border-color: #e90305; color: #e90305; background: #fff5f5; }
.mf__zoom { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.mf__zoom span { font-size: 13px; color: #5a6472; font-weight: 600; }
.mf__zoom input { flex: 1; accent-color: #e90305; }
.mf__actions { display: flex; gap: 10px; }
.mf__upload, .mf__download, .mf__share {
  flex: 1; text-align: center; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 14px;
  cursor: pointer; border: none;
}
.mf__upload { background: #eef2f6; color: #16232f; }
.mf__download { background: #16232f; color: #fff; }
.mf__share { background: #e90305; color: #fff; }
.mf__download:disabled, .mf__share:disabled { opacity: 0.5; cursor: default; }
```

- [ ] **Step 4: Verificar build + lint**

Run: `npm run build && npx eslint src/app/mi-foto`
Expected: build OK, sin errores de lint.

- [ ] **Step 5: Verificación en navegador (idealmente móvil)**

Abrir `http://localhost:3000/mi-foto`. Verificar:
- Subir una foto la muestra en el lienzo con la franja roja inferior + "Simón Horna Alpaca" + "#AhoraNación" + logo blanco.
- Cambiar a "Historia" reencuadra a 9:16; el marco se mantiene proporcional.
- Zoom y arrastrar reencuadran la foto.
- "Descargar" baja un PNG (`ahora-nacion-square.png` / `-story.png`) con el marco quemado.
- En móvil, "Compartir" abre la hoja nativa con la imagen; en escritorio sin soporte, cae a descarga.

- [ ] **Step 6: Commit**

```bash
git add src/app/mi-foto
git commit -m "feat(mi-foto): generador de foto con marco oficial en canvas"
```

---

## Task 5: Enlaces en el header del landing

**Files:**
- Modify: `src/components/landing/layout/Header.jsx`

**Interfaces:**
- Consumes: rutas `/mi-mesa` y `/mi-foto` (Tasks 3–4).
- Produces: enlaces de navegación visibles en escritorio y móvil.

- [ ] **Step 1: Añadir enlaces en el menú de escritorio**

En `Header.jsx`, dentro de `<ul className="nav-menu d-xl-flex ...">`, **después** del `{navItems.map(...)}` (cerrando el map, antes de `</ul>`), añadir dos items estáticos (son rutas, no anclas de scroll):

```jsx
              <li className="nav-menu__item" style={{ flexShrink: 0 }}>
                <a href="/mi-mesa" className="nav-menu__link text-heading" style={{ whiteSpace: 'nowrap', fontSize: '14px', padding: '8px 12px', color: '#222', fontWeight: 500, textDecoration: 'none' }}>
                  Consultor de Mesa
                </a>
              </li>
              <li className="nav-menu__item" style={{ flexShrink: 0 }}>
                <a href="/mi-foto" className="nav-menu__link text-heading" style={{ whiteSpace: 'nowrap', fontSize: '14px', padding: '8px 12px', color: '#222', fontWeight: 500, textDecoration: 'none' }}>
                  Foto con Marco
                </a>
              </li>
```

- [ ] **Step 2: Añadir enlaces en el menú móvil**

En `Header.jsx`, dentro de `<ul className="nav-menu d-block p-0" ...>`, después del `{navItems.map(...)}` que renderiza los items móviles (antes de `</ul>`), añadir:

```jsx
              <li className="nav-menu__item" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <a href="/mi-mesa" onClick={() => setMobileOpen(false)} className="nav-menu__link text-heading d-block py-3 px-3" style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: 500, borderRadius: '6px', textDecoration: 'none' }}>
                  Consultor de Mesa
                </a>
              </li>
              <li className="nav-menu__item" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <a href="/mi-foto" onClick={() => setMobileOpen(false)} className="nav-menu__link text-heading d-block py-3 px-3" style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: 500, borderRadius: '6px', textDecoration: 'none' }}>
                  Foto con Marco
                </a>
              </li>
```

- [ ] **Step 3: Verificar build + lint**

Run: `npm run build && npx eslint src/components/landing/layout/Header.jsx`
Expected: build OK, sin errores de lint.

- [ ] **Step 4: Verificación en navegador**

Abrir `http://localhost:3000/`. Verificar en escritorio y móvil (viewport 375px) que aparecen "Consultor de Mesa" y "Foto con Marco" en el menú, y que navegan a `/mi-mesa` y `/mi-foto` respectivamente.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/layout/Header.jsx
git commit -m "feat(landing): enlaces a Consultor de Mesa y Foto con Marco en el header"
```

---

## Self-Review (completado por el autor del plan)

**1. Cobertura del spec:**
- Modelo `Personero` + RBAC → Task 1. ✓
- CRUD admin `/personeros` (tabla, buscar por nombre/DNI, filtro distrito, modal, activar/desactivar, eliminar) → Task 2. ✓
- Ícono nuevo + nav → Task 2. ✓
- Padding correcto desde el inicio (aprendizaje del bug de simpatizantes) → Task 2, Step 5. ✓
- API pública `GET /api/personeros/:dni` con rate-limit, 400/404/429, solo activos, datos completos → Task 3. ✓
- Página `/mi-mesa` con mesa destacada, cómo llegar, llamar, WhatsApp → Task 3. ✓
- `/mi-foto` 100% cliente, canvas, formatos cuadrado+historia, zoom, arrastre, descargar, compartir, marco por código aislado → Task 4. ✓
- Marco con logo + "Simón Horna Alpaca" + "#AhoraNación" → Task 4, `drawFrame`. ✓
- Enlaces en el landing → Task 5. ✓
- YAGNI: sin import CSV, sin storage de fotos, sin perfil circular, sin historial. ✓

**2. Placeholders:** ninguno — todo el código está completo e inline.

**3. Consistencia de tipos:** `PersoneroInput`/`PersoneroRow`/`ActionResult` usados igual en types.ts, actions.ts, page.tsx y PersonerosClient.tsx. Acciones: `createPersonero`, `updatePersonero`, `setPersoneroActive`, `deletePersonero` — mismos nombres en actions.ts y su import en el cliente. La forma de respuesta de la API (`name, district, localName, localAddress, mesa, coordinatorName, coordinatorPhone`) coincide con el tipo `Result` de `MesaLookupClient`. Ícono `id-card` añadido al union y al switch antes de usarse en data.ts y PersonerosClient.
