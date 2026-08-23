// Tipos compartidos entre el motor de envío (servidor) y la UI. Sin "server-only".
export type SchedulerReason =
  | "disabled" // MESSAGING_SCHEDULER=off o proceso sin scheduler
  | "idle" // sin campañas en curso
  | "waiting" // pausa aleatoria entre envíos
  | "out_of_window" // fuera de la ventana horaria de la campaña
  | "daily_cap" // tope diario alcanzado
  | "session_down" // WhatsApp no está WORKING
  | "veda"; // veda electoral

export type SchedulerSnapshot = {
  active: boolean;
  reason: SchedulerReason;
  campaignId: string | null;
  nextSendAt: string | null; // ISO
  sessionStatus: string | null;
  lastTickAt: string | null; // ISO
};
