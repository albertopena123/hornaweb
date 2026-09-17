/**
 * personerosExport.ts
 * ─────────────────────────────────────────────────────────────────────
 * Generador Corporativo de Exportación para el Padrón de Personeros
 * de Mesa y Locales de Votación del Partido Político Ahora Nación.
 *
 * Formatos disponibles:
 *   1) PDF Oficial  – Formato A4 apaisado (landscape) con membrete oficial,
 *                     medallón del isotipo Ahora Nación, franja métrica KPI,
 *                     badging cromático por cargo (Titular, Suplente, General)
 *                     y paginación automática sin caracteres inválidos.
 *   2) XLSX Oficial – Libro corporativo ExcelJS con doble hoja:
 *                     • Hoja 1: Padrón Nominal Completo de Personeros (16 cols)
 *                     • Hoja 2: Resumen de Cobertura Electoral por Centro de Votación
 * ─────────────────────────────────────────────────────────────────────
 */

import type { PersoneroRow, LocalOption } from "@/app/(admin)/personeros/types";

export interface PersonerosExportStats {
  total: number;
  titulares: number;
  suplentes: number;
  generales: number;
  localesCount: number;
  mesasCount: number;
}

const COLORS = {
  brand: [185, 28, 28] as [number, number, number],         // Carmesí (#b91c1c)
  brandDark: [127, 29, 29] as [number, number, number],     // Borgoña (#7f1d1d)
  brandDeep: [153, 27, 27] as [number, number, number],     // Carmesí oscuro (#991b1b)
  gold: [217, 119, 6] as [number, number, number],          // Dorado solar (#d97706)
  goldLight: [254, 243, 199] as [number, number, number],   // Ámbar tenue (#fef3c7)
  blue: [2, 132, 199] as [number, number, number],          // Azul (#0284c7)
  blueLight: [224, 242, 254] as [number, number, number],   // Azul tenue (#e0f2fe)
  purple: [124, 58, 237] as [number, number, number],       // Violeta (#7c3aed)
  purpleLight: [243, 232, 255] as [number, number, number], // Violeta tenue (#f3e8ff)
  success: [22, 163, 74] as [number, number, number],       // Verde (#16a34a)
  successLight: [220, 252, 231] as [number, number, number],// Verde tenue (#dcfce7)
  danger: [220, 38, 38] as [number, number, number],        // Rojo (#dc2626)
  dangerLight: [254, 242, 242] as [number, number, number], // Rojo tenue (#fef2f2)
  slateDark: [15, 23, 42] as [number, number, number],      // Slate 900 (#0f172a)
  slateText: [30, 41, 59] as [number, number, number],      // Slate 800 (#1e293b)
  gray: [100, 116, 139] as [number, number, number],        // Slate 500 (#64748b)
  grayLight: [248, 250, 252] as [number, number, number],   // Slate 50 (#f8fafc)
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],      // Slate 200 (#e2e8f0)
};

