"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import {
  saveBroadcastConfig,
  type BroadcastConfig,
  type BroadcastStatus,
} from "@/lib/broadcast";

export type BroadcastActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function updateBroadcastAction(
  data: Omit<BroadcastConfig, "embedUrl" | "updatedAt">
): Promise<BroadcastActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, error: "No autorizado. Inicie sesión nuevamente." };
    }

    if (!data.title || data.title.trim().length < 3) {
      return {
        ok: false,
        fieldErrors: { title: "El título debe tener al menos 3 caracteres." },
      };
    }

    const validStatus: BroadcastStatus = ["live", "upcoming", "recorded"].includes(
      data.status
    )
      ? data.status
      : "live";

    await saveBroadcastConfig({
      enabled: Boolean(data.enabled),
      showOnHome: Boolean(data.showOnHome),
      status: validStatus,
      region: data.region?.trim() || "Madre de Dios",
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || "Jurado Nacional de Elecciones (JNE) · Voto Informado",
      url: data.url?.trim() || "",
      customMessage: data.customMessage?.trim() || "",
    });

    // Revalidar las rutas afectadas para que el cambio sea inmediato
    revalidatePath("/");
    revalidatePath("/debate");
    revalidatePath("/transmision");

    return { ok: true };
  } catch (error) {
    console.error("updateBroadcastAction error:", error);
    return {
      ok: false,
      error: "Ocurrió un error inesperado al guardar la transmisión.",
    };
  }
}
