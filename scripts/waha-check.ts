// Uso: npx tsx scripts/waha-check.ts            → estado de la sesión
//      npx tsx scripts/waha-check.ts +51987654321 → además verifica si el número tiene WhatsApp
import "dotenv/config";

async function main() {
  const url = (process.env.WAHA_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
  const key = process.env.WAHA_API_KEY ?? "";
  const session = process.env.WAHA_SESSION ?? "default";
  const headers = { "X-Api-Key": key, Accept: "application/json" };

  const s = await fetch(`${url}/api/sessions/${session}`, { headers });
  console.log("GET /api/sessions/%s →", session, s.status, await s.text());

  const phone = process.argv[2];
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const c = await fetch(`${url}/api/contacts/check-exists?phone=${digits}&session=${session}`, { headers });
    console.log("check-exists →", c.status, await c.text());
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
