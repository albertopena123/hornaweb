"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Vote,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Trash2,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  Palette,
} from "lucide-react";
import "./candidatos.css";
import {
  updateCandidate,
  createCandidate,
  toggleCandidateActive,
  deleteCandidate,
  type CandidateInput,
} from "./actions";

type CandidateData = {
  id: string;
  name: string;
  party: string;
  partyLogo: string | null;
  photoUrl: string | null;
  cargo: "gobernador" | "provincial" | "distrital";
  province: string | null;
  order: number;
  color: string;
  active: boolean;
};

type Props = {
  candidates: CandidateData[];
  canWrite: boolean;
};

export function CandidatosClient({ candidates: initialCandidates, canWrite }: Props) {
  const [candidates, setCandidates] = useState<CandidateData[]>(initialCandidates);
  const [activeTab, setActiveTab] = useState<"all" | "gobernador" | "Tambopata" | "Manu" | "Tahuamanu">("all");
  const [search, setSearch] = useState("");

  // Modal para Crear / Editar
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateData | null>(null);

  const [formData, setFormData] = useState<CandidateInput>({
    name: "",
    party: "",
    partyLogo: "",
    photoUrl: "",
    cargo: "gobernador",
    province: "Tambopata",
    order: 1,
    color: "#dc2626",
    active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Filtrado de candidatos
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      const matchSearch =
        q === "" || c.name.toLowerCase().includes(q) || c.party.toLowerCase().includes(q);

      if (activeTab === "gobernador") {
        return matchSearch && c.cargo === "gobernador";
      }
      if (activeTab === "Tambopata" || activeTab === "Manu" || activeTab === "Tahuamanu") {
        return matchSearch && c.cargo === "provincial" && c.province === activeTab;
      }
      return matchSearch;
    });
  }, [candidates, activeTab, search]);

  // Contadores por categoría
  const countGobernador = useMemo(() => candidates.filter((c) => c.cargo === "gobernador").length, [candidates]);
  const countTambopata = useMemo(() => candidates.filter((c) => c.cargo === "provincial" && c.province === "Tambopata").length, [candidates]);
  const countManu = useMemo(() => candidates.filter((c) => c.cargo === "provincial" && c.province === "Manu").length, [candidates]);
  const countTahuamanu = useMemo(() => candidates.filter((c) => c.cargo === "provincial" && c.province === "Tahuamanu").length, [candidates]);

  // Abrir modal de edición
  const openEditModal = (c: CandidateData) => {
    setSelectedCandidate(c);
    setFormData({
      name: c.name,
      party: c.party,
      partyLogo: c.partyLogo || "",
      photoUrl: c.photoUrl || "",
      cargo: c.cargo,
      province: c.province || "Tambopata",
      order: c.order,
      color: c.color || "#dc2626",
      active: c.active,
    });
    setModalMode("edit");
  };

  // Abrir modal de creación
  const openCreateModal = () => {
    setSelectedCandidate(null);
    setFormData({
      name: "",
      party: "",
      partyLogo: "",
      photoUrl: "",
      cargo: activeTab === "all" || activeTab === "gobernador" ? "gobernador" : "provincial",
      province: activeTab === "Manu" || activeTab === "Tahuamanu" ? activeTab : "Tambopata",
      order: filteredCandidates.length + 1,
      color: "#2563eb",
      active: true,
    });
    setModalMode("create");
  };

  // Guardar Cambios
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Ingresa el nombre completo del candidato.");
      return;
    }
    if (!formData.party.trim()) {
      alert("Ingresa el partido político.");
      return;
    }

    setIsSaving(true);
    setToast(null);

    if (modalMode === "create") {
      const res = await createCandidate(formData);
      if (res.ok && res.candidate) {
        setCandidates((prev) => [...prev, res.candidate as CandidateData]);
        setToast({ kind: "success", text: `✓ Candidato ${res.candidate.name} registrado con éxito.` });
        setModalMode(null);
      } else {
        alert(res.error || "Error al crear candidato.");
      }
    } else if (modalMode === "edit" && selectedCandidate) {
      const res = await updateCandidate(selectedCandidate.id, formData);
      if (res.ok && res.candidate) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === selectedCandidate.id ? (res.candidate as CandidateData) : c))
        );
        setToast({ kind: "success", text: `✓ Candidato ${res.candidate.name} actualizado correctamente.` });
        setModalMode(null);
      } else {
        alert(res.error || "Error al actualizar candidato.");
      }
    }

    setIsSaving(false);
  };

  // Activar / Desactivar
  const handleToggleActive = async (c: CandidateData) => {
    if (!canWrite) return;
    const res = await toggleCandidateActive(c.id);
    if (res.ok && res.active !== undefined) {
      setCandidates((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, active: res.active! } : item))
      );
      setToast({
        kind: "success",
        text: `Candidato ${c.name} ahora está ${res.active ? "Activo" : "Inactivo"}.`,
      });
    }
  };

  // Eliminar
  const handleDelete = async (c: CandidateData) => {
    if (!canWrite) return;
    if (!confirm(`¿Seguro que deseas eliminar al candidato ${c.name}? Esta acción no se puede deshacer si no tiene votos vinculados.`)) {
      return;
    }
    const res = await deleteCandidate(c.id);
    if (res.ok) {
      setCandidates((prev) => prev.filter((item) => item.id !== c.id));
      setToast({ kind: "success", text: `Candidato ${c.name} eliminado.` });
    } else {
      alert(res.error || "No se pudo eliminar.");
    }
  };

  return (
    <div className="cand-admin-page">
      {/* Header */}
      <header className="cand-admin-header">
        <div className="cand-admin-titles">
          <div className="cand-brand-pill">Cómputo Electoral · Configuración</div>
          <h1>Padrón Oficial de Candidatos</h1>
          <p>
            Administra y corrige nombres, partidos, logotipos y fotos de candidatos a Gobernador Regional y Alcaldías Provinciales.
          </p>
        </div>

        <div className="cand-admin-header-actions">
          {canWrite && (
            <button type="button" className="btn btn--primary" onClick={openCreateModal}>
              <Plus size={16} /> Nuevo Candidato
            </button>
          )}
          <Link href="/visor-envivo" target="_blank" className="btn btn--secondary">
            Pantalla en Vivo <ExternalLink size={13} />
          </Link>
        </div>
      </header>

      {/* Toast Alert */}
      {toast && (
        <div className={`cand-toast cand-toast--${toast.kind}`}>
          {toast.text}
          <button type="button" onClick={() => setToast(null)} className="toast-close">
            ✕
          </button>
        </div>
      )}

      {/* Pestañas de Cargo y Provincia */}
      <nav className="cand-tabs-bar">
        <button
          type="button"
          className={`cand-tab ${activeTab === "all" ? "cand-tab--active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <Vote size={15} /> Todos ({candidates.length})
        </button>

        <button
          type="button"
          className={`cand-tab ${activeTab === "gobernador" ? "cand-tab--active" : ""}`}
          onClick={() => setActiveTab("gobernador")}
        >
          🏛️ Gobernador Regional ({countGobernador})
        </button>

        <button
          type="button"
          className={`cand-tab ${activeTab === "Tambopata" ? "cand-tab--active" : ""}`}
          onClick={() => setActiveTab("Tambopata")}
        >
          🏢 Alcaldía Tambopata ({countTambopata})
        </button>

        <button
          type="button"
          className={`cand-tab ${activeTab === "Manu" ? "cand-tab--active" : ""}`}
          onClick={() => setActiveTab("Manu")}
        >
          🏢 Alcaldía Manu ({countManu})
        </button>

        <button
          type="button"
          className={`cand-tab ${activeTab === "Tahuamanu" ? "cand-tab--active" : ""}`}
          onClick={() => setActiveTab("Tahuamanu")}
        >
          🏢 Alcaldía Tahuamanu ({countTahuamanu})
        </button>
      </nav>

      {/* Filtro de Búsqueda */}
      <div className="cand-filter-bar">
        <div className="cand-search-wrap">
          <Search size={15} />
          <input
            type="text"
            placeholder="Buscar candidato o partido político..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="cand-count-info">
          Mostrando {filteredCandidates.length} de {candidates.length} candidatos
        </span>
      </div>

      {/* Grid de Candidatos */}
      <div className="cand-grid">
        {filteredCandidates.length === 0 ? (
          <div className="cand-empty-state">
            <Vote size={48} className="text-gray-400" />
            <h3>No se encontraron candidatos</h3>
            <p>Prueba con otros términos de búsqueda o selecciona otra categoría.</p>
          </div>
        ) : (
          filteredCandidates.map((c) => {
            const isHorna = c.party.includes("AHORA NACION");

            return (
              <div
                key={c.id}
                className={`cand-card ${isHorna ? "cand-card--horna" : ""} ${
                  !c.active ? "cand-card--inactive" : ""
                }`}
              >
                <div className="cand-card-top">
                  <div className="cand-order-badge">
                    <span>N° {c.order}</span>
                  </div>

                  <div className="cand-cargo-badge">
                    {c.cargo === "gobernador" ? "Gobernador" : `Alcalde · ${c.province}`}
                  </div>

                  <div
                    className="cand-color-dot"
                    style={{ backgroundColor: c.color }}
                    title={`Color oficial: ${c.color}`}
                  />
                </div>

                <div className="cand-card-body">
                  {/* Foto y Logo */}
                  <div className="cand-visuals">
                    <div className="cand-photo-wrap">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="cand-photo" />
                      ) : (
                        <div className="cand-photo-fallback">{c.name.charAt(0)}</div>
                      )}
                    </div>

                    <div className="cand-logo-wrap">
                      {c.partyLogo ? (
                        <img src={c.partyLogo} alt={c.party} className="cand-party-logo" />
                      ) : (
                        <div className="cand-logo-fallback">{c.party.slice(0, 3)}</div>
                      )}
                    </div>
                  </div>

                  {/* Datos del Candidato */}
                  <div className="cand-details">
                    <h3 className="cand-name" title={c.name}>
                      {c.name}
                    </h3>
                    <p className="cand-party" title={c.party}>
                      {c.party}
                    </p>
                  </div>
                </div>

                <div className="cand-card-footer">
                  <span className={`cand-status-pill ${c.active ? "cand-status--active" : "cand-status--inactive"}`}>
                    {c.active ? "Activo" : "Inactivo"}
                  </span>

                  <div className="cand-card-actions">
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          className="btn-card-action"
                          onClick={() => handleToggleActive(c)}
                          title={c.active ? "Desactivar candidato" : "Activar candidato"}
                        >
                          {c.active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          className="btn-card-action btn-card-action--edit"
                          onClick={() => openEditModal(c)}
                          title="Editar datos del candidato"
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          className="btn-card-action btn-card-action--delete"
                          onClick={() => handleDelete(c)}
                          title="Eliminar candidato"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Crear / Editar Candidato */}
      {modalMode && (
        <div className="modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="modal cand-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">
                  {modalMode === "create" ? "Nuevo Candidato" : "Edición de Candidato"}
                </span>
                <h3 style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  {modalMode === "create" ? "Registrar Nuevo Candidato" : `Editar: ${formData.name || "Candidato"}`}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setModalMode(null)}>
                ✕
              </button>
            </header>

            <form onSubmit={handleSave}>
              <div className="modal__body cand-form-body">
                <div className="form-row">
                  <label className="field-label">
                    Nombre Completo del Candidato: <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="cand-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. SIMON PEDRO HORNA ALPACA"
                    required
                  />
                </div>

                <div className="form-row">
                  <label className="field-label">
                    Partido Político: <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="cand-input"
                    value={formData.party}
                    onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                    placeholder="Ej. AHORA NACION - AN"
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-row">
                    <label className="field-label">Cargo:</label>
                    <select
                      className="cand-input"
                      value={formData.cargo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cargo: e.target.value as any,
                        })
                      }
                    >
                      <option value="gobernador">Gobernador Regional</option>
                      <option value="provincial">Alcalde Provincial</option>
                      <option value="distrital">Alcalde Distrital</option>
                    </select>
                  </div>

                  {formData.cargo === "provincial" && (
                    <div className="form-row">
                      <label className="field-label">Provincia:</label>
                      <select
                        className="cand-input"
                        value={formData.province || "Tambopata"}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      >
                        <option value="Tambopata">Tambopata</option>
                        <option value="Manu">Manu</option>
                        <option value="Tahuamanu">Tahuamanu</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="form-row">
                    <label className="field-label">Orden en la Cédula:</label>
                    <input
                      type="number"
                      className="cand-input"
                      min={1}
                      max={99}
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="form-row">
                    <label className="field-label">Color Distintivo:</label>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        className="color-input-btn"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                      <input
                        type="text"
                        className="cand-input"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="field-label">URL Fotografía Oficial (JNE / Retrato):</label>
                  <input
                    type="url"
                    className="cand-input"
                    value={formData.photoUrl || ""}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    placeholder="https://... foto.jpg"
                  />
                  {formData.photoUrl && (
                    <div className="url-preview-thumb">
                      <img src={formData.photoUrl} alt="Preview" onError={(e) => ((e.target as any).style.display = "none")} />
                      <span>Vista previa de la fotografía</span>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <label className="field-label">URL Logotipo del Partido (JNE / PNG):</label>
                  <input
                    type="url"
                    className="cand-input"
                    value={formData.partyLogo || ""}
                    onChange={(e) => setFormData({ ...formData, partyLogo: e.target.value })}
                    placeholder="https://... logo.png"
                  />
                  {formData.partyLogo && (
                    <div className="url-preview-thumb">
                      <img src={formData.partyLogo} alt="Preview" onError={(e) => ((e.target as any).style.display = "none")} />
                      <span>Vista previa del logotipo</span>
                    </div>
                  )}
                </div>

                <div className="form-row form-checkbox-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    <span>Candidato activo (visible en actas y en la pantalla en vivo)</span>
                  </label>
                </div>
              </div>

              <footer className="modal__foot">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setModalMode(null)}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Candidato"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
