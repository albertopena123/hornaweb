import { NextResponse } from "next/server";
import { extractVotesFromActaImage } from "@/lib/actas/ai-extractor";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, mesa, electionType, province } = body;

    if (!image) {
      return NextResponse.json({ error: "No se proporcionó la imagen del acta." }, { status: 400 });
    }

    const result = await extractVotesFromActaImage(
      image,
      mesa,
      electionType || "gobernador",
      province || "Tambopata"
    );
    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("Error en extract-acta:", error);
    return NextResponse.json(
      { error: "No se pudo procesar la imagen del acta con IA.", details: error.message },
      { status: 500 }
    );
  }
}
