"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Vote,
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  UserCheck,
  Phone,
  Filter,
  Edit2,
  Save,
  Trash2,
  ExternalLink,
  Camera,
  School,
  Users,
  MessageCircle,
  Check,
  Loader2,
  UserPlus,
} from "lucide-react";
import type { ElectoralLocalData, PersoneroRow, PermFlags, PersoneroMini } from "./types";
import { DISTRICTS, districtLabel } from "@/lib/districts";
import {
  updateLocalCoordinator,
  updateLocal,
  updateMesa,
  unassignPersoneroFromMesa,
  assignPersoneroToMesa,
  createPersonero,
} from "./actions";
import { parseCoordinates, getGoogleMapsUrl } from "@/lib/geo";
import { confirmAction, toastSuccess, toastError } from "@/lib/alerts";

type Props = {
  locales: ElectoralLocalData[];
  personeros: PersoneroRow[];
  onAssignMesa?: (mesaNum: string, localName: string, role?: "titular" | "suplente") => void;
  onCoordinatorUpdated?: (localId: string, name: string, phone: string) => void;
  onLocalUpdated?: (local: ElectoralLocalData) => void;
  perms?: PermFlags;
};

export function MesasView({
  locales,
  personeros,
  onAssignMesa,
  onCoordinatorUpdated,
  onLocalUpdated,
  perms,
}: Props) {
  const [localItems, setLocalItems] = useState<ElectoralLocalData[]>(locales);
  useEffect(() => {
    setLocalItems(locales);
  }, [locales]);

  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "empty" | "without-suplente" | "full">("all");
  const [coordFilter, setCoordFilter] = useState<"all" | "with" | "without">("all");
  const [selectedMesa, setSelectedMesa] = useState<any | null>(null);

  // Modal para editar coordinador del colegio
  const [editingLocalCoord, setEditingLocalCoord] = useState<ElectoralLocalData | null>(null);
  const [coordName, setCoordName] = useState("");
  const [coordPhone, setCoordPhone] = useState("");
  const [savingCoord, setSavingCoord] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);

  // Modal para editar colegio completo
  const [editingLocal, setEditingLocal] = useState<ElectoralLocalData | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editProvince, setEditProvince] = useState("Tambopata");
  const [editLat, setEditLat] = useState<string>("");
  const [editLng, setEditLng] = useState<string>("");
  const [mapsInput, setMapsInput] = useState("");
  const [savingLocal, setSavingLocal] = useState(false);
  const [localEditMsg, setLocalEditMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Modal para editar mesa (aula, autoridades ONPE)
  const [editingMesaInline, setEditingMesaInline] = useState(false);
  const [mesaAula, setMesaAula] = useState("");
  const [mesaPres, setMesaPres] = useState("");
  const [mesaSec, setMesaSec] = useState("");
  const [mesaSupl, setMesaSupl] = useState("");
  const [savingMesa, setSavingMesa] = useState(false);

  // Lista de personeros registrados
  const [personeroItems, setPersoneroItems] = useState<PersoneroRow[]>(personeros);
  useEffect(() => {
    setPersoneroItems(personeros);
  }, [personeros]);

  // Modal para Asignar Personero (Titular / Suplente)
  const [assignModal, setAssignModal] = useState<{
    mesaNum: string;
    localName: string;
    role: "titular" | "suplente";
    aula?: string;
  } | null>(null);
  const [assignTab, setAssignTab] = useState<"search" | "new">("search");
  const [assignSearch, setAssignSearch] = useState("");
  const [assignOnlyFree, setAssignOnlyFree] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Formulario de registro rápido de personero nuevo
  const [newDocNumber, setNewDocNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newDniLookup, setNewDniLookup] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [savingNewPersonero, setSavingNewPersonero] = useState(false);
  const [newPersoneroError, setNewPersoneroError] = useState<string | null>(null);

  // Autocompletado de DNI para nuevo personero
  useEffect(() => {
    const doc = newDocNumber.trim();
    if (!/^\d{8}$/.test(doc)) {
      setNewDniLookup("idle");
      return;
    }
    const ctrl = new AbortController();
    setNewDniLookup("loading");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dni/${doc}`, { signal: ctrl.signal });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok && typeof json.name === "string" && json.name) {
          setNewName((prev) => (prev.trim() === "" ? json.name : prev));
          setNewDniLookup("found");
        } else {
          setNewDniLookup(res.status === 404 ? "notfound" : "error");
        }
      } catch {
        if (!ctrl.signal.aborted) setNewDniLookup("error");
      }
    }, 350);

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [newDocNumber]);

  function openAssignModal(mesaNum: string, localName: string, role: "titular" | "suplente", aula?: string | null) {
    setAssignModal({
      mesaNum,
      localName,
      role,
      aula: aula || undefined,
    });
    setAssignTab("search");
    setAssignSearch("");
    setAssignOnlyFree(true);
    setNewDocNumber("");
    setNewName("");
    setNewPhone("");
    setNewDistrict("");
    setNewPersoneroError(null);
    setNewDniLookup("idle");
  }

  // Candidatos filtrados para asignación
  const personerosDisponibles = useMemo(() => {
    return personeroItems.filter(
      (p) => !p.mesa || p.mesa.trim() === "" || p.mesa === "-" || p.mesa === "0"
    );
  }, [personeroItems]);

  const filteredAssignCandidates = useMemo(() => {
    const term = assignSearch.trim().toLowerCase();
    return personeroItems.filter((p) => {
      const isFree = !p.mesa || p.mesa.trim() === "" || p.mesa === "-" || p.mesa === "0";
      if (assignOnlyFree && !isFree) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.docNumber.includes(term) ||
        (p.phone && p.phone.includes(term))
      );
    });
  }, [personeroItems, assignSearch, assignOnlyFree]);

  async function handleAssignExistingPersonero(p: PersoneroRow) {
    if (!assignModal) return;
    setAssigningId(p.id);

    const res = await assignPersoneroToMesa(
      p.id,
      assignModal.mesaNum,
      assignModal.aula,
      assignModal.localName,
      undefined,
      assignModal.role
    );

    if (res.ok) {
      toastSuccess(`¡${p.name} asignado como ${assignModal.role} a la mesa ${assignModal.mesaNum}!`);

      // 1. Actualizar personeroItems
      setPersoneroItems((prev) =>
        prev.map((item) =>
          item.id === p.id
            ? {
                ...item,
                mesa: assignModal.mesaNum,
                role: assignModal.role,
                isSuplente: assignModal.role === "suplente",
                localName: assignModal.localName,
              }
            : item
        )
      );

      // 2. Actualizar localItems
      setLocalItems((prev) =>
        prev.map((loc) => {
          let hasMesa = false;
          const newMesas = loc.mesas.map((m) => {
            if (m.number !== assignModal.mesaNum) return m;
            hasMesa = true;
            const newTitular: PersoneroRow["role"] extends string
              ? import("./types").PersoneroMini
              : never =
              assignModal.role === "titular"
                ? {
                    id: p.id,
                    name: p.name,
                    phone: p.phone,
                    aula: assignModal.aula || m.aula || null,
                    role: "titular",
                    isSuplente: false,
                    whatsappNotifiedAt: p.whatsappNotifiedAt || null,
                  }
                : m.titular || {
                    id: "",
                    name: "",
                    phone: null,
                    aula: null,
                    role: "titular",
                    whatsappNotifiedAt: null,
                  };

            const titularObj = assignModal.role === "titular" ? newTitular : m.titular || null;

            const newSuplente =
              assignModal.role === "suplente"
                ? {
                    id: p.id,
                    name: p.name,
                    phone: p.phone,
                    aula: assignModal.aula || m.aula || null,
                    role: "suplente",
                    isSuplente: true,
                    whatsappNotifiedAt: p.whatsappNotifiedAt || null,
                  }
                : m.suplente || null;

            return {
              ...m,
              titular: titularObj,
              suplente: newSuplente,
              personero: titularObj || newSuplente || null,
            };
          });

          if (!hasMesa) return loc;

          const cubiertas = newMesas.filter((m) => !!m.titular).length;
          const suplentes = newMesas.filter((m) => !!m.suplente).length;

          return {
            ...loc,
            mesas: newMesas,
            cubiertasCount: cubiertas,
            cubiertasSuplenteCount: suplentes,
          };
        })
      );

      // 3. Actualizar selectedMesa si está abierto
      setSelectedMesa((prev: any) => {
        if (!prev || prev.mesa.number !== assignModal.mesaNum) return prev;
        const updatedTitular =
          assignModal.role === "titular"
            ? { id: p.id, name: p.name, phone: p.phone, aula: assignModal.aula || prev.mesa.aula || null, role: "titular" }
            : prev.mesa.titular;
        const updatedSuplente =
          assignModal.role === "suplente"
            ? { id: p.id, name: p.name, phone: p.phone, aula: assignModal.aula || prev.mesa.aula || null, role: "suplente" }
            : prev.mesa.suplente;
        return {
          ...prev,
          mesa: {
            ...prev.mesa,
            titular: updatedTitular,
            suplente: updatedSuplente,
            personero: updatedTitular || updatedSuplente || null,
          },
        };
      });

      setAssignModal(null);
    } else {
      toastError(res.error || "No se pudo asignar al personero");
    }
    setAssigningId(null);
  }

  async function handleCreateAndAssignPersonero() {
    if (!assignModal) return;
    if (!newDocNumber.trim() || !/^\d{8}$/.test(newDocNumber.trim())) {
      setNewPersoneroError("El DNI debe tener 8 dígitos.");
      return;
    }
    if (!newName.trim()) {
      setNewPersoneroError("Ingresa el nombre del personero.");
      return;
    }

    setSavingNewPersonero(true);
    setNewPersoneroError(null);

    const res = await createPersonero({
      docType: "dni",
      docNumber: newDocNumber.trim(),
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      district: newDistrict || undefined,
      localName: assignModal.localName,
      mesa: assignModal.mesaNum,
      aula: assignModal.aula || undefined,
      role: assignModal.role,
      isSuplente: assignModal.role === "suplente",
      coordinatorName: "",
      coordinatorPhone: "",
      active: true,
    });

    if (res.ok && res.data) {
      const newId = res.data.id;
      toastSuccess(`¡Personero registrado y asignado como ${assignModal.role} a la mesa ${assignModal.mesaNum}!`);

      const newRow: PersoneroRow = {
        id: newId,
        docType: "dni",
        docNumber: newDocNumber.trim(),
        name: newName.trim(),
        phone: newPhone.trim() || null,
        source: "admin",
        district: newDistrict || null,
        localName: assignModal.localName,
        localAddress: null,
        mesa: assignModal.mesaNum,
        aula: assignModal.aula || null,
        role: assignModal.role,
        isSuplente: assignModal.role === "suplente",
        coordinatorName: "",
        coordinatorPhone: "",
        active: true,
        notes: null,
        whatsappNotifiedAt: null,
        credentialToken: null,
        isMesaMember: false,
        createdAt: new Date().toISOString(),
        createdByName: null,
      };

      setPersoneroItems((prev) => [newRow, ...prev]);

      setLocalItems((prev) =>
        prev.map((loc) => {
          let hasMesa = false;
          const newMesas = loc.mesas.map((m) => {
            if (m.number !== assignModal.mesaNum) return m;
            hasMesa = true;
            const newTitular: PersoneroMini | null =
              assignModal.role === "titular"
                ? {
                    id: newId,
                    name: newName.trim(),
                    phone: newPhone.trim() || null,
                    aula: assignModal.aula || m.aula || null,
                    role: "titular",
                    isSuplente: false,
                    whatsappNotifiedAt: null,
                  }
                : m.titular ?? null;
            const newSuplente: PersoneroMini | null =
              assignModal.role === "suplente"
                ? {
                    id: newId,
                    name: newName.trim(),
                    phone: newPhone.trim() || null,
                    aula: assignModal.aula || m.aula || null,
                    role: "suplente",
                    isSuplente: true,
                    whatsappNotifiedAt: null,
                  }
                : m.suplente ?? null;
            return {
              ...m,
              titular: newTitular,
              suplente: newSuplente,
              personero: newTitular || newSuplente || null,
            };
          });

          if (!hasMesa) return loc;

          const cubiertas = newMesas.filter((m) => !!m.titular).length;
          const suplentes = newMesas.filter((m) => !!m.suplente).length;

          return {
            ...loc,
            mesas: newMesas,
            cubiertasCount: cubiertas,
            cubiertasSuplenteCount: suplentes,
          };
        })
      );

      setSelectedMesa((prev: any) => {
        if (!prev || prev.mesa.number !== assignModal.mesaNum) return prev;
        const updatedTitular: PersoneroMini | null =
          assignModal.role === "titular"
            ? {
                id: newId,
                name: newName.trim(),
                phone: newPhone.trim() || null,
                aula: assignModal.aula || prev.mesa.aula || null,
                role: "titular",
                isSuplente: false,
                whatsappNotifiedAt: null,
              }
            : prev.mesa.titular ?? null;
        const updatedSuplente: PersoneroMini | null =
          assignModal.role === "suplente"
            ? {
                id: newId,
                name: newName.trim(),
                phone: newPhone.trim() || null,
                aula: assignModal.aula || prev.mesa.aula || null,
                role: "suplente",
                isSuplente: true,
                whatsappNotifiedAt: null,
              }
            : prev.mesa.suplente ?? null;
        return {
          ...prev,
          mesa: {
            ...prev.mesa,
            titular: updatedTitular,
            suplente: updatedSuplente,
            personero: updatedTitular || updatedSuplente || null,
          },
        };
      });

      setAssignModal(null);
    } else {
      const msg = (!res.ok ? res.error : "") || "Error al registrar y asignar personero.";
      setNewPersoneroError(msg);
      toastError(msg);
    }
    setSavingNewPersonero(false);
  }

  function openCoordModal(loc: ElectoralLocalData) {
    setEditingLocalCoord(loc);
    setCoordName(loc.coordinatorName || "");
    setCoordPhone(loc.coordinatorPhone || "");
    setCoordError(null);
  }

  function openEditLocalModal(loc: ElectoralLocalData) {
    setEditingLocal(loc);
    setEditName(loc.name);
    setEditCode(loc.code || "");
    setEditAddress(loc.address || "");
    setEditDistrict(loc.district || "");
    setEditProvince(loc.province || "Tambopata");
    setEditLat(loc.latitude !== null ? String(loc.latitude) : "");
    setEditLng(loc.longitude !== null ? String(loc.longitude) : "");
    setMapsInput("");
    setLocalEditMsg(null);
  }

  function handleParseMapsLink() {
    const parsed = parseCoordinates(mapsInput);
    if (parsed) {
      setEditLat(String(parsed.lat));
      setEditLng(String(parsed.lng));
      setLocalEditMsg({
        kind: "success",
        text: `Coordenadas extraídas: ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`,
      });
    } else {
      setLocalEditMsg({
        kind: "error",
        text: "No se reconocieron coordenadas en el enlace o texto ingresado.",
      });
    }
  }

  async function handleSaveLocal() {
    if (!editingLocal) return;
    if (!editName.trim()) {
      setLocalEditMsg({ kind: "error", text: "El nombre del colegio es obligatorio." });
      return;
    }

    const latNum = editLat.trim() ? parseFloat(editLat.trim()) : null;
    const lngNum = editLng.trim() ? parseFloat(editLng.trim()) : null;

    if ((latNum !== null && isNaN(latNum)) || (lngNum !== null && isNaN(lngNum))) {
      setLocalEditMsg({ kind: "error", text: "Las coordenadas deben ser números válidos." });
      return;
    }

    setSavingLocal(true);
    setLocalEditMsg(null);

    const res = await updateLocal(editingLocal.id, {
      name: editName.trim(),
      code: editCode.trim() || undefined,
      address: editAddress.trim() || null,
      district: editDistrict || undefined,
      province: editProvince || undefined,
      latitude: latNum,
      longitude: lngNum,
    });

    if (res.ok) {
      const updated: ElectoralLocalData = {
        ...editingLocal,
        name: editName.trim(),
        code: editCode.trim(),
        address: editAddress.trim() || null,
        district: editDistrict,
        province: editProvince,
        latitude: latNum,
        longitude: lngNum,
      };

      setLocalItems((prev) => prev.map((l) => (l.id === editingLocal.id ? updated : l)));
      onLocalUpdated?.(updated);
      toastSuccess("Datos del colegio actualizados con éxito");
      setEditingLocal(null);
    } else {
      const msg = res.error || "Error al actualizar datos del colegio.";
      setLocalEditMsg({ kind: "error", text: msg });
      toastError(msg);
    }
    setSavingLocal(false);
  }

  async function handleSaveLocalCoord() {
    if (!editingLocalCoord) return;
    if (!coordName.trim()) {
      setCoordError("Ingresa el nombre del coordinador.");
      return;
    }
    setSavingCoord(true);
    setCoordError(null);
    const res = await updateLocalCoordinator(editingLocalCoord.id, coordName.trim(), coordPhone.trim());
    if (res.ok) {
      setLocalItems((prev) =>
        prev.map((loc) =>
          loc.id === editingLocalCoord.id
            ? { ...loc, coordinatorName: coordName.trim(), coordinatorPhone: coordPhone.trim() }
            : loc
        )
      );
      onCoordinatorUpdated?.(editingLocalCoord.id, coordName.trim(), coordPhone.trim());
      toastSuccess("Coordinador del colegio guardado con éxito");
      setEditingLocalCoord(null);
    } else {
      const msg = res.error || "Error al guardar el coordinador.";
      setCoordError(msg);
      toastError(msg);
    }
    setSavingCoord(false);
  }

  async function handleUnassignPersonero(personeroId: string, mesaNum: string, isSupl: boolean) {
    const roleLabel = isSupl ? "personero suplente" : "personero titular";
    const confirmed = await confirmAction({
      title: "¿Desasignar personero?",
      text: `¿Estás seguro de retirar al ${roleLabel} de la mesa ${mesaNum}?`,
      confirmButtonText: "Sí, desasignar",
      isDanger: true,
    });
    if (!confirmed) return;

    const res = await unassignPersoneroFromMesa(personeroId);
    if (res.ok) {
      toastSuccess("Personero desasignado correctamente");
      setLocalItems((prev) =>
        prev.map((loc) => ({
          ...loc,
          mesas: loc.mesas.map((m) => {
            if (m.number !== mesaNum) return m;
            return {
              ...m,
              titular: isSupl ? m.titular : null,
              suplente: isSupl ? null : m.suplente,
              personero: isSupl ? (m.titular || null) : (m.suplente || null),
            };
          }),
        }))
      );
      setSelectedMesa((prev: any) => {
        if (!prev || prev.mesa.number !== mesaNum) return prev;
        return {
          ...prev,
          mesa: {
            ...prev.mesa,
            titular: isSupl ? prev.mesa.titular : null,
            suplente: isSupl ? null : prev.mesa.suplente,
            personero: isSupl ? (prev.mesa.titular || null) : (prev.mesa.suplente || null),
          },
        };
      });
    } else {
      toastError(res.error || "No se pudo desasignar al personero");
    }
  }

  async function handleSaveMesaDetails() {
    if (!selectedMesa) return;
    setSavingMesa(true);
    const res = await updateMesa(selectedMesa.mesa.number, {
      aula: mesaAula,
      onpePresidente: mesaPres,
      onpeSecretario: mesaSec,
      onpeSuplentes: mesaSupl,
    });
    if (res.ok) {
      toastSuccess("Detalles de la mesa guardados con éxito");
      setLocalItems((prev) =>
        prev.map((loc) => ({
          ...loc,
          mesas: loc.mesas.map((m) =>
            m.number === selectedMesa.mesa.number
              ? {
                  ...m,
                  aula: mesaAula || null,
                  onpePresidente: mesaPres || null,
                  onpeSecretario: mesaSec || null,
                  onpeSuplentes: mesaSupl || null,
                }
              : m
          ),
        }))
      );
      setSelectedMesa((prev: any) => ({
        ...prev,
        mesa: {
          ...prev.mesa,
          aula: mesaAula || null,
          onpePresidente: mesaPres || null,
          onpeSecretario: mesaSec || null,
          onpeSuplentes: mesaSupl || null,
        },
      }));
      setEditingMesaInline(false);
    } else {
      toastError(res.error || "Error al actualizar los detalles de la mesa");
    }
    setSavingMesa(false);
  }

  // Filtrado de colegios
  const filteredLocales = useMemo(() => {
    const term = q.trim().toLowerCase();
    return localItems
      .map((loc) => {
        const matchesDistrict = district === "" || loc.district === district;
        const matchesProvince = province === "" || loc.province === province;
        if (!matchesDistrict || !matchesProvince) return null;

        const hasCoord = !!loc.coordinatorName;
        if (coordFilter === "with" && !hasCoord) return null;
        if (coordFilter === "without" && hasCoord) return null;

        // Filtrar mesas dentro del colegio
        const matchingMesas = loc.mesas.filter((m) => {
          const titular = m.titular || (m.personero && !m.personero.isSuplente ? m.personero : null);
          const suplente = m.suplente || (m.personero && m.personero.isSuplente ? m.personero : null);

          const hasTitular = !!titular;
          const hasSuplente = !!suplente;
          const isComplete = hasTitular && hasSuplente;

          if (filterStatus === "empty" && hasTitular) return false;
          if (filterStatus === "without-suplente" && (!hasTitular || hasSuplente)) return false;
          if (filterStatus === "full" && !isComplete) return false;

          if (term === "") return true;
          return (
            m.number.includes(term) ||
            loc.name.toLowerCase().includes(term) ||
            (loc.coordinatorName && loc.coordinatorName.toLowerCase().includes(term)) ||
            (titular?.name && titular.name.toLowerCase().includes(term)) ||
            (suplente?.name && suplente.name.toLowerCase().includes(term))
          );
        });

        if (
          term !== "" &&
          matchingMesas.length === 0 &&
          !loc.name.toLowerCase().includes(term) &&
          !(loc.coordinatorName && loc.coordinatorName.toLowerCase().includes(term))
        ) {
          return null;
        }

        return {
          ...loc,
          displayMesas: matchingMesas,
        };
      })
      .filter(Boolean) as (ElectoralLocalData & { displayMesas: any[] })[];
  }, [localItems, q, district, province, filterStatus, coordFilter]);

  // Provincias únicas ordenadas
  const availableProvincias = useMemo(() => {
    const set = new Set<string>();
    localItems.forEach((l) => {
      if (l.province) set.add(l.province);
    });
    return Array.from(set).sort();
  }, [localItems]);

  // Distritos filtrados según la provincia seleccionada
  const availableDistritos = useMemo(() => {
    return DISTRICTS.filter((d) => !province || d.province === province);
  }, [province]);

  // Conteo de locales por distrito
  const localCountByDistrict = useMemo(() => {
    const map = new Map<string, number>();
    localItems.forEach((l) => {
      map.set(l.district, (map.get(l.district) || 0) + 1);
    });
    return map;
  }, [localItems]);

  // Total de locales en el ámbito actual
  const totalLocalesInScope = useMemo(() => {
    return localItems.filter((l) => !province || l.province === province).length;
  }, [localItems, province]);

  // Estadísticas dinámicas de mesas dentro del ámbito seleccionado
  const mesaStats = useMemo(() => {
    let total = 0;
    let sinTitular = 0;
    let faltaSuplente = 0;
    let completas = 0;

    localItems.forEach((loc) => {
      if (province && loc.province !== province) return;
      if (district && loc.district !== district) return;

      loc.mesas.forEach((m) => {
        total++;
        const hasTitular = !!(m.titular || (m.personero && !m.personero.isSuplente ? m.personero : null));
        const hasSuplente = !!(m.suplente || (m.personero && m.personero.isSuplente ? m.personero : null));

        if (!hasTitular) {
          sinTitular++;
        } else if (!hasSuplente) {
          faltaSuplente++;
        } else {
          completas++;
        }
      });
    });

    return { total, sinTitular, faltaSuplente, completas };
  }, [localItems, province, district]);

  // Estadísticas dinámicas de colegios dentro del ámbito seleccionado
  const colegioStats = useMemo(() => {
    const inScope = localItems.filter((loc) => {
      if (province && loc.province !== province) return false;
      if (district && loc.district !== district) return false;
      return true;
    });
    const withCoord = inScope.filter((l) => !!l.coordinatorName).length;
    return {
      total: inScope.length,
      withCoord,
      withoutCoord: inScope.length - withCoord,
    };
  }, [localItems, province, district]);

  const hasActiveFilters = q || district || province || filterStatus !== "all" || coordFilter !== "all";

  function clearFilters() {
    setQ("");
    setDistrict("");
    setProvince("");
    setFilterStatus("all");
    setCoordFilter("all");
  }

  return (
    <div className="mesas-matrix-container">
      {/* Barra de Búsqueda y Filtros */}
      <div className="mesas-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por N° de mesa (ej. 067000), colegio o personero..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          value={province}
          onChange={(e) => {
            const nextProv = e.target.value;
            setProvince(nextProv);
            if (nextProv && district) {
              const d = DISTRICTS.find((item) => item.id === district);
              if (d && d.province !== nextProv) setDistrict("");
            }
          }}
          className="filter-select"
        >
          <option value="">Todas las Provincias ({availableProvincias.length})</option>
          {availableProvincias.map((p) => {
            const count = localItems.filter((l) => l.province === p).length;
            return (
              <option key={p} value={p}>
                {p} ({count} {count === 1 ? "local" : "locales"})
              </option>
            );
          })}
        </select>

        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los Distritos ({totalLocalesInScope} locales)</option>
          {availableDistritos.map((d) => {
            const count = localCountByDistrict.get(d.id) || 0;
            return (
              <option key={d.id} value={d.id}>
                {d.label} ({count} {count === 1 ? "local" : "locales"})
              </option>
            );
          })}
        </select>

        <div className="status-pills">
          <button
            type="button"
            className={`status-pill ${filterStatus === "all" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            Todas ({mesaStats.total})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--red ${filterStatus === "empty" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("empty")}
          >
            Sin Titular ({mesaStats.sinTitular})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--yellow ${filterStatus === "without-suplente" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("without-suplente")}
          >
            Falta Suplente ({mesaStats.faltaSuplente})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--green ${filterStatus === "full" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("full")}
          >
            100% Completas ({mesaStats.completas})
          </button>
        </div>

        {/* Filtro de Coordinadores de Colegio */}
        <div className="status-pills status-pills--coords" style={{ borderLeft: "1px solid var(--border, #cbd5e1)", paddingLeft: "8px" }}>
          <button
            type="button"
            className={`status-pill ${coordFilter === "all" ? "status-pill--active" : ""}`}
            onClick={() => setCoordFilter("all")}
          >
            Colegios ({colegioStats.total})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--green ${coordFilter === "with" ? "status-pill--active" : ""}`}
            onClick={() => setCoordFilter("with")}
          >
            Con Coord. ({colegioStats.withCoord})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--yellow ${coordFilter === "without" ? "status-pill--active" : ""}`}
            onClick={() => setCoordFilter("without")}
          >
            Sin Coord. ({colegioStats.withoutCoord})
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn--xs btn--outline"
            onClick={clearFilters}
            style={{ fontSize: "11px" }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Cuadrícula de Colegios y sus Mesas */}
      {filteredLocales.length === 0 ? (
        <div
          className="personeros__empty"
          style={{
            padding: "48px 16px",
            background: "var(--surface, #fff)",
            borderRadius: "14px",
            border: "1px dashed var(--border, #cbd5e1)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Building2 size={36} style={{ color: "var(--text-muted, #94a3b8)" }} />
          <h4 style={{ margin: "0", fontSize: "16px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
            No se encontraron colegios ni mesas
          </h4>
          <p style={{ margin: "0", fontSize: "13px", color: "var(--text-muted, #64748b)", maxWidth: "380px" }}>
            No hay locales que coincidan con los filtros de búsqueda o ubicación seleccionados.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={clearFilters}
              style={{ marginTop: "8px" }}
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="locales-cards-grid">
          {filteredLocales.map((loc) => {
            const totalMesas = loc.totalMesas || loc.mesas.length;
            const titularesCount = loc.mesas.filter(
              (m) => !!(m.titular || (m.personero && !m.personero.isSuplente))
            ).length;
            const suplentesCount = loc.mesas.filter(
              (m) => !!(m.suplente || (m.personero && m.personero.isSuplente))
            ).length;
            const completasCount = loc.mesas.filter((m) => {
              const t = m.titular || (m.personero && !m.personero.isSuplente);
              const s = m.suplente || (m.personero && m.personero.isSuplente);
              return !!t && !!s;
            }).length;

            const pct = totalMesas > 0 ? Math.round((titularesCount / totalMesas) * 100) : 0;
            const is100 = pct === 100 && completasCount === totalMesas;

            return (
              <div key={loc.id} className={`local-card ${is100 ? "local-card--complete" : ""}`}>
                {/* Cabecera de la Institución Educativa */}
                <div className="local-card__head">
                  <div className="local-card__identity">
                    <div className="local-card__icon-badge" title="Centro de Votación">
                      <School size={18} />
                    </div>
                    <div className="local-card__titles">
                      <div className="local-card__meta">
                        <span className="local-card__district">
                          {loc.province} · {districtLabel(loc.district as any)}
                        </span>
                        {loc.code && <span className="local-card__code">CÓD. {loc.code}</span>}
                      </div>
                      <h3 className="local-card__name">{loc.name}</h3>
                    </div>
                  </div>

                  <div className="local-card__head-actions">
                    {perms?.canWriteLocales !== false && (
                      <button
                        type="button"
                        className="btn btn--xs btn--outline local-card__edit-btn"
                        onClick={() => openEditLocalModal(loc)}
                        title="Editar nombre, dirección o coordenadas GPS"
                      >
                        <Edit2 size={11} /> Editar
                      </button>
                    )}
                  </div>
                </div>

                {/* Dirección y Google Maps */}
                {loc.address && (
                  <div className="local-card__address">
                    <MapPin size={13} className="local-card__address-icon" />
                    <span className="local-card__address-text">{loc.address}</span>
                    {loc.latitude && loc.longitude && (
                      <a
                        href={getGoogleMapsUrl(loc.latitude, loc.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="local-card__maps-link"
                        title="Abrir ubicación en Google Maps"
                      >
                        <ExternalLink size={10} /> Maps
                      </a>
                    )}
                  </div>
                )}

                {/* Salud y Cobertura del Colegio */}
                <div className="local-card__health">
                  <div className="local-card__health-header">
                    <div className="local-card__health-stats">
                      <span className="health-stat" title="Total de mesas electorales en este colegio">
                        <Vote size={12} /> <strong>{totalMesas}</strong> {totalMesas === 1 ? "mesa" : "mesas"}
                      </span>
                      <span className="health-stat health-stat--titular" title="Mesas con personero titular asignado">
                        <UserCheck size={12} /> <strong>{titularesCount}</strong> {titularesCount === 1 ? "titular" : "titulares"}
                      </span>
                      <span className="health-stat health-stat--suplente" title="Mesas con personero suplente asignado">
                        <Users size={12} /> <strong>{suplentesCount}</strong> {suplentesCount === 1 ? "suplente" : "suplentes"}
                      </span>
                    </div>

                    <span
                      className={`badge ${
                        pct === 100
                          ? "badge--green"
                          : pct > 0
                          ? "badge--amber"
                          : "badge--red"
                      }`}
                    >
                      {pct === 100 ? "100% Cubierto" : `${titularesCount}/${totalMesas} (${pct}%)`}
                    </span>
                  </div>

                  <div className="local-card__meter-track">
                    <div
                      className={`local-card__meter-fill ${
                        pct === 100
                          ? "local-card__meter-fill--complete"
                          : pct > 0
                          ? "local-card__meter-fill--partial"
                          : "local-card__meter-fill--empty"
                      }`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>

                {/* Fila del Coordinador del Colegio */}
                <div className={`local-card__coord-bar ${!loc.coordinatorName ? "local-card__coord-bar--missing" : ""}`}>
                  <div className="local-card__coord-info">
                    <div className={`coord-avatar ${loc.coordinatorName ? "coord-avatar--active" : "coord-avatar--empty"}`}>
                      <UserCheck size={13} />
                    </div>
                    <div className="coord-details">
                      {loc.coordinatorName ? (
                        <>
                          <div className="coord-label">Coordinador del Colegio</div>
                          <div className="coord-name-wrap">
                            <strong className="coord-name">{loc.coordinatorName}</strong>
                            {loc.coordinatorPhone && (
                              <a
                                href={`https://wa.me/51${loc.coordinatorPhone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="coord-wa-btn"
                                title={`Chatear por WhatsApp con ${loc.coordinatorName}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle size={11} /> WhatsApp ({loc.coordinatorPhone})
                              </a>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="coord-missing-text">
                          <AlertCircle size={12} /> Sin coordinador de centro asignado
                        </div>
                      )}
                    </div>
                  </div>

                  {perms?.canWriteLocales !== false && (
                    <button
                      type="button"
                      className={`btn btn--xs ${loc.coordinatorName ? "btn--outline" : "btn--primary"} coord-action-btn`}
                      onClick={() => openCoordModal(loc)}
                      title="Asignar o modificar el coordinador de este colegio"
                    >
                      {loc.coordinatorName ? "Editar Coord." : "+ Asignar Coord."}
                    </button>
                  )}
                </div>

                {/* Sección de Aulas y Mesas de Votación */}
                <div className="local-card__mesas-section">
                  <div className="local-card__mesas-header">
                    <span className="mesas-title">
                      Mesas de Votación ({loc.displayMesas.length})
                    </span>
                    <div className="mesas-legend-dots">
                      <span className="dot-item" title="Con titular y suplente">
                        <span className="legend-dot legend-dot--green" /> Completa
                      </span>
                      <span className="dot-item" title="Con titular pero falta suplente">
                        <span className="legend-dot legend-dot--yellow" /> Parcial
                      </span>
                      <span className="dot-item" title="Sin personero titular">
                        <span className="legend-dot legend-dot--red" /> Vacante
                      </span>
                    </div>
                  </div>

                  <div className="mesas-mini-grid">
                    {loc.displayMesas.map((m) => {
                      const titular = m.titular || (m.personero && !m.personero.isSuplente ? m.personero : null);
                      const suplente = m.suplente || (m.personero && m.personero.isSuplente ? m.personero : null);

                      const hasTitular = !!titular;
                      const hasSuplente = !!suplente;

                      let pillClass = "mesa-mini-pill--empty";
                      let statusDotClass = "mesa-dot--red";
                      let statusLabel = "Vacante";

                      if (hasTitular && hasSuplente) {
                        pillClass = "mesa-mini-pill--covered";
                        statusDotClass = "mesa-dot--green";
                        statusLabel = "Completa";
                      } else if (hasTitular) {
                        pillClass = "mesa-mini-pill--partial";
                        statusDotClass = "mesa-dot--yellow";
                        statusLabel = "Falta Suplente";
                      } else if (hasSuplente) {
                        pillClass = "mesa-mini-pill--suplente-only";
                        statusDotClass = "mesa-dot--purple";
                        statusLabel = "Solo Suplente";
                      }

                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`mesa-mini-pill ${pillClass}`}
                          onClick={() => {
                            setEditingMesaInline(false);
                            setMesaAula(m.aula || "");
                            setMesaPres(m.onpePresidente || "");
                            setMesaSec(m.onpeSecretario || "");
                            setMesaSupl(m.onpeSuplentes || "");
                            setSelectedMesa({ mesa: m, localName: loc.name, localId: loc.id });
                          }}
                        >
                          <div className="mesa-pill__content">
                            <div className="mesa-pill__row">
                              <span className="mesa-pill__num">{m.number}</span>
                              <span className={`mesa-status-dot ${statusDotClass}`} />
                            </div>
                            {m.aula ? (
                              <span className="mesa-pill__aula">Aula {m.aula}</span>
                            ) : (
                              <span className="mesa-pill__role-hint">{statusLabel}</span>
                            )}
                          </div>

                          {/* Tooltip flotante interactivo al hover */}
                          <div className="mesa-tooltip" role="tooltip">
                            <div className="mesa-tooltip__header">
                              <strong>Mesa N° {m.number}</strong>
                              <span className={`mesa-tooltip__badge ${statusDotClass}`}>
                                {statusLabel}
                              </span>
                            </div>
                            {m.aula && (
                              <div className="mesa-tooltip__meta">
                                <span>Aula: <strong>{m.aula}</strong></span>
                              </div>
                            )}
                            <div className="mesa-tooltip__divider" />
                            <div className="mesa-tooltip__row">
                              <span className="tooltip-role">Titular:</span>
                              <span className={titular ? "tooltip-val tooltip-val--active" : "tooltip-val tooltip-val--vacant"}>
                                {titular ? titular.name : "Vacante"}
                              </span>
                            </div>
                            <div className="mesa-tooltip__row">
                              <span className="tooltip-role">Suplente:</span>
                              <span className={suplente ? "tooltip-val tooltip-val--active" : "tooltip-val tooltip-val--vacant"}>
                                {suplente ? suplente.name : "Vacante"}
                              </span>
                            </div>
                            {m.onpePresidente && (
                              <div className="mesa-tooltip__meta" style={{ marginTop: "4px" }}>
                                <span>ONPE: {m.onpePresidente}</span>
                              </div>
                            )}
                            <div className="mesa-tooltip__footer">
                              Clic para gestionar mesa
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Mesa seleccionada (Titular + Suplente + Aula + ONPE) */}
      {selectedMesa && (
        <div className="modal-backdrop" onClick={() => setSelectedMesa(null)}>
          <div className="modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">Detalle de Mesa</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  Mesa N° {selectedMesa.mesa.number}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  {selectedMesa.localName}
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setSelectedMesa(null)}>
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* PERSONERO TITULAR */}
              {(() => {
                const titular =
                  selectedMesa.mesa.titular ||
                  (selectedMesa.mesa.personero && !selectedMesa.mesa.personero.isSuplente
                    ? selectedMesa.mesa.personero
                    : null);

                return (
                  <div className="mesa-detail-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="badge badge--green">Personero Titular</span>
                      {titular && perms?.canWriteMesas !== false && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => handleUnassignPersonero(titular.id, selectedMesa.mesa.number, false)}
                        >
                          <Trash2 size={11} /> Desasignar
                        </button>
                      )}
                    </div>
                    {titular ? (
                      <div style={{ marginTop: "6px" }}>
                        <div className="mesa-detail-card__name">
                          {titular.name}
                        </div>
                        {titular.phone && (
                          <div style={{ marginTop: "4px" }}>
                            <a
                              href={`https://wa.me/51${titular.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="coord-phone-link"
                            >
                              <Phone size={12} /> {titular.phone} (WhatsApp)
                            </a>
                          </div>
                        )}
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--outline"
                            style={{ marginTop: "8px" }}
                            onClick={() => {
                              openAssignModal(selectedMesa.mesa.number, selectedMesa.localName, "titular", selectedMesa.mesa.aula);
                            }}
                          >
                            Cambiar Titular
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mesa-detail-card__empty">Sin personero titular</span>
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--primary"
                            onClick={() => {
                              openAssignModal(selectedMesa.mesa.number, selectedMesa.localName, "titular", selectedMesa.mesa.aula);
                            }}
                          >
                            <Plus size={11} /> Asignar Titular
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* PERSONERO SUPLENTE */}
              {(() => {
                const suplente =
                  selectedMesa.mesa.suplente ||
                  (selectedMesa.mesa.personero && selectedMesa.mesa.personero.isSuplente
                    ? selectedMesa.mesa.personero
                    : null);

                return (
                  <div className="mesa-detail-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="badge badge--amber">Personero Suplente</span>
                      {suplente && perms?.canWriteMesas !== false && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => handleUnassignPersonero(suplente.id, selectedMesa.mesa.number, true)}
                        >
                          <Trash2 size={11} /> Desasignar
                        </button>
                      )}
                    </div>
                    {suplente ? (
                      <div style={{ marginTop: "6px" }}>
                        <div className="mesa-detail-card__name">
                          {suplente.name}
                        </div>
                        {suplente.phone && (
                          <div style={{ marginTop: "4px" }}>
                            <a
                              href={`https://wa.me/51${suplente.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="coord-phone-link"
                            >
                              <Phone size={12} /> {suplente.phone} (WhatsApp)
                            </a>
                          </div>
                        )}
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--outline"
                            style={{ marginTop: "8px" }}
                            onClick={() => {
                              openAssignModal(selectedMesa.mesa.number, selectedMesa.localName, "suplente", selectedMesa.mesa.aula);
                            }}
                          >
                            Cambiar Suplente
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mesa-detail-card__empty">Sin personero suplente</span>
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--secondary"
                            onClick={() => {
                              openAssignModal(selectedMesa.mesa.number, selectedMesa.localName, "suplente", selectedMesa.mesa.aula);
                            }}
                          >
                            <Plus size={11} /> Asignar Suplente
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SECCIÓN AULA Y MIEMBROS ONPE */}
              <div className="mesa-detail-card--onpe">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span className="onpe-section-title">
                    Ubicación y Autoridades ONPE
                  </span>
                  {!editingMesaInline && perms?.canWriteMesas !== false && (
                    <button
                      type="button"
                      className="btn btn--xs btn--outline"
                      onClick={() => setEditingMesaInline(true)}
                    >
                      <Edit2 size={11} /> Editar
                    </button>
                  )}
                </div>

                {editingMesaInline ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Aula / Pabellón</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaAula}
                        onChange={(e) => setMesaAula(e.target.value)}
                        placeholder="Ej. Pabellón C - Aula 102"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Presidente de Mesa ONPE</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaPres}
                        onChange={(e) => setMesaPres(e.target.value)}
                        placeholder="Nombre completo según padrón"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Secretario de Mesa ONPE</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaSec}
                        onChange={(e) => setMesaSec(e.target.value)}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Suplentes ONPE</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaSupl}
                        onChange={(e) => setMesaSupl(e.target.value)}
                        placeholder="Nombres de suplentes"
                      />
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button
                        type="button"
                        className="btn btn--xs btn--primary"
                        onClick={handleSaveMesaDetails}
                        disabled={savingMesa}
                      >
                        {savingMesa ? "Guardando..." : "Guardar Mesa"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--xs btn--secondary"
                        onClick={() => setEditingMesaInline(false)}
                        disabled={savingMesa}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="onpe-info-row" style={{ marginBottom: "4px" }}>
                      <span className="onpe-info-label">Aula:</span> <strong>{selectedMesa.mesa.aula || "Por confirmar"}</strong>
                    </div>
                    {selectedMesa.mesa.onpePresidente && (
                      <div className="onpe-info-row">
                        <span className="onpe-info-label">Presidente ONPE:</span> <strong>{selectedMesa.mesa.onpePresidente}</strong>
                      </div>
                    )}
                    {selectedMesa.mesa.onpeSecretario && (
                      <div className="onpe-info-row">
                        <span className="onpe-info-label">Secretario ONPE:</span> <strong>{selectedMesa.mesa.onpeSecretario}</strong>
                      </div>
                    )}
                    {selectedMesa.mesa.onpeSuplentes && (
                      <div className="onpe-info-row">
                        <span className="onpe-info-label">Suplentes ONPE:</span> <strong>{selectedMesa.mesa.onpeSuplentes}</strong>
                      </div>
                    )}
                    {!selectedMesa.mesa.onpePresidente && !selectedMesa.mesa.onpeSecretario && (
                      <div className="mesa-detail-card__empty">
                        Sin autoridades ONPE registradas para esta mesa.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <footer className="modal__foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                href={`/personeros/acta?mesa=${selectedMesa.mesa.number}`}
                className="btn btn--primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              >
                <Camera size={14} /> Subir Acta Mesa {selectedMesa.mesa.number}
              </Link>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setSelectedMesa(null)}
              >
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal para Editar Colegio Completo */}
      {editingLocal && (
        <div className="modal-backdrop" onClick={() => !savingLocal && setEditingLocal(null)}>
          <div className="modal" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">Editar Centro de Votación</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  {editingLocal.name}
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setEditingLocal(null)}
                disabled={savingLocal}
              >
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="field">
                <label className="field__label">
                  Nombre del Colegio <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div className="field">
                  <label className="field__label">Código Local</label>
                  <input
                    type="text"
                    className="input"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Provincia</label>
                  <select
                    className="input"
                    value={editProvince}
                    onChange={(e) => setEditProvince(e.target.value)}
                  >
                    <option value="Tambopata">Tambopata</option>
                    <option value="Manu">Manu</option>
                    <option value="Tahuamanu">Tahuamanu</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">Distrito</label>
                  <select
                    className="input"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field__label">Dirección</label>
                <input
                  type="text"
                  className="input"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>

              {/* Coordenadas */}
              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label className="field__label" style={{ fontSize: "11px" }}>
                  Pegar URL de Google Maps o Coordenadas directas
                </label>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="URL de Google Maps o '-12.5933, -69.1891'"
                    value={mapsInput}
                    onChange={(e) => setMapsInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--xs btn--secondary"
                    onClick={handleParseMapsLink}
                  >
                    Extraer
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Latitud</label>
                    <input
                      type="text"
                      className="input"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Longitud</label>
                    <input
                      type="text"
                      className="input"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {localEditMsg && (
                <div className={`coord-alert coord-alert--${localEditMsg.kind}`}>
                  {localEditMsg.text}
                </div>
              )}
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setEditingLocal(null)}
                disabled={savingLocal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveLocal}
                disabled={savingLocal}
              >
                <Save size={13} /> {savingLocal ? "Guardando..." : "Guardar Cambios"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal para Asignar / Editar Coordinador del Colegio */}
      {editingLocalCoord && (
        <div className="modal-backdrop" onClick={() => setEditingLocalCoord(null)}>
          <div className="modal" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">Coordinación de Colegio</span>
                <h3 style={{ margin: "6px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  {editingLocalCoord.coordinatorName ? "Modificar Coordinador" : "Asignar Coordinador de Colegio"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  {editingLocalCoord.name} ({editingLocalCoord.totalMesas} mesas)
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setEditingLocalCoord(null)}>
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <p className="coord-modal-desc">
                El coordinador es el responsable de supervisar este centro de votación. Su nombre y número de WhatsApp aparecerán directamente en la credencial digital de los personeros para que puedan comunicarse inmediatamente.
              </p>

              <div className="field">
                <label className="field__label">
                  Nombre Completo del Coordinador <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Juan Carlos Pérez Quispe"
                  value={coordName}
                  onChange={(e) => setCoordName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="field">
                <label className="field__label">
                  Celular / WhatsApp del Coordinador <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="Ej. 982136949"
                  value={coordPhone}
                  onChange={(e) => setCoordPhone(e.target.value)}
                />
              </div>

              {coordError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "6px", color: "#b91c1c", fontSize: "12px" }}>
                  {coordError}
                </div>
              )}
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setEditingLocalCoord(null)}
                disabled={savingCoord}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveLocalCoord}
                disabled={savingCoord}
              >
                {savingCoord ? "Guardando..." : "Guardar Coordinador"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal para Asignar Personero (Titular / Suplente) */}
      {assignModal && (
        <div className="modal-backdrop" onClick={() => !savingNewPersonero && !assigningId && setAssignModal(null)}>
          <div className="modal" style={{ maxWidth: "560px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className={`badge ${assignModal.role === "titular" ? "badge--green" : "badge--amber"}`}>
                  Asignar {assignModal.role === "titular" ? "Personero Titular" : "Personero Suplente"}
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  Mesa N° {assignModal.mesaNum}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
                  {assignModal.localName} {assignModal.aula ? `· Aula ${assignModal.aula}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setAssignModal(null)}
                disabled={savingNewPersonero || !!assigningId}
              >
                ✕
              </button>
            </header>

            {/* Selector de Pestañas */}
            <div className="assign-modal-tabs">
              <button
                type="button"
                className={`tab-btn ${assignTab === "search" ? "tab-btn--active" : ""}`}
                onClick={() => setAssignTab("search")}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: assignTab === "search" ? "var(--accent, #2563eb)" : "var(--text-muted, #64748b)",
                  borderBottom: assignTab === "search" ? "2px solid var(--accent, #2563eb)" : "2px solid transparent",
                }}
              >
                <Search size={14} /> Seleccionar Registrado ({personerosDisponibles.length} libres)
              </button>
              <button
                type="button"
                className={`tab-btn ${assignTab === "new" ? "tab-btn--active" : ""}`}
                onClick={() => setAssignTab("new")}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: assignTab === "new" ? "var(--accent, #2563eb)" : "var(--text-muted, #64748b)",
                  borderBottom: assignTab === "new" ? "2px solid var(--accent, #2563eb)" : "2px solid transparent",
                }}
              >
                <UserPlus size={14} /> Registrar Nuevo
              </button>
            </div>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "60vh", overflowY: "auto", padding: "16px" }}>
              {assignTab === "search" ? (
                <>
                  {/* Buscador y Filtro */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div className="search-box" style={{ flex: 1 }}>
                      <Search size={15} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Buscar por DNI, nombre o celular..."
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted, #64748b)", cursor: "pointer", whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={assignOnlyFree}
                        onChange={(e) => setAssignOnlyFree(e.target.checked)}
                      />
                      Solo sin mesa
                    </label>
                  </div>

                  {/* Lista de Personeros */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {filteredAssignCandidates.length === 0 ? (
                      <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: "13px" }}>
                        No se encontraron personeros que coincidan.
                        <div style={{ marginTop: "10px" }}>
                          <button
                            type="button"
                            className="btn btn--xs btn--outline"
                            onClick={() => setAssignTab("new")}
                          >
                            + Registrar nuevo personero
                          </button>
                        </div>
                      </div>
                    ) : (
                      filteredAssignCandidates.map((p) => {
                        const isFree = !p.mesa || p.mesa.trim() === "" || p.mesa === "-" || p.mesa === "0";
                        const isCurrent = p.mesa === assignModal.mesaNum;
                        const isAssigningThis = assigningId === p.id;

                        return (
                          <div
                            key={p.id}
                            className={`assign-candidate-card ${isCurrent ? "assign-candidate-card--current" : ""}`}
                          >
                            <div style={{ minWidth: 0, flex: 1, paddingRight: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <strong style={{ fontSize: "13.5px", color: "var(--text, #0f172a)" }}>{p.name}</strong>
                                {isFree ? (
                                  <span className="badge badge--green" style={{ fontSize: "10px", padding: "1px 6px" }}>Disponible</span>
                                ) : (
                                  <span className="badge badge--amber" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                    En Mesa {p.mesa}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "var(--text-muted, #64748b)", display: "flex", gap: "10px", marginTop: "3px" }}>
                                <span>DNI: <strong>{p.docNumber}</strong></span>
                                {p.phone && <span>Tel: {p.phone}</span>}
                                {p.district && <span>Distrito: {p.district}</span>}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn--xs btn--primary"
                              disabled={isAssigningThis || !!assigningId}
                              onClick={() => handleAssignExistingPersonero(p)}
                              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                            >
                              {isAssigningThis ? (
                                <>
                                  <Loader2 size={12} className="spin" /> Asignando...
                                </>
                              ) : (
                                `Asignar ${assignModal.role === "titular" ? "Titular" : "Suplente"}`
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Formulario de Registro Nuevo */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateAndAssignPersonero();
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                >
                  {newPersoneroError && (
                    <div className="alert alert--danger" style={{ fontSize: "12px", padding: "8px 12px" }}>
                      {newPersoneroError}
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text, #0f172a)", display: "block" }}>
                      DNI (8 dígitos) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="Ej: 71234567"
                        value={newDocNumber}
                        onChange={(e) => setNewDocNumber(e.target.value.replace(/\D/g, ""))}
                        className="input"
                        style={{ flex: 1 }}
                        required
                        autoFocus
                      />
                      {newDniLookup === "loading" && <Loader2 size={18} className="spin" style={{ color: "#3b82f6" }} />}
                      {newDniLookup === "found" && <Check size={18} style={{ color: "#10b981" }} />}
                    </div>
                    {newDniLookup === "found" && (
                      <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, marginTop: "2px", display: "block" }}>
                        ✓ Nombre consultado con éxito desde RENIEC
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text, #0f172a)", display: "block" }}>
                      Nombres y Apellidos Completos <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nombres completos"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="input"
                      style={{ marginTop: "4px", width: "100%" }}
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text, #0f172a)", display: "block" }}>
                        Teléfono (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        placeholder="Ej: 987654321"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="input"
                        style={{ marginTop: "4px", width: "100%" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text, #0f172a)", display: "block" }}>
                        Distrito
                      </label>
                      <select
                        value={newDistrict}
                        onChange={(e) => setNewDistrict(e.target.value)}
                        className="filter-select"
                        style={{ marginTop: "4px", width: "100%" }}
                      >
                        <option value="">Seleccionar distrito...</option>
                        {DISTRICTS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={savingNewPersonero}
                    style={{ marginTop: "10px", padding: "10px", width: "100%", justifyContent: "center" }}
                  >
                    {savingNewPersonero ? (
                      <>
                        <Loader2 size={15} className="spin" /> Registrando y Asignando...
                      </>
                    ) : (
                      `Registrar y Asignar como ${assignModal.role === "titular" ? "Titular" : "Suplente"}`
                    )}
                  </button>
                </form>
              )}
            </div>

            <footer className="modal__foot" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setAssignModal(null)}
                disabled={savingNewPersonero || !!assigningId}
              >
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
