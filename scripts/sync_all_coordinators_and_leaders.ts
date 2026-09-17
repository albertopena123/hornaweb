import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, District } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_DEFS } from "../src/lib/auth/permissions";
import { hashPassword } from "../src/lib/auth/password";
import { toTitleCase } from "../src/lib/text";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  console.log("=== INICIANDO SINCRONIZACIÓN INTEGRAL DE COORDINADORES Y LÍDERES ===");

  // Cargar nombres oficiales de RENIEC si existen
  let reniecMap: Record<string, string> = {};
  const reniecPath = path.join(__dirname, "reniec_names.json");
  if (fs.existsSync(reniecPath)) {
    try {
      reniecMap = JSON.parse(fs.readFileSync(reniecPath, "utf-8"));
      console.log(`✓ Cargados ${Object.keys(reniecMap).length} nombres oficiales desde RENIEC`);
    } catch (e) {
      console.warn("No se pudo leer reniec_names.json, se usarán nombres por defecto");
    }
  }

  // 1. Sincronizar catálogo de permisos y roles en base a ROLE_DEFS
  console.log("\n1. Sincronizando catálogo de permisos y roles...");
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

  const rolesMap = new Map((await prisma.role.findMany()).map((r) => [r.key, r]));
  console.log(`✓ Roles verificados en BD: ${Array.from(rolesMap.keys()).join(", ")}`);

  // 2. Definición completa de los 20 Colegios y sus 25 Asignaciones de Coordinador (Hoja 1)
  console.log("\n2. Asignando coordinadores a los 20 Colegios en ElectoralLocal...");

  const COLEGIOS_CONFIG = [
    {
      query: "HUERTO INFANTIL",
      c1Dni: "76928222",
      c1Phone: "982791261",
      c1Fallback: "KEYLA LUZ NIETO PEREZ",
    },
    {
      query: "DOS DE MAYO",
      c1Dni: "01123246",
      c1Phone: "997370435",
      c1Fallback: "MIGUEL CHAVEZ PINCHI",
      c2Dni: "10383823",
      c2Phone: "980728935",
      c2Fallback: "WILLIAMS WILFREDO MICHE MERINO",
    },
    {
      query: "ROSARIO",
      c1Dni: "42816428",
      c1Phone: "921513845",
      c1Fallback: "LUIS CARLOS POMPILLA SALAS",
    },
    {
      query: "PALMERAS",
      c1Dni: "44410565",
      c1Phone: "984357937",
      c1Fallback: "MARIELA GONZALES CAÑARI",
    },
    {
      query: "PASTORA",
      c1Dni: "28297881",
      c1Phone: "950740862",
      c1Fallback: "JUAN WILFREDO FERNANDEZ GARAMENDI",
      c2Dni: "45029433",
      c2Phone: "986676886",
      c2Fallback: "PIERO ALEXANDER TERRAZAS ARDAYA",
    },
    {
      query: "BILLINGHURST",
      c1Dni: "01022660",
      c1Phone: "949834730",
      c1Fallback: "GUSTAVO PEREYRA PANDURO",
    },
    {
      query: "SANTA CRUZ",
      c1Dni: "02846909",
      c1Phone: "919032342",
      c1Fallback: "SERGIO ROLANDO NAVARRO AVENDAÑO",
    },
    {
      query: "AMAZONICA",
      c1Dni: "42847252",
      c1Phone: "951251496",
      c1Fallback: "ETNA CATHERINE EGOAVIL ESCOBAR",
      c2Dni: "40395424",
      c2Phone: "982736965",
      c2Fallback: "CESAR ARQUE MEZA",
    },
    {
      query: "VELA VALLES",
      c1Dni: "44607424",
      c1Phone: "993630302",
      c1Fallback: "JULIO MARWIN HAGLERS CHICATA HIDALGO",
    },
    {
      query: "QUIÑONES",
      c1Dni: "43872160",
      c1Phone: "953085403",
      c1Fallback: "DAVID MARLON YUCRA CHAMBI",
    },
    {
      query: "BOURONCLE",
      c1Dni: "45647172",
      c1Phone: "957229829",
      c1Fallback: "IRVING GABRIEL MACEDO TELLO",
      c2Dni: "45559557",
      c2Phone: "94952299",
      c2Fallback: "ALICIA ELIANA COTALUQUE TERRAZAS",
    },
    {
      query: "FITZCARRALD",
      c1Dni: "47194470",
      c1Phone: "913801036",
      c1Fallback: "RODOLFO ALFONSO MIYASHIRO RODRIGUEZ",
    },
    {
      query: "ESPERANZA",
      c1Dni: "24696311",
      c1Phone: "942763489",
      c1Fallback: "MARIO CCAHUANTICO CCAHUANTICO",
    },
    {
      query: "ANDINA",
      c1Dni: "43635878",
      c1Phone: "942551002",
      c1Fallback: "JUAN CARLOS CATUNTA CORAHUA",
    },
    {
      query: "SANTA ROSA",
      c1Dni: "60439069",
      c1Phone: "905516639",
      c1Fallback: "KATZUMY KETTY CONDOR TRAVEZAÑO",
    },
    {
      query: "MILAGROS",
      c1Dni: "41618095",
      c1Phone: "922074597",
      c1Fallback: "MANUEL ALEJANDRO REINOSO MONDOÑEDO",
    },
    {
      query: "JAIME WHITE",
      c1Dni: "80238057",
      c1Phone: "907139506",
      c1Fallback: "PAULO ADEMYR MANAYAY ASALDE",
    },
    {
      query: "ALIPIO PONCE",
      c1Dni: "04822748",
      c1Phone: "943743288",
      c1Fallback: "EDGAR PIZANGO AGUILAR",
    },
    {
      query: "FAUSTINO",
      c1Dni: "04812906",
      c1Phone: "982746770",
      c1Fallback: "JOSEFINA BARRA LENES",
      c2Dni: "47066888",
      c2Phone: "974569477",
      c2Fallback: "VANIA ELISABETH PEÑA BARRA",
    },
    {
      query: "ENAWIPA",
      c1Dni: "04963601",
      c1Phone: "964109702",
      c1Fallback: "CESAR AUGUSTO JOJAJE ERINEY",
    },
  ];

  for (const cfg of COLEGIOS_CONFIG) {
    const local = await prisma.electoralLocal.findFirst({
      where: { name: { contains: cfg.query, mode: "insensitive" } },
    });

    if (!local) {
      console.warn(`[!] No se encontró colegio con query "${cfg.query}"`);
      continue;
    }

    const c1Name = reniecMap[cfg.c1Dni] || cfg.c1Fallback;
    const c2Name = cfg.c2Dni ? (reniecMap[cfg.c2Dni] || cfg.c2Fallback || null) : null;

    await prisma.electoralLocal.update({
      where: { id: local.id },
      data: {
        coordinatorName: c1Name,
        coordinatorDni: cfg.c1Dni,
        coordinatorPhone: cfg.c1Phone,
        coordinator2Name: c2Name,
        coordinator2Dni: cfg.c2Dni || null,
        coordinator2Phone: cfg.c2Phone || null,
      },
    });

    console.log(`✓ Colegio actualizado: "${local.name}" -> C1: ${c1Name}${c2Name ? ` | C2: ${c2Name}` : ""}`);
  }

  // 3. Sincronizar todos los Coordinadores de Colegio a la tabla User
  console.log("\n3. Sincronizando cuentas de usuario (/usuarios) para los 25 coordinadores de colegio...");
  const roleCoord1 = rolesMap.get("coordinador_local_1")!;
  const roleCoord2 = rolesMap.get("coordinador_local_2")!;

  const localesConCoord = await prisma.electoralLocal.findMany({
    where: {
      OR: [{ coordinatorDni: { not: null } }, { coordinator2Dni: { not: null } }],
    },
  });

  for (const local of localesConCoord) {
    // Coordinador 1 (Titular)
    if (local.coordinatorDni && local.coordinatorDni.trim().length >= 8) {
      const dni = local.coordinatorDni.trim();
      const rawName = reniecMap[dni] || local.coordinatorName || "Coordinador 1";
      const name = toTitleCase(rawName);
      const phone = local.coordinatorPhone?.trim() || null;
      const email = `${dni}@ahoranacion.pe`;
      const pwHash = await hashPassword(dni);

      const existing = await prisma.user.findFirst({
        where: { OR: [{ dni }, { email }, { email: `${dni}@personeros.ahoranacion.pe` }] },
      });

      let uId: string;
      if (existing) {
        const u = await prisma.user.update({
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
        uId = u.id;
      } else {
        const u = await prisma.user.create({
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
        uId = u.id;
      }

      await prisma.userRole.deleteMany({ where: { userId: uId, roleId: roleCoord2.id } });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: uId, roleId: roleCoord1.id } },
        update: {},
        create: { userId: uId, roleId: roleCoord1.id },
      });
      console.log(`[Coord 1 Titular] ${name} (${dni}) -> ${local.name}`);
    }

    // Coordinador 2 (Adjunto)
    if (local.coordinator2Dni && local.coordinator2Dni.trim().length >= 8) {
      const dni = local.coordinator2Dni.trim();
      const rawName = reniecMap[dni] || local.coordinator2Name || "Coordinador 2";
      const name = toTitleCase(rawName);
      const phone = local.coordinator2Phone?.trim() || null;
      const email = `${dni}@ahoranacion.pe`;
      const pwHash = await hashPassword(dni);

      const existing = await prisma.user.findFirst({
        where: { OR: [{ dni }, { email }, { email: `${dni}@personeros.ahoranacion.pe` }] },
      });

      let uId: string;
      if (existing) {
        const u = await prisma.user.update({
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
        uId = u.id;
      } else {
        const u = await prisma.user.create({
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
        uId = u.id;
      }

      await prisma.userRole.deleteMany({ where: { userId: uId, roleId: roleCoord1.id } });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: uId, roleId: roleCoord2.id } },
        update: {},
        create: { userId: uId, roleId: roleCoord2.id },
      });
      console.log(`[Coord 2 Adjunto] ${name} (${dni}) -> ${local.name}`);
    }
  }

  // 4. Sincronizar Líderes y Coordinadores Territoriales (Hoja 2)
  console.log("\n4. Sincronizando Líderes y Coordinadores Territoriales (Hoja 2)...");

  const LEADERS = [
    {
      dni: "42837202",
      cargo: "Coordinador General MDD",
      rawName: "JORGE ALFREDO BLANCO GARCIA",
      phone: "951329084",
      roleKey: "coordinador_departamental",
      scopeType: "departamental",
      province: null,
      district: null,
    },
    {
      dni: "46889586",
      cargo: "Personero Legal",
      rawName: "VLADIMIR LIPA COLQUE",
      phone: "974259136",
      roleKey: "admin",
      scopeType: "departamental",
      province: null,
      district: null,
    },
    {
      dni: "19963793",
      cargo: "Coordinador Adjunto",
      rawName: "GUILLERMO CONDOR PAUCAR",
      phone: "915008611",
      roleKey: "admin",
      scopeType: "departamental",
      province: null,
      district: null,
    },
    {
      dni: "60973331",
      cargo: "Secretario de Grupo",
      rawName: "BORIS MANUEL CALLO LIPA",
      phone: "969322735",
      roleKey: "coordinador_departamental",
      scopeType: "departamental",
      province: null,
      district: null,
    },
    {
      dni: "40455993",
      cargo: "Área de Sistemas e Informática",
      rawName: "JOSE CARLOS NAVARRO VEGA",
      phone: "987787010",
      roleKey: "admin",
      scopeType: "departamental",
      province: null,
      district: null,
    },
    {
      dni: "21492930",
      cargo: "Apoyo Legal",
      rawName: "ANGEL RIGOBERTO QUIJANDRIA MENDOZA",
      phone: "982727238",
      roleKey: "verificador",
      scopeType: "departamental",
      province: null,
      district: null,
    },
    {
      dni: "46424983",
      cargo: "Capacitadora Personeros",
      rawName: "KAROL MARGARITA PAREDES TORREZ",
      phone: "955721347",
      roleKey: "coordinador_departamental",
      scopeType: "departamental",
      province: null,
      district: null,
    },
    {
      dni: "40951921",
      cargo: "Coordinador Delegado Prov. Tambopata",
      rawName: "ROY RUBELI GUTIERREZ PAREDES",
      phone: "913933709",
      roleKey: "coordinador_provincial",
      scopeType: "provincial",
      province: "Tambopata",
      district: null,
    },
    {
      dni: "46318591",
      cargo: "Coordinador Delegado Prov. Tambopata",
      rawName: "ABELINO CCAHUANTICO CCASA",
      phone: "989412131",
      roleKey: "coordinador_provincial",
      scopeType: "provincial",
      province: "Tambopata",
      district: null,
    },
    {
      dni: "41774094",
      cargo: "Coordinador Delegado Prov. Tahuamanu",
      rawName: "CLIFFOD DIXSON GUTIERREZ MACHACA",
      phone: "997075261",
      roleKey: "coordinador_provincial",
      scopeType: "provincial",
      province: "Tahuamanu",
      district: null,
    },
    {
      dni: "01560048",
      cargo: "Coordinador Delegado Prov. Manu",
      rawName: "LUJHAMS WILSON CHOQUE CONDORI",
      phone: "965248836",
      roleKey: "coordinador_provincial",
      scopeType: "provincial",
      province: "Manu",
      district: null,
    },
    {
      dni: "43110497",
      cargo: "Distrital Deleg. Dist. Inambari, Piedras, Laberinto",
      rawName: "VIVIAN MILUSCA LARA ESCOBAR",
      phone: "982760254",
      roleKey: "coordinador_distrital",
      scopeType: "distrital",
      province: "Tambopata",
      district: "inambari" as District,
    },
  ];

  for (const l of LEADERS) {
    const rawName = reniecMap[l.dni] || l.rawName;
    const name = toTitleCase(rawName);
    const email = `${l.dni}@ahoranacion.pe`;
    const pwHash = await hashPassword(l.dni);
    const roleTarget = rolesMap.get(l.roleKey);

    if (!roleTarget) {
      console.warn(`Rol ${l.roleKey} no encontrado para ${name}`);
      continue;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ dni: l.dni }, { email }] },
    });

    let uId: string;
    if (existing) {
      const u = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          dni: l.dni,
          phone: l.phone || existing.phone,
          scopeType: l.scopeType,
          assignedProvince: l.province,
          assignedDistrict: l.district,
          active: true,
        },
      });
      uId = u.id;
      console.log(`[Actualizado Líder] ${name} (${l.cargo}) -> Rol: ${roleTarget.name}`);
    } else {
      const u = await prisma.user.create({
        data: {
          email,
          name,
          dni: l.dni,
          phone: l.phone,
          passwordHash: pwHash,
          scopeType: l.scopeType,
          assignedProvince: l.province,
          assignedDistrict: l.district,
          active: true,
        },
      });
      uId = u.id;
      console.log(`[Creado Líder] ${name} (${l.cargo}) -> Rol: ${roleTarget.name}`);
    }

    // Asegurar rol asignado
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: uId, roleId: roleTarget.id } },
      update: {},
      create: { userId: uId, roleId: roleTarget.id },
    });
  }

  console.log("\n=== SINCRONIZACIÓN COMPLETADA CON ÉXITO ===");
  await prisma.$disconnect();
}

main().catch(console.error);
