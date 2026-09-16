/**
 * nominaExport.ts
 * ─────────────────────────────────────────────────────────────────────
 * Exporta la Nómina de Coordinadores de Centro de Votación en dos
 * formatos profesionales:
 *
 *   1) PDF  – Generado con jsPDF (vectorial, no screenshot)
 *   2) XLSX – Generado con ExcelJS con colores y estilos corporativos
 *
 * Ambos incluyen el logo del partido, encabezados con la paleta
 * oficial y un diseño listo para impresión y distribución.
 * ─────────────────────────────────────────────────────────────────────
 */

export interface NominaLocal {
  name: string;
  code: string | null;
  province: string;
  district: string;
  totalMesas: number;
  mesasLength: number;
  coordinatorName: string | null;
  coordinatorDni: string | null;
  coordinatorPhone: string | null;
  coordinator2Name: string | null;
  coordinator2Dni: string | null;
  coordinator2Phone: string | null;
}

export interface NominaStats {
  totalColegios: number;
  conCoord: number;
  sinCoord: number;
}

// ─── Paleta Oficial ─────────────────────────────────────────────────
const COLORS = {
  brand: [22, 101, 52] as [number, number, number],       // Verde oscuro institucional
  brandLight: [220, 252, 231] as [number, number, number], // Verde clarito fondo
  accent: [37, 99, 235] as [number, number, number],       // Azul para Coord. 2
  accentLight: [239, 246, 255] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],       // Rojo para sin asignar
  dangerLight: [254, 242, 242] as [number, number, number],
  headerBg: [15, 23, 42] as [number, number, number],      // Slate-900 header
  headerText: [255, 255, 255] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  grayLight: [241, 245, 249] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Carga una imagen desde una URL y devuelve su base64 data-url */
