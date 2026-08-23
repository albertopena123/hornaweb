import { readFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { contentTypeFor, isSafeFilename, uploadsDir } from "@/lib/uploads";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isSafeFilename(file)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(uploadsDir("anuncios"), file));
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentTypeFor(file),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
