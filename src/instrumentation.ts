// Se ejecuta una vez al arrancar el servidor de Next. Arranca el motor de envío
// solo en runtime Node.js (nunca en edge) y solo si MESSAGING_SCHEDULER != "off".
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.MESSAGING_SCHEDULER !== "off") {
    const { startScheduler } = await import("./lib/messaging/scheduler");
    startScheduler();
  }
}
