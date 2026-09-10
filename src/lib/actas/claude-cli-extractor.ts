import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import type { ExtractedActaData } from "./ai-extractor";

/**
 * Extraer votos de una foto de Acta Electoral usando el Claude Code CLI ya
 * instalado en la máquina (sesión/suscripción de Claude, sin ANTHROPIC_API_KEY).
 *
 * Mismo patrón que el modo CLI del extraction-service de SIGRIS (engine.py
 * `_run_via_cli_once`):
 *   - `claude -p -` con el prompt por stdin y `--output-format json` para
 *     obtener { result, session_id, is_error, usage } en vez de texto suelto.
 *   - Se ejecuta desde un directorio temporal que SOLO contiene la foto: si se
 *     corre en el cwd del proyecto, Claude Code carga automáticamente
 *     AGENTS.md/CLAUDE.md y el árbol de archivos en el prompt de sistema —
 *     ruido carísimo e irrelevante para esta tarea puntual.
 *   - `--strict-mcp-config --allowed-tools Read`: ni servidores MCP ni más
 *     herramientas que la lectura del propio archivo de imagen.
 * Diferencia clave frente a SIGRIS: no hay `--max-turns` en esta versión del
 * CLI (se quitó), y el modelo SÍ agrega texto fuera del JSON pedido (una nota
 * de auditoría, por ejemplo) — por eso el parseo es defensivo igual que
 * `_parse()` en Python: intento directo → bloque ```json``` → llaves
 * balanceadas.
 */

const CLAUDE_CMD = process.env.CLAUDE_CLI || "claude";
const CLI_MODEL = process.env.CLAUDE_CLI_MODEL || "claude-opus-5";
const CLI_EFFORT = process.env.CLAUDE_CLI_EFFORT || "medium";
const CLI_TIMEOUT_MS = Number(process.env.CLI_TIMEOUT_MS || 120_000);

type ImageBlock = { ext: string; data: Buffer };

function parseDataUrlToBuffer(imageBase64OrUrl: string): ImageBlock | null {
  const match = imageBase64OrUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1] === "jpg" ? "jpeg" : match[1];
  return { ext, data: Buffer.from(match[2], "base64") };
}

async function withIsolatedImage<T>(image: ImageBlock, fn: (dir: string, filename: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "hornaweb-acta-"));
  const filename = `acta.${image.ext}`;
  try {
    await writeFile(join(dir, filename), image.data);
    return await fn(dir, filename);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runClaudeCli(
  args: string[],
  input: string,
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_CMD, args, {
      cwd,
      shell: process.platform === "win32", // en Windows "claude" es un shim .cmd de npm
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Claude CLI excedió el tiempo límite de ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });

    child.stdin.write(input, "utf-8");
    child.stdin.end();
  });
}

// ── Parseo robusto del JSON dentro de `result` (igual que engine.py _parse) ──

const ANSI_RE = /\x1B\[[0-9;]*m/g;

function tryParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

function extractBalancedJson(s: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) return s.slice(start, i + 1);
    }
  }
  return null;
}

function parseActaJson(raw: string): {
  mesaNumber: string | null;
  votes: Array<{ party: string; votes: number }>;
  votosBlancos: number;
  votosNulos: number;
  votosImpugnados: number;
  totalVotos: number;
  confidence: number;
} {
  const clean = raw.replace(ANSI_RE, "").trim();

  let data =
    tryParse(clean) ??
    (() => {
      const fence = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      return fence ? tryParse(fence[1]) : null;
    })() ??
    (() => {
      const balanced = extractBalancedJson(clean);
      return balanced ? tryParse(balanced) : null;
    })();

  if (!data) {
    throw new Error(`Claude no devolvió JSON válido.\nRespuesta (primeros 500 caracteres):\n${clean.slice(0, 500)}`);
  }

  const votesRaw = Array.isArray(data.votes) ? data.votes : [];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0);

  return {
    mesaNumber: typeof data.mesaNumber === "string" ? data.mesaNumber : null,
    votes: votesRaw
      .filter((v): v is { party: unknown; votes: unknown } => !!v && typeof v === "object")
      .map((v) => ({ party: String((v as any).party ?? ""), votes: num((v as any).votes) })),
    votosBlancos: num(data.votosBlancos),
    votosNulos: num(data.votosNulos),
    votosImpugnados: num(data.votosImpugnados),
    totalVotos: num(data.totalVotos),
    confidence: typeof data.confidence === "number" ? Math.min(1, Math.max(0, data.confidence)) : 0.7,
  };
}

// ── Prompt ────────────────────────────────────────────────────────────────

