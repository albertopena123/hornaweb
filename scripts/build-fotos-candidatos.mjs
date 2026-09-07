/**
 * Genera los retratos de la sección "Nuestros candidatos" del landing.
 *
 * Las fotos originales son de estudio, 4000x6000, cuerpo entero, y varias
 * personas tienen 2-3 tomas casi idénticas: aquí se elige UNA por candidato.
 *
 * El recorte se normaliza por tamaño de cabeza (headH) para que todos los
 * rostros queden a la misma escala aunque las tomas se hicieran a distinta
 * distancia. Las coordenadas están medidas a mano sobre el original.
 *
 *   node scripts/build-fotos-candidatos.mjs [carpeta-de-fotos]
 *
 * Usa `sharp`, que ya viene instalado como dependencia de Next.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] ?? "C:/Users/PC/Downloads/partidaoriso/Fotos";
const OUT = path.join(process.cwd(), "public/assets/images/candidatos");

// `file` es un fragmento único del nombre original (los nombres traen
// caracteres Unicode decorativos, p. ej. "𝗛𝘂𝗲𝗽𝗲𝘁𝘂𝗵𝗲", que no se pueden teclear).
// headTop/cx/headH van en píxeles del original.
const CANDIDATOS = [
  { slug: "simon-horna",      file: /^SimonHorna\.jpe?g$/i,          headTop: 1289, cx: 2044, headH: 1200 },
  { slug: "juan-ticona",      file: /^AlcaldeProvincial_Tambopata/i, headTop: 968,  cx: 1890, headH: 1200, skip: /_\d\./ },
  { slug: "yilmer-gonzales",  file: /Tahuamanu_YilmerGonzalesKhan_1\./i, headTop: 1102, cx: 2050, headH: 1114 },
  { slug: "abimael-huaman",   file: /AbimaelHuamanCcolque\.jpe?g$/i, headTop: 1128, cx: 1944, headH: 1243 },
  { slug: "isaac-cahuana",    file: /IsaacCahuanaCcama\.jpe?g$/i,    headTop: 1059, cx: 2158, headH: 1157 },
  { slug: "jhonny-curinambe", file: /JhonnyCurinambeLeyva\.jpe?g$/i, headTop: 914,  cx: 1997, headH: 1157 },
  { slug: "danny-taboada",    file: /DannyTaboadaCaceres\.jpe?g$/i,  headTop: 471,  cx: 2060, headH: 1414 },
];

// Encuadre: la cabeza ocupa ~48 % del alto de una caja 3:4, con 16 % de aire arriba.
const REF_HEAD = 1183;
const REF_H = 2450;
const HEADROOM = 0.16;
const WIDTHS = [560, 840]; // 1x y 1.5x de la tarjeta

const files = fs.readdirSync(SRC).filter((f) => /\.jpe?g$/i.test(f));
fs.mkdirSync(OUT, { recursive: true });

for (const c of CANDIDATOS) {
  const match = files.filter((f) => c.file.test(f) && !(c.skip && c.skip.test(f)));
  if (match.length !== 1) {
    throw new Error(`${c.slug}: se esperaba 1 archivo, hay ${match.length} [${match}]`);
  }
  const img = sharp(path.join(SRC, match[0]));
  const meta = await img.metadata();

  const height = Math.round((REF_H * c.headH) / REF_HEAD);
  const width = Math.round((height * 3) / 4);
  const top = Math.max(0, Math.min(meta.height - height, Math.round(c.headTop - HEADROOM * height)));
  const left = Math.max(0, Math.min(meta.width - width, Math.round(c.cx - width / 2)));

  for (const w of WIDTHS) {
    const suffix = w === WIDTHS[0] ? "" : `@${Math.round((w / WIDTHS[0]) * 10) / 10}x`;
    const dest = path.join(OUT, `${c.slug}${suffix}.webp`);
    await sharp(path.join(SRC, match[0]))
      .extract({ left, top, width, height })
      .resize({ width: w })
      .webp({ quality: 82 })
      .toFile(dest);
    console.log(`${path.basename(dest)}  ${(fs.statSync(dest).size / 1024).toFixed(0)} KB  ← ${match[0]}`);
  }
}
