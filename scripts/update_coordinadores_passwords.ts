import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  console.log("=== ACTUALIZACIÓN DE CONTRASEÑAS DE COORDINADORES A SU NÚMERO DE CELULAR ===\n");

  // Buscar todos los usuarios que tengan algún rol de coordinador
  // o cuyo cargo/perfil sea coordinador
  const users = await prisma.user.findMany({
    include: {
      roles: { include: { role: true } },
      assignedLocal: true,
    },
    orderBy: { name: "asc" },
  });

  const COORD_ROLES = [
    "coordinador",
    "coordinador_departamental",
    "coordinador_provincial",
    "coordinador_distrital",
    "coordinador_local_1",
    "coordinador_local_2",
  ];

  let updatedCount = 0;
  let skippedCount = 0;
  const results: Array<{
    name: string;
    dni: string | null;
    phone: string;
    roles: string;
    status: string;
  }> = [];

  for (const user of users) {
    const roleKeys = user.roles.map((r) => r.role.key);
    const isCoordinatorRole = roleKeys.some((k) =>
      COORD_ROLES.includes(k) || k.toLowerCase().includes("coordinador")
    );
    // También incluir a Guillermo Cóndor Paucar (DNI 19963793), que es Coordinador Adjunto
    const isGuillermo = user.dni === "19963793";

    if (!isCoordinatorRole && !isGuillermo) {
      continue;
    }

    // Determinar el celular
    let cleanPhone = user.phone ? user.phone.replace(/\D/g, "") : "";

    // Si no tiene teléfono en User, buscar en Personero / Supporter / ElectoralLocal
    if (!cleanPhone && user.dni) {
      const p = await prisma.personero.findFirst({ where: { docNumber: user.dni } });
      if (p?.phone) cleanPhone = p.phone.replace(/\D/g, "");

      if (!cleanPhone) {
        const s = await prisma.supporter.findFirst({ where: { docNumber: user.dni } });
        if (s?.phone) cleanPhone = s.phone.replace(/\D/g, "");
      }

      if (!cleanPhone) {
        const el = await prisma.electoralLocal.findFirst({
          where: { OR: [{ coordinatorDni: user.dni }, { coordinator2Dni: user.dni }] },
        });
        if (el?.coordinatorDni === user.dni && el?.coordinatorPhone) {
          cleanPhone = el.coordinatorPhone.replace(/\D/g, "");
        } else if (el?.coordinator2Dni === user.dni && el?.coordinator2Phone) {
          cleanPhone = el.coordinator2Phone.replace(/\D/g, "");
        }
      }
    }

    if (!cleanPhone || cleanPhone.length < 6) {
      console.warn(`[!] OMITIDO (sin celular válido): ${user.name} (DNI: ${user.dni})`);
      results.push({
        name: user.name,
        dni: user.dni,
        phone: cleanPhone || "SIN TELÉFONO",
        roles: roleKeys.join(", "),
        status: "OMITIDO (sin celular válido >= 6 dígitos)",
      });
      skippedCount++;
      continue;
    }

    // Generar el hash de la nueva contraseña con el número de celular
    const passwordHash = await hashPassword(cleanPhone);

    // Actualizar usuario en la BD (incluyendo su teléfono si no lo tenía)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        phone: cleanPhone,
      },
    });

    results.push({
      name: user.name,
      dni: user.dni,
      phone: cleanPhone,
      roles: roleKeys.join(", ") || (isGuillermo ? "Coordinador Adjunto (admin)" : "coordinador"),
      status: "ACTUALIZADO",
    });
    updatedCount++;
    console.log(`✓ [ACTUALIZADO] ${user.name} | DNI: ${user.dni} | Nueva Clave (Celular): ${cleanPhone}`);
  }

  console.log("\n==========================================");
  console.log(`TOTAL COORDINADORES ACTUALIZADOS: ${updatedCount}`);
  console.log(`TOTAL OMITIDOS: ${skippedCount}`);
  console.log("==========================================\n");

  await prisma.$disconnect();
}

main().catch(console.error);
