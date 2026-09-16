import { NextResponse } from "next/server";
import { extractVotesFromActaImage } from "@/lib/actas/ai-extractor";
import { extractVotesFromActaImageClaude } from "@/lib/actas/claude-extractor";
import { extractVotesFromActaImageCli } from "@/lib/actas/claude-cli-extractor";
import { QueueFullError, runQueuedExtraction } from "@/lib/actas/extraction-queue";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, mesa, electionType, province } = body;

    if (!image) {
      return NextResponse.json({ error: "No se proporcionó la imagen del acta." }, { status: 400 });
    }

    const args = [image, mesa, electionType || "gobernador", province || "Tambopata"] as const;

    // Orden de motores de extracción:
    // 1. Claude vía API (ANTHROPIC_API_KEY) — el más barato y rápido, para producción.
    // 2. Claude vía CLI local (misma sesión/suscripción de Claude Code de este equipo,
    //    sin API key) — igual que el modo CLI del extraction-service de SIGRIS.
    // 3. Gemini (si hay GEMINI_API_KEY) — red de seguridad para no romper el flujo
    //    si ninguna de las dos anteriores está disponible. Si tampoco hay Gemini,
    //    ai-extractor.ts lanza un error en vez de inventar votos (ver su comentario).
    //
    // Todo el intento (1→2→3) se ejecuta a través de una cola con concurrencia
    // limitada (ver extraction-queue.ts): sin esto, una ráfaga de personeros
    // usando "Analizar con IA" a la vez saturaría la VM y dispararía timeouts.
    const result = await runQueuedExtraction(async () => {
      if (process.env.ANTHROPIC_API_KEY) {
        return await extractVotesFromActaImageClaude(...args);
      }
      try {
        return await extractVotesFromActaImageCli(...args);
      } catch (cliErr: any) {
        console.warn("Claude CLI no disponible, usando motor de respaldo:", cliErr.message);
        return await extractVotesFromActaImage(...args);
      }
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    if (error instanceof QueueFullError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Error en extract-acta:", error);
    return NextResponse.json(
      { error: "No se pudo procesar la imagen del acta con IA.", details: error.message },
      { status: 500 }
    );
  }
}
