import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_DEFS } from "../src/lib/auth/permissions";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  console.log("=== INICIANDO SINCRONIZACIÓN DE COORDINADORES DE COLEGIO A USUARIOS ===");

  // 1. Sincronizar permisos y roles en base a ROLE_DEFS
  console.log("1. Sincronizando permisos y roles en la base de datos...");
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, category: p.category },
      create: p,
    });
  }

  const allPerms = await prisma.permission.findMany();
  const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));

  for (const r of ROLE_DEFS) {
    const roleRecord = await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description, system: r.system },
      create: { key: r.key, name: r.name, description: r.description, system: r.system },
    });

    const permKeys = r.key === "superadmin" ? Array.from(permByKey.keys()) : r.permissions;
    await prisma.rolePermission.deleteMany({ where: { roleId: roleRecord.id } });
    for (const pKey of permKeys) {
      const pId = permByKey.get(pKey);
      if (pId) {
        await prisma.rolePermission.create({ data: { roleId: roleRecord.id, permissionId: pId } });
      }
    }
  }

  const roleCoord1 = await prisma.role.findUnique({ where: { key: "coordinador_local_1" } });
  const roleCoord2 = await prisma.role.findUnique({ where: { key: "coordinador_local_2" } });

  if (!roleCoord1 || !roleCoord2) {
    throw new Error("No se encontraron los roles coordinador_local_1 o coordinador_local_2.");
  }
  console.log("✓ Roles verificados:", roleCoord1.name, "y", roleCoord2.name);

  // 2. Obtener locales electorales con coordinadores que tengan DNI
  const locales = await prisma.electoralLocal.findMany({
    where: {
      OR: [
        { coordinatorDni: { not: null } },
        { coordinator2Dni: { not: null } },
      ],
    },
    orderBy: [{ district: "asc" }, { name: "asc" }],
  });

  console.log(`\n2. Encontrados ${locales.length} colegios con coordinadores registrados.`);

  let totalCoords1 = 0;
  let totalCoords2 = 0;

  for (const local of locales) {
    // Procesa Coordinador 1 (Titular)
    if (local.coordinatorDni && local.coordinatorDni.trim().length >= 8) {
      const dni = local.coordinatorDni.trim();
      const name = local.coordinatorName?.trim() || "Coordinador 1";
      const phone = local.coordinatorPhone?.trim() || null;
      const email = `${dni}@ahoranacion.pe`;
      const pwHash = await hashPassword(dni);

      // Buscar si ya existe por DNI o emails conocidos
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { dni },
            { email },
            { email: `${dni}@personeros.ahoranacion.pe` },
          ],
        },
      });

      let userId: string;
      if (existing) {
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            dni,
            phone: phone || existing.phone,
            scopeType: "local",
            assignedLocalId: local.id,
            assignedDistrict: local.district,
            assignedProvince: local.province,
            active: true,
          },
        });
        userId = updated.id;
        console.log(`[Actualizado Coord 1] ${name} (${dni}) -> ${local.name}`);
      } else {
        const created = await prisma.user.create({
          data: {
            email,
            name,
            dni,
            phone,
            passwordHash: pwHash,
            scopeType: "local",
            assignedLocalId: local.id,
            assignedDistrict: local.district,
            assignedProvince: local.province,
            active: true,
          },
        });
        userId = created.id;
        console.log(`[Creado Coord 1] ${name} (${dni}) -> ${local.name}`);
      }

      // Asignar rol coordinador_local_1 y desvincular coordinador_local_2
      await prisma.userRole.deleteMany({
        where: { userId, roleId: roleCoord2.id },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: roleCoord1.id } },
        update: {},
        create: { userId, roleId: roleCoord1.id },
      });

      totalCoords1++;
    }

    // Procesa Coordinador 2 (Adjunto)
    if (local.coordinator2Dni && local.coordinator2Dni.trim().length >= 8) {
      const dni = local.coordinator2Dni.trim();
      const name = local.coordinator2Name?.trim() || "Coordinador 2";
      const phone = local.coordinator2Phone?.trim() || null;
      const email = `${dni}@ahoranacion.pe`;
      const pwHash = await hashPassword(dni);

      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { dni },
            { email },
            { email: `${dni}@personeros.ahoranacion.pe` },
          ],
        },
      });

      let userId: string;
      if (existing) {
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            dni,
            phone: phone || existing.phone,
            scopeType: "local",
            assignedLocalId: local.id,
            assignedDistrict: local.district,
            assignedProvince: local.province,
            active: true,
          },
        });
        userId = updated.id;
        console.log(`[Actualizado Coord 2] ${name} (${dni}) -> ${local.name}`);
      } else {
        const created = await prisma.user.create({
          data: {
            email,
            name,
            dni,
            phone,
            passwordHash: pwHash,
            scopeType: "local",
            assignedLocalId: local.id,
            assignedDistrict: local.district,
            assignedProvince: local.province,
            active: true,
          },
        });
        userId = created.id;
        console.log(`[Creado Coord 2] ${name} (${dni}) -> ${local.name}`);
      }

      // Asignar rol coordinador_local_2 y desvincular coordinador_local_1
      await prisma.userRole.deleteMany({
        where: { userId, roleId: roleCoord1.id },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: roleCoord2.id } },
        update: {},
        create: { userId, roleId: roleCoord2.id },
      });

      totalCoords2++;
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`✓ Coordinadores 1 (Titulares) procesados: ${totalCoords1}`);
  console.log(`✓ Coordinadores 2 (Adjuntos) procesados: ${totalCoords2}`);
  console.log(`✓ Total cuentas de coordinadores de colegio activadas: ${totalCoords1 + totalCoords2}`);

  await prisma.$disconnect();
}

main().catch(console.error);
