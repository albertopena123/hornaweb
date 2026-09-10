import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ExtractedActaData } from "./ai-extractor";

/**
 * Extraer votos de la fotografía de un Acta de Escrutinio usando Claude (visión).
 *
 * Mismo patrón que el extraction-service de SIGRIS (engine.py): un prompt de
 * sistema fijo (cacheado) con las reglas de lectura del acta, la foto como
 * bloque de imagen, y salida forzada a JSON — aquí vía Structured Outputs
 * (`output_config.format` + `messages.parse()`) en vez del parseo manual de
 * bloques ```json``` que usa la versión Python, porque la API TS ya valida el
 * esquema por nosotros y evita el reintento por "Claude no devolvió JSON válido".
 */

const ActaExtractionSchema = z.object({
  mesaNumber: z
    .string()
    .nullable()
    .describe(
      "Número de mesa de sufragio de 6 dígitos tal como aparece impreso en el acta (campo 'MESA DE SUFRAGIO N°'). null si no es legible.",
    ),
  votes: z
    .array(
      z.object({
        party: z
          .string()
          .describe("Nombre de la organización política EXACTAMENTE como aparece impreso en esa fila de la tabla."),
        votes: z
          .number()
          .int()
          .min(0)
          .describe("Número de votos escrito a mano en la columna 'TOTAL DE VOTOS' para esa fila."),
      }),
    )
    .describe("Una entrada por cada fila de la tabla de organizaciones políticas, en el mismo orden del acta."),
  votosBlancos: z.number().int().min(0).describe("Fila 'VOTOS EN BLANCO'."),
  votosNulos: z.number().int().min(0).describe("Fila 'VOTOS NULOS'."),
  votosImpugnados: z.number().int().min(0).describe("Fila 'VOTOS IMPUGNADOS'."),
  totalVotos: z.number().int().min(0).describe("Fila 'TOTAL DE VOTOS EMITIDOS'."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Qué tan segura está la lectura de los números manuscritos, de 0 (ilegible) a 1 (nítido)."),
});

const SYSTEM_PROMPT = `Eres un auditor electoral experto en actas de escrutinio de la ONPE (Perú). Vas a leer la fotografía de un Acta Electoral y transcribir EXACTAMENTE los números manuscritos de la tabla de resultados.

ESTRUCTURA TÍPICA DEL ACTA:
- Encabezado con "MESA DE SUFRAGIO N°" (6 dígitos).
- Tabla "ORGANIZACIONES POLÍTICAS": una fila por partido, con su nombre/sigla y una columna "TOTAL DE VOTOS" escrita a mano.
- Debajo de la tabla: "VOTOS EN BLANCO", "VOTOS NULOS", "VOTOS IMPUGNADOS" y "TOTAL DE VOTOS EMITIDOS", también manuscritos.

REGLAS:
- Transcribe cada número EXACTAMENTE como está escrito, dígito por dígito (el acta trae una guía de caligrafía de referencia: 0 1 2 3 4 5 6 7 8 9).
- Si un número es realmente ilegible, usa 0 en ese campo y baja "confidence" en vez de adivinar.
- No inventes, no redondees ni corrijas cifras aunque no cuadre la suma total.
- Devuelve una fila por cada organización política visible en la tabla, respetando el orden del acta.`;

type ImageBlock = { media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string };

function parseDataUrl(imageBase64OrUrl: string): ImageBlock | null {
  const match = imageBase64OrUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!match) return null;
  return { media_type: match[1] as ImageBlock["media_type"], data: match[2] };
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export async function extractVotesFromActaImageClaude(
  imageBase64OrUrl: string,
  mesaHint?: string,
  electionType: string = "gobernador",
  province: string = "Tambopata",
): Promise<ExtractedActaData> {
  const image = parseDataUrl(imageBase64OrUrl);
  if (!image) {
    throw new Error(
      "La imagen del acta debe enviarse como base64 (data:image/jpeg|png;base64,...) para poder analizarla con Claude.",
    );
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      cargo: electionType === "provincial" ? "provincial" : "gobernador",
      ...(electionType === "provincial" ? { province } : {}),
      active: true,
    },
    orderBy: { order: "asc" },
  });

  const userText = `Elección: ${
    electionType === "provincial" ? `Consejeros / Alcaldía Provincial (${province})` : "Gobernador Regional"
  } — Madre de Dios, Elecciones Regionales y Municipales 2026.
${mesaHint ? `Mesa esperada: ${mesaHint}.\n` : ""}Organizaciones políticas en contienda (referencia; el orden exacto de la tabla puede variar):
${candidates.map((c) => `- ${c.party}`).join("\n")}

Lee la foto adjunta y extrae los datos según las instrucciones del sistema.`;

  const response = await getClient().messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
          { type: "text", text: userText },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ActaExtractionSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude no pudo procesar esta imagen (rechazada por políticas de seguridad).");
  }
  if (!response.parsed_output) {
    throw new Error("Claude no devolvió una extracción válida del acta. Intenta con una foto más nítida.");
  }

  const extracted = response.parsed_output;

  // Empareja cada fila leída del acta con el candidato real de la BD por nombre de partido.
  const votesMap: Record<string, number> = {};
  const extractedList: NonNullable<ExtractedActaData["extractedList"]> = [];

  for (const cand of candidates) {
    const row = extracted.votes.find(
      (v) =>
        v.party.toLowerCase().includes(cand.party.toLowerCase()) ||
        cand.party.toLowerCase().includes(v.party.toLowerCase()),
    );
    const votes = Math.max(0, row?.votes ?? 0);
    votesMap[cand.id] = votes;
    extractedList.push({ candidateId: cand.id, candidateName: cand.name, party: cand.party, votes });
  }

  console.log(
    `[claude-extractor] mesa=${extracted.mesaNumber ?? mesaHint ?? "?"} tokens=${response.usage.input_tokens}in/${response.usage.output_tokens}out ` +
      `cache=${response.usage.cache_read_input_tokens ?? 0}read/${response.usage.cache_creation_input_tokens ?? 0}write confidence=${extracted.confidence}`,
  );

  return {
    mesaNumber: extracted.mesaNumber || mesaHint,
    source: "ia",
    votes: votesMap,
    votosBlancos: extracted.votosBlancos,
    votosNulos: extracted.votosNulos,
    votosImpugnados: extracted.votosImpugnados,
    totalVotos: extracted.totalVotos,
    confidence: extracted.confidence,
    extractedList,
  };
}
