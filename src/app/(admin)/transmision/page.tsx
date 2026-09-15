import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/server";
import { getBroadcastConfig } from "@/lib/broadcast";
import { TransmisionClient } from "./TransmisionClient";

export const metadata: Metadata = {
  title: "Transmisión y Debate · Panel de Administración",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const config = await getBroadcastConfig();

  return <TransmisionClient initialConfig={config} userEmail={user.email} />;
}