async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function districtLabel(d: string): string {
  return d
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
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
// 1) EXPORTAR A PDF
// ═══════════════════════════════════════════════════════════════════════
export async function downloadNominaPdf(
  locales: NominaLocal[],
  stats: NominaStats
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  // Landscape A4 para que la tabla quepa bien
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const margin = 12;
  const usableW = pageW - margin * 2;

  // Cargar logo
  let logoData: string | null = null;
  try {
    logoData = await loadImageAsBase64("/assets/images/logo/logo.png");
  } catch {
    // Si falla el logo, continuar sin él
  }

  // ─── Función para dibujar cabecera en cada página ───
  function drawHeader(pageNum: number, totalPages: number) {
    // Franja superior verde oscuro
    pdf.setFillColor(...COLORS.brand);
    pdf.rect(0, 0, pageW, 28, "F");

    // Logo
    if (logoData) {
      pdf.addImage(logoData, "PNG", margin, 3, 22, 22, undefined, "FAST");
    }

    // Texto del partido
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...COLORS.white);
    pdf.text("PARTIDO POLÍTICO AHORA NACIÓN", logoData ? margin + 26 : margin, 11);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      "NÓMINA DE COORDINADORES DE LOCAL DE VOTACIÓN · REGIÓN MADRE DE DIOS",
      logoData ? margin + 26 : margin,
      17
    );

    // Estadísticas en la cabecera
    pdf.setFontSize(8);
    pdf.text(
      `Total Colegios: ${stats.totalColegios}  |  Asignados: ${stats.conCoord}  |  Pendientes: ${stats.sinCoord}`,
      logoData ? margin + 26 : margin,
      23
    );

    // Fecha y paginación a la derecha
    pdf.setFontSize(7);
    pdf.setTextColor(200, 220, 200);
    pdf.text(formatDate(), pageW - margin, 11, { align: "right" });
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, 16, { align: "right" });

    // Línea separadora
    pdf.setDrawColor(...COLORS.brand);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 29, pageW - margin, 29);
  }

  // ─── Función para dibujar cabecera de tabla ───
  function drawTableHeader(y: number): number {
    const colX = getColumnXPositions();
    const headerH = 8;

    pdf.setFillColor(...COLORS.headerBg);
    pdf.roundedRect(margin, y, usableW, headerH, 1, 1, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.headerText);

    const headers = ["#", "Provincia / Distrito", "Centro de Votación", "Mesas", "Coordinador 1 (Titular)", "Coordinador 2 (Adjunto)", "Teléfono"];
    headers.forEach((h, i) => {
      const x = colX[i] + 1.5;
      pdf.text(h, x, y + 5.5);
    });

    return y + headerH + 1;
  }

  function getColumnXPositions(): number[] {
    // #, Provincia, Centro, Mesas, Coord1, Coord2, Teléfono
    return [
      margin,
      margin + 10,
      margin + 45,
      margin + 120,
      margin + 135,
      margin + 195,
      margin + 240,
    ];
  }

  // ─── Función para dibujar pie de página ───
  function drawFooter() {
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.gray);
    pdf.text(
      "Documento generado por el Sistema de Gestión Electoral · Ahora Nación MDD · ahoranacionmdd.com",
      pageW / 2,
      pageH - 5,
      { align: "center" }
    );
    // Línea fina en pie
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageH - 8, pageW - margin, pageH - 8);
  }

  // ─── Pre-calcular total de páginas ───
  const rowH = 10;
  const startY = 35;
  const maxY = pageH - 14;
  const rowsPerFirstPage = Math.floor((maxY - startY) / rowH);
  const totalPages = Math.max(1, 1 + Math.ceil((locales.length - rowsPerFirstPage) / Math.floor((maxY - startY) / rowH)));

  // ─── Dibujar filas ───
  let currentPage = 1;
  drawHeader(currentPage, totalPages);
  let y = drawTableHeader(startY);

  locales.forEach((loc, idx) => {
    // Salto de página si no cabe
    if (y + rowH > maxY) {
      drawFooter();
      pdf.addPage();
      currentPage++;
      drawHeader(currentPage, totalPages);
      y = drawTableHeader(startY);
    }

    const hasCoord = !!loc.coordinatorName && loc.coordinatorName.trim() !== "";
    const numMesas = loc.totalMesas || loc.mesasLength || 0;
    const colX = getColumnXPositions();
    const rowIdx = idx + 1;

    // Fondo alterno + fondo rojo si no tiene coordinador
    if (!hasCoord && !loc.coordinator2Name) {
      pdf.setFillColor(...COLORS.dangerLight);
      pdf.rect(margin, y - 1, usableW, rowH, "F");
    } else if (idx % 2 === 0) {
      pdf.setFillColor(...COLORS.grayLight);
      pdf.rect(margin, y - 1, usableW, rowH, "F");
    }

    // Línea inferior
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.1);
    pdf.line(margin, y + rowH - 1, pageW - margin, y + rowH - 1);

    const textY = y + 3;

    // Col 0: #
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.gray);
    pdf.text(String(rowIdx), colX[0] + 1.5, textY);

    // Col 1: Provincia / Distrito
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.text);
    pdf.text(loc.province, colX[1] + 1.5, textY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.gray);
    pdf.text(districtLabel(loc.district), colX[1] + 1.5, textY + 4);

    // Col 2: Centro de Votación
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.text);
    // Truncar nombre si es muy largo
    const maxNameLen = 50;
    const displayName = loc.name.length > maxNameLen ? loc.name.slice(0, maxNameLen) + "…" : loc.name;
    pdf.text(displayName, colX[2] + 1.5, textY);
    if (loc.code) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...COLORS.gray);
      pdf.text(`CÓD. ${loc.code}`, colX[2] + 1.5, textY + 4);
    }

    // Col 3: Mesas
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.text);
    pdf.text(String(numMesas), colX[3] + 6, textY + 1, { align: "center" });

    // Col 4: Coordinador 1
    if (loc.coordinatorName) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...COLORS.brand);
      pdf.text(loc.coordinatorName, colX[4] + 1.5, textY);
      if (loc.coordinatorDni) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(5.5);
        pdf.setTextColor(...COLORS.gray);
        pdf.text(`DNI: ${loc.coordinatorDni}`, colX[4] + 1.5, textY + 4);
      }
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...COLORS.danger);
      pdf.text("⚠ SIN COORDINADOR", colX[4] + 1.5, textY + 1);
    }

    // Col 5: Coordinador 2
    if (loc.coordinator2Name) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...COLORS.accent);
      pdf.text(loc.coordinator2Name, colX[5] + 1.5, textY);
      if (loc.coordinator2Dni) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(5.5);
        pdf.setTextColor(...COLORS.gray);
        pdf.text(`DNI: ${loc.coordinator2Dni}`, colX[5] + 1.5, textY + 4);
      }
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(180, 180, 180);
      pdf.text("—", colX[5] + 1.5, textY + 1);
    }

    // Col 6: Teléfonos
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    if (loc.coordinatorPhone) {
      pdf.setTextColor(...COLORS.accent);
      pdf.text(`C1: ${loc.coordinatorPhone}`, colX[6] + 1.5, textY);
    }
    if (loc.coordinator2Phone) {
      pdf.setTextColor(...COLORS.accent);
      pdf.text(`C2: ${loc.coordinator2Phone}`, colX[6] + 1.5, textY + 4);
    }
    if (!loc.coordinatorPhone && !loc.coordinator2Phone) {
      pdf.setTextColor(180, 180, 180);
      pdf.text("—", colX[6] + 1.5, textY + 1);
    }

    y += rowH;
  });

  drawFooter();

  // Guardar archivo
  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`Nomina_Coordinadores_MDD_${dateStr}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// 2) EXPORTAR A EXCEL
// ═══════════════════════════════════════════════════════════════════════
export async function downloadNominaExcel(
  locales: NominaLocal[],
  stats: NominaStats
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Electoral Ahora Nación";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Nómina de Coordinadores", {
    properties: { tabColor: { argb: "FF166534" } },
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // ─── Logo e imagen ───────────────────────────
  // ExcelJS puede insertar imágenes; intentamos cargar el logo
  try {
    const logoResponse = await fetch("/assets/images/logo/logo.png");
    const logoBlob = await logoResponse.blob();
    const logoBuffer = await logoBlob.arrayBuffer();
    const logoId = workbook.addImage({
      buffer: logoBuffer,
      extension: "png",
    });
    ws.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 70, height: 70 },
    });
  } catch {
    // Continuar sin logo si falla
  }

  // ─── Título principal ─────────────────────────
  // Fila 1: Título del Partido
  ws.mergeCells("B1:K1");
  const titleCell = ws.getCell("B1");
  titleCell.value = "PARTIDO POLÍTICO AHORA NACIÓN";
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF166534" } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Fila 2: Subtítulo
  ws.mergeCells("B2:K2");
  const subtitleCell = ws.getCell("B2");
  subtitleCell.value = "NÓMINA DE COORDINADORES DE LOCAL DE VOTACIÓN · REGIÓN MADRE DE DIOS";
  subtitleCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF475569" } };
  subtitleCell.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(2).height = 20;

  // Fila 3: Estadísticas
  ws.mergeCells("B3:K3");
  const statsCell = ws.getCell("B3");
  statsCell.value = `Total Colegios: ${stats.totalColegios}  |  Asignados: ${stats.conCoord}  |  Pendientes: ${stats.sinCoord}  |  Generado: ${formatDate()}`;
  statsCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF64748B" } };
  statsCell.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(3).height = 18;

  // Fila 4: Vacía (separador)
  ws.getRow(4).height = 8;

  // ─── Columnas ────────────────────────────────
  ws.columns = [
    { key: "num",            width: 5,  header: "#" },
    { key: "province",       width: 16, header: "Provincia" },
    { key: "district",       width: 18, header: "Distrito" },
    { key: "centerName",     width: 42, header: "Centro de Votación" },
    { key: "code",           width: 12, header: "Código" },
    { key: "mesas",          width: 8,  header: "Mesas" },
    { key: "coord1Name",     width: 30, header: "Coordinador 1 (Titular)" },
    { key: "coord1Dni",      width: 14, header: "DNI Coord. 1" },
    { key: "coord1Phone",    width: 14, header: "Cel. Coord. 1" },
    { key: "coord2Name",     width: 30, header: "Coordinador 2 (Adjunto)" },
    { key: "coord2Dni",      width: 14, header: "DNI Coord. 2" },
    { key: "coord2Phone",    width: 14, header: "Cel. Coord. 2" },
    { key: "estado",         width: 14, header: "Estado" },
  ];

  // ─── Fila de encabezados (fila 5) ─────────────
  const headerRow = ws.getRow(5);
  headerRow.values = [
    "#", "Provincia", "Distrito", "Centro de Votación", "Código",
    "Mesas", "Coordinador 1 (Titular)", "DNI Coord. 1", "Cel. Coord. 1",
    "Coordinador 2 (Adjunto)", "DNI Coord. 2", "Cel. Coord. 2", "Estado",
  ];
  headerRow.height = 22;
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber <= 13) {
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "thin", color: { argb: "FF334155" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      };
    }
  });

  // ─── Datos ─────────────────────────────────────
  locales.forEach((loc, idx) => {
    const hasCoord = !!loc.coordinatorName && loc.coordinatorName.trim() !== "";
    const numMesas = loc.totalMesas || loc.mesasLength || 0;
    const rowNum = idx + 6; // Empezamos en la fila 6

    const row = ws.addRow({
      num: idx + 1,
      province: loc.province,
      district: districtLabel(loc.district),
      centerName: loc.name,
      code: loc.code || "",
      mesas: numMesas,
      coord1Name: loc.coordinatorName || "SIN ASIGNAR",
      coord1Dni: loc.coordinatorDni || "",
      coord1Phone: loc.coordinatorPhone || "",
      coord2Name: loc.coordinator2Name || "",
      coord2Dni: loc.coordinator2Dni || "",
      coord2Phone: loc.coordinator2Phone || "",
      estado: hasCoord || loc.coordinator2Name ? "✔ Asignado" : "⚠ Pendiente",
    });

    row.height = 18;

    // Estilos de cada celda
    row.eachCell((cell, colNumber) => {
      if (colNumber > 13) return;

      // Fuente base
      cell.font = { name: "Calibri", size: 9.5 };
      cell.alignment = { vertical: "middle", wrapText: true };

      // Bordes finos
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Fondo alterno
      if (!hasCoord && !loc.coordinator2Name) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF2F2" },
        };
      } else if (idx % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });

    // Estilos especiales por columna
    const numCell = row.getCell(1);
    numCell.alignment = { horizontal: "center", vertical: "middle" };
    numCell.font = { name: "Calibri", size: 9, color: { argb: "FF64748B" } };

    const mesasCell = row.getCell(6);
    mesasCell.alignment = { horizontal: "center", vertical: "middle" };
    mesasCell.font = { name: "Calibri", size: 10, bold: true };

    // Coordinador 1 coloreado
    const coord1Cell = row.getCell(7);
    if (loc.coordinatorName) {
      coord1Cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF166534" } };
    } else {
      coord1Cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFDC2626" } };
    }

    // Coordinador 2 coloreado
    const coord2Cell = row.getCell(10);
    if (loc.coordinator2Name) {
      coord2Cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF2563EB" } };
    }

    // Estado
    const estadoCell = row.getCell(13);
    estadoCell.alignment = { horizontal: "center", vertical: "middle" };
    if (hasCoord || loc.coordinator2Name) {
      estadoCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF16A34A" } };
      estadoCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDCFCE7" },
      };
    } else {
      estadoCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFDC2626" } };
      estadoCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };
    }

    // Provincia y Centro en negrita
    row.getCell(2).font = { name: "Calibri", size: 9.5, bold: true };
    row.getCell(4).font = { name: "Calibri", size: 9.5, bold: true };
  });

  // ─── Fila resumen al final ────────────────────
  const summaryRowNum = locales.length + 6;
  ws.mergeCells(`A${summaryRowNum}:E${summaryRowNum}`);
  const summaryCell = ws.getCell(`A${summaryRowNum}`);
  summaryCell.value = `TOTAL: ${stats.totalColegios} Colegios`;
  summaryCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
  summaryCell.alignment = { horizontal: "right", vertical: "middle" };
  summaryCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  const totalMesasSummary = locales.reduce((acc, l) => acc + (l.totalMesas || l.mesasLength || 0), 0);
  const mesasSumCell = ws.getCell(`F${summaryRowNum}`);
  mesasSumCell.value = totalMesasSummary;
  mesasSumCell.font = { name: "Calibri", size: 11, bold: true };
  mesasSumCell.alignment = { horizontal: "center", vertical: "middle" };
  mesasSumCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  ws.mergeCells(`G${summaryRowNum}:L${summaryRowNum}`);
  const coordSumCell = ws.getCell(`G${summaryRowNum}`);
  coordSumCell.value = `Asignados: ${stats.conCoord}  |  Pendientes: ${stats.sinCoord}  |  Cobertura: ${Math.round((stats.conCoord / stats.totalColegios) * 100)}%`;
  coordSumCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF166534" } };
  coordSumCell.alignment = { horizontal: "center", vertical: "middle" };
  coordSumCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  // Estado summary
  const estadoSumCell = ws.getCell(`M${summaryRowNum}`);
  estadoSumCell.value = `${Math.round((stats.conCoord / stats.totalColegios) * 100)}%`;
  estadoSumCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF166534" } };
  estadoSumCell.alignment = { horizontal: "center", vertical: "middle" };
  estadoSumCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDCFCE7" },
  };

  ws.getRow(summaryRowNum).height = 22;

  // ─── Pie de documento ─────────────────────────
  const footerRowNum = summaryRowNum + 2;
  ws.mergeCells(`A${footerRowNum}:M${footerRowNum}`);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value = `Documento generado por el Sistema de Gestión Electoral · Ahora Nación MDD · ahoranacionmdd.com · ${formatDate()}`;
  footerCell.font = { name: "Calibri", size: 8, italic: true, color: { argb: "FF94A3B8" } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };

  // ─── Congelar encabezado ─────────────────────
  ws.views = [
    { state: "frozen", ySplit: 5, xSplit: 0 },
  ];

  // ─── Auto filtro ─────────────────────────────
  ws.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: locales.length + 5, column: 13 },
  };

  // ─── Protección de columnas para impresión ────
  ws.getColumn(1).width = 5;

  // ─── Generar y descargar ──────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Nomina_Coordinadores_MDD_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
