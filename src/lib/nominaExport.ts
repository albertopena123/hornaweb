/**
 * nominaExport.ts
 * ─────────────────────────────────────────────────────────────────────
 * Exporta la Nómina Oficial de Coordinadores de Centro de Votación y
 * la Plana de Coordinación Territorial en dos formatos ejecutivos:
 *
 *   1) PDF  – Vectorial de alta resolución (jsPDF) con membrete oficial
 *             Ahora Nación, paleta carmesí/dorada, logo circular y KPI badges.
 *   2) XLSX – Libro corporativo ExcelJS con 2 hojas:
 *             • Hoja 1: Locales de Votación (51 colegios y coordinadores)
 *             • Hoja 2: Liderazgo Territorial (Plana regional, provincial y distrital)
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

// ─── Paleta Oficial Ahora Nación ────────────────────────────────────
const COLORS = {
  brand: [185, 28, 28] as [number, number, number],          // Carmesí Institucional (#b91c1c)
  brandDark: [127, 29, 29] as [number, number, number],      // Borgoña (#7f1d1d)
  brandLight: [254, 242, 242] as [number, number, number],   // Fondo suave carmesí (#fef2f2)
  gold: [217, 119, 6] as [number, number, number],           // Dorado Solar (#d97706)
  goldLight: [254, 243, 199] as [number, number, number],    // Amarillo tenue (#fef3c7)
  accent: [2, 132, 199] as [number, number, number],         // Azul Institucional para Coord 2 (#0284c7)
  accentLight: [240, 249, 255] as [number, number, number],  // Azul tenue (#f0f9ff)
  success: [22, 163, 74] as [number, number, number],        // Verde éxito (#16a34a)
  successLight: [240, 253, 244] as [number, number, number], // Verde tenue (#f0fdf4)
  danger: [220, 38, 38] as [number, number, number],         // Rojo alerta (#dc2626)
  dangerLight: [254, 242, 242] as [number, number, number],  // Rojo tenue (#fef2f2)
  headerBg: [185, 28, 28] as [number, number, number],       // Encabezado de tabla (#b91c1c)
  headerText: [255, 255, 255] as [number, number, number],   // Blanco
  slateDark: [15, 23, 42] as [number, number, number],       // Slate 900 (#0f172a)
  text: [15, 23, 42] as [number, number, number],            // Texto principal
  gray: [100, 116, 139] as [number, number, number],         // Slate 500 (#64748b)
  grayLight: [248, 250, 252] as [number, number, number],    // Slate 50 (#f8fafc)
  white: [255, 255, 255] as [number, number, number],        // Blanco
  border: [226, 232, 240] as [number, number, number],       // Slate 200 (#e2e8f0)
};

// ─── Liderazgo y Coordinación Territorial (Hoja 2) ──────────────────
export const TERRITORIAL_LEADERS = [
  { item: 1, name: "Jorge Alfredo Blanco Garcia", cargo: "Coordinador General MDD", rol: "Coordinador Departamental", scope: "Departamental (Madre de Dios)", dni: "42837202", phone: "951329084" },
  { item: 2, name: "Vladimir Lipa Colque", cargo: "Personero Legal", rol: "Administrador", scope: "Departamental", dni: "46889586", phone: "974259136" },
  { item: 3, name: "Guillermo Condor Paucar", cargo: "Coordinador Adjunto", rol: "Administrador", scope: "Departamental", dni: "19963793", phone: "915008611" },
  { item: 4, name: "Boris Manuel Callo Lipa", cargo: "Secretario de Grupo", rol: "Coordinador Departamental", scope: "Departamental", dni: "60973331", phone: "969322735" },
  { item: 5, name: "Jose Carlos Navarro Vega", cargo: "Área de Sistemas e Informática", rol: "Administrador", scope: "Departamental", dni: "40455993", phone: "987787010" },
  { item: 6, name: "Angel Rigoberto Quijandria Mendoza", cargo: "Apoyo Legal", rol: "Verificador de Cómputo", scope: "Departamental", dni: "21492930", phone: "982727238" },
  { item: 7, name: "Karol Margarita Paredes Torrez", cargo: "Capacitadora Personeros", rol: "Coordinador Departamental", scope: "Departamental", dni: "46424983", phone: "955721347" },
  { item: 8, name: "Guadalupe Nalvarte", cargo: "Capacitadora Personeros", rol: "Coordinador Departamental", scope: "Departamental", dni: "—", phone: "978341497" },
  { item: 9, name: "Roy Rubeli Gutierrez Paredes", cargo: "Coordinador Delegado Prov. Tambopata", rol: "Coordinador Provincial", scope: "Provincia Tambopata", dni: "40951921", phone: "913933709" },
  { item: 10, name: "Abelino Ccahuantico Ccasa", cargo: "Coordinador Delegado Prov. Tambopata", rol: "Coordinador Provincial", scope: "Provincia Tambopata", dni: "46318591", phone: "989412131" },
  { item: 11, name: "Cliffod Dixson Gutierrez Machaca", cargo: "Coordinador Delegado Prov. Tahuamanu", rol: "Coordinador Provincial", scope: "Provincia Tahuamanu", dni: "41774094", phone: "997075261" },
  { item: 12, name: "Lujhams Wilson Choque Condori", cargo: "Coordinador Delegado Prov. Manu", rol: "Coordinador Provincial", scope: "Provincia Manu", dni: "01560048", phone: "965248836" },
  { item: 13, name: "Vivian Milusca Lara Escobar", cargo: "Distrital Deleg. Dist. Inambari, Piedras, Laberinto", rol: "Coordinador Distrital", scope: "Multidistrital (Inambari / Tambopata)", dni: "43110497", phone: "982760254" },
];

// ─── Helpers ────────────────────────────────────────────────────────

/** Carga el logo oficial en PNG base64 vía canvas para soporte universal */
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
// 1) EXPORTAR A PDF (Membrete oficial Ahora Nación)
// ═══════════════════════════════════════════════════════════════════════
export async function downloadNominaPdf(
  locales: NominaLocal[],
  stats: NominaStats
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  // Landscape A4 para máxima legibilidad de la tabla
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const margin = 12;
  const usableW = pageW - margin * 2; // 273mm

  // Cargar logo oficial Ahora Nación
  const logoData = await loadLogoBase64();

  // Ordenar jerárquicamente por Provincia -> Distrito -> Local de Votación
  const sortedLocales = [...locales].sort((a, b) => {
    const pComp = (a.province || "").localeCompare(b.province || "");
    if (pComp !== 0) return pComp;
    const dComp = (a.district || "").localeCompare(b.district || "");
    if (dComp !== 0) return dComp;
    return a.name.localeCompare(b.name);
  });

  // ─── Posición exacta de las 9 columnas (Total = 273mm) ───
  // Col 0: # (8mm)
  // Col 1: Provincia (22mm)
  // Col 2: Distrito (26mm)
  // Col 3: Local de Votación (65mm)
  // Col 4: Mesas (12mm)
  // Col 5: Coordinador 1 (44mm)
  // Col 6: Coordinador 2 (44mm)
  // Col 7: Teléfonos (26mm)
  // Col 8: Estado (26mm)
  function getColumnXPositions(): number[] {
    return [
      margin,             // 0: #
      margin + 8,         // 1: Provincia
      margin + 30,        // 2: Distrito
      margin + 56,        // 3: Local de Votación
      margin + 121,       // 4: Mesas
      margin + 133,       // 5: Coord 1
      margin + 177,       // 6: Coord 2
      margin + 221,       // 7: Teléfonos
      margin + 247,       // 8: Estado
    ];
  }

  // ─── Cabecera Institucional y Métricas ───
  function drawHeader(pageNum: number, totalPages: number) {
    // 1. Franja superior carmesí Ahora Nación (#991b1b / #b91c1c)
    pdf.setFillColor(...COLORS.brandDark);
    pdf.rect(0, 0, pageW, 23, "F");

    // 2. Franja dorada de acento (#d97706)
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
    pdf.text(
      "NÓMINA OFICIAL DE COORDINADORES DE LOCAL DE VOTACIÓN",
      textX,
      15
    );

    // Jurisdicción / Ámbito
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.goldLight);
    pdf.text("REGIÓN MADRE DE DIOS · ELECCIONES GENERALES 2026", textX, 20);

    // Fecha y página a la derecha
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
    const totalMesasSum = locales.reduce((acc, l) => acc + (l.totalMesas || l.mesasLength || 0), 0);
    const pct = Math.round((stats.conCoord / Math.max(1, stats.totalColegios)) * 100);
    const kpiY = 25.5;

    pdf.setFillColor(...COLORS.grayLight);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(margin, kpiY, usableW, 7, 1, 1, "FD");

    const kpiItems = [
      { label: "Centros Electorales", val: `${stats.totalColegios} Locales`, color: COLORS.brand },
      { label: "Locales Asignados", val: `${stats.conCoord} Asignados`, color: COLORS.success },
      { label: "Locales Pendientes", val: `${stats.sinCoord} Pendientes`, color: COLORS.danger },
      { label: "Mesas de Sufragio", val: `${totalMesasSum} Mesas`, color: COLORS.slateDark },
      { label: "Cobertura Regional", val: `${pct}% Cobertura`, color: COLORS.gold },
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

  // ─── Cabecera de la tabla (y = 34) ───
  function drawTableHeader(y: number): number {
    const colX = getColumnXPositions();
    const headerH = 7.5;

    // Fondo cabecera de tabla: Carmesí oscuro
    pdf.setFillColor(...COLORS.brandDark);
    pdf.roundedRect(margin, y, usableW, headerH, 1, 1, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...COLORS.white);

    const headers = [
      { text: "#", x: colX[0] + 4, align: "center" as const },
      { text: "Provincia", x: colX[1] + 2, align: "left" as const },
      { text: "Distrito", x: colX[2] + 2, align: "left" as const },
      { text: "Local de Votación", x: colX[3] + 2, align: "left" as const },
      { text: "Mesas", x: colX[4] + 6, align: "center" as const },
      { text: "Coordinador 1 (Titular)", x: colX[5] + 2, align: "left" as const },
      { text: "Coordinador 2 (Adjunto)", x: colX[6] + 2, align: "left" as const },
      { text: "Teléfonos", x: colX[7] + 2, align: "left" as const },
      { text: "Estado", x: colX[8] + 13, align: "center" as const },
    ];

    headers.forEach((h) => {
      pdf.text(h.text, h.x, y + 4.8, { align: h.align });
    });

    return y + headerH + 0.8;
  }

  // ─── Pie de página ───
  function drawFooter() {
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageH - 7, pageW - margin, pageH - 7);

    pdf.setFontSize(6.2);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.gray);
    pdf.text(
      "Documento oficial de campaña · Partido Político Ahora Nación · Madre de Dios · hornaweb.pe",
      pageW / 2,
      pageH - 4.2,
      { align: "center" }
    );
  }

  // ─── Paginación y filas ───
  const rowH = 8.8;
  const startY = 34;
  const maxY = pageH - 12;
  const rowsPerPage = Math.floor((maxY - (startY + 8.3)) / rowH);
  const totalPages = Math.max(1, Math.ceil(sortedLocales.length / rowsPerPage));

  let currentPage = 1;
  drawHeader(currentPage, totalPages);
  let y = drawTableHeader(startY);

  sortedLocales.forEach((loc, idx) => {
    if (y + rowH > maxY) {
      drawFooter();
      pdf.addPage();
      currentPage++;
      drawHeader(currentPage, totalPages);
      y = drawTableHeader(startY);
    }

    const hasCoord1 = !!loc.coordinatorName && loc.coordinatorName.trim() !== "";
    const hasCoord2 = !!loc.coordinator2Name && loc.coordinator2Name.trim() !== "";
    const hasAnyCoord = hasCoord1 || hasCoord2;
    const numMesas = loc.totalMesas || loc.mesasLength || 0;
    const colX = getColumnXPositions();
    const rowIdx = idx + 1;

    // Fondo cebra suave (sin llenar toda la fila de rojo fuerte)
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

    // Col 1: Provincia
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.4);
    pdf.setTextColor(...COLORS.slateDark);
    pdf.text(loc.province, colX[1] + 2, textY + 0.8);

    // Col 2: Distrito
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.4);
    pdf.setTextColor(...COLORS.slateDark);
    pdf.text(districtLabel(loc.district), colX[2] + 2, textY + 0.8);

    // Col 3: Centro de Votación (ancho 65mm para evitar cortes agresivos)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.slateDark);
    const maxNameLen = 42;
    const displayName = loc.name.length > maxNameLen ? loc.name.slice(0, maxNameLen) + "…" : loc.name;
    pdf.text(displayName, colX[3] + 2, textY);
    if (loc.code) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.2);
      pdf.setTextColor(...COLORS.gray);
      pdf.text(`CÓD: ${loc.code}`, colX[3] + 2, textY + 3.4);
    }

    // Col 4: Mesas (Centrado)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(...COLORS.slateDark);
    pdf.text(String(numMesas), colX[4] + 6, textY + 0.8, { align: "center" });

    // Col 5: Coordinador 1 (Titular)
    if (hasCoord1) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.4);
      pdf.setTextColor(...COLORS.brand);
      const maxC1Len = 28;
      const c1Display = loc.coordinatorName!.length > maxC1Len ? loc.coordinatorName!.slice(0, maxC1Len) + "…" : loc.coordinatorName!;
      pdf.text(c1Display, colX[5] + 2, textY);
      if (loc.coordinatorDni) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(5.2);
        pdf.setTextColor(...COLORS.gray);
        pdf.text(`DNI: ${loc.coordinatorDni}`, colX[5] + 2, textY + 3.4);
      }
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.setTextColor(...COLORS.danger);
      pdf.text("SIN ASIGNAR", colX[5] + 2, textY + 0.8);
    }

    // Col 6: Coordinador 2 (Adjunto)
    if (hasCoord2) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.4);
      pdf.setTextColor(...COLORS.accent);
      const maxC2Len = 28;
      const c2Display = loc.coordinator2Name!.length > maxC2Len ? loc.coordinator2Name!.slice(0, maxC2Len) + "…" : loc.coordinator2Name!;
      pdf.text(c2Display, colX[6] + 2, textY);
      if (loc.coordinator2Dni) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(5.2);
        pdf.setTextColor(...COLORS.gray);
        pdf.text(`DNI: ${loc.coordinator2Dni}`, colX[6] + 2, textY + 3.4);
      }
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(...COLORS.gray);
      pdf.text("-", colX[6] + 2, textY + 0.8);
    }

    // Col 7: Teléfonos
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.8);
    pdf.setTextColor(...COLORS.slateDark);
    if (loc.coordinatorPhone) {
      pdf.text(`C1: ${loc.coordinatorPhone}`, colX[7] + 2, textY);
    }
    if (loc.coordinator2Phone) {
      pdf.text(`C2: ${loc.coordinator2Phone}`, colX[7] + 2, textY + 3.4);
    }
    if (!loc.coordinatorPhone && !loc.coordinator2Phone) {
      pdf.setTextColor(...COLORS.gray);
      pdf.text("-", colX[7] + 2, textY + 0.8);
    }

    // Col 8: Estado (Badge Pill dibujado)
    const pillW = 20;
    const pillH = 4.2;
    const pillX = colX[8] + 13 - pillW / 2;
    const pillY = y + (rowH - pillH) / 2;

    if (hasAnyCoord) {
      pdf.setFillColor(...COLORS.successLight);
      pdf.setDrawColor(...COLORS.success);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(pillX, pillY, pillW, pillH, 0.8, 0.8, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...COLORS.success);
      pdf.text("ASIGNADO", colX[8] + 13, pillY + 3, { align: "center" });
    } else {
      pdf.setFillColor(...COLORS.dangerLight);
      pdf.setDrawColor(...COLORS.danger);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(pillX, pillY, pillW, pillH, 0.8, 0.8, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...COLORS.danger);
      pdf.text("PENDIENTE", colX[8] + 13, pillY + 3, { align: "center" });
    }

    y += rowH;
  });

  drawFooter();

  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`Nomina_Coordinadores_Ahora_Nacion_${dateStr}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// 2) EXPORTAR A EXCEL (.XLSX) con 2 Hojas Profesionales
// ═══════════════════════════════════════════════════════════════════════
export async function downloadNominaExcel(
  locales: NominaLocal[],
  stats: NominaStats
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Partido Político Ahora Nación";
  workbook.created = new Date();

  // ─── Cargar Logo para el Libro Excel ───
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
    // Si falla cargar el archivo png, continuar
  }

  const ARGB = {
    brandRed: "FFB91C1C",       // Rojo Carmesí (#b91c1c)
    brandDark: "FF7F1D1D",      // Borgoña (#7f1d1d)
    bannerRed: "FFDC2626",      // Rojo brillante (#dc2626)
    brandLight: "FFFEF2F2",     // Fondo rojo suave (#fef2f2)
    gold: "FFD97706",           // Dorado (#d97706)
    goldLight: "FFFEF3C7",      // Fondo dorado (#fef3c7)
    slateHeader: "FF1E293B",    // Slate 800
    white: "FFFFFFFF",
    grayBorder: "FFE2E8F0",
    grayDarkBorder: "FF94A3B8",
    zebraBg: "FFF8FAFC",
    assignedBg: "FFDCFCE7",
    assignedFg: "FF15803D",
    pendingBg: "FFFEE2E2",
    pendingFg: "FFB91C1C",
    coord2Fg: "FF0284C7",
    coord2Bg: "FFE0F2FE",
  };

  // Ordenar jerárquicamente por Provincia -> Distrito -> Local de Votación
  const sortedLocales = [...locales].sort((a, b) => {
    const pComp = (a.province || "").localeCompare(b.province || "");
    if (pComp !== 0) return pComp;
    const dComp = (a.district || "").localeCompare(b.district || "");
    if (dComp !== 0) return dComp;
    return a.name.localeCompare(b.name);
  });

  // ═══════════════════════════════════════════════════════════════════
  // HOJA 1: COORDINADORES POR LOCAL DE VOTACIÓN (51 Colegios)
  // ═══════════════════════════════════════════════════════════════════
  const ws1 = workbook.addWorksheet("Locales de Votación", {
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

  // Fila 1: Título Oficial con fondo Rojo Ahora Nación
  ws1.mergeCells("B1:M1");
  const titleCell1 = ws1.getCell("B1");
  titleCell1.value = "PARTIDO POLÍTICO AHORA NACIÓN";
  titleCell1.font = { name: "Calibri", size: 16, bold: true, color: { argb: ARGB.white } };
  titleCell1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  titleCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.bannerRed } };
  ws1.getRow(1).height = 28;

  // Fila 2: Subtítulo
  ws1.mergeCells("B2:M2");
  const subtitleCell1 = ws1.getCell("B2");
  subtitleCell1.value = "PADRÓN OFICIAL DE COORDINADORES DE CENTRO DE VOTACIÓN · MADRE DE DIOS";
  subtitleCell1.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: ARGB.white } };
  subtitleCell1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  subtitleCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandRed } };
  ws1.getRow(2).height = 20;

  // Fila 3: KPI Metrics Strip
  const totalMesas1 = sortedLocales.reduce((acc, l) => acc + (l.totalMesas || l.mesasLength || 0), 0);
  const pct1 = Math.round((stats.conCoord / Math.max(1, stats.totalColegios)) * 100);

  ws1.mergeCells("B3:M3");
  const statsCell1 = ws1.getCell("B3");
  statsCell1.value = `Colegios: ${stats.totalColegios}   |   Asignados: ${stats.conCoord}   |   Pendientes: ${stats.sinCoord}   |   Mesas Totales: ${totalMesas1}   |   Cobertura: ${pct1}%   |   Generado: ${formatDate()}`;
  statsCell1.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.gold } };
  statsCell1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  statsCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandLight } };
  ws1.getRow(3).height = 18;

  // Fila 4: Separador
  ws1.getRow(4).height = 6;

  // Fila 5: Cabeceras de Columna con anchos balanceados y legibles
  ws1.columns = [
    { key: "num",         width: 8,  header: "#" },
    { key: "province",    width: 18, header: "Provincia" },
    { key: "district",    width: 22, header: "Distrito" },
    { key: "localName",   width: 48, header: "Centro de Votación" },
    { key: "code",        width: 14, header: "Código" },
    { key: "mesas",       width: 10, header: "Mesas" },
    { key: "coord1Name",  width: 36, header: "Coordinador 1 (Titular)" },
    { key: "coord1Dni",   width: 14, header: "DNI Coord. 1" },
    { key: "coord1Phone", width: 16, header: "Cel. Coord. 1" },
    { key: "coord2Name",  width: 36, header: "Coordinador 2 (Adjunto)" },
    { key: "coord2Dni",   width: 14, header: "DNI Coord. 2" },
    { key: "coord2Phone", width: 16, header: "Cel. Coord. 2" },
    { key: "estado",      width: 18, header: "Estado" },
  ];

  const headerRow1 = ws1.getRow(5);
  headerRow1.values = [
    "#", "Provincia", "Distrito", "Centro de Votación", "Código",
    "Mesas", "Coordinador 1 (Titular)", "DNI Coord. 1", "Cel. Coord. 1",
    "Coordinador 2 (Adjunto)", "DNI Coord. 2", "Cel. Coord. 2", "Estado",
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

  // Filas de Datos
  sortedLocales.forEach((loc, idx) => {
    const hasCoord1 = !!loc.coordinatorName && loc.coordinatorName.trim() !== "";
    const hasCoord2 = !!loc.coordinator2Name && loc.coordinator2Name.trim() !== "";
    const hasAny = hasCoord1 || hasCoord2;
    const numMesas = loc.totalMesas || loc.mesasLength || 0;

    const row = ws1.addRow({
      num: idx + 1,
      province: loc.province,
      district: districtLabel(loc.district),
      localName: loc.name,
      code: loc.code || "",
      mesas: numMesas,
      coord1Name: loc.coordinatorName || "SIN ASIGNAR",
      coord1Dni: loc.coordinatorDni || "",
      coord1Phone: loc.coordinatorPhone || "",
      coord2Name: loc.coordinator2Name || "",
      coord2Dni: loc.coordinator2Dni || "",
      coord2Phone: loc.coordinator2Phone || "",
      estado: hasAny ? "✔ Asignado" : "⚠ Pendiente",
    });

    row.height = 19;

    row.eachCell((cell, colNumber) => {
      if (colNumber > 13) return;
      cell.font = { name: "Calibri", size: 9.5 };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: ARGB.grayBorder } },
        bottom: { style: "thin", color: { argb: ARGB.grayBorder } },
        left: { style: "thin", color: { argb: ARGB.grayBorder } },
        right: { style: "thin", color: { argb: ARGB.grayBorder } },
      };

      // Fondo
      if (!hasAny) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.pendingBg } };
      } else if (idx % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.zebraBg } };
      }
    });

    // Formateo por columna
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(1).font = { name: "Calibri", size: 9, color: { argb: "FF64748B" } };

    row.getCell(2).font = { name: "Calibri", size: 9.5, bold: true };
    row.getCell(4).font = { name: "Calibri", size: 9.5, bold: true };

    const mesasCell = row.getCell(6);
    mesasCell.alignment = { horizontal: "center", vertical: "middle" };
    mesasCell.font = { name: "Calibri", size: 10, bold: true };

    // Coord 1 resaltado
    const c1Cell = row.getCell(7);
    if (hasCoord1) {
      c1Cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: ARGB.brandRed } };
    } else {
      c1Cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: ARGB.pendingFg } };
    }

    // Coord 2 resaltado en azul institucional
    const c2Cell = row.getCell(10);
    if (hasCoord2) {
      c2Cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: ARGB.coord2Fg } };
    }

    // DNI y Celular formateados como texto puro (numFmt = "@") para conservar ceros
    const c1DniCell = row.getCell(8);
    c1DniCell.numFmt = "@";
    c1DniCell.alignment = { horizontal: "center", vertical: "middle" };
    c1DniCell.font = { name: "Calibri", size: 9.5, bold: true };

    const c1PhoneCell = row.getCell(9);
    c1PhoneCell.numFmt = "@";
    c1PhoneCell.alignment = { horizontal: "center", vertical: "middle" };
    c1PhoneCell.font = { name: "Calibri", size: 9.5 };

    const c2DniCell = row.getCell(11);
    c2DniCell.numFmt = "@";
    c2DniCell.alignment = { horizontal: "center", vertical: "middle" };
    c2DniCell.font = { name: "Calibri", size: 9.5, bold: true };

    const c2PhoneCell = row.getCell(12);
    c2PhoneCell.numFmt = "@";
    c2PhoneCell.alignment = { horizontal: "center", vertical: "middle" };
    c2PhoneCell.font = { name: "Calibri", size: 9.5 };

    // Estado Badge
    const estCell = row.getCell(13);
    estCell.alignment = { horizontal: "center", vertical: "middle" };
    if (hasAny) {
      estCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.assignedFg } };
      estCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.assignedBg } };
    } else {
      estCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.pendingFg } };
      estCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.pendingBg } };
    }
  });

  // Fila de Totales en Hoja 1
  const sumRow1 = sortedLocales.length + 6;
  ws1.mergeCells(`A${sumRow1}:E${sumRow1}`);
  const sumLabel1 = ws1.getCell(`A${sumRow1}`);
  sumLabel1.value = `TOTAL: ${stats.totalColegios} Colegios Electorales`;
  sumLabel1.font = { name: "Calibri", size: 11, bold: true, color: { argb: ARGB.white } };
  sumLabel1.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  sumLabel1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.slateHeader } };

  const sumMesasCell1 = ws1.getCell(`F${sumRow1}`);
  sumMesasCell1.value = totalMesas1;
  sumMesasCell1.font = { name: "Calibri", size: 11, bold: true, color: { argb: ARGB.white } };
  sumMesasCell1.alignment = { horizontal: "center", vertical: "middle" };
  sumMesasCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.slateHeader } };

  ws1.mergeCells(`G${sumRow1}:L${sumRow1}`);
  const sumMid1 = ws1.getCell(`G${sumRow1}`);
  sumMid1.value = `Asignados: ${stats.conCoord}  |  Pendientes: ${stats.sinCoord}  |  Cobertura Total: ${pct1}%`;
  sumMid1.font = { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.brandRed } };
  sumMid1.alignment = { horizontal: "center", vertical: "middle" };
  sumMid1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandLight } };

  const sumEnd1 = ws1.getCell(`M${sumRow1}`);
  sumEnd1.value = `${pct1}%`;
  sumEnd1.font = { name: "Calibri", size: 11, bold: true, color: { argb: ARGB.assignedFg } };
  sumEnd1.alignment = { horizontal: "center", vertical: "middle" };
  sumEnd1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.assignedBg } };
  ws1.getRow(sumRow1).height = 22;

  // Congelar encabezados y autofiltro
  ws1.views = [{ state: "frozen", ySplit: 5, xSplit: 0 }];
  ws1.autoFilter = { from: { row: 5, column: 1 }, to: { row: sortedLocales.length + 5, column: 13 } };

  // ═══════════════════════════════════════════════════════════════════
  // HOJA 2: LIDERAZGO REGIONAL Y COORDINACIÓN TERRITORIAL
  // ═══════════════════════════════════════════════════════════════════
  const ws2 = workbook.addWorksheet("Liderazgo Territorial", {
    properties: { tabColor: { argb: ARGB.gold } },
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Logotipo institucional contenido en A1:A3 en Hoja 2
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
  ws2.mergeCells("B1:H1");
  const titleCell2 = ws2.getCell("B1");
  titleCell2.value = "PARTIDO POLÍTICO AHORA NACIÓN";
  titleCell2.font = { name: "Calibri", size: 16, bold: true, color: { argb: ARGB.white } };
  titleCell2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  titleCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.bannerRed } };
  ws2.getRow(1).height = 28;

  // Fila 2: Subtítulo Hoja 2
  ws2.mergeCells("B2:H2");
  const subtitleCell2 = ws2.getCell("B2");
  subtitleCell2.value = "COORDINACIÓN REGIONAL, PROVINCIAL Y DISTRITAL DE PERSONEROS · MADRE DE DIOS";
  subtitleCell2.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: ARGB.white } };
  subtitleCell2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  subtitleCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandRed } };
  ws2.getRow(2).height = 20;

  // Fila 3: Info Hoja 2
  ws2.mergeCells("B3:H3");
  const infoCell2 = ws2.getCell("B3");
  infoCell2.value = `Total Líderes Registrados: ${TERRITORIAL_LEADERS.length}   |   Supervisión Departamental, Provincial y Distrital   |   Generado: ${formatDate()}`;
  infoCell2.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.gold } };
  infoCell2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  infoCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.brandLight } };
  ws2.getRow(3).height = 18;

  // Fila 4: Separador
  ws2.getRow(4).height = 6;

  // Columnas Hoja 2
  ws2.columns = [
    { key: "item",   width: 8,  header: "Item" },
    { key: "name",   width: 38, header: "Nombres y Apellidos (Oficial RENIEC)" },
    { key: "cargo",  width: 38, header: "Cargo en el Partido" },
    { key: "rol",    width: 28, header: "Rol en el Sistema" },
    { key: "scope",  width: 34, header: "Ámbito Territorial" },
    { key: "dni",    width: 14, header: "DNI" },
    { key: "phone",  width: 16, header: "Celular" },
    { key: "estado", width: 16, header: "Estado" },
  ];

  const headerRow2 = ws2.getRow(5);
  headerRow2.values = [
    "Item", "Nombres y Apellidos (Oficial RENIEC)", "Cargo en el Partido",
    "Rol en el Sistema", "Ámbito Territorial", "DNI", "Celular", "Estado",
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

  // Datos Hoja 2
  TERRITORIAL_LEADERS.forEach((lead, idx) => {
    const row = ws2.addRow({
      item: lead.item,
      name: lead.name,
      cargo: lead.cargo,
      rol: lead.rol,
      scope: lead.scope,
      dni: lead.dni,
      phone: lead.phone,
      estado: "✔ Registrado",
    });

    row.height = 20;

    row.eachCell((cell, colNumber) => {
      if (colNumber > 8) return;
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
    row.getCell(1).font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF64748B" } };

    // Nombre en negrita carmesí
    row.getCell(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.brandRed } };

    // Cargo en negrita
    row.getCell(3).font = { name: "Calibri", size: 9.5, bold: true };

    // DNI y Celular centrados y formateados como texto puro (numFmt = "@")
    row.getCell(6).numFmt = "@";
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).font = { name: "Calibri", size: 9.5, bold: true };

    row.getCell(7).numFmt = "@";
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).font = { name: "Calibri", size: 9.5, bold: true, color: { argb: ARGB.coord2Fg } };

    // Estado verde
    const est2 = row.getCell(8);
    est2.alignment = { horizontal: "center", vertical: "middle" };
    est2.font = { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.assignedFg } };
    est2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.assignedBg } };
  });

  // Congelar encabezados y autofiltro en Hoja 2
  ws2.views = [{ state: "frozen", ySplit: 5, xSplit: 0 }];
  ws2.autoFilter = { from: { row: 5, column: 1 }, to: { row: TERRITORIAL_LEADERS.length + 5, column: 8 } };

  // ─── Generar y Descargar Archivo XLSX ───
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Nomina_Coordinadores_Ahora_Nacion_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