async function loadLogoBase64(): Promise<string | null> {
  const sources = [
    "/assets/images/logo/logo-an.png",
    "/assets/images/logo/logo-an.webp",
    "/assets/images/logo/logo.png",
  ];

  for (const src of sources) {
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 400;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("No canvas context");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = src;
      });
      if (data) return data;
    } catch {
      // Intentar con siguiente ruta
    }
  }
  return null;
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 1) DESCARGAR PDF OFICIAL DE PERSONEROS (Landscape A4)
// ═══════════════════════════════════════════════════════════════════════
export async function downloadPersonerosPdf(
  personeros: PersoneroRow[],
  stats: PersonerosExportStats
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const margin = 12;
  const usableW = pageW - margin * 2; // 273mm

  const logoData = await loadLogoBase64();

  // Ordenar jerárquicamente por Distrito -> Local de Votación -> Mesa -> Cargo (Titular antes de Suplente) -> Nombre
  const sortedPersoneros = [...personeros].sort((a, b) => {
    const dComp = (a.district || "").localeCompare(b.district || "");
    if (dComp !== 0) return dComp;
    const lComp = (a.localName || "").localeCompare(b.localName || "");
    if (lComp !== 0) return lComp;
    const mA = a.mesa || "";
    const mB = b.mesa || "";
    if (mA !== mB) {
      if (mA === "" || mA.toLowerCase().includes("gen")) return -1;
      if (mB === "" || mB.toLowerCase().includes("gen")) return 1;
      return mA.localeCompare(mB, undefined, { numeric: true });
    }
    const roleRank = (p: PersoneroRow) => {
      if (!p.isSuplente && p.role !== "suplente" && p.role !== "general") return 1;
      if (p.isSuplente || p.role === "suplente") return 2;
      return 3;
    };
    const rComp = roleRank(a) - roleRank(b);
    if (rComp !== 0) return rComp;
    return (a.name || "").localeCompare(b.name || "");
  });

  // ─── Columnas del Reporte de Personeros ───
  // Total = 8 + 18 + 52 + 22 + 24 + 54 + 16 + 26 + 37 + 16 = 273mm
  function getCols() {
    return [
      margin,             // 0: # (8mm)
      margin + 8,         // 1: DNI (18mm)
      margin + 26,        // 2: Apellidos y Nombres (52mm)
      margin + 78,        // 3: Cargo (22mm)
      margin + 100,       // 4: Distrito (24mm)
      margin + 124,       // 5: Local de Votación (54mm)
      margin + 178,       // 6: Mesa (16mm)
      margin + 194,       // 7: Celular (26mm)
      margin + 220,       // 8: Coordinador Local (37mm)
      margin + 257,       // 9: Estado (16mm)
    ];
  }

  // ─── Dibuja Encabezado Institucional y Métricas ───
  function drawHeader(pageNum: number, totalPages: number) {
    // 1. Franja Superior Carmesí
    pdf.setFillColor(...COLORS.brandDeep);
    pdf.rect(0, 0, pageW, 23, "F");

    // 2. Línea de Acento Dorada
    pdf.setFillColor(...COLORS.gold);
    pdf.rect(0, 23, pageW, 1.8, "F");

    // 3. Logo Oficial Ahora Nación (Directo sobre franja institucional, sin círculos)
    if (logoData) {
      pdf.addImage(logoData, "PNG", margin, 3.5, 16, 16, undefined, "FAST");
    }

    const textX = margin + 20;

    // Título Principal
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...COLORS.white);
    pdf.text("PARTIDO POLÍTICO AHORA NACIÓN", textX, 9);

    // Subtítulo
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("PADRÓN OFICIAL DE PERSONEROS DE MESA Y LOCALES DE VOTACIÓN", textX, 15);

    // Jurisdicción / Ámbito
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.goldLight);
    pdf.text("REGIÓN MADRE DE DIOS · ELECCIONES GENERALES 2026", textX, 20);

    // Metadatos a la derecha
    pdf.setFontSize(6.8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(255, 255, 255);
    pdf.text(formatDate(), pageW - margin, 9, { align: "right" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, 15, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.goldLight);
    pdf.text("Sistema Electoral HornaWeb", pageW - margin, 20, { align: "right" });

    // 4. Franja de Métricas / KPI Strip (y = 25.5 a 32.5)
    const kpiY = 25.5;
    pdf.setFillColor(...COLORS.grayLight);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(margin, kpiY, usableW, 7, 1, 1, "FD");

    const kpiItems = [
      { label: "Personeros Registrados", val: String(stats.total), color: COLORS.brand },
      { label: "Titulares de Mesa", val: String(stats.titulares), color: COLORS.success },
      { label: "Suplentes", val: String(stats.suplentes), color: COLORS.blue },
      { label: "Generales de Local", val: String(stats.generales), color: COLORS.purple },
      { label: "Mesas Cubiertas", val: String(stats.mesasCount), color: COLORS.slateDark },
      { label: "Locales de Votación", val: String(stats.localesCount), color: COLORS.slateDark },
    ];

    const itemW = usableW / kpiItems.length;
    kpiItems.forEach((kpi, idx) => {
      const itemX = margin + idx * itemW + itemW / 2;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...COLORS.gray);
      pdf.text(kpi.label.toUpperCase(), itemX, kpiY + 2.8, { align: "center" });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...kpi.color);
      pdf.text(kpi.val, itemX, kpiY + 6, { align: "center" });

      if (idx < kpiItems.length - 1) {
        pdf.setDrawColor(...COLORS.border);
        pdf.setLineWidth(0.15);
        pdf.line(margin + (idx + 1) * itemW, kpiY + 1.2, margin + (idx + 1) * itemW, kpiY + 5.8);
      }
    });
  }

  // ─── Cabecera de la Tabla (y = 34) ───
  function drawTableHeader(y: number): number {
    const colX = getCols();
    const headerH = 7.5;

    pdf.setFillColor(...COLORS.brandDark);
    pdf.roundedRect(margin, y, usableW, headerH, 1, 1, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...COLORS.white);

    const headers = [
      { text: "#", x: colX[0] + 4, align: "center" as const },
      { text: "DNI", x: colX[1] + 9, align: "center" as const },
      { text: "Apellidos y Nombres", x: colX[2] + 2, align: "left" as const },
      { text: "Cargo / Rol", x: colX[3] + 11, align: "center" as const },
      { text: "Distrito", x: colX[4] + 2, align: "left" as const },
      { text: "Centro de Votación", x: colX[5] + 2, align: "left" as const },
      { text: "Mesa", x: colX[6] + 8, align: "center" as const },
      { text: "Celular / WA", x: colX[7] + 2, align: "left" as const },
      { text: "Coordinador Colegio", x: colX[8] + 2, align: "left" as const },
      { text: "Estado", x: colX[9] + 8, align: "center" as const },
    ];

    headers.forEach((h) => {
      pdf.text(h.text, h.x, y + 4.8, { align: h.align });
    });

    return y + headerH + 0.8;
  }

  // ─── Pie de Página ───
  function drawFooter() {
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageH - 7, pageW - margin, pageH - 7);

    pdf.setFontSize(6.2);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.gray);
    pdf.text(
      "Documento oficial de control electoral · Partido Político Ahora Nación · Madre de Dios · hornaweb.pe",
      pageW / 2,
      pageH - 4.2,
      { align: "center" }
    );
  }

  // ─── Filas y Paginación ───
  const rowH = 8.8;
  const startY = 34;
  const maxY = pageH - 12;
  const rowsPerPage = Math.floor((maxY - (startY + 8.5)) / rowH);
  const totalPages = Math.max(1, Math.ceil(sortedPersoneros.length / rowsPerPage));

  let currentPage = 1;
  drawHeader(currentPage, totalPages);
  let y = drawTableHeader(startY);

  sortedPersoneros.forEach((p, idx) => {
    if (y + rowH > maxY) {
      drawFooter();
      pdf.addPage();
      currentPage++;
      drawHeader(currentPage, totalPages);
      y = drawTableHeader(startY);
    }

    const colX = getCols();
    const rowIdx = idx + 1;

    // Fondo cebra suave
    if (idx % 2 === 1) {
      pdf.setFillColor(...COLORS.grayLight);
      pdf.rect(margin, y, usableW, rowH, "F");
    }

    // Línea inferior fina
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.1);
    pdf.line(margin, y + rowH, pageW - margin, y + rowH);

    const textY = y + 3.2;

    // Col 0: #
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...COLORS.gray);
    pdf.text(String(rowIdx), colX[0] + 4, textY + 0.8, { align: "center" });

    // Col 1: DNI (Destacado)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.slateDark);
    pdf.text(p.docNumber || "—", colX[1] + 9, textY + 0.8, { align: "center" });

    // Col 2: Apellidos y Nombres
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...COLORS.brand);
    const maxNameLen = 32;
    const nameDisplay = p.name.length > maxNameLen ? p.name.slice(0, maxNameLen) + "…" : p.name;
    pdf.text(nameDisplay, colX[2] + 2, textY);

    if (p.isMesaMember) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5);
      pdf.setTextColor(...COLORS.gold);
      pdf.text("★ MIEMBRO DE MESA ONPE", colX[2] + 2, textY + 3.4);
    }

    // Col 3: Cargo / Rol (Pill)
    const isTitular = !p.isSuplente && p.role !== "suplente" && p.role !== "general";
    const isGeneral = p.role === "general";
    const pillW = 18;
    const pillH = 4.2;
    const pillX = colX[3] + 11 - pillW / 2;
    const pillY = y + (rowH - pillH) / 2;

    if (isGeneral) {
      pdf.setFillColor(...COLORS.purpleLight);
      pdf.roundedRect(pillX, pillY, pillW, pillH, 0.8, 0.8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...COLORS.purple);
      pdf.text("GENERAL", colX[3] + 11, pillY + 3.1, { align: "center" });
    } else if (isTitular) {
      pdf.setFillColor(...COLORS.successLight);
      pdf.roundedRect(pillX, pillY, pillW, pillH, 0.8, 0.8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...COLORS.success);
      pdf.text("TITULAR", colX[3] + 11, pillY + 3.1, { align: "center" });
    } else {
      pdf.setFillColor(...COLORS.blueLight);
      pdf.roundedRect(pillX, pillY, pillW, pillH, 0.8, 0.8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...COLORS.blue);
      pdf.text("SUPLENTE", colX[3] + 11, pillY + 3.1, { align: "center" });
    }

    // Col 4: Distrito
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...COLORS.slateText);
    const distText = p.district ? p.district.charAt(0).toUpperCase() + p.district.slice(1).toLowerCase() : "—";
    pdf.text(distText, colX[4] + 2, textY + 0.8);

    // Col 5: Local de Votación
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.4);
    pdf.setTextColor(...COLORS.slateDark);
    const maxLocalLen = 34;
    const localDisplay = p.localName.length > maxLocalLen ? p.localName.slice(0, maxLocalLen) + "…" : p.localName;
    pdf.text(localDisplay, colX[5] + 2, textY);
    if (p.aula) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.2);
      pdf.setTextColor(...COLORS.gray);
      pdf.text(`Aula: ${p.aula}`, colX[5] + 2, textY + 3.4);
    }

    // Col 6: Mesa (Destacada)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(...COLORS.brandDark);
    pdf.text(p.mesa || "GENERAL", colX[6] + 8, textY + 0.8, { align: "center" });

    // Col 7: Celular / WA
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...COLORS.slateDark);
    pdf.text(p.phone || "—", colX[7] + 2, textY);
    if (p.whatsappNotifiedAt) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5);
      pdf.setTextColor(...COLORS.success);
      pdf.text("WA: Notificado", colX[7] + 2, textY + 3.4);
    }

    // Col 8: Coordinador Local
    if (p.coordinatorName) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.setTextColor(...COLORS.slateDark);
      const maxCoordLen = 22;
      const coordDisplay = p.coordinatorName.length > maxCoordLen ? p.coordinatorName.slice(0, maxCoordLen) + "…" : p.coordinatorName;
      pdf.text(coordDisplay, colX[8] + 2, textY);
      if (p.coordinatorPhone) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(5.2);
        pdf.setTextColor(...COLORS.gray);
        pdf.text(`Cel: ${p.coordinatorPhone}`, colX[8] + 2, textY + 3.4);
      }
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.8);
      pdf.setTextColor(...COLORS.gray);
      pdf.text("Sin Asignar", colX[8] + 2, textY + 0.8);
    }

    // Col 9: Estado
    const statePillW = 14;
    const statePillH = 4;
    const statePillX = colX[9] + 8 - statePillW / 2;
    const statePillY = y + (rowH - statePillH) / 2;

    if (p.active) {
      pdf.setFillColor(...COLORS.successLight);
      pdf.roundedRect(statePillX, statePillY, statePillW, statePillH, 0.8, 0.8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.4);
      pdf.setTextColor(...COLORS.success);
      pdf.text("ACTIVO", colX[9] + 8, statePillY + 2.9, { align: "center" });
    } else {
      pdf.setFillColor(...COLORS.grayLight);
      pdf.roundedRect(statePillX, statePillY, statePillW, statePillH, 0.8, 0.8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.4);
      pdf.setTextColor(...COLORS.gray);
      pdf.text("INACTIVO", colX[9] + 8, statePillY + 2.9, { align: "center" });
    }

    y += rowH;
  });

  drawFooter();

  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`Padron_Personeros_Ahora_Nacion_${dateStr}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// 2) DESCARGAR EXCEL OFICIAL DE PERSONEROS (.xlsx con Doble Hoja)
// ═══════════════════════════════════════════════════════════════════════
export async function downloadPersonerosExcel(
  personeros: PersoneroRow[],
  stats: PersonerosExportStats,
  locales: LocalOption[] = []
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Partido Político Ahora Nación · Madre de Dios";
  workbook.lastModifiedBy = "Sistema Electoral HornaWeb";
  workbook.created = new Date();

  // Cargar Logo Oficial en PNG
  let logoId: number | null = null;
  try {
    const logoResp = await fetch("/assets/images/logo/logo-an.png");
    if (logoResp.ok) {
      const logoBlob = await logoResp.blob();
      const logoBuffer = await logoBlob.arrayBuffer();
      logoId = workbook.addImage({
        buffer: logoBuffer,
        extension: "png",
      });
    }
  } catch {
    // Continuar si falla
  }

  const ARGB = {
    brandRed: "FFB91C1C",       // Carmesí (#b91c1c)
    brandDark: "FF7F1D1D",      // Borgoña (#7f1d1d)
    bannerRed: "FFDC2626",      // Rojo brillante (#dc2626)
    brandLight: "FFFEF2F2",     // Fondo suave (#fef2f2)
    gold: "FFD97706",           // Dorado (#d97706)
    goldLight: "FFFEF3C7",      // Fondo dorado (#fef3c7)
    white: "FFFFFFFF",
    grayBorder: "FFE2E8F0",
    grayDarkBorder: "FF94A3B8",
    zebraBg: "FFF8FAFC",
    assignedBg: "FFDCFCE7",
    assignedFg: "FF15803D",
    pendingBg: "FFFEE2E2",
    pendingFg: "FFB91C1C",
    blueBg: "FFE0F2FE",
    blueFg: "FF0284C7",
    purpleBg: "FFF3E8FF",
    purpleFg: "FF7C3AED",
  };

  // Ordenar jerárquicamente por Distrito -> Local de Votación -> Mesa -> Cargo -> Nombre
  const sortedPersoneros = [...personeros].sort((a, b) => {
    const dComp = (a.district || "").localeCompare(b.district || "");
    if (dComp !== 0) return dComp;
    const lComp = (a.localName || "").localeCompare(b.localName || "");
    if (lComp !== 0) return lComp;
    const mA = a.mesa || "";
    const mB = b.mesa || "";
    if (mA !== mB) {
      if (mA === "" || mA.toLowerCase().includes("gen")) return -1;
      if (mB === "" || mB.toLowerCase().includes("gen")) return 1;
      return mA.localeCompare(mB, undefined, { numeric: true });
    }
    const roleRank = (p: PersoneroRow) => {
      if (!p.isSuplente && p.role !== "suplente" && p.role !== "general") return 1;
      if (p.isSuplente || p.role === "suplente") return 2;
      return 3;
    };
    const rComp = roleRank(a) - roleRank(b);
    if (rComp !== 0) return rComp;
    return (a.name || "").localeCompare(b.name || "");
  });

  // ───────────────────────────────────────────────────────────────────
  // HOJA 1: PADRÓN NOMINAL DE PERSONEROS
  // ───────────────────────────────────────────────────────────────────
  const ws1 = workbook.addWorksheet("Padrón de Personeros", {
    properties: { tabColor: { argb: ARGB.brandRed } },
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Logotipo institucional contenido en A1:A3
  ws1.mergeCells("A1:A3");
  const logoCell1 = ws1.getCell("A1");
  logoCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandDark } };
  logoCell1.border = {
    top: { style: "medium", color: { argb: ARGB.brandDark } },
    bottom: { style: "medium", color: { argb: ARGB.brandDark } },
    left: { style: "medium", color: { argb: ARGB.brandDark } },
    right: { style: "medium", color: { argb: ARGB.brandDark } },
  };

  if (logoId !== null) {
    ws1.addImage(logoId, {
      tl: { col: 0.15, row: 0.25 },
      ext: { width: 48, height: 48 },
    });
  }

  // Fila 1: Título Principal
  ws1.mergeCells("B1:P1");
  const titleCell1 = ws1.getCell("B1");
  titleCell1.value = "PARTIDO POLÍTICO AHORA NACIÓN";
  titleCell1.font = { name: "Calibri", size: 16, bold: true, color: { argb: ARGB.white } };
  titleCell1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  titleCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.bannerRed } };
  ws1.getRow(1).height = 28;

  // Fila 2: Subtítulo
  ws1.mergeCells("B2:P2");
  const subCell1 = ws1.getCell("B2");
  subCell1.value = "PADRÓN OFICIAL DE PERSONEROS DE MESA Y LOCALES · REGIÓN MADRE DE DIOS";
  subCell1.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: ARGB.white } };
  subCell1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  subCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandRed } };
  ws1.getRow(2).height = 20;

  // Fila 3: KPI Metrics
  ws1.mergeCells("B3:P3");
  const kpiCell1 = ws1.getCell("B3");
  kpiCell1.value = `Total Personeros: ${stats.total}   |   Titulares: ${stats.titulares}   |   Suplentes: ${stats.suplentes}   |   Generales: ${stats.generales}   |   Mesas Cubiertas: ${stats.mesasCount}   |   Generado: ${formatDate()}`;
  kpiCell1.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.gold } };
  kpiCell1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  kpiCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandLight } };
  ws1.getRow(3).height = 18;

  ws1.getRow(4).height = 6;

  // Columnas Hoja 1 con anchos equilibrados
  ws1.columns = [
    { key: "num",         width: 8,  header: "#" },
    { key: "dni",         width: 14, header: "DNI" },
    { key: "name",        width: 36, header: "Apellidos y Nombres" },
    { key: "cargo",       width: 20, header: "Cargo / Rol" },
    { key: "district",    width: 20, header: "Distrito" },
    { key: "localName",   width: 44, header: "Local de Votación" },
    { key: "address",     width: 32, header: "Dirección del Local" },
    { key: "mesa",        width: 12, header: "Mesa" },
    { key: "aula",        width: 12, header: "Aula" },
    { key: "phone",       width: 16, header: "Celular" },
    { key: "whatsapp",    width: 14, header: "Notif. WA" },
    { key: "onpeMember",  width: 16, header: "Miembro ONPE" },
    { key: "coordName",   width: 34, header: "Coordinador Colegio" },
    { key: "coordPhone",  width: 16, header: "Cel. Coordinador" },
    { key: "estado",      width: 14, header: "Estado" },
    { key: "credencial",  width: 14, header: "Credencial" },
  ];

  const headerRow1 = ws1.getRow(5);
  headerRow1.values = [
    "#", "DNI", "Apellidos y Nombres", "Cargo / Rol", "Distrito",
    "Local de Votación", "Dirección del Local", "Mesa", "Aula", "Celular",
    "Notif. WA", "Miembro ONPE", "Coordinador Colegio", "Cel. Coordinador", "Estado", "Credencial"
  ];
  headerRow1.height = 24;
  headerRow1.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandRed } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: ARGB.brandDark } },
      bottom: { style: "medium", color: { argb: ARGB.gold } },
      left: { style: "thin", color: { argb: ARGB.brandDark } },
      right: { style: "thin", color: { argb: ARGB.brandDark } },
    };
  });

  sortedPersoneros.forEach((p, idx) => {
    const isTitular = !p.isSuplente && p.role !== "suplente" && p.role !== "general";
    const isGeneral = p.role === "general";
    const cargoStr = isGeneral ? "Personero General" : isTitular ? "Personero de Mesa" : "Personero Suplente";

    const row = ws1.addRow({
      num: idx + 1,
      dni: p.docNumber,
      name: p.name,
      cargo: cargoStr,
      district: p.district || "—",
      localName: p.localName,
      address: p.localAddress || "—",
      mesa: p.mesa || "GENERAL",
      aula: p.aula || "—",
      phone: p.phone || "—",
      whatsapp: p.whatsappNotifiedAt ? "SÍ" : "NO",
      onpeMember: p.isMesaMember ? "SÍ" : "NO",
      coordName: p.coordinatorName || "—",
      coordPhone: p.coordinatorPhone || "—",
      estado: p.active ? "Activo" : "Inactivo",
      credencial: p.credentialToken ? "Emitida" : "Pendiente",
    });

    row.height = 20;

    row.eachCell((cell, colNumber) => {
      if (colNumber > 16) return;
      cell.font = { name: "Calibri", size: 9.5 };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: ARGB.grayBorder } },
        bottom: { style: "thin", color: { argb: ARGB.grayBorder } },
        left: { style: "thin", color: { argb: ARGB.grayBorder } },
        right: { style: "thin", color: { argb: ARGB.grayBorder } },
      };
      if (idx % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.zebraBg } };
      }
    });

    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    
    // DNI formateado como texto puro (numFmt = "@") y centrado
    const dniCell = row.getCell(2);
    dniCell.numFmt = "@";
    dniCell.alignment = { horizontal: "center", vertical: "middle" };
    dniCell.font = { name: "Calibri", size: 9.5, bold: true };

    row.getCell(3).font = { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.brandRed } };

    // Cargo con color
    const cargoCell = row.getCell(4);
    cargoCell.alignment = { horizontal: "center", vertical: "middle" };
    cargoCell.font = { name: "Calibri", size: 9, bold: true };
    if (isTitular) {
      cargoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.assignedBg } };
      cargoCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.assignedFg } };
    } else if (isGeneral) {
      cargoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.purpleBg } };
      cargoCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.purpleFg } };
    } else {
      cargoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.blueBg } };
      cargoCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.blueFg } };
    }

    row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(8).font = { name: "Calibri", size: 9.5, bold: true };

    // Celular personero
    const phoneCell = row.getCell(10);
    phoneCell.numFmt = "@";
    phoneCell.alignment = { horizontal: "center", vertical: "middle" };

    row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(12).alignment = { horizontal: "center", vertical: "middle" };

    // Celular coordinador
    const coordPhoneCell = row.getCell(14);
    coordPhoneCell.numFmt = "@";
    coordPhoneCell.alignment = { horizontal: "center", vertical: "middle" };

    // Estado
    const estadoCell = row.getCell(15);
    estadoCell.alignment = { horizontal: "center", vertical: "middle" };
    estadoCell.font = { name: "Calibri", size: 9, bold: true };
    if (p.active) {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.assignedBg } };
      estadoCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.assignedFg } };
    }
  });

  // Fila de Totales
  const lastRow1 = sortedPersoneros.length + 5;
  const summaryRow1 = lastRow1 + 1;
  ws1.mergeCells(`A${summaryRow1}:C${summaryRow1}`);
  const totalCell1 = ws1.getCell(`A${summaryRow1}`);
  totalCell1.value = `TOTAL GENERAL: ${sortedPersoneros.length} PERSONEROS REGISTRADOS`;
  totalCell1.font = { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.white } };
  totalCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandDark } };
  totalCell1.alignment = { horizontal: "center", vertical: "middle" };

  ws1.mergeCells(`D${summaryRow1}:P${summaryRow1}`);
  const sumDetailCell1 = ws1.getCell(`D${summaryRow1}`);
  sumDetailCell1.value = `Titulares: ${stats.titulares}   |   Suplentes: ${stats.suplentes}   |   Generales: ${stats.generales}   |   Mesas Representadas: ${stats.mesasCount}`;
  sumDetailCell1.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: ARGB.brandDark } };
  sumDetailCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  sumDetailCell1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  ws1.getRow(summaryRow1).height = 22;

  ws1.views = [{ state: "frozen", ySplit: 5, xSplit: 0 }];
  ws1.autoFilter = { from: { row: 5, column: 1 }, to: { row: lastRow1, column: 16 } };

  // ───────────────────────────────────────────────────────────────────
  // HOJA 2: RESUMEN DE COBERTURA POR LOCAL DE VOTACIÓN
  // ───────────────────────────────────────────────────────────────────
  if (locales && locales.length > 0) {
    const ws2 = workbook.addWorksheet("Cobertura por Local", {
      properties: { tabColor: { argb: ARGB.gold } },
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    // Logotipo institucional contenido en A1:A3 de Hoja 2
    ws2.mergeCells("A1:A3");
    const logoCell2 = ws2.getCell("A1");
    logoCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandDark } };
    logoCell2.border = {
      top: { style: "medium", color: { argb: ARGB.brandDark } },
      bottom: { style: "medium", color: { argb: ARGB.brandDark } },
      left: { style: "medium", color: { argb: ARGB.brandDark } },
      right: { style: "medium", color: { argb: ARGB.brandDark } },
    };

    if (logoId !== null) {
      ws2.addImage(logoId, {
        tl: { col: 0.15, row: 0.25 },
        ext: { width: 48, height: 48 },
      });
    }

    // Fila 1: Título Hoja 2
    ws2.mergeCells("B1:K1");
    const tCell2 = ws2.getCell("B1");
    tCell2.value = "PARTIDO POLÍTICO AHORA NACIÓN";
    tCell2.font = { name: "Calibri", size: 16, bold: true, color: { argb: ARGB.white } };
    tCell2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    tCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.bannerRed } };
    ws2.getRow(1).height = 28;

    // Fila 2: Subtítulo Hoja 2
    ws2.mergeCells("B2:K2");
    const sub2 = ws2.getCell("B2");
    sub2.value = "RESUMEN EJECUTIVO DE COBERTURA DE PERSONEROS POR LOCAL DE VOTACIÓN";
    sub2.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: ARGB.white } };
    sub2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    sub2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandRed } };
    ws2.getRow(2).height = 20;

    // Fila 3: Info Hoja 2
    ws2.mergeCells("B3:K3");
    const info2 = ws2.getCell("B3");
    info2.value = `Total Locales: ${locales.length}   |   Supervisión y Despliegue de Personeros   |   Generado: ${formatDate()}`;
    info2.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.gold } };
    info2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    info2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandLight } };
    ws2.getRow(3).height = 18;

    ws2.getRow(4).height = 6;

    // Columnas Hoja 2
    ws2.columns = [
      { key: "num",          width: 8,  header: "#" },
      { key: "localName",    width: 46, header: "Local de Votación" },
      { key: "district",     width: 20, header: "Distrito" },
      { key: "totalMesas",   width: 14, header: "Mesas Totales" },
      { key: "totalPers",    width: 16, header: "Personeros Asignados" },
      { key: "titulares",    width: 14, header: "Titulares" },
      { key: "suplentes",    width: 14, header: "Suplentes" },
      { key: "cobertura",    width: 14, header: "% Cobertura" },
      { key: "coord1",       width: 34, header: "Coordinador Titular" },
      { key: "coordPhone",   width: 16, header: "Cel. Coordinador" },
      { key: "estado",       width: 16, header: "Estado" },
    ];

    const headerRow2 = ws2.getRow(5);
    headerRow2.values = [
      "#", "Local de Votación", "Distrito", "Mesas Totales", "Personeros Asignados",
      "Titulares", "Suplentes", "% Cobertura", "Coordinador Titular", "Cel. Coordinador", "Estado"
    ];
    headerRow2.height = 24;
    headerRow2.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandRed } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "medium", color: { argb: ARGB.brandDark } },
        bottom: { style: "medium", color: { argb: ARGB.gold } },
        left: { style: "thin", color: { argb: ARGB.brandDark } },
        right: { style: "thin", color: { argb: ARGB.brandDark } },
      };
    });

    // Ordenar locales por Distrito y Nombre
    const sortedLocales = [...locales].sort((a, b) => {
      const dComp = (a.district || "").localeCompare(b.district || "");
      if (dComp !== 0) return dComp;
      return (a.name || "").localeCompare(b.name || "");
    });

    sortedLocales.forEach((loc, idx) => {
      const pInLoc = personeros.filter((p) => p.localName.toLowerCase() === loc.name.toLowerCase());
      const tCount = pInLoc.filter((p) => !p.isSuplente && p.role !== "suplente" && p.role !== "general").length;
      const sCount = pInLoc.filter((p) => p.isSuplente || p.role === "suplente").length;
      const uniqueMesas = new Set(pInLoc.map((p) => p.mesa).filter(Boolean)).size;
      const mTotal = uniqueMesas > 0 ? uniqueMesas : 1;
      const covPct = Math.min(100, Math.round((tCount / Math.max(1, mTotal)) * 100));
      const coord1 = pInLoc.find((p) => p.coordinatorName)?.coordinatorName || "—";
      const coordPhone = pInLoc.find((p) => p.coordinatorPhone)?.coordinatorPhone || "—";

      const row = ws2.addRow({
        num: idx + 1,
        localName: loc.name,
        district: loc.district || "—",
        totalMesas: mTotal,
        totalPers: pInLoc.length,
        titulares: tCount,
        suplentes: sCount,
        cobertura: `${covPct}%`,
        coord1: coord1,
        coordPhone: coordPhone,
        estado: covPct >= 100 ? "100% Cubierto" : covPct > 0 ? "Parcial" : "Sin Personeros",
      });

      row.height = 20;

      row.eachCell((cell, colNumber) => {
        if (colNumber > 11) return;
        cell.font = { name: "Calibri", size: 9.5 };
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: ARGB.grayBorder } },
          bottom: { style: "thin", color: { argb: ARGB.grayBorder } },
          left: { style: "thin", color: { argb: ARGB.grayBorder } },
          right: { style: "thin", color: { argb: ARGB.grayBorder } },
        };
        if (idx % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.zebraBg } };
        }
      });

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.brandRed } };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).font = { name: "Calibri", size: 9.5, bold: true };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).font = { name: "Calibri", size: 9.5, bold: true };

      // Teléfono coordinador
      row.getCell(10).numFmt = "@";
      row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

      // Estado cobertura
      const estCell = row.getCell(11);
      estCell.alignment = { horizontal: "center", vertical: "middle" };
      estCell.font = { name: "Calibri", size: 9, bold: true };
      if (covPct >= 100) {
        estCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.assignedBg } };
        estCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.assignedFg } };
      } else if (covPct > 0) {
        estCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.goldLight } };
        estCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.gold } };
      } else {
        estCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.pendingBg } };
        estCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.pendingFg } };
      }
    });

    ws2.views = [{ state: "frozen", ySplit: 5, xSplit: 0 }];
    ws2.autoFilter = { from: { row: 5, column: 1 }, to: { row: locales.length + 5, column: 11 } };
  }

  // ─── Generar Archivo XLSX ───
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Padron_Personeros_Ahora_Nacion_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