function buildPrompt(
  candidateParties: string[],
  filename: string,
  mesaHint: string | undefined,
  electionType: string,
  province: string,
): string {
  return `Eres un auditor electoral experto en actas de escrutinio de la ONPE (Perú). Usa la herramienta Read para abrir el archivo de imagen "${filename}" (está en el directorio actual) y transcribe EXACTAMENTE los números manuscritos de la tabla de resultados.

ESTRUCTURA TÍPICA DEL ACTA:
- Encabezado con "MESA DE SUFRAGIO N°" (6 dígitos).
- Tabla "ORGANIZACIONES POLÍTICAS": una fila por partido, con su nombre/sigla y una columna "TOTAL DE VOTOS" escrita a mano.
- Debajo de la tabla: "VOTOS EN BLANCO", "VOTOS NULOS", "VOTOS IMPUGNADOS" y "TOTAL DE VOTOS EMITIDOS", también manuscritos.

REGLAS:
- Transcribe cada número EXACTAMENTE como está escrito, dígito por dígito.
- Si un número es realmente ilegible, usa 0 en ese campo y baja "confidence" en vez de adivinar.
- No inventes, no redondees ni corrijas cifras aunque no cuadre la suma total.
- Devuelve una fila por cada organización política visible en la tabla, respetando el orden del acta.

CONTEXTO: Elección de ${electionType === "provincial" ? `Consejeros / Alcaldía Provincial (${province})` : "Gobernador Regional"} — Madre de Dios, Elecciones Regionales y Municipales 2026.${
    mesaHint ? ` Mesa esperada: ${mesaHint}.` : ""
  }
Organizaciones políticas en contienda (referencia; el orden exacto de la tabla puede variar):
${candidateParties.map((p) => `- ${p}`).join("\n")}

Responde ÚNICAMENTE con un JSON (sin texto antes ni después, sin bloque \`\`\`) con esta forma exacta:
{
  "mesaNumber": "string de 6 dígitos o null si no es legible",
  "votes": [ { "party": "nombre del partido tal como aparece en el acta", "votes": numero_entero } ],
  "votosBlancos": numero_entero,
  "votosNulos": numero_entero,
  "votosImpugnados": numero_entero,
  "totalVotos": numero_entero,
  "confidence": numero_entre_0_y_1
}`;
}

export async function extractVotesFromActaImageCli(
  imageBase64OrUrl: string,
  mesaHint?: string,
  electionType: string = "gobernador",
  province: string = "Tambopata",
): Promise<ExtractedActaData> {
  const image = parseDataUrlToBuffer(imageBase64OrUrl);
  if (!image) {
    throw new Error(
      "La imagen del acta debe enviarse como base64 (data:image/jpeg|png;base64,...) para poder analizarla con el CLI de Claude.",
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

  const parsed = await withIsolatedImage(image, async (dir, filename) => {
    const prompt = buildPrompt(
      candidates.map((c) => c.party),
      filename,
      mesaHint,
      electionType,
      province,
    );

    const args = [
      "-p",
      "--output-format",
      "json",
      "--model",
      CLI_MODEL,
      "--effort",
      CLI_EFFORT,
      "--strict-mcp-config",
      "--allowed-tools",
      "Read",
      "-",
    ];

    const { stdout, stderr, code } = await runClaudeCli(args, prompt, dir, CLI_TIMEOUT_MS);

    if (!stdout.trim() && stderr) {
      throw new Error(`Claude CLI error: ${stderr.slice(0, 500)}`);
    }

    let output: any;
    try {
      output = JSON.parse(stdout);
    } catch {
      throw new Error(
        `Claude CLI no devolvió una respuesta interpretable (código de salida ${code}).\n${stdout.slice(0, 300)}`,
      );
    }

    if (output.is_error || output.subtype === "error") {
      throw new Error(`Claude CLI devolvió error: ${String(output.result ?? "").slice(0, 300)}`);
    }

    const usage = output.usage ?? {};
    console.log(
      `[claude-cli-extractor] session_id=${output.session_id} costo≈$${output.total_cost_usd ?? "?"} ` +
        `tokens=${usage.input_tokens ?? 0}in/${usage.output_tokens ?? 0}out ` +
        `cache=${usage.cache_read_input_tokens ?? 0}read/${usage.cache_creation_input_tokens ?? 0}write`,
    );

    return parseActaJson(String(output.result ?? ""));
  });

  // Empareja cada fila leída del acta con el candidato real de la BD por nombre de partido.
  const votesMap: Record<string, number> = {};
  const extractedList: NonNullable<ExtractedActaData["extractedList"]> = [];

  for (const cand of candidates) {
    const row = parsed.votes.find(
      (v) =>
        v.party.toLowerCase().includes(cand.party.toLowerCase()) ||
        cand.party.toLowerCase().includes(v.party.toLowerCase()),
    );
    const votes = Math.max(0, row?.votes ?? 0);
    votesMap[cand.id] = votes;
    extractedList.push({ candidateId: cand.id, candidateName: cand.name, party: cand.party, votes });
  }

  return {
    mesaNumber: parsed.mesaNumber || mesaHint,
    source: "ia",
    votes: votesMap,
    votosBlancos: parsed.votosBlancos,
    votosNulos: parsed.votosNulos,
    votosImpugnados: parsed.votosImpugnados,
    totalVotos: parsed.totalVotos,
    confidence: parsed.confidence,
    extractedList,
  };
}
