"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Phone,
  MessageSquare,
  Building2,
  MapPin,
  Vote,
  ExternalLink,
  Filter,
  Check,
  X,
  UserCheck,
  Eye,
  Tv,
} from "lucide-react";
import "./verificacion.css";
import { approveActa, observeActa } from "./actions";

type Props = {
  user: any;
  initialActas: any[];
  candidates: any[];
};

export function VerificacionClient({ user, initialActas, candidates }: Props) {
  const [actas, setActas] = useState(initialActas);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialActas.find((a) => a.status === "enviada" || a.status === "en_revision")?.id || initialActas[0]?.id || null
  );

  const [tabFilter, setTabFilter] = useState<"pending" | "approved" | "observed" | "all">("pending");
  const [electionFilter, setElectionFilter] = useState<"all" | "gobernador" | "provincial">("all");
  const [searchMesa, setSearchMesa] = useState("");

  // Controles de inspección de imagen (Zoom y Rotación)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Modal de Observación
  const [showObserveModal, setShowObserveModal] = useState(false);
  const [observeReason, setObserveReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const selectedActa = useMemo(
    () => actas.find((a) => a.id === selectedId) ?? null,
    [actas, selectedId]
  );

  // Filtrar cola de actas
  const filteredQueue = useMemo(() => {
    const q = searchMesa.trim().toLowerCase();
    return actas.filter((a) => {
      const matchMesa = q === "" || a.mesaNumber.includes(q) || a.local?.name.toLowerCase().includes(q);
      const isPending = a.status === "enviada" || a.status === "en_revision";
      const isApproved = a.status === "aprobada";
      const isObserved = a.status === "observada";

      if (tabFilter === "pending" && !isPending) return false;
      if (tabFilter === "approved" && !isApproved) return false;
      if (tabFilter === "observed" && !isObserved) return false;

      const eType = a.electionType || "gobernador";
      if (electionFilter !== "all" && eType !== electionFilter) return false;

      return matchMesa;
    });
  }, [actas, tabFilter, electionFilter, searchMesa]);

  // Candidatos activos para el acta seleccionada (gobernador vs provincial)
  const activeCandidatesForActa = useMemo(() => {
    if (!selectedActa) return [];
    const eType = selectedActa.electionType || "gobernador";
    if (eType === "gobernador") {
      return candidates.filter((c) => c.cargo === "gobernador");
    }
    const prov = selectedActa.local?.province || "Tambopata";
    return candidates.filter(
      (c) => c.cargo === "provincial" && (!c.province || c.province.toLowerCase() === prov.toLowerCase())
    );
  }, [selectedActa, candidates]);

  // Contadores
  const countPending = useMemo(
    () => actas.filter((a) => a.status === "enviada" || a.status === "en_revision").length,
    [actas]
  );
  const countApproved = useMemo(() => actas.filter((a) => a.status === "aprobada").length, [actas]);
  const countObserved = useMemo(() => actas.filter((a) => a.status === "observada").length, [actas]);

  // Manejar Aprobación
  async function handleApprove() {
    if (!selectedActa) return;
    if (!confirm(`¿Confirmas que los votos coinciden con el acta de la Mesa N° ${selectedActa.mesaNumber}? Esta acción integrará los votos al cómputo oficial en tiempo real.`)) {
      return;
    }

    setIsProcessing(true);
    setActionMessage(null);

    const res = await approveActa(selectedActa.id);
    if (res.ok && res.acta) {
      setActas((prev) => prev.map((a) => (a.id === selectedActa.id ? { ...a, ...res.acta } : a)));
      setActionMessage({ kind: "success", text: `✓ Acta de Mesa ${selectedActa.mesaNumber} aprobada e integrada al cómputo.` });
    } else {
      setActionMessage({ kind: "error", text: res.error || "Error al aprobar acta." });
    }
    setIsProcessing(false);
  }

  // Manejar Observación
  async function handleObserveSubmit() {
    if (!selectedActa) return;
    if (!observeReason.trim()) {
      alert("Por favor indica el motivo de la observación.");
      return;
    }

    setIsProcessing(true);
    const res = await observeActa(selectedActa.id, observeReason.trim());
    if (res.ok && res.acta) {
      setActas((prev) => prev.map((a) => (a.id === selectedActa.id ? { ...a, ...res.acta } : a)));
      setShowObserveModal(false);
      setObserveReason("");
      setActionMessage({ kind: "success", text: `⚠ Acta de Mesa ${selectedActa.mesaNumber} marcada como observada.` });
    } else {
      alert(res.error || "Error al observar acta.");
    }
    setIsProcessing(false);
  }

  // Construir link de WhatsApp con el personero
  const personeroWaLink = useMemo(() => {
    if (!selectedActa?.personero?.phone) return null;
    const cleanPhone = selectedActa.personero.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola ${selectedActa.personero.name}, te escribo desde el Centro de Cómputo de Ahora Nación sobre el Acta de Escrutinio de la Mesa N° ${selectedActa.mesaNumber} (${selectedActa.local?.name}).`
    );
    return `https://wa.me/51${cleanPhone}?text=${msg}`;
  }, [selectedActa]);

  return (
    <div className="verif-page">
      {/* Barra Superior */}
      <header className="verif-header">
        <div className="verif-header__title">
          <div className="verif-brand-pill">Centro de Cómputo · Verificador</div>
          <h1>Filtro y Verificación de Actas de Escrutinio</h1>
          <p className="verif-header__sub">
            Cotejo lado a lado de la fotografía del acta original contra los datos registrados antes de su integración oficial.
          </p>
        </div>

        <div className="verif-header__actions">
          <Link href="/visor-envivo" target="_blank" className="btn btn--secondary btn--visor-live">
            <Tv size={16} className="text-red animate-pulse" /> Ver Pantalla Gigante en Vivo <ExternalLink size={13} />
          </Link>
          <Link href="/personeros" className="btn btn--outline">
            Volver a Personeros
          </Link>
        </div>
      </header>

      {/* Métricas de Cola */}
      <div className="verif-stats-bar">
        <button
          type="button"
          className={`stat-tab-card ${tabFilter === "pending" ? "stat-tab-card--active" : ""}`}
          onClick={() => setTabFilter("pending")}
        >
          <div className="stat-tab-icon stat-tab-icon--blue">
            <Clock size={18} />
          </div>
          <div>
            <span className="stat-tab-count">{countPending}</span>
            <span className="stat-tab-label">Actas Pendientes</span>
          </div>
        </button>

        <button
          type="button"
          className={`stat-tab-card ${tabFilter === "approved" ? "stat-tab-card--active" : ""}`}
          onClick={() => setTabFilter("approved")}
        >
          <div className="stat-tab-icon stat-tab-icon--green">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="stat-tab-count">{countApproved}</span>
            <span className="stat-tab-label">Actas Aprobadas</span>
          </div>
        </button>

        <button
          type="button"
          className={`stat-tab-card ${tabFilter === "observed" ? "stat-tab-card--active" : ""}`}
          onClick={() => setTabFilter("observed")}
        >
          <div className="stat-tab-icon stat-tab-icon--amber">
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className="stat-tab-count">{countObserved}</span>
            <span className="stat-tab-label">Actas Observadas</span>
          </div>
        </button>

        <button
          type="button"
          className={`stat-tab-card ${tabFilter === "all" ? "stat-tab-card--active" : ""}`}
          onClick={() => setTabFilter("all")}
        >
          <div className="stat-tab-icon stat-tab-icon--gray">
            <Vote size={18} />
          </div>
          <div>
            <span className="stat-tab-count">{actas.length}</span>
            <span className="stat-tab-label">Total Recibidas</span>
          </div>
        </button>
      </div>

      {actionMessage && (
        <div className={`verif-alert verif-alert--${actionMessage.kind}`}>
          {actionMessage.text}
        </div>
      )}

      {/* Área de Trabajo Dividida */}
      <div className="verif-workbench">
        {/* Cola Izquierda: Lista de Actas */}
        <aside className="verif-queue-panel">
          <div className="queue-panel-head">
            <h3>Cola de Recepción ({filteredQueue.length})</h3>
            <div className="queue-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar por mesa o colegio..."
                value={searchMesa}
                onChange={(e) => setSearchMesa(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
              <button
                type="button"
                className={`btn btn--xs ${electionFilter === "all" ? "btn--primary" : "btn--secondary"}`}
                onClick={() => setElectionFilter("all")}
              >
                Todas
              </button>
              <button
                type="button"
                className={`btn btn--xs ${electionFilter === "gobernador" ? "btn--primary" : "btn--secondary"}`}
                onClick={() => setElectionFilter("gobernador")}
              >
                Gobernación
              </button>
              <button
                type="button"
                className={`btn btn--xs ${electionFilter === "provincial" ? "btn--primary" : "btn--secondary"}`}
                onClick={() => setElectionFilter("provincial")}
              >
                Alcaldías
              </button>
            </div>
          </div>

          <div className="queue-list">
            {filteredQueue.length === 0 ? (
              <div className="queue-empty">
                <p>No hay actas en esta categoría.</p>
              </div>
            ) : (
              filteredQueue.map((acta) => {
                const isSelected = acta.id === selectedId;
                const isApproved = acta.status === "aprobada";
                const isObserved = acta.status === "observada";
                const isProv = acta.electionType === "provincial";

                return (
                  <button
                    key={acta.id}
                    type="button"
                    className={`queue-item ${isSelected ? "queue-item--selected" : ""}`}
                    onClick={() => {
                      setSelectedId(acta.id);
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                  >
                    <div className="queue-item__top">
                      <span className="queue-item__mesa">Mesa {acta.mesaNumber}</span>
                      <span
                        className={`status-chip ${
                          isApproved
                            ? "status-chip--approved"
                            : isObserved
                            ? "status-chip--observed"
                            : "status-chip--pending"
                        }`}
                      >
                        {isApproved ? "Aprobada" : isObserved ? "Observada" : "Pendiente"}
                      </span>
                    </div>

                    <div className="queue-item__local">{acta.local?.name}</div>
                    <div className="queue-item__meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={`badge ${isProv ? "badge--purple" : "badge--neutral"}`} style={{ fontSize: "10px" }}>
                        {isProv ? `Alcaldía (${acta.local?.province || "Prov"})` : "Gobernador"}
                      </span>
                      <span>Total: <strong>{acta.totalVotos}</strong></span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Panel Central: Inspección Lado a Lado */}
        {selectedActa ? (
          <main className="verif-inspect-panel">
            {/* Header del Acta Seleccionada */}
            <div className="inspect-head">
              <div>
                <div className="inspect-title-row">
                  <h2>Mesa N° {selectedActa.mesaNumber}</h2>
                  <span
                    className={`status-chip ${
                      selectedActa.status === "aprobada"
                        ? "status-chip--approved"
                        : selectedActa.status === "observada"
                        ? "status-chip--observed"
                        : "status-chip--pending"
                    }`}
                  >
                    {selectedActa.status === "aprobada"
                      ? "✓ Acta Aprobada e Integrada"
                      : selectedActa.status === "observada"
                      ? "⚠ Acta Observada"
                      : "🔍 Pendiente de Verificación"}
                  </span>
                </div>
                <p className="inspect-local-addr">
                  <Building2 size={13} /> {selectedActa.local?.name} ({selectedActa.local?.province} · {selectedActa.local?.district})
                </p>
              </div>

              {/* Ficha del Personero Remitente con WhatsApp */}
              {selectedActa.personero && (
                <div className="inspect-personero-badge">
                  <div className="personero-meta">
                    <span className="personero-label">Personero remitente:</span>
                    <strong className="personero-name">{selectedActa.personero.name}</strong>
                    <span className="personero-sub">DNI: {selectedActa.personero.docNumber}</span>
                  </div>
                  {personeroWaLink && (
                    <a
                      href={personeroWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp-personero"
                      title="Abrir chat de WhatsApp para consultar con el personero"
                    >
                      <Phone size={13} /> WhatsApp ({selectedActa.personero.phone})
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Layout Side-by-Side: Acta Original vs Datos Registrados */}
            <div className="inspect-split-grid">
              {/* Lado Izquierdo: Foto del Acta con Zoom y Rotación */}
              <div className="inspect-photo-box">
                <div className="photo-box-toolbar">
                  <span className="photo-box-title">Acta Original de Escrutinio</span>
                  <div className="photo-controls">
                    <button
                      type="button"
                      className="btn-ctrl"
                      onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 3))}
                      title="Acercar (Zoom In)"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-ctrl"
                      onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
                      title="Alejar (Zoom Out)"
                    >
                      <ZoomOut size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-ctrl"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      title="Rotar 90°"
                    >
                      <RotateCw size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-ctrl"
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      title="Restablecer vista"
                    >
                      100%
                    </button>
                  </div>
                </div>

                <div className="photo-viewport">
                  {selectedActa.photoUrl ? (
                    <img
                      src={selectedActa.photoUrl}
                      alt={`Foto acta mesa ${selectedActa.mesaNumber}`}
                      className="inspect-img"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: "transform 0.2s ease-out",
                      }}
                    />
                  ) : (
                    <div className="photo-missing">No se adjuntó imagen del acta.</div>
                  )}
                </div>
              </div>

              {/* Lado Derecho: Tabla de Votos Registrados */}
              <div className="inspect-votes-box">
                <div className="votes-box-header">
                  <span className="votes-box-title">Datos Registrados para Cotejo</span>
                  <span className="votes-box-source">
                    Origen: <strong>{selectedActa.source === "ia" ? "IA + Personero" : "Manual"}</strong>
                  </span>
                </div>

                <div className="votes-tally-list">
                  {activeCandidatesForActa.map((c) => {
                    const matchedVote = selectedActa.votos?.find((v: any) => v.candidateId === c.id);
                    const voteCount = matchedVote?.votes || 0;
                    const isHorna = c.party.includes("AHORA NACION");

                    return (
                      <div
                        key={c.id}
                        className={`tally-row ${isHorna ? "tally-row--highlight" : ""}`}
                      >
                        <div className="tally-party-info">
                          <span className="tally-order">{c.order}</span>
                          {c.partyLogo ? (
                            <img src={c.partyLogo} alt={c.party} className="tally-logo" />
                          ) : (
                            <div className="tally-logo-fallback">{c.party.slice(0, 2)}</div>
                          )}
                          <div className="tally-names">
                            <strong className="tally-party">{c.party}</strong>
                            <span className="tally-candidate">{c.name}</span>
                          </div>
                        </div>

                        <div className="tally-number">
                          <span>{voteCount}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="tally-special-section">
                    <div className="tally-row tally-row--special">
                      <span>Votos en Blanco</span>
                      <strong>{selectedActa.votosBlancos}</strong>
                    </div>
                    <div className="tally-row tally-row--special">
                      <span>Votos Nulos</span>
                      <strong>{selectedActa.votosNulos}</strong>
                    </div>
                    <div className="tally-row tally-row--special">
                      <span>Votos Impugnados</span>
                      <strong>{selectedActa.votosImpugnados}</strong>
                    </div>
                  </div>

                  <div className="tally-sum-bar">
                    <span>Total Ciudadanos que Votaron:</span>
                    <strong className="tally-sum-val">{selectedActa.totalVotos}</strong>
                  </div>
                </div>

                {/* Motivo de observación si ya estaba observada */}
                {selectedActa.status === "observada" && selectedActa.observationReason && (
                  <div className="observed-reason-callout">
                    <strong>Motivo de Observación Registrado:</strong>
                    <p>"{selectedActa.observationReason}"</p>
                  </div>
                )}

                {/* Botonera de Decisión del Verificador */}
                <div className="inspect-decision-toolbar">
                  <button
                    type="button"
                    className="btn-decision btn-decision--approve"
                    onClick={handleApprove}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 size={18} /> Aprobar e Integrar al Cómputo
                  </button>
                  <button
                    type="button"
                    className="btn-decision btn-decision--observe"
                    onClick={() => setShowObserveModal(true)}
                    disabled={isProcessing}
                  >
                    <AlertTriangle size={18} /> Observar / Rechazar
                  </button>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <div className="verif-no-selection">
            <Vote size={48} className="text-gray" />
            <h3>Selecciona un acta de la cola para verificar</h3>
          </div>
        )}
      </div>

      {/* Modal para Observar Acta */}
      {showObserveModal && selectedActa && (
        <div className="modal-backdrop" onClick={() => setShowObserveModal(false)}>
          <div className="modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--red">Observación de Acta</span>
                <h3 style={{ margin: "6px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  Observar Acta Mesa N° {selectedActa.mesaNumber}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setShowObserveModal(false)}>
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>
                Indica claramente la inconsistencia detectada para que el personero la corrija o reenvíe una fotografía más legible.
              </p>

              {/* Botones de motivos comunes */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  "Suma de votos no coincide",
                  "Fotografía borrosa o cortada",
                  "Mesa incorrecta",
                  "Faltan firmas de miembros ONPE",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    className="btn btn--xs btn--outline"
                    onClick={() => setObserveReason(sug)}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div className="field">
                <label className="field__label">Detalle de la Observación:</label>
                <textarea
                  className="input"
                  rows={3}
                  value={observeReason}
                  onChange={(e) => setObserveReason(e.target.value)}
                  placeholder="Ej. La suma de los votos por partido da 240 pero el total consignado dice 235."
                  autoFocus
                />
              </div>

              {personeroWaLink && (
                <div style={{ background: "#ecfdf5", padding: "10px", borderRadius: "6px", border: "1px solid #a7f3d0", fontSize: "12px" }}>
                  <strong>Consejo:</strong> Puedes coordinar directamente con {selectedActa.personero?.name} por WhatsApp antes o después de observar el acta.
                </div>
              )}
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setShowObserveModal(false)}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ background: "#dc2626" }}
                onClick={handleObserveSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? "Registrando..." : "Confirmar Observación"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
