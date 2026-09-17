import "dotenv/config";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("C:\\Users\\USER\\Desktop\\hornaweb\\DOC-20260916-WA0044.xlsx");

  console.log("==================================================================");
  console.log("ANALISIS COMPLETO DEL EXCEL ACTUALIZADO (DOC-20260916-WA0044.xlsx)");
  console.log("==================================================================");

  // 1. Hoja 1: Locales y Coordinadores
  const sheet1 = workbook.getWorksheet("LISTA DE COO") || workbook.worksheets[0];
  const sheet1Data: any[] = [];

  sheet1.eachRow((row, rowNumber) => {
    if (rowNumber < 7) return; // Encabezados
    const values = (Array.isArray(row.values) ? row.values.slice(1) : row.values) as any[];
    const item = values[0];
    const name = values[1];
    const dni = values[2] ? String(values[2]).trim() : "";
    const phone = values[4] ? String(values[4]).replace(/\s+/g, "").trim() : "";
    const local = values[5] ? String(values[5]).trim() : "";
    
    if (name && dni) {
      sheet1Data.push({
        rowNumber,
        item,
        name: String(name).trim(),
        dni,
        phone,
        local
      });
    }
  });

  console.log(`\n--- HOJA 1: LISTA DE COORDINADORES DE COLEGIO (${sheet1Data.length} registros con DNI) ---`);
  
  // Buscar en BD
  const allLocales = await prisma.electoralLocal.findMany();
  const allUsers = await prisma.user.findMany({
    include: { roles: { include: { role: true } } }
  });

  for (const row of sheet1Data) {
    const userInDb = allUsers.find(u => u.dni === row.dni);
    // Buscar local
    const matchedLocal = allLocales.find(l => {
      const dbNorm = l.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const excelNorm = row.local.toLowerCase().replace(/[^a-z0-9]/g, "");
      return dbNorm.includes(excelNorm) || excelNorm.includes(dbNorm) ||
             (row.local.includes("PASTORA") && l.name.includes("PASTORA")) ||
             (row.local.includes("PALMA REAL") && l.name.includes("PALMA REAL")) ||
             (row.local.includes("BILLINGURT") && l.name.includes("BILLINGHURST")) ||
             (row.local.includes("UNAMAD") && l.name.includes("AMAZONICA")) ||
             (row.local.includes("ABA") && l.name.includes("BOURONCLE")) ||
             (row.local.includes("QUIÑONES") && l.name.includes("QUIÑONES")) ||
             (row.local.includes("VELA VALLES") && l.name.includes("VELA VALLES")) ||
             (row.local.includes("ESPERANZA") && l.name.includes("ESPERANZA")) ||
             (row.local.includes("ANDINA") && l.name.includes("ANDINA")) ||
             (row.local.includes("MILAGROS") && l.name.includes("MILAGROS")) ||
             (row.local.includes("JAIME WHITE") && l.name.includes("JAIME WHITE")) ||
             (row.local.includes("ALIPIO PONCE") && l.name.includes("ALIPIO PONCE")) ||
             (row.local.includes("FAUSTINO MALDONADO") && l.name.includes("FAUSTINO MALDONADO")) ||
             (row.local.includes("HUERTO INFANTIL") && l.name.includes("HUERTO INFANTIL")) ||
             (row.local.includes("PALMERAS") && l.name.includes("PALMERAS")) ||
             (row.local.includes("DOS DE MAYO") && l.name.includes("DOS DE MAYO")) ||
             (row.local.includes("ROSARIO") && l.name.includes("ROSARIO")) ||
             (row.local.includes("SANTA CRUZ") && l.name.includes("SANTA CRUZ")) ||
             (row.local.includes("SANTA ROSA") && l.name.includes("SANTA ROSA")) ||
             (row.local.includes("FITZCARRALD") && l.name.includes("FITZCARRALD"));
    });

    console.log(`\n[Item ${row.item}] ${row.name} | DNI: ${row.dni} | Cel: ${row.phone}`);
    console.log(`   Excel Local: "${row.local}"`);
    if (matchedLocal) {
      const isC1 = matchedLocal.coordinatorDni === row.dni;
      const isC2 = matchedLocal.coordinator2Dni === row.dni;
      console.log(`   BD Local: "${matchedLocal.name}" (ID: ${matchedLocal.id})`);
      console.log(`   Estado en Local BD: ${isC1 ? 'ASIGNADO COMO COORD 1' : isC2 ? 'ASIGNADO COMO COORD 2' : 'NO ASIGNADO AÚN EN LOCAL'}`);
      if (!isC1 && !isC2) {
        console.log(`     -> Actual en BD Local: C1=${matchedLocal.coordinatorName} (${matchedLocal.coordinatorDni}) | C2=${matchedLocal.coordinator2Name} (${matchedLocal.coordinator2Dni})`);
      }
    } else {
      console.log(`   [!] LOCAL NO ENCONTRADO EN BD`);
    }

    if (userInDb) {
      console.log(`   Usuario en BD: SI (Email: ${userInDb.email}, Roles: ${userInDb.roles.map(r => r.role.name).join(', ')})`);
    } else {
      console.log(`   Usuario en BD: NO (Falta crear usuario en /usuarios)`);
    }
  }

  // 2. Hoja 2: Liderazgo y Delegados Regionales
  const sheet2 = workbook.getWorksheet("Hoja2") || workbook.worksheets[1];
  const sheet2Data: any[] = [];

  sheet2.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    const values = (Array.isArray(row.values) ? row.values.slice(1) : row.values) as any[];
    const item = values[0];
    const name = values[1];
    const cargo = values[2];
    const dni = values[3] ? String(values[3]).trim() : "";
    const phone = values[4] ? String(values[4]).replace(/\s+/g, "").trim() : "";

    if (name && (dni || cargo)) {
      sheet2Data.push({
        rowNumber,
        item,
        name: String(name).trim(),
        cargo: String(cargo || "").trim(),
        dni,
        phone
      });
    }
  });

  console.log(`\n\n==================================================================`);
  console.log(`--- HOJA 2: LIDERAZGO REGIONAL Y CAPACITADORES (${sheet2Data.length} personas) ---`);
  console.log(`==================================================================`);

  for (const leader of sheet2Data) {
    const userInDb = leader.dni ? allUsers.find(u => u.dni === leader.dni) : allUsers.find(u => u.name.toLowerCase().includes(leader.name.toLowerCase()));
    console.log(`\n[Item ${leader.item || '-'}] ${leader.name}`);
    console.log(`   Cargo: ${leader.cargo}`);
    console.log(`   DNI: ${leader.dni || '(SIN DNI)'} | Cel: ${leader.phone}`);
    if (userInDb) {
      console.log(`   Estado en BD: REGISTRADO como "${userInDb.name}" (DNI: ${userInDb.dni}, Email: ${userInDb.email}, Rol: ${userInDb.roles.map(r => r.role.name).join(', ')}, Scope: ${userInDb.scopeType})`);
    } else {
      console.log(`   Estado en BD: NO REGISTRADO EN BD`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
