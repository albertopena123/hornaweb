"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Vote,
  Building2,
  MapPin,
  RefreshCw,
  Eye,
  Send,
  Check,
  AlertTriangle,
  RotateCw,
  Landmark,
} from "lucide-react";
import "./personero-acta.css";
import { submitActa } from "./actions";

type CandidateItem = {
  id: string;
  name: string;
  party: string;
  partyLogo: string | null;
  photoUrl: string | null;
  order: number;
  color: string;
  cargo: string;
  province?: string | null;
};

type Props = {
  user: any;
  personero: any;
  initialMesa: string;
  mesaData: any;
  candidates: CandidateItem[];
  existingActas?: any[];
  existingActa?: any;
};

export function PersoneroActaClient({
  user,
  personero,
  initialMesa,
  mesaData,
  candidates,
  existingActas = [],
  existingActa,
}: Props) {
  const [mesaNum, setMesaNum] = useState(initialMesa);

  // Tipo de Elección Activa: Gobernador o Alcaldía Provincial
  const [electionType, setElectionType] = useState<"gobernador" | "provincial">("gobernador");

  // Provincia activa (detectada del colegio o por defecto Tambopata)
  const defaultProvince =
    mesaData?.local?.province ||
    (personero?.district === "manu" || personero?.district === "fitzcarrald" || personero?.district === "madre_de_dios" || personero?.district === "huepetuhe"
      ? "Manu"
      : personero?.district === "inambari" || personero?.district === "laberinto" || personero?.district === "las_piedras"
      ? "Tambopata"
      : personero?.district === "iberia" || personero?.district === "inapari" || personero?.district === "tahuamanu"
      ? "Tahuamanu"
      : "Tambopata");

  const [selectedProvince, setSelectedProvince] = useState<string>(defaultProvince);

  // Lista local de actas existentes para sincronizar estados en caliente
  const [actas, setActas] = useState<any[]>(() => {
    if (existingActas && existingActas.length > 0) return existingActas;
    if (existingActa) return [existingActa];
    return [];
  });

  // Acta actual para el tipo de elección seleccionado
  const currentActa = useMemo(() => {
    return actas.find((a) => (a.electionType || "gobernador") === electionType) || null;
  }, [actas, electionType]);

  const [photoUrl, setPhotoUrl] = useState<string>(currentActa?.photoUrl || "");
  const [mode, setMode] = useState<"manual" | "ia">("manual");
  const [isExtractingIa, setIsExtractingIa] = useState(false);
  const [iaExtracted, setIaExtracted] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);

  // Candidatos filtrados según la elección y provincia
  const activeCandidates = useMemo(() => {
    if (electionType === "gobernador") {
      return candidates.filter((c) => c.cargo === "gobernador");
    }
    return candidates.filter(
      (c) =>
        c.cargo === "provincial" &&
        (!c.province || c.province.toLowerCase() === selectedProvince.toLowerCase())
    );
  }, [candidates, electionType, selectedProvince]);

  // Votos por candidato: candidateId -> cantidad
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [votosBlancos, setVotosBlancos] = useState<number>(0);
  const [votosNulos, setVotosNulos] = useState<number>(0);
  const [votosImpugnados, setVotosImpugnados] = useState<number>(0);

  // Cargar votos cuando cambia el tipo de elección o acta cargada
  useEffect(() => {
    if (currentActa) {
      setPhotoUrl(currentActa.photoUrl || "");
      const map: Record<string, number> = {};
      if (currentActa.votos) {
        for (const v of currentActa.votos) {
          map[v.candidateId] = v.votes;
        }
      }
      setVotes(map);
      setVotosBlancos(currentActa.votosBlancos || 0);
      setVotosNulos(currentActa.votosNulos || 0);
      setVotosImpugnados(currentActa.votosImpugnados || 0);
    } else {
      setPhotoUrl("");
      const emptyMap: Record<string, number> = {};
      for (const c of activeCandidates) {
        emptyMap[c.id] = 0;
      }
      setVotes(emptyMap);
      setVotosBlancos(0);
      setVotosNulos(0);
      setVotosImpugnados(0);
    }
    setIaExtracted(false);
    setIaError(null);
    setErrorMessage(null);
  }, [electionType, currentActa, activeCandidates]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suma total calculada automáticamente
  const totalCalculado = useMemo(() => {
    let sum = 0;
    for (const count of Object.values(votes)) {
      sum += Number(count) || 0;
    }
    sum += Number(votosBlancos) || 0;
    sum += Number(votosNulos) || 0;
    sum += Number(votosImpugnados) || 0;
    return sum;
  }, [votes, votosBlancos, votosNulos, votosImpugnados]);

  // Manejador de cambio de archivo / cámara
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPhotoUrl(base64);
      setIaExtracted(false);
      setIaError(null);
    };
    reader.readAsDataURL(file);
  }

  // Extraer automáticamente con IA
  async function handleExtractWithAI() {
    if (!photoUrl) {
      setIaError("Primero debes tomar o subir la foto del acta.");
      return;
    }

    setIsExtractingIa(true);
    setIaError(null);

    try {
      const res = await fetch("/api/ia/extract-acta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: photoUrl,
          mesa: mesaNum,
          electionType,
          province: selectedProvince,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo extraer con IA.");
      }

      const extracted = data.data;
      if (extracted.votes) {
        setVotes(extracted.votes);
      }
      setVotosBlancos(extracted.votosBlancos || 0);
      setVotosNulos(extracted.votosNulos || 0);
      setVotosImpugnados(extracted.votosImpugnados || 0);
      setMode("ia");
      setIaExtracted(true);
    } catch (err: any) {
      setIaError(err.message || "Error al procesar con IA.");
    } finally {
      setIsExtractingIa(false);
    }
  }

  // Enviar acta a validación
  async function handleSubmit() {
    if (!mesaNum.trim()) {
      setErrorMessage("Ingresa el número de mesa.");
      return;
    }
    if (!photoUrl) {
      setErrorMessage("Debes adjuntar la fotografía del acta de escrutinio.");
      return;
    }
    if (totalCalculado === 0) {
      if (!confirm("El total de votos calculados es 0. ¿Estás seguro de enviar esta acta?")) {
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);

    const res = await submitActa({
      mesaNumber: mesaNum,
      photoUrl,
      source: mode,
      electionType,
      province: selectedProvince,
      votes,
      votosBlancos,
      votosNulos,
      votosImpugnados,
      totalVotos: totalCalculado,
    });

    if (res.ok) {
      // Actualizar acta en la lista
      const updatedItem = {
        id: res.actaId,
        mesaNumber: mesaNum,
        electionType,
        photoUrl,
        status: "enviada",
        votosBlancos,
        votosNulos,
        votosImpugnados,
        totalVotos: totalCalculado,
      };
      setActas((prev) => [
        ...prev.filter((a) => (a.electionType || "gobernador") !== electionType),
        updatedItem,
      ]);
    } else {
      setErrorMessage(res.error || "Error al enviar el acta.");
    }
    setSubmitting(false);
  }

  const currentStatus = currentActa?.status;

  return (
    <main className="acta-page">
      <div className="acta-container">
        {/* Cabecera Superior */}
        <header className="acta-head">
          <div className="acta-head__top">
            <Link href="/personeros" className="acta-back-btn">
              <ArrowLeft size={16} /> Volver al panel de personeros
            </Link>
            <span className="acta-brand-badge">Elecciones 2026 · Ahora Nación</span>
          </div>

          <h1 className="acta-title">Envío de Acta de Escrutinio</h1>
          <p className="acta-subtitle">
            Al finalizar el conteo de votos de tu mesa, toma una fotografía nítida del acta oficial de escrutinio y transmítela para su verificación y cómputo en vivo.
          </p>

          {/* Tarjeta de Información de la Mesa */}
          <div className="acta-mesa-card">
            <div className="acta-mesa-card__col">
              <span className="acta-mesa-label">Mesa de Sufragio</span>
              <div className="acta-mesa-num">
                <Vote size={20} />
                <span>Mesa N° {mesaNum || "______"}</span>
              </div>
            </div>

            {mesaData?.local && (
              <div className="acta-mesa-card__col">
                <span className="acta-mesa-label">Colegio / Local</span>
                <strong className="acta-local-name">{mesaData.local.name}</strong>
                <span className="acta-local-meta">
                  {mesaData.local.province} · {mesaData.local.district}
                </span>
              </div>
            )}

            {personero && (
              <div className="acta-mesa-card__col">
                <span className="acta-mesa-label">Personero Responsable</span>
                <strong className="acta-personero-name">{personero.name}</strong>
                <span className="acta-personero-dni">
                  DNI: {personero.docNumber} · {personero.isSuplente ? "Suplente" : "Titular"}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* SELECTOR DE TIPO DE ELECCIÓN: GOBERNADOR VS ALCALDÍA PROVINCIAL */}
        <div className="election-scope-tabs">
          <button
            type="button"
            className={`scope-tab ${electionType === "gobernador" ? "scope-tab--active" : ""}`}
            onClick={() => setElectionType("gobernador")}
          >
            <Landmark size={18} />
            <div className="scope-tab-content">
              <span className="scope-tab-title">Gobernador Regional</span>
              <span className="scope-tab-sub">Madre de Dios (14 candidatos)</span>
            </div>
            {actas.some((a) => (a.electionType || "gobernador") === "gobernador") && (
              <span className="scope-badge-sent">✓ Enviada</span>
            )}
          </button>

          <button
            type="button"
            className={`scope-tab ${electionType === "provincial" ? "scope-tab--active" : ""}`}
            onClick={() => setElectionType("provincial")}
          >
            <Building2 size={18} />
            <div className="scope-tab-content">
              <span className="scope-tab-title">Alcaldía Provincial</span>
              <span className="scope-tab-sub">Provincia de {selectedProvince}</span>
            </div>
            {actas.some((a) => a.electionType === "provincial") && (
              <span className="scope-badge-sent">✓ Enviada</span>
            )}
          </button>
        </div>

        {/* Sub-pestañas de Provincia para Alcaldía Provincial */}
        {electionType === "provincial" && (
          <div className="province-scope-bar">
            <span className="province-scope-label">Selecciona Provincia:</span>
            <div className="province-pills">
              {["Tambopata", "Manu", "Tahuamanu"].map((prov) => (
                <button
                  key={prov}
                  type="button"
                  className={`province-pill ${selectedProvince === prov ? "province-pill--active" : ""}`}
                  onClick={() => setSelectedProvince(prov)}
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estado del Acta actual si ya fue enviada */}
        {currentStatus && (
          <div className={`acta-status-banner acta-status-banner--${currentStatus}`}>
            <div className="status-banner__icon">
              {currentStatus === "aprobada" ? (
                <CheckCircle2 size={24} className="text-green" />
              ) : currentStatus === "observada" ? (
                <AlertTriangle size={24} className="text-amber" />
              ) : (
                <Clock size={24} className="text-blue" />
              )}
            </div>
            <div className="status-banner__info">
              <h3 className="status-banner__title">
                {currentStatus === "aprobada"
                  ? `✓ Acta de ${electionType === "gobernador" ? "Gobernador" : `Alcaldía (${selectedProvince})`} Aprobada`
                  : currentStatus === "observada"
                  ? `⚠ Acta de ${electionType === "gobernador" ? "Gobernador" : `Alcaldía (${selectedProvince})`} Observada - Requiere Corrección`
                  : `📤 Acta de ${electionType === "gobernador" ? "Gobernador" : `Alcaldía (${selectedProvince})`} en Cola de Verificación`}
              </h3>
              <p className="status-banner__desc">
                {currentStatus === "aprobada"
                  ? "Los votos de esta mesa ya fueron contrastados por el operador y sumados al cómputo oficial en tiempo real."
                  : currentStatus === "observada"
                  ? `Observación del verificador: "${currentActa?.observationReason || "Por favor verifica los números o sube una fotografía más nítida."}". Corrige y vuelve a transmitir.`
                  : "Tu acta ha sido recibida y se encuentra a la espera de contraste con el operador verificador."}
              </p>
            </div>
          </div>
        )}

        {/* Formulario Principal de Subida de Acta */}
        <div className="acta-content-grid">
          {/* Columna Izquierda: Fotografía del Acta */}
          <section className="acta-step-card">
            <div className="step-card-header">
              <span className="step-number">1</span>
              <div>
                <h2 className="step-title">
                  Foto del Acta de {electionType === "gobernador" ? "Gobernador" : `Alcaldía (${selectedProvince})`}
                </h2>
                <p className="step-desc">Asegúrate de que la sección de escrutinio y totales sean nítidos.</p>
              </div>
            </div>

            {/* Input oculto para cámara/archivo */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {photoUrl ? (
              <div className="acta-photo-preview-wrap">
                <img src={photoUrl} alt="Foto del acta de escrutinio" className="acta-photo-img" />
                <div className="acta-photo-overlay-actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RotateCw size={14} /> Cambiar fotografía
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="acta-photo-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="dropzone-icon-circle">
                  <Camera size={32} />
                </div>
                <strong className="dropzone-title">Tomar Foto con Celular o Subir Imagen</strong>
                <span className="dropzone-hint">
                  Acta de {electionType === "gobernador" ? "Gobernación Regional" : `Alcaldía Provincial de ${selectedProvince}`}
                </span>
              </div>
            )}

            {/* Botón de Autorelleno con IA */}
            {photoUrl && (
              <div className="ia-extract-card">
                <div className="ia-extract-info">
                  <Sparkles size={20} className="ia-sparkles-icon" />
                  <div>
                    <strong>Extracción Inteligente con IA</strong>
                    <p>
                      La IA leerá las casillas de los candidatos a{" "}
                      {electionType === "gobernador" ? "Gobernador" : `Alcalde de ${selectedProvince}`} y
                      rellenará los votos automáticamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-ia-action"
                  onClick={handleExtractWithAI}
                  disabled={isExtractingIa}
                >
                  {isExtractingIa ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Extrayendo votos...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Analizar y Autorellenar con IA
                    </>
                  )}
                </button>
              </div>
            )}

            {iaExtracted && (
              <div className="ia-success-badge">
                <Check size={16} />
                <span>Votos leídos con IA. Por favor, revísalos en la lista de la derecha antes de enviar.</span>
              </div>
            )}

            {iaError && <div className="ia-error-alert">{iaError}</div>}
          </section>

          {/* Columna Derecha: Registro de Votos por Candidato */}
          <section className="acta-step-card">
            <div className="step-card-header">
              <span className="step-number">2</span>
              <div>
                <h2 className="step-title">
                  Candidatos: {electionType === "gobernador" ? "Gobernación Regional" : `Alcaldía ${selectedProvince}`}
                </h2>
                <p className="step-desc">
                  {mode === "ia"
                    ? "Verifica que los números coincidan exactamente con el acta en mano."
                    : "Ingresa los votos obtenidos por cada candidato en esta mesa."}
                </p>
              </div>
            </div>

            {/* Modos de llenado */}
            <div className="acta-modes-toggle">
              <button
                type="button"
                className={`mode-toggle-btn ${mode === "manual" ? "mode-toggle-btn--active" : ""}`}
                onClick={() => setMode("manual")}
              >
                Ingreso Manual
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${mode === "ia" ? "mode-toggle-btn--active" : ""}`}
                onClick={() => setMode("ia")}
              >
                <Sparkles size={14} /> Asistido con IA
              </button>
            </div>

            {/* Tabla de Votos */}
            <div className="acta-votes-table">
              {activeCandidates.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                  No hay candidatos configurados para {electionType === "gobernador" ? "Gobernador" : `Alcaldía ${selectedProvince}`}.
                </div>
              ) : (
                activeCandidates.map((cand) => {
                  const count = votes[cand.id] ?? 0;
                  const isHorna = cand.party.includes("AHORA NACION");

                  return (
                    <div
                      key={cand.id}
                      className={`acta-vote-row ${isHorna ? "acta-vote-row--highlight" : ""}`}
                    >
                      <div className="vote-row__party">
                        <span className="party-order">{cand.order}</span>
                        {cand.partyLogo ? (
                          <img src={cand.partyLogo} alt={cand.party} className="party-logo-img" />
                        ) : (
                          <div className="party-logo-placeholder">{cand.party.slice(0, 2)}</div>
                        )}
                        <div className="party-names">
                          <strong className="party-title">{cand.party}</strong>
                          <span className="candidate-name">{cand.name}</span>
                        </div>
                      </div>

                      <div className="vote-row__input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="999"
                          className="vote-number-input"
                          value={count === 0 ? "" : count}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setVotes((prev) => ({ ...prev, [cand.id]: val }));
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}

              {/* Blancos, Nulos e Impugnados */}
              <div className="acta-vote-special-rows">
                <div className="acta-vote-row acta-vote-row--special">
                  <div className="party-names">
                    <strong>Votos en Blanco</strong>
                  </div>
                  <input
                    type="number"
                    min="0"
                    className="vote-number-input"
                    value={votosBlancos === 0 ? "" : votosBlancos}
                    placeholder="0"
                    onChange={(e) => setVotosBlancos(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>

                <div className="acta-vote-row acta-vote-row--special">
                  <div className="party-names">
                    <strong>Votos Nulos</strong>
                  </div>
                  <input
                    type="number"
                    min="0"
                    className="vote-number-input"
                    value={votosNulos === 0 ? "" : votosNulos}
                    placeholder="0"
                    onChange={(e) => setVotosNulos(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>

                <div className="acta-vote-row acta-vote-row--special">
                  <div className="party-names">
                    <strong>Votos Impugnados</strong>
                  </div>
                  <input
                    type="number"
                    min="0"
                    className="vote-number-input"
                    value={votosImpugnados === 0 ? "" : votosImpugnados}
                    placeholder="0"
                    onChange={(e) => setVotosImpugnados(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>
              </div>

              {/* Total Calculado */}
              <div className="acta-total-bar">
                <span>Total de Ciudadanos que Votaron:</span>
                <strong className="acta-total-number">{totalCalculado}</strong>
              </div>
            </div>

            {errorMessage && <div className="acta-error-banner">{errorMessage}</div>}

            {/* Botón de Confirmación y Envío */}
            <div className="acta-submit-action">
              <button
                type="button"
                className="btn-submit-acta"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Transmitiendo acta al centro de cómputo...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Enviar Acta de {electionType === "gobernador" ? "Gobernador" : `Alcaldía (${selectedProvince})`}
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
