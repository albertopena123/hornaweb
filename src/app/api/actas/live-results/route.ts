import { NextResponse } from "next/server";
import { getLiveResultsData } from "@/lib/actas/live-query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const electionType = searchParams.get("electionType") || "gobernador";
    const province = searchParams.get("province") || undefined;
    const data = await getLiveResultsData(electionType, province);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en live-results API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
