import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { getGobernadoresMDD, getAlcaldesProvincialesMDD } from '@/data/votoData';
import { createSvgLogoFallback, createSvgUserFallback } from '@/services/jneService';
import { getVoteLockStatus, recordUserVote, checkDualServerVoteLock, clearVoteLock } from '@/services/voteLockService';
import type { VoteLockStatus } from '@/services/voteLockService';
import { audioFeedback } from '@/utils/audioFeedback';
import { VoteLockScreen } from './VoteLockScreen';
import { VoterDemographicsModal, type DemographicsData } from './VoterDemographicsModal';
import type { VotoSimulado, DistritoMDD, Candidato } from '@/types';
import { AlertTriangle, Vote, RotateCcw, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import './CedulaSimulador.css';

interface CedulaSimuladorProps {
  userLocation: { distrito: DistritoMDD; sector: string; lat: number; lng: number } | null;
  onSubmitVote?: (voto: VotoSimulado) => void;
  onNavigate?: (tab: 'encuestas' | 'mapa' | 'candidatos' | 'simulador') => void;
}

type SectionKey = 'gob_reg' | 'alc_prov';

interface ColumnConfig {
  id: string;
  title: string;
  sec: SectionKey;
  color: string;
}

const BLUE_CLR = '#0046b4';

export const CedulaSimulador: React.FC<CedulaSimuladorProps> = ({
  userLocation,
  onSubmitVote,
  onNavigate
}) => {
  const [regionalLock, setRegionalLock] = useState<VoteLockStatus>(() => getVoteLockStatus('regional'));
  const [provincialLock, setProvincialLock] = useState<VoteLockStatus>(() => getVoteLockStatus('tambopata'));

  // Sincronización en tiempo real independiente con MySQL para Gobernador y Alcalde
  useEffect(() => {
    checkDualServerVoteLock().then((dual: any) => {
      if (dual) {
        setRegionalLock(dual.regional);
        setProvincialLock(dual.provincial);
        if (!dual.regional.isLocked) {
          clearVoteLock('regional');
        }
        if (!dual.provincial.isLocked) {
          clearVoteLock('tambopata');
        }
      }
    });
  }, []);
  const provinciaNombre = userLocation?.distrito?.provincia || 'Tambopata';
  const distritoNombre = userLocation?.distrito?.nombre || 'Puerto Maldonado';

  // Candidatos reales cargados dinámicamente de votoData.ts
  const gobernadores: Candidato[] = getGobernadoresMDD();
  const alcaldesProvinciales: Candidato[] = getAlcaldesProvincialesMDD(provinciaNombre);

  const COL_CFG: ColumnConfig[] = [
    { id: 'c01', title: 'Gobernador y<br>Vicegobernador Regional', sec: 'gob_reg', color: 'fila-celeste' },
    { id: 'c02', title: `Alcalde Provincial<br>(${provinciaNombre})`, sec: 'alc_prov', color: 'fila-bage' }
  ];

  const SEC_LBL: Record<SectionKey, string> = {
    gob_reg: 'Gobernador y Vicegobernador Regional',
    alc_prov: `Alcalde Provincial de ${provinciaNombre}`
  };

  // Estado del simulador
  const [votes, setVotes] = useState<Record<string, string>>({}); // sec -> candidato.id
  const [marked, setMarked] = useState<Record<string, boolean>>({}); // `${sec}_${cand.id}_${t}` -> bool
  const [activeCol, setActiveCol] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string>('');

  // Modales
  const [isDrawOpen, setIsDrawOpen] = useState<boolean>(false);
  const [drawTarget, setDrawTarget] = useState<{ sec: SectionKey; cand: Candidato; t: 'logo' | 'foto' } | null>(null);
  const [quickShape, setQuickShape] = useState<'X' | '+' | null>(null);
  const [drawWarn, setDrawWarn] = useState<{ msg: string; type: 'ok' | 'bad' | 'warn' | '' }>({ msg: '', type: '' });

  const [isWarnOpen, setIsWarnOpen] = useState<boolean>(false);
  const [warnData, setWarnData] = useState<{ sec: SectionKey; attemptedCand: Candidato } | null>(null);

  const [isResultsOpen, setIsResultsOpen] = useState<boolean>(false);
  const [isDemographicsModalOpen, setIsDemographicsModalOpen] = useState<boolean>(false);
  const [submittedReceiptRecord, setSubmittedReceiptRecord] = useState<any>(null);

  // Referencias Canvas de Dibujo Modal
  const dCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<{ x: number; y: number }[][]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[] | null>(null);

  // Canvas refs en la cartilla
  const markCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  // Toast Timer
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(''), 2800);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  // Teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDrawOpen) {
        if (e.key === 'Enter') { e.preventDefault(); handleConfirmDraw(); }
        else if (e.key === 'Escape') { e.preventDefault(); setIsDrawOpen(false); }
      } else if (isWarnOpen && e.key === 'Escape') {
        setIsWarnOpen(false);
      } else if (isResultsOpen && e.key === 'Escape') {
        setIsResultsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawOpen, isWarnOpen, isResultsOpen, quickShape, drawTarget]);

  // Dibujar marcas confirmadas en canvas de cartilla tras re-render
  useEffect(() => {
    Object.keys(marked).forEach((key) => {
      if (marked[key] && markCanvasRefs.current[key]) {
        const cv = markCanvasRefs.current[key];
        if (cv) {
          const ctx = cv.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, 50, 50);
            ctx.strokeStyle = BLUE_CLR;
            ctx.lineWidth = 4.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(9, 9); ctx.lineTo(41, 41);
            ctx.moveTo(41, 9); ctx.lineTo(9, 41);
            ctx.stroke();
          }
        }
      }
    });
  }, [marked, activeCol, provinciaNombre]);

  const showToast = (msg: string) => setToastMsg(msg);

  const isDrawingRef = useRef<boolean>(false);

  // Auxiliar geométrico para validar intersección de líneas (Normativa Electoral Oficial)
  const doSegmentsIntersect = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ): boolean => {
    const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    };
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  };

  // Determina si un trazo individual es una línea recta válida o un garabato/círculo/curva/espiral
  const isStrokeStraightLine = (pts: { x: number; y: number }[]): boolean => {
    if (!pts || pts.length < 2) return false;

    let pathLength = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }

    const start = pts[0];
    const end = pts[pts.length - 1];
    const directDist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);

    // Círculo, espiral o lazo cerrado
    if (directDist < 30 && pathLength > 50) {
      return false;
    }
    if (directDist < 18) {
      return false; // Punto o toque minúsculo
    }

    // Ratio de linealidad (> 1.45 significa trazo curvo, zig-zag o garabato)
    const ratio = pathLength / (directDist || 1);
    if (ratio > 1.42) {
      return false;
    }

    // Auto-intersecciones en el mismo trazo (bucles / firmas)
    const step = Math.max(1, Math.floor(pts.length / 16));
    const sampled: { x: number; y: number }[] = [];
    for (let i = 0; i < pts.length; i += step) {
      sampled.push(pts[i]);
    }
    if (sampled[sampled.length - 1] !== pts[pts.length - 1]) {
      sampled.push(pts[pts.length - 1]);
    }

    for (let i = 0; i < sampled.length - 1; i++) {
      for (let j = i + 2; j < sampled.length - 1; j++) {
        if (i === 0 && j === sampled.length - 2) continue;
        if (doSegmentsIntersect(sampled[i], sampled[i + 1], sampled[j], sampled[j + 1])) {
          return false;
        }
      }
    }

    return true;
  };

  const validateStrokes = () => {
    const strokes = strokesRef.current;
    if (strokes.length === 0) {
      setDrawWarn({ msg: '✍️ Dibuje su cruz (+) o aspa (X) sobre el recuadro, o elija una opción rápida arriba.', type: '' });
      return;
    }

    // 1 Trazo
    if (strokes.length === 1) {
      const s1 = strokes[0];
      const isStraight = isStrokeStraightLine(s1);
      if (!isStraight) {
        setDrawWarn({
          msg: '❌ VOTO NULO / INVÁLIDO: Garabatos, círculos o espirales anulan el voto según la normativa electoral.',
          type: 'bad'
        });
      } else {
        setDrawWarn({
          msg: '⚠️ Trazo incompleto (1 línea recta): Debe cruzar una segunda línea formando una Cruz (+) o Aspa (X).',
          type: 'warn'
        });
      }
      return;
    }

    // 2 Trazos
    if (strokes.length === 2) {
      const s1 = strokes[0];
      const s2 = strokes[1];
      const is1Straight = isStrokeStraightLine(s1);
      const is2Straight = isStrokeStraightLine(s2);

      if (!is1Straight || !is2Straight) {
        setDrawWarn({
          msg: '❌ VOTO NULO / INVÁLIDO: Los trazos contienen garabatos, curvas o figuras no reglamentarias.',
          type: 'bad'
        });
        return;
      }

      const p1 = s1[0];
      const p2 = s1[s1.length - 1];
      const p3 = s2[0];
      const p4 = s2[s2.length - 1];

      const intersects = doSegmentsIntersect(p1, p2, p3, p4);
      if (intersects) {
        setDrawWarn({
          msg: '✅ ¡VOTO VÁLIDO! Cruz (+) o Aspa (X) con intersección dentro del recuadro.',
          type: 'ok'
        });
      } else {
        setDrawWarn({
          msg: '❌ VOTO NULO / INVÁLIDO: Las 2 líneas no se cruzan dentro del recuadro.',
          type: 'bad'
        });
      }
      return;
    }

    // >= 3 Trazos
    if (strokes.length >= 3) {
      setDrawWarn({
        msg: '❌ VOTO NULO / INVÁLIDO: Garabatos, firmas o múltiples rayas anulan la cédula electoral.',
        type: 'bad'
      });
    }
  };

  const drawShapeOnCanvas = (canvas: HTMLCanvasElement | null, shape: 'X' | '+') => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 220, 220);
    ctx.strokeStyle = BLUE_CLR;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (shape === 'X') {
      ctx.moveTo(35, 35); ctx.lineTo(185, 185);
      ctx.moveTo(185, 35); ctx.lineTo(35, 185);
      strokesRef.current = [
        [{ x: 35, y: 35 }, { x: 185, y: 185 }],
        [{ x: 185, y: 35 }, { x: 35, y: 185 }]
      ];
    } else {
      ctx.moveTo(110, 25); ctx.lineTo(110, 195);
      ctx.moveTo(25, 110); ctx.lineTo(195, 110);
      strokesRef.current = [
        [{ x: 110, y: 25 }, { x: 110, y: 195 }],
        [{ x: 25, y: 110 }, { x: 195, y: 110 }]
      ];
    }
    ctx.stroke();
  };

  // --- LOGICA DE DIBUJO ---
  const isSectionLocked = (sec: SectionKey) => {
    return sec === 'gob_reg' ? regionalLock.isLocked : provincialLock.isLocked;
  };

  const handleOpenDraw = (sec: SectionKey, cand: Candidato, t: 'logo' | 'foto') => {
    if (isSectionLocked(sec)) {
      showToast(`🔒 Ya registraste tu voto para ${sec === 'gob_reg' ? 'Gobernador Regional' : 'Alcalde Provincial'}.`);
      return;
    }
    const key = `${sec}_${cand.id}_${t}`;
    if (marked[key]) {
      showToast('Este recuadro ya tiene una marca');
      return;
    }
    if (votes[sec] !== undefined && votes[sec] !== cand.id) {
      setWarnData({ sec, attemptedCand: cand });
      setIsWarnOpen(true);
      return;
    }

    setDrawTarget({ sec, cand, t });
    setQuickShape(null);
    setDrawWarn({ msg: '✍️ Dibuje su cruz (+) o aspa (X) sobre el recuadro, o elija una opción rápida arriba.', type: '' });
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setIsDrawOpen(true);

    // Iniciar con lienzo completamente LIMPIO / SIN MARCAR
    setTimeout(() => {
      if (dCanvasRef.current) {
        const ctx = dCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, 220, 220);
      }
    }, 50);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = dCanvasRef.current;
    if (!canvas) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current = [{ x, y }];

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = BLUE_CLR;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = dCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentStrokeRef.current) {
      currentStrokeRef.current.push({ x, y });
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}

    if (currentStrokeRef.current && currentStrokeRef.current.length > 0) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }

    validateStrokes();
  };

  const handleQuickPick = (shape: 'X' | '+') => {
    setQuickShape(shape);
    if (dCanvasRef.current) {
      drawShapeOnCanvas(dCanvasRef.current, shape);
    }
    setDrawWarn({ msg: `✅ ¡VOTO VÁLIDO! ${shape === 'X' ? 'Cruz (X)' : 'Aspa (+)'} oficial reglamentaria seleccionada.`, type: 'ok' });
  };

  const handleConfirmDraw = () => {
    if (!drawTarget) return;
    const { sec, cand, t } = drawTarget;
    const key = `${sec}_${cand.id}_${t}`;

    // Validar si el lienzo está vacío
    if (strokesRef.current.length === 0 && !quickShape) {
      alert('⚠️ El recuadro está en blanco.\nPor favor trace su cruz (X / +) con el mouse/dedo o pulse los botones [ X ] o [ + ] antes de confirmar.');
      return;
    }

    // Si el trazo fue detectado como inválido o nulo, orientar al elector
    if (drawWarn.type === 'bad' || drawWarn.type === 'warn') {
      const proceed = confirm(
        '⚠️ Orientación al Elector:\n\n' +
        'Su trazo no cumple con la regla de Cruz (+) o Aspa (X) con intersección dentro del recuadro, y será considerado como VOTO NULO en mesa de sufragio.\n\n' +
        '¿Desea registrarlo como Voto Nulo de todas formas?\n(Presione "Cancelar" si desea corregir su trazo).'
      );
      if (!proceed) return;
    }

    setMarked((prev) => ({ ...prev, [key]: true }));
    setVotes((prev) => ({ ...prev, [sec]: cand.id }));

    setIsDrawOpen(false);
    showToast(`✓ ${cand.partido} — ${t === 'foto' ? 'fotografía' : 'símbolo'} marcado`);

    checkAllDone();
  };

  const handleClearDraw = () => {
    setQuickShape(null);
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setDrawWarn({ msg: '✍️ Lienzo limpio. Trace su cruz (+) o aspa (X) o elija una opción rápida.', type: '' });
    if (dCanvasRef.current) {
      const ctx = dCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 220, 220);
    }
  };

  const clearEntireBallot = () => {
    setVotes({});
    setMarked({});
    // Limpiar visualmente todos los canvas en la cartilla
    Object.values(markCanvasRefs.current).forEach((canvas) => {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setQuickShape(null);
  };

  const handleResetAll = () => {
    if (!confirm('¿Seguro que desea limpiar toda la cédula?')) return;
    clearEntireBallot();
    clearVoteLock('regional');
    clearVoteLock('tambopata');
    setRegionalLock(getVoteLockStatus('regional'));
    setProvincialLock(getVoteLockStatus('tambopata'));
    setSubmittedReceiptRecord(null);
    showToast('Cédula limpiada ↺');
  };

  const checkAllDone = () => {
    const doneCount = Object.keys(votes).length;
    if (doneCount === 2) {
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch (err) { console.log(err); }
    }
  };

  const getCompletedCount = () => Object.keys(votes).length;

  const handleFinalSubmit = () => {
    const selectedGobId = !regionalLock.isLocked ? votes['gob_reg'] : undefined;
    const selectedAlcId = !provincialLock.isLocked ? votes['alc_prov'] : undefined;

    if (!regionalLock.isLocked && !selectedGobId && !provincialLock.isLocked && !selectedAlcId) {
      showToast('⚠️ Seleccione al menos una opción para emitir su voto');
      return;
    }
    if (!regionalLock.isLocked && !selectedGobId && provincialLock.isLocked) {
      showToast('⚠️ Marque su candidato para Gobernador Regional');
      return;
    }
    if (!provincialLock.isLocked && !selectedAlcId && regionalLock.isLocked) {
      showToast('⚠️ Marque su candidato para Alcalde Provincial');
      return;
    }

    if (onSubmitVote) {
      setIsDemographicsModalOpen(true);
    }
  };

  const handleConfirmBallotDemographics = (data: DemographicsData) => {
    setIsDemographicsModalOpen(false);
    const selectedGobId = !regionalLock.isLocked ? votes['gob_reg'] : undefined;
    const selectedAlcId = !provincialLock.isLocked ? votes['alc_prov'] : undefined;

    if (onSubmitVote) {
      const nuevoVoto: VotoSimulado = {
        id: `cedula-mdd-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        provincia: userLocation ? userLocation.distrito.provincia : provinciaNombre,
        distrito: userLocation ? userLocation.distrito.id : 'puerto-maldonado',
        sectorOBarrio: data.sector,
        lat: data.lat,
        lng: data.lng,
        precisionGPS: data.precisionGPS,
        candidatoGobernadorId: selectedGobId || '',
        candidatoAlcaldeId: selectedAlcId || undefined,
        rangoEdad: data.rangoEdad,
        edad: data.edad,
        sexo: data.sexo,
        temaPrioritario: 'Mineria Formal'
      };

      onSubmitVote(nuevoVoto);
      recordUserVote(nuevoVoto);

      if (selectedGobId) {
        setRegionalLock({ ...regionalLock, isLocked: true, remainingSeconds: 0 });
      }
      if (selectedAlcId) {
        setProvincialLock({ ...provincialLock, isLocked: true, remainingSeconds: 0 });
      }

      // Comprobante oficial de participación para la pantalla de confirmación
      const receipt = {
        voteId: nuevoVoto.id,
        timestamp: Date.now(),
        ip: '190.119.81.129',
        candidatoGobernadorId: nuevoVoto.candidatoGobernadorId,
        candidatoAlcaldeId: nuevoVoto.candidatoAlcaldeId,
        distrito: nuevoVoto.distrito,
        provincia: nuevoVoto.provincia,
        sectorOBarrio: nuevoVoto.sectorOBarrio,
        receiptNumber: `ACTA-MDD-${Date.now().toString().slice(-6)}`
      };
      setSubmittedReceiptRecord(receipt);

      audioFeedback.playVoteSuccess();
    }

    try {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.55 }
      });
    } catch (err) {
      console.log(err);
    }
    setIsResultsOpen(false);
    showToast('🎉 ¡Voto en Cédula registrado con éxito!');
  };

  const getCandidateListForSec = (sec: SectionKey) => {
    return sec === 'gob_reg' ? gobernadores : alcaldesProvinciales;
  };

  const getSelectedCandidateObj = (sec: SectionKey) => {
    const candId = votes[sec];
    if (!candId) return null;
    const list = getCandidateListForSec(sec);
    return list.find((c) => c.id === candId) || null;
  };

  // Si se emitió un voto o ambas secciones están selladas, mostrar el comprobante interactivo
  if (submittedReceiptRecord || (regionalLock.isLocked && provincialLock.isLocked)) {
    const activeLockRec = submittedReceiptRecord || regionalLock.record || provincialLock.record;

    return (
      <VoteLockScreen
        lockStatus={{
          isLocked: true,
          remainingSeconds: 0,
          remainingFormatted: '00:00:00',
          record: activeLockRec,
          clientIp: '190.119.81.129'
        }}
        onGoToResults={() => {
          if (onNavigate) {
            onNavigate('encuestas');
          } else if (typeof window !== 'undefined') {
            window.location.hash = 'encuestas';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        }}
        onUnlockSuccess={() => {
          clearEntireBallot();
          clearVoteLock('regional');
          clearVoteLock('tambopata');
          setRegionalLock(getVoteLockStatus('regional'));
          setProvincialLock(getVoteLockStatus('tambopata'));
          setSubmittedReceiptRecord(null);
          setActiveCol(0);
        }}
        onGoToCedulaAlcalde={() => {
          setSubmittedReceiptRecord(null);
          setActiveCol(1);
          setTimeout(() => {
            const stepNav = document.getElementById('step-nav') || document.querySelector('.sim-cartilla');
            if (stepNav) stepNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }}
        onGoToCedulaGobernador={() => {
          setSubmittedReceiptRecord(null);
          setActiveCol(0);
          setTimeout(() => {
            const stepNav = document.getElementById('step-nav') || document.querySelector('.sim-cartilla');
            if (stepNav) stepNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }}
      />
    );
  }

  return (
    <div className="sim-container-wrapper">
      {/* HEADER SIMULADOR REGIONAL Y MUNICIPAL MDD */}
      <header className="sim-hdr">
        <div className="sim-cw-header">
          <div className="sim-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: '#ffffff',
              padding: '4px',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              flexShrink: 0
            }}>
              <img
                src="/gobierno_regional_mdd.png"
                alt="Gobierno Regional Madre de Dios"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div className="sim-title">
              <h2>CÉDULA DE ELECCIONES REGIONALES Y MUNICIPALES 2026</h2>
              <small>Gobernador Regional y Alcalde Provincial ({provinciaNombre} • {distritoNombre})</small>
            </div>
          </div>
          <div className="sim-hdr-btns">
            <button className="btn-sim-reset" onClick={handleResetAll}>
              <RotateCcw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Limpiar todo
            </button>
            <button className="btn-sim-finalizar" onClick={() => setIsResultsOpen(true)}>
              <Vote size={18} />
              FINALIZAR
            </button>
          </div>
        </div>
      </header>

      {/* PROGRESS BAR */}
      <div id="prog-wrap">
        <div id="prog-bar" style={{ width: `${(getCompletedCount() / 2) * 100}%` }}></div>
      </div>

      {/* STEP NAVIGATION (Mobile / Tablet) */}
      <nav id="step-nav">
        {COL_CFG.map((cfg, idx) => (
          <button
            key={cfg.id}
            className={`snb ${activeCol === idx ? 'active' : ''} ${votes[cfg.sec] !== undefined ? 'done' : ''}`}
            onClick={() => setActiveCol(idx)}
          >
            <span className="snb-check">✓</span>
            {cfg.sec === 'gob_reg' ? '1. Gobernador Regional' : `2. Alcalde Provincial (${provinciaNombre})`}
          </button>
        ))}
      </nav>

      {/* CÉDULA DE 2 COLUMNAS (GOBERNADOR Y ALCALDE PROVINCIAL) */}
      <div className="sim-cw">
        <div className="sim-cartilla" style={{ minWidth: 'auto', justifyContent: 'center' }}>
          {COL_CFG.map((cfg, colIdx) => {
            const list = getCandidateListForSec(cfg.sec);

            return (
              <div
                key={cfg.id}
                className={`sim-cc ${activeCol === colIdx ? 'acol' : ''}`}
                style={{ maxWidth: '600px', flex: 1 }}
              >
                <div className="sim-chdr">
                  <h5 dangerouslySetInnerHTML={{ __html: cfg.title }} />
                  {isSectionLocked(cfg.sec) && (
                    <div style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginTop: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🔒 Voto Ya Registrado (Bloqueado)
                    </div>
                  )}
                </div>

                <table>
                  <thead>
                    <tr className="fila-gris">
                      <th colSpan={4}>
                        Marque con una cruz <em>X</em> o una aspa <i>+</i><br />
                        dentro del recuadro del símbolo y/o fotografía del candidato de su preferencia
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((cand) => {
                      const isLocked = votes[cfg.sec] !== undefined && votes[cfg.sec] !== cand.id;

                      return (
                        <tr key={cand.id} className={cfg.color}>
                          <td className="texto" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 900 }}>{cand.partido}</p>
                            <span style={{ fontSize: '0.65rem', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
                              Candidato: <strong>{cand.nombre}</strong>
                            </span>
                          </td>

                          {/* Logo Cell con fallback SVG */}
                          <td
                            className="logo"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleOpenDraw(cfg.sec, cand, 'logo')}
                          >
                            <img
                              src={cand.partidoLogo}
                              alt={cand.partido}
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = createSvgLogoFallback(cand.partido);
                              }}
                            />
                            <canvas
                              ref={(el) => { markCanvasRefs.current[`${cfg.sec}_${cand.id}_logo`] = el; }}
                              className={`co ${isLocked ? 'co-locked' : ''} ${marked[`${cfg.sec}_${cand.id}_logo`] ? 'co-done' : ''}`}
                              width="50"
                              height="50"
                            />
                          </td>

                          {/* Foto Cell del Candidato con fallback SVG */}
                          <td
                            className="foto"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleOpenDraw(cfg.sec, cand, 'foto')}
                          >
                            <img
                              src={cand.fotoUrl}
                              alt={cand.nombre}
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = createSvgUserFallback(cand.nombre);
                              }}
                            />
                            <canvas
                              ref={(el) => { markCanvasRefs.current[`${cfg.sec}_${cand.id}_foto`] = el; }}
                              className={`co ${isLocked ? 'co-locked' : ''} ${marked[`${cfg.sec}_${cand.id}_foto`] ? 'co-done' : ''}`}
                              width="50"
                              height="50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Controles de navegación responsive */}
                <div className="nav-row">
                  {colIdx > 0 && (
                    <button className="bp" onClick={() => setActiveCol(colIdx - 1)}>
                      <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Anterior
                    </button>
                  )}
                  {colIdx === 1 ? (
                    <button className="btn-finalizar-mob" onClick={() => setIsResultsOpen(true)}>
                      FINALIZAR
                    </button>
                  ) : (
                    <button className="bn" onClick={() => setActiveCol(colIdx + 1)}>
                      Siguiente <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: DIBUJAR MARCA (X / +) */}
      <div className={`sim-mo ${isDrawOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setIsDrawOpen(false)}>
        <div className="sim-mb">
          <div className="sim-mh">
            <h3>Marcar voto</h3>
          </div>
          <div className="sim-mbd">
            <div className="qpick-row">
              <span className="qpick-lbl">Selección rápida o dibuje abajo:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`qpick-btn ${quickShape === 'X' ? 'selected' : ''}`} onClick={() => handleQuickPick('X')}>
                  <X size={26} color="#0046b4" />
                </button>
                <button className={`qpick-btn ${quickShape === '+' ? 'selected' : ''}`} onClick={() => handleQuickPick('+')}>
                  <Plus size={26} color="#0046b4" />
                </button>
              </div>
            </div>

            <div id="dcw">
              <div className="dcw-inner">
                {drawTarget && (
                  <img
                    id="dC-bg"
                    src={drawTarget.t === 'foto' ? drawTarget.cand.fotoUrl : drawTarget.cand.partidoLogo}
                    alt="Preview"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = drawTarget.t === 'foto' ? createSvgUserFallback(drawTarget.cand.nombre) : createSvgLogoFallback(drawTarget.cand.partido);
                    }}
                  />
                )}
                <canvas
                  ref={dCanvasRef}
                  id="dC"
                  width="220"
                  height="220"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{ touchAction: 'none', cursor: 'crosshair' }}
                />
              </div>
            </div>

            {drawTarget && (
              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{drawTarget.cand.nombre}</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{drawTarget.cand.partido}</div>
              </div>
            )}

            <div id="draw-hint" style={{ marginTop: '4px' }}>Trace la primera línea y luego la segunda que la cruce</div>
            <div id="draw-warn" className={drawWarn.type}>{drawWarn.msg}</div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 10px',
              marginTop: '10px',
              fontSize: '0.72rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>💡</span>
              <span>
                <strong>Regla Electoral Oficial:</strong> El voto es válido únicamente si la intersección de la cruz (+) o aspa (X) cae dentro del recuadro del símbolo o fotografía.
              </span>
            </div>
          </div>
          <div className="sim-mac">
            <button className="bm cancel" onClick={() => setIsDrawOpen(false)}>Cancelar</button>
            <button className="bm c-red" onClick={handleClearDraw}>Limpiar</button>
            <button className="bm c-blue" onClick={handleConfirmDraw}>Confirmar</button>
          </div>
        </div>
      </div>

      {/* MODAL: ADVERTENCIA VOTO DUPLICADO */}
      <div className={`sim-mo ${isWarnOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setIsWarnOpen(false)}>
        <div className="sim-mb">
          <div className="sim-mh" style={{ background: '#b71c1c' }}>
            <span>¡Voto ya registrado!</span>
          </div>
          <div className="sim-mbd">
            {warnData && (
              <>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 8px 0' }}>
                  Ya eligió un candidato en "{SEC_LBL[warnData.sec]}"
                </p>
                <div className="wbadge">
                  <AlertTriangle size={24} style={{ flexShrink: 0, color: '#dc2626' }} />
                  <p>
                    Intenta marcar a <strong>{warnData.attemptedCand.nombre}</strong> ({warnData.attemptedCand.partido}), pero ya tiene otro candidato registrado en esta sección. Marcar candidatos distintos en la misma columna <strong>ANULA su voto</strong>.
                  </p>
                </div>
              </>
            )}
            <p className="warn-footer">Solo puede marcar un candidato por sección de votación.</p>
          </div>
          <div className="sim-mac">
            <button className="bm c-red" style={{ background: '#b71c1c', color: '#fff' }} onClick={() => setIsWarnOpen(false)}>
              Entendido
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: RESULTADOS / FINALIZAR CÉDULA REGIONAL MDD */}
      <div className={`sim-mo ${isResultsOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setIsResultsOpen(false)}>
        <div className="sim-mb">
          <div className="sim-mh" style={{ background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)' }}>
            <Vote size={22} />
            <span>RESUMEN DE MI CÉDULA (MADRE DE DIOS)</span>
          </div>

          {getCompletedCount() < 2 && (
            <div className="res-header-incompleto">
              <AlertTriangle size={18} />
              <span>Hay {2 - getCompletedCount()} sección(es) sin marcar — puede continuar votando o registrar.</span>
            </div>
          )}

          <div className="res-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {COL_CFG.map((cfg) => {
              const selectedCand = getSelectedCandidateObj(cfg.sec);

              return (
                <div key={cfg.sec} className={`res-col ${selectedCand ? '' : 'vacio'}`}>
                  <span className="res-sec-label">{SEC_LBL[cfg.sec]}</span>
                  {!selectedCand ? (
                    <span className="res-vacio-txt">Sin selección</span>
                  ) : (
                    <>
                      <span className="res-party-name">{selectedCand.partido}</span>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a', marginBottom: '8px' }}>
                        {selectedCand.nombre}
                      </strong>
                      <div className="res-imgs">
                        <div className="res-img-wrap">
                          <img
                            src={selectedCand.partidoLogo}
                            alt="Logo"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = createSvgLogoFallback(selectedCand.partido); }}
                          />
                          <span>Símbolo</span>
                        </div>
                        <div className="res-img-wrap">
                          <img
                            src={selectedCand.fotoUrl}
                            alt="Candidato"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = createSvgUserFallback(selectedCand.nombre); }}
                          />
                          <span>Candidato</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sim-mac" style={{ flexWrap: 'wrap' }}>
            <button className="bm cancel" onClick={() => setIsResultsOpen(false)}>Cerrar</button>
            <button className="bm c-red" onClick={() => { setIsResultsOpen(false); handleResetAll(); }}>Limpiar Cédula</button>
            <button className="bm c-blue" style={{ background: '#d32f2f' }} onClick={handleFinalSubmit}>
              Registrar Voto en la Simulación
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Captura Demográfica y Sector en Campo */}
      <VoterDemographicsModal
        isOpen={isDemographicsModalOpen}
        onClose={() => setIsDemographicsModalOpen(false)}
        surveyTitle="Cédula Única Regional y Municipal • Madre de Dios 2026"
        candidateName={getSelectedCandidateObj('gob_reg')?.nombre || getSelectedCandidateObj('alc_prov')?.nombre || 'Cédula Oficial'}
        candidateParty={getSelectedCandidateObj('gob_reg')?.partido || getSelectedCandidateObj('alc_prov')?.partido}
        candidatePhoto={getSelectedCandidateObj('gob_reg')?.fotoUrl || getSelectedCandidateObj('alc_prov')?.fotoUrl}
        partyLogo={getSelectedCandidateObj('gob_reg')?.partidoLogo || getSelectedCandidateObj('alc_prov')?.partidoLogo}
        onConfirm={handleConfirmBallotDemographics}
      />

      {/* TOAST NOTIFICACIÓN */}
      <div id="sim-toast" className={toastMsg ? 'on' : ''}>
        {toastMsg}
      </div>
    </div>
  );
};
