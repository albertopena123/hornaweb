import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/app/api/v1/_lib/response";
import { DISTRICT_IDS } from "@/lib/districts";

export async function GET() {
  try {
    const rows = await prisma.supporter.groupBy({
      by: ["district"],
      where: { status: "approved" },
      _count: { _all: true },
    });
    const districts: Record<string, number> = {};
    for (const id of DISTRICT_IDS) districts[id] = 0;
    let total = 0;
    for (const r of rows) {
      districts[r.district] = r._count._all;
      total += r._count._all;
    }
    const res = ok({ total, districts });
    res.headers.set("Cache-Control", "public, max-age=60");
    return res;
  } catch (e) {
    console.error("GET /api/apoyos/mapa", e);
    return fail("Error interno.", 500);
  }
}
