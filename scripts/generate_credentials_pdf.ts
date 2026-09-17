import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { jsPDF } from "jspdf";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  // 1. Obtener todos los coordinadores y líderes registrados
  const users = await prisma.user.findMany({
    where: {
      active: true,
      dni: { not: null },
      roles: {
        some: {
          role: {
            key: {
              in: [
                "coordinador_departamental",
                "coordinador_provincial",
                "coordinador_distrital",
                "coordinador_local_1",
                "coordinador_local_2",
                "admin",
                "verificador",
              ],
            },
          },
        },
      },
    },
    include: {
      roles: { include: { role: true } },
      assignedLocal: true,
    },
    orderBy: [
      { scopeType: "asc" },
      { name: "asc" },
    ],
  });

  console.log(`Total usuarios coordinadores encontrados: ${users.length}`);

  // Separar territoriales de locales de votación
  const territoriales = users.filter((u) => u.scopeType !== "local");
  const locales = users.filter((u) => u.scopeType === "local");

  // Ordenamiento jerárquico de líderes territoriales: Departamental -> Provincial -> Distrital
  const scopePriority: Record<string, number> = {
    departamental: 1,
    provincial: 2,
    distrital: 3,
  };

  territoriales.sort((a, b) => {
    const pa = scopePriority[a.scopeType || ""] || 99;
    const pb = scopePriority[b.scopeType || ""] || 99;
    if (pa !== pb) return pa - pb;
    const provA = a.assignedProvince || "";
    const provB = b.assignedProvince || "";
    if (provA !== provB) return provA.localeCompare(provB);
    const distA = a.assignedDistrict || "";
    const distB = b.assignedDistrict || "";
    if (distA !== distB) return distA.localeCompare(distB);
    return a.name.localeCompare(b.name);
  });

  // Ordenamiento jerárquico de coordinadores de colegio: Provincia -> Distrito -> Local -> Coord 1 antes de Coord 2
  locales.sort((a, b) => {
    const provA = a.assignedLocal?.province || a.assignedProvince || "TAMBOPATA";
    const provB = b.assignedLocal?.province || b.assignedProvince || "TAMBOPATA";
    if (provA !== provB) return provA.localeCompare(provB);

    const distA = a.assignedLocal?.district || a.assignedDistrict || "";
    const distB = b.assignedLocal?.district || b.assignedDistrict || "";
    if (distA !== distB) return distA.localeCompare(distB);

    const locA = a.assignedLocal?.name || "";
    const locB = b.assignedLocal?.name || "";
    if (locA !== locB) return locA.localeCompare(locB);

    const isA2 = a.roles.some((r) => r.role.key === "coordinador_local_2") ? 1 : 0;
    const isB2 = b.roles.some((r) => r.role.key === "coordinador_local_2") ? 1 : 0;
    if (isA2 !== isB2) return isA2 - isB2;

    return a.name.localeCompare(b.name);
  });

  // 2. Configuración jsPDF (A4 Landscape para máxima legibilidad ejecutiva)
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const margin = 12;
  const usableW = pageW - margin * 2; // 273mm

  // Colores corporativos Ahora Nación (RGB)
  const C = {
    brandRed: [185, 28, 28] as [number, number, number],       // Carmesí (#b91c1c)
    brandDark: [127, 29, 29] as [number, number, number],     // Borgoña (#7f1d1d)
    brandDeep: [153, 27, 27] as [number, number, number],     // Carmesí intenso (#991b1b)
    gold: [217, 119, 6] as [number, number, number],          // Dorado (#d97706)
    goldLight: [254, 243, 199] as [number, number, number],   // Fondo dorado suave (#fef3c7)
    slateDark: [15, 23, 42] as [number, number, number],      // Slate 900 (#0f172a)
    slateText: [30, 41, 59] as [number, number, number],      // Slate 800 (#1e293b)
    gray: [100, 116, 139] as [number, number, number],        // Slate 500 (#64748b)
    grayLight: [248, 250, 252] as [number, number, number],   // Slate 50 (#f8fafc)
    white: [255, 255, 255] as [number, number, number],
    border: [226, 232, 240] as [number, number, number],      // Slate 200 (#e2e8f0)
    success: [22, 163, 74] as [number, number, number],       // Verde (#16a34a)
    successLight: [220, 252, 231] as [number, number, number],// Verde tenue (#dcfce7)
    blue: [2, 132, 199] as [number, number, number],          // Azul (#0284c7)
    blueLight: [224, 242, 254] as [number, number, number],   // Azul tenue (#e0f2fe)
  };

  // Cargar imagen del logo oficial en base64
  let logoBase64: string | null = null;
  const logoPath = path.join(process.cwd(), "public/assets/images/logo/logo-an.png");
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
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

  // ─── Función para dibujar cabecera institucional ───
  function drawHeader(pageNum: number, totalPages: number, sub: string) {
    // Franja Superior Carmesí
    pdf.setFillColor(...C.brandDeep);
    pdf.rect(0, 0, pageW, 23, "F");

    // Línea Dorada de Acento
    pdf.setFillColor(...C.gold);
    pdf.rect(0, 23, pageW, 1.8, "F");

    // Logo Oficial Ahora Nación (Directo sobre franja institucional, sin círculos)
    if (logoBase64) {
      pdf.addImage(logoBase64, "PNG", margin, 3.5, 16, 16, undefined, "FAST");
    }

    const textX = margin + 20;

    // Título Principal
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...C.white);
    pdf.text("PARTIDO POLÍTICO AHORA NACIÓN", textX, 9);

    // Subtítulo
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(sub, textX, 15);

    // Ámbito territorial y electoral
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...C.goldLight);
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
    pdf.setTextColor(...C.goldLight);
    pdf.text("Sistema Electoral HornaWeb", pageW - margin, 20, { align: "right" });
  }

  // ─── Pie de Página ───
  function drawFooter() {
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageH - 7, pageW - margin, pageH - 7);

    pdf.setFontSize(6.2);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...C.gray);
    pdf.text(
      "Documento Oficial y Confidencial · Partido Político Ahora Nación · Madre de Dios · hornaweb.pe",
      pageW / 2,
      pageH - 4.2,
      { align: "center" }
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // PÁGINA 1: INSTRUCCIONES DE ACCESO + PLANA TERRITORIAL (DISTRITAL / PROV / DEPT)
  // ═════════════════════════════════════════════════════════════════════
  let currentPage = 1;
  const totalPages = 3;

  drawHeader(currentPage, totalPages, "DIRECTORIO OFICIAL DE ACCESOS Y CREDENCIALES · LIDERAZGO TERRITORIAL");

  // Panel de Instrucciones Oficiales de Acceso (y = 26 a 41)
  const instY = 26;
  const instH = 15;
  pdf.setFillColor(...C.grayLight);
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(margin, instY, usableW, instH, 1.2, 1.2, "FD");

  // Barra lateral carmesí en el panel
  pdf.setFillColor(...C.brandRed);
  pdf.roundedRect(margin, instY, 2.5, instH, 0.8, 0.8, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.brandDark);
  pdf.text("INSTRUCCIONES DE INGRESO AL SISTEMA ELECTORAL", margin + 6, instY + 4.2);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...C.slateText);
  pdf.text(
    "1. Enlace Oficial de Acceso: https://ahoranacionmdd.com/login",
    margin + 6,
    instY + 8
  );
  pdf.text(
    "2. Usuario: Ingrese su número de DNI (o su correo institucional asignado: [DNI]@ahoranacion.pe).",
    margin + 6,
    instY + 11.5
  );
  pdf.text(
    "3. Contraseña Inicial: Su mismo número de DNI. Por seguridad, cambie su contraseña desde su perfil tras el primer ingreso.",
    margin + 140,
    instY + 11.5
  );

  // ─── Tabla 1: Plana Territorial (y = 44) ───
  let table1Y = 44;
  const t1HeaderH = 7.5;

  pdf.setFillColor(...C.brandDark);
  pdf.roundedRect(margin, table1Y, usableW, t1HeaderH, 1, 1, "F");

  // Anchos: Total = 8 + 48 + 38 + 42 + 20 + 22 + 48 + 25 + 22 = 273mm
  const t1Cols = [
    margin,             // 0: # (8mm)
    margin + 8,         // 1: Nombres y Apellidos (48mm)
    margin + 56,        // 2: Cargo Institucional (38mm)
    margin + 94,        // 3: Ámbito Territorial (42mm)
    margin + 136,       // 4: DNI (20mm)
    margin + 156,       // 5: Teléfono (22mm)
    margin + 178,       // 6: Usuario de Acceso (48mm)
    margin + 226,       // 7: Clave Inicial (25mm)
    margin + 251,       // 8: Estado (22mm)
  ];

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.6);
  pdf.setTextColor(...C.white);

  const t1Headers = [
    { text: "#", x: t1Cols[0] + 4, align: "center" as const },
    { text: "Nombres y Apellidos (RENIEC)", x: t1Cols[1] + 2, align: "left" as const },
    { text: "Cargo en el Partido", x: t1Cols[2] + 2, align: "left" as const },
    { text: "Ámbito Territorial", x: t1Cols[3] + 2, align: "left" as const },
    { text: "DNI", x: t1Cols[4] + 10, align: "center" as const },
    { text: "Celular", x: t1Cols[5] + 11, align: "center" as const },
    { text: "Usuario / Correo de Acceso", x: t1Cols[6] + 2, align: "left" as const },
    { text: "Contraseña Inicial", x: t1Cols[7] + 12.5, align: "center" as const },
    { text: "Estado", x: t1Cols[8] + 11, align: "center" as const },
  ];

  t1Headers.forEach((h) => {
    pdf.text(h.text, h.x, table1Y + 4.8, { align: h.align });
  });

  table1Y += t1HeaderH + 0.8;
  const t1RowH = 9.2;

  territoriales.forEach((u, idx) => {
    const roleName = u.roles[0]?.role?.name || "Coordinador";
    const scope = u.scopeType === "distrital"
      ? `Distrito de ${u.assignedDistrict?.toUpperCase() || "INAMBARI"}`
      : u.scopeType === "provincial"
      ? `Provincia de ${u.assignedProvince || "TAMBOPATA"}`
      : "Departamental (Madre de Dios)";

    // Fondo alternado cebra
    if (idx % 2 === 1) {
      pdf.setFillColor(...C.grayLight);
      pdf.rect(margin, table1Y, usableW, t1RowH, "F");
    }

    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.1);
    pdf.line(margin, table1Y + t1RowH, pageW - margin, table1Y + t1RowH);

    const textY = table1Y + 3.8;

    // #
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...C.gray);
    pdf.text(String(idx + 1), t1Cols[0] + 4, textY + 0.5, { align: "center" });

    // Nombres
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...C.brandRed);
    const maxNameLen = 28;
    const nameDisplay = u.name.length > maxNameLen ? u.name.slice(0, maxNameLen) + "…" : u.name;
    pdf.text(nameDisplay, t1Cols[1] + 2, textY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.2);
    pdf.setTextColor(...C.gray);
    pdf.text("Acreditado Oficialmente", t1Cols[1] + 2, textY + 3.5);

    // Cargo
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.4);
    pdf.setTextColor(...C.slateDark);
    pdf.text(roleName, t1Cols[2] + 2, textY + 1.2);

    // Ámbito
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...C.slateText);
    pdf.text(scope, t1Cols[3] + 2, textY + 1.2);

    // DNI
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.slateDark);
    pdf.text(u.dni || "—", t1Cols[4] + 10, textY + 1.2, { align: "center" });

    // Celular
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.slateText);
    pdf.text(u.phone || "—", t1Cols[5] + 11, textY + 1.2, { align: "center" });

    // Usuario / Correo
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.4);
    pdf.setTextColor(...C.brandDark);
    pdf.text(u.email || `${u.dni}@ahoranacion.pe`, t1Cols[6] + 2, textY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.2);
    pdf.setTextColor(...C.gray);
    pdf.text(`o DNI directo: ${u.dni}`, t1Cols[6] + 2, textY + 3.5);

    // Clave Inicial (Destacada en caja clara)
    pdf.setFillColor(...C.goldLight);
    pdf.roundedRect(t1Cols[7] + 2, table1Y + 2.2, 21, 5, 0.6, 0.6, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...C.gold);
    pdf.text(u.dni || "—", t1Cols[7] + 12.5, textY + 1.8, { align: "center" });

    // Estado
    pdf.setFillColor(...C.successLight);
    pdf.roundedRect(t1Cols[8] + 2, table1Y + 2.2, 18, 5, 0.6, 0.6, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...C.success);
    pdf.text("HABILITADO", t1Cols[8] + 11, textY + 1.8, { align: "center" });

    table1Y += t1RowH;
  });

  drawFooter();

  // ═════════════════════════════════════════════════════════════════════
  // PÁGINAS 2 Y 3: COORDINADORES DE CENTRO DE VOTACIÓN (COLEGIOS)
  // ═════════════════════════════════════════════════════════════════════
  // Anchos: Total = 8 + 48 + 26 + 50 + 18 + 22 + 48 + 27 + 26 = 273mm
  const t2Cols = [
    margin,             // 0: # (8mm)
    margin + 8,         // 1: Nombres y Apellidos (48mm)
    margin + 56,        // 2: Tipo de Coordinador (26mm)
    margin + 82,        // 3: Centro de Votación y Código (50mm)
    margin + 132,       // 4: DNI (18mm)
    margin + 150,       // 5: Celular (22mm)
    margin + 172,       // 6: Usuario de Acceso (48mm)
    margin + 220,       // 7: Contraseña Inicial (27mm)
    margin + 247,       // 8: Estado de Acceso (26mm)
  ];

  function drawTable2Header(y: number): number {
    const h = 7.5;
    pdf.setFillColor(...C.brandDark);
    pdf.roundedRect(margin, y, usableW, h, 1, 1, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.6);
    pdf.setTextColor(...C.white);

    const headers = [
      { text: "#", x: t2Cols[0] + 4, align: "center" as const },
      { text: "Nombres y Apellidos", x: t2Cols[1] + 2, align: "left" as const },
      { text: "Nivel de Coordinación", x: t2Cols[2] + 2, align: "left" as const },
      { text: "Centro de Votación Asignado", x: t2Cols[3] + 2, align: "left" as const },
      { text: "DNI", x: t2Cols[4] + 9, align: "center" as const },
      { text: "Celular", x: t2Cols[5] + 11, align: "center" as const },
      { text: "Usuario / Correo de Acceso", x: t2Cols[6] + 2, align: "left" as const },
      { text: "Contraseña Inicial", x: t2Cols[7] + 13.5, align: "center" as const },
      { text: "Estado", x: t2Cols[8] + 13, align: "center" as const },
    ];

    headers.forEach((hd) => {
      pdf.text(hd.text, hd.x, y + 4.8, { align: hd.align });
    });

    return y + h + 0.8;
  }

  const t2RowH = 9.2;
  const t2StartY = 26;
  const t2MaxY = pageH - 12;
  const t2RowsPerPage = Math.floor((t2MaxY - (t2StartY + 8.3)) / t2RowH);

  pdf.addPage();
  currentPage++;
  drawHeader(currentPage, totalPages, "DIRECTORIO DE ACCESOS · COORDINADORES DE CENTRO DE VOTACIÓN (PARTE 1)");
  let y = drawTable2Header(t2StartY);

  locales.forEach((u, idx) => {
    if (y + t2RowH > t2MaxY) {
      drawFooter();
      pdf.addPage();
      currentPage++;
      drawHeader(currentPage, totalPages, "DIRECTORIO DE ACCESOS · COORDINADORES DE CENTRO DE VOTACIÓN (PARTE 2)");
      y = drawTable2Header(t2StartY);
    }

    const isCoord2 = u.roles.some((r) => r.role.key === "coordinador_local_2");
    const roleLabel = isCoord2 ? "Coordinador 2 (Adjunto)" : "Coordinador 1 (Titular)";
    const local = u.assignedLocal?.name || "Local de Votación";
    const code = u.assignedLocal?.code ? ` (${u.assignedLocal.code})` : "";
    const dist = u.assignedDistrict ? u.assignedDistrict.toUpperCase() : "TAMBOPATA";

    if (idx % 2 === 1) {
      pdf.setFillColor(...C.grayLight);
      pdf.rect(margin, y, usableW, t2RowH, "F");
    }

    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.1);
    pdf.line(margin, y + t2RowH, pageW - margin, y + t2RowH);

    const textY = y + 3.8;

    // #
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...C.gray);
    pdf.text(String(idx + 1), t2Cols[0] + 4, textY + 0.5, { align: "center" });

    // Nombres
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...C.brandRed);
    const maxNameLen = 28;
    const nameDisplay = u.name.length > maxNameLen ? u.name.slice(0, maxNameLen) + "…" : u.name;
    pdf.text(nameDisplay, t2Cols[1] + 2, textY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.2);
    pdf.setTextColor(...C.gray);
    pdf.text(`Distrito: ${dist}`, t2Cols[1] + 2, textY + 3.5);

    // Tipo de Coordinador (Badge)
    if (isCoord2) {
      pdf.setFillColor(...C.blueLight);
      pdf.roundedRect(t2Cols[2] + 1, y + 2.2, 23, 5, 0.6, 0.6, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.4);
      pdf.setTextColor(...C.blue);
      pdf.text("COORD. 2 (ADJUNTO)", t2Cols[2] + 12.5, textY + 1.8, { align: "center" });
    } else {
      pdf.setFillColor(...C.successLight);
      pdf.roundedRect(t2Cols[2] + 1, y + 2.2, 23, 5, 0.6, 0.6, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.4);
      pdf.setTextColor(...C.success);
      pdf.text("COORD. 1 (TITULAR)", t2Cols[2] + 12.5, textY + 1.8, { align: "center" });
    }

    // Centro de Votación
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.4);
    pdf.setTextColor(...C.slateDark);
    const maxLocalLen = 34;
    const localDisplay = local.length > maxLocalLen ? local.slice(0, maxLocalLen) + "…" : local;
    pdf.text(localDisplay, t2Cols[3] + 2, textY);
    if (u.assignedLocal?.code) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.2);
      pdf.setTextColor(...C.gray);
      pdf.text(`Código: ${u.assignedLocal.code}`, t2Cols[3] + 2, textY + 3.5);
    }

    // DNI
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.slateDark);
    pdf.text(u.dni || "—", t2Cols[4] + 9, textY + 1.2, { align: "center" });

    // Celular
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.slateText);
    pdf.text(u.phone || "—", t2Cols[5] + 11, textY + 1.2, { align: "center" });

    // Usuario de Acceso
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.4);
    pdf.setTextColor(...C.brandDark);
    pdf.text(u.email || `${u.dni}@ahoranacion.pe`, t2Cols[6] + 2, textY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.2);
    pdf.setTextColor(...C.gray);
    pdf.text(`o DNI: ${u.dni}`, t2Cols[6] + 2, textY + 3.5);

    // Contraseña Inicial
    pdf.setFillColor(...C.goldLight);
    pdf.roundedRect(t2Cols[7] + 3, y + 2.2, 21, 5, 0.6, 0.6, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...C.gold);
    pdf.text(u.dni || "—", t2Cols[7] + 13.5, textY + 1.8, { align: "center" });

    // Estado
    pdf.setFillColor(...C.successLight);
    pdf.roundedRect(t2Cols[8] + 3, y + 2.2, 20, 5, 0.6, 0.6, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...C.success);
    pdf.text("HABILITADO", t2Cols[8] + 13, textY + 1.8, { align: "center" });

    y += t2RowH;
  });

  drawFooter();

  // 3. Guardar el PDF de forma estrictamente privada en el Escritorio local
  const pdfBytes = pdf.output("arraybuffer");
  const buffer = Buffer.from(pdfBytes);

  const destDesktop = "C:\\Users\\USER\\Desktop\\CREDENCIALES_COORDINADORES_AHORA_NACION.pdf";
  try {
    fs.writeFileSync(destDesktop, buffer);
    console.log(`✓ Archivo confidencial guardado exclusivamente en el Escritorio: ${destDesktop}`);
  } catch (e) {
    console.warn("Error al guardar en el Escritorio:", e);
  }
}

main().catch(console.error);
