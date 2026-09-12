/**
 * Generador de archivos PDF oficiales para Credenciales y Fotochecks:
 * 1) Credencial Oficial A4 (210mm x 297mm: Original y Copia para mesa ONPE)
 * 2) Fotocheck Tarjeta (54mm x 85.6mm con Frente y Reverso)
 */

export async function downloadCredencialA4Pdf(
  sheetElement: HTMLElement,
  personeroName: string,
  docNumber: string
) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(sheetElement, {
    scale: 2.2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // A4 portrait: 210mm ancho x 297mm alto
  pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");

  const safeName = personeroName.trim().replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  pdf.save(`Credencial_Oficial_A4_${docNumber}_${safeName}.pdf`);
}

export async function downloadFotocheckPdf(
  frontElement: HTMLElement,
  backElement: HTMLElement,
  personeroName: string,
  docNumber: string
) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Escalar a 3.0 para calidad ultra-nítida en impresión de tarjetas
  const canvasFront = await html2canvas(frontElement, {
    scale: 3.0,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const canvasBack = await html2canvas(backElement, {
    scale: 3.0,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgFront = canvasFront.toDataURL("image/png");
  const imgBack = canvasBack.toDataURL("image/png");

  // Formato oficial estándar de tarjeta: 54mm ancho x 85.6mm alto
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [54, 85.6],
  });

  // Página 1: Frente (Anverso)
  pdf.addImage(imgFront, "PNG", 0, 0, 54, 85.6, undefined, "FAST");

  // Página 2: Reverso (Dorso)
  pdf.addPage([54, 85.6], "portrait");
  pdf.addImage(imgBack, "PNG", 0, 0, 54, 85.6, undefined, "FAST");

  const safeName = personeroName.trim().replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  pdf.save(`Fotocheck_Oficial_${docNumber}_${safeName}.pdf`);
}
