import type { Candidato, DistritoMDD, VotoSimulado } from '../types';
import { getJneBlobLogoUrl, getJneFotoCandidatoUrl, JNE_AZURE_BLOB_BASE } from '../services/jneService';

export interface SectorMDD {
  nombre: string;
  lat: number;
  lng: number;
}

// 18 Sectores oficiales de Puerto Maldonado para encuestas en campo (Ing. Navarro - GOREMAD)
export const SECTORES_PUERTO_MALDONADO: SectorMDD[] = [
  { nombre: 'CENTRO CACHUELA', lat: -12.5680, lng: -69.1720 },
  { nombre: 'CENTRO PASTORA', lat: -12.5720, lng: -69.1950 },
  { nombre: 'CHONTA', lat: -12.6150, lng: -69.2150 },
  { nombre: 'CHORRILLOS', lat: -12.5990, lng: -69.1860 },
  { nombre: 'EL CASTAÑAL', lat: -12.6050, lng: -69.1780 },
  { nombre: 'EL PRADO', lat: -12.5850, lng: -69.2100 },
  { nombre: 'LA JOYA', lat: -12.6100, lng: -69.1850 },
  { nombre: 'LA JOYITA I', lat: -12.6140, lng: -69.1880 },
  { nombre: 'LA JOYITA II', lat: -12.6180, lng: -69.1920 },
  { nombre: 'LAS PASTORA', lat: -12.5740, lng: -69.1980 },
  { nombre: 'MICHILALA', lat: -12.5810, lng: -69.1620 },
  { nombre: 'OTILIA', lat: -12.6010, lng: -69.2020 },
  { nombre: 'PUERTO ARTURO', lat: -12.6280, lng: -69.1710 },
  { nombre: 'RENACER', lat: -12.6080, lng: -69.2080 },
  { nombre: 'ROMPEOLAS', lat: -12.5910, lng: -69.1830 },
  { nombre: 'PUERTO MALDONADO', lat: -12.5933, lng: -69.1891 },
  { nombre: 'PUEBLO VIEJO', lat: -12.5900, lng: -69.1750 },
  { nombre: 'TRIUNFO', lat: -12.6040, lng: -69.1680 }
];

export const DISTRITOS_MDD: DistritoMDD[] = [
  // Provincia Tambopata (depCode=16, provCode=01)
  {
    id: 'puerto-maldonado',
    nombre: 'Tambopata (Puerto Maldonado)',
    provincia: 'Tambopata',
    lat: -12.5933,
    lng: -69.1891,
    poblacionElectoralAprox: 72000,
    centrosPoblados: SECTORES_PUERTO_MALDONADO.map(s => s.nombre)
  },
  {
    id: 'inambari',
    nombre: 'Inambari (Mazuko)',
    provincia: 'Tambopata',
    lat: -13.0456,
    lng: -70.3667,
    poblacionElectoralAprox: 14500,
    centrosPoblados: ['Mazuko', 'Santa Rosa', 'Km 108', 'La Pampa', 'Leoncito']
  },
  {
    id: 'laberinto',
    nombre: 'Laberinto (Puerto Rosario)',
    provincia: 'Tambopata',
    lat: -12.7167,
    lng: -69.5833,
    poblacionElectoralAprox: 8900,
    centrosPoblados: ['Puerto Rosario de Laberinto', 'Florida Baja', 'Santo Domingo']
  },
  {
    id: 'las-piedras',
    nombre: 'Las Piedras (Plapladora)',
    provincia: 'Tambopata',
    lat: -12.4333,
    lng: -69.2167,
    poblacionElectoralAprox: 9800,
    centrosPoblados: ['Plapladora', 'San Juan Grande', 'Mavila', 'Alegría']
  },

  // Provincia Tahuamanu (depCode=16, provCode=02)
  {
    id: 'inapari',
    nombre: 'Iñapari (Frontera Brasil)',
    provincia: 'Tahuamanu',
    lat: -10.9467,
    lng: -69.5767,
    poblacionElectoralAprox: 4200,
    centrosPoblados: ['Iñapari Centro', 'Bélgica', 'Casco Urbano Fronterizo']
  },
  {
    id: 'iberia',
    nombre: 'Iberia',
    provincia: 'Tahuamanu',
    lat: -11.3467,
    lng: -69.5891,
    poblacionElectoralAprox: 11200,
    centrosPoblados: ['Iberia Centro', 'Arrozal', 'Chiringay', 'Oceanía']
  },
  {
    id: 'tahuamanu',
    nombre: 'Tahuamanu (San Lorenzo)',
    provincia: 'Tahuamanu',
    lat: -11.2333,
    lng: -69.7500,
    poblacionElectoralAprox: 3100,
    centrosPoblados: ['San Lorenzo', 'Monalis', 'Shiringayoc']
  },

  // Provincia Manu (depCode=16, provCode=03)
  {
    id: 'salvacion',
    nombre: 'Manu (Villa Salvación)',
    provincia: 'Manu',
    lat: -12.8367,
    lng: -71.3650,
    poblacionElectoralAprox: 5800,
    centrosPoblados: ['Villa Salvación', 'Atalaya', 'Shipetiari', 'Shintuya']
  },
  {
    id: 'huepetuhe',
    nombre: 'Huepetuhe',
    provincia: 'Manu',
    lat: -13.0033,
    lng: -70.5283,
    poblacionElectoralAprox: 9100,
    centrosPoblados: ['Huepetuhe Centro', 'Puquiri', 'Delta 1', 'Choque']
  },
  {
    id: 'fitzcarrald',
    nombre: 'Fitzcarrald (Boca Manu)',
    provincia: 'Manu',
    lat: -12.2667,
    lng: -70.9167,
    poblacionElectoralAprox: 2300,
    centrosPoblados: ['Boca Manu', 'Diamante', 'Maizal']
  },
  {
    id: 'madre-de-dios-dist',
    nombre: 'Madre de Dios (Boca Colorado)',
    provincia: 'Manu',
    lat: -12.6000,
    lng: -70.4000,
    poblacionElectoralAprox: 6400,
    centrosPoblados: ['Boca Colorado', 'San José de Karene', 'Puerto Luz']
  }
];

// LAS 14 ORGANIZACIONES POLÍTICAS OFICIALES CON LOGOS DIRECTOS DEL CDN DE VOTO INFORMADO (stovotoinformadodev.blob.core.windows.net)
// LAS 14 ORGANIZACIONES POLÍTICAS OFICIALES REGISTRADAS EN EL JNE PARA MADRE DE DIOS 2026
export const CANDIDATOS: Candidato[] = [
  {
    id: 'gob-1',
    nombre: 'SIMON PEDRO HORNA ALPACA',
    profesion: 'Ingeniero Ambiental y Gestor de Recursos Naturales',
    partido: 'AHORA NACION - AN',
    partidoLogo: getJneBlobLogoUrl('2980'),
    fotoUrl: getJneFotoCandidatoUrl('09649665'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Formalización Minera Integral, Conectividad Vial Interprovincial y Sostenibilidad Ambiental',
    propuestasSecundarias: [
      'Vicegobernadora: ROXANA BORDA GAMARRA',
      'Asistencia técnica e insumos para el ordenamiento ambiental de la pequeña minería en Tambopata y Inambari.',
      'Pavimentación de la carretera interoceánica a comunidades castañeras.',
      'Fondo Regional de Apoyo al Productor Castañero y Agrícola.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/DEW0uIo45eehbqZg2ZxWHCND4W1iTuX9',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Candidato acreditado oficialmente para la Gobernación Regional de Madre de Dios 2026.',
    biografiaBreve: 'Candidato oficial a Gobernador Regional por Ahora Nación. Fórmula integrada por Simón Pedro Horna Alpaca y Roxana Borda Gamarra.'
  },
  {
    id: 'gob-2',
    nombre: 'ERNESTO HUILLCA RICALDE',
    profesion: 'Licenciado en Administración e Infraestructura Pública',
    partido: 'ALIANZA ELECTORAL VENCEREMOS',
    partidoLogo: getJneBlobLogoUrl('3028'),
    fotoUrl: getJneFotoCandidatoUrl('25321220'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Reestructuración Agraria Regional y Apoyo a los Comités de Autodefensa Amazónicos',
    propuestasSecundarias: [
      'Vicegobernadora: NORMA RICARDINA BERNEDO LOPEZ',
      'Créditos agrarios directos a pequeños productores de plátano, cacao y maíz.',
      'Saneamiento físico-legal de comunidades nativas de Tambopata, Manu y Tahuamanu.',
      'Seguridad rural y control fitosanitario provincial.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/5Isz4oOTMtMNnc9_BTEsCZwCMobBVIsf',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Líder Gremial Agrario y candidato oficial para la Gobernación Regional.',
    biografiaBreve: 'Candidato oficial a Gobernador Regional por Alianza Electoral Venceremos. Fórmula acompañada por Norma Ricardina Bernedo López.'
  },
  {
    id: 'gob-3',
    nombre: 'FREDDY ALVARO VRACKO METZGER',
    profesion: 'Abogado y Defensor de los Derechos Forestales',
    partido: 'ALIANZA LIBERTAD MADREDIOSENSE',
    partidoLogo: getJneBlobLogoUrl('2809'),
    fotoUrl: getJneFotoCandidatoUrl('10613379'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Defensa Territorial de Madre de Dios, Cero Extorsión y Titulación Castañera',
    propuestasSecundarias: [
      'Vicegobernadora: FIORELLA NATALIA RIVAS VERA',
      'Titulación integral y modernizada de concesiones castañeras y madereras.',
      'Construcción de la Central Macro de Seguridad con tecnología térmica.',
      'Exoneración de aranceles de maquinaria forestal sostenible.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/zsiHDPg_1zA0dBm6HodjUQ22TlzbO7zx',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Abogado nativo de Puerto Maldonado con amplia trayectoria regional.',
    biografiaBreve: 'Candidato a Gobernador por Alianza Libertad Madrediosense, junto a la candidata a Vicegobernadora Fiorella Natalia Rivas Vera.'
  },
  {
    id: 'gob-4',
    nombre: 'JOSE ABRAHAM CARDOZO MOUZULLY',
    profesion: 'Empresario e Ingeniero Agroindustrial',
    partido: 'ALIANZA PARA EL PROGRESO',
    partidoLogo: getJneBlobLogoUrl('1257'),
    fotoUrl: getJneFotoCandidatoUrl('05060221'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Modernización del Hospital Santa Rosa de Puerto Maldonado y Red de Salud Intercultural',
    propuestasSecundarias: [
      'Vicegobernadora: GLENDA KATHERINE LUZ REYNER HERRERA',
      'Construcción del Centro Oncológico y Unidad de Cuidados Intensivos Pediátricos.',
      'Telemedicina y ambulancias fluviales/terrestres para Iñapari, Salvación y Huepetuhe.',
      'Programa regional contra la anemia y desnutrición infantil.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/JpsonQMkn0SMzPHtnRe0BO7XnuR86NQF',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Candidato inscrito en la fórmula oficial de Alianza para el Progreso.',
    biografiaBreve: 'Representante de Alianza Para El Progreso en Madre de Dios, junto a Glenda Katherine Luz Reyner Herrera como Vicegobernadora.'
  },
  {
    id: 'gob-5',
    nombre: 'YENIFER ZAVALA AREQUE',
    profesion: 'Licenciada en Gestión Pública y Economía Amazónica',
    partido: 'AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL',
    partidoLogo: getJneBlobLogoUrl('2173'),
    fotoUrl: getJneFotoCandidatoUrl('43289389'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Transformación Digital del Gobierno Regional y Parque Industrial de Puerto Maldonado',
    propuestasSecundarias: [
      'Vicegobernador: ENRIQUE LEONIDAS ANDRES MUÑOZ PAREDES',
      'Trámites 100% digitales y licencias de minería en 48 horas.',
      'Instalación del Hub Amazónico de Innovación y Robótica.',
      'Conexión de fibra óptica a todos los colegios rurales de MDD.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/sMy47E5gFr_yJmopxmiSeJkd2hALk73H',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Líder en innovación y políticas de digitalización del Estado.',
    biografiaBreve: 'Candidata a Gobernadora Regional por Avanza País, acompañada por Enrique Leonidas Andrés Muñoz Paredes como Vicegobernador.'
  },
  {
    id: 'gob-6',
    nombre: 'CARLOS QUISPE MEDINA',
    profesion: 'Dirigente Agrícola y Promotor Comunitario',
    partido: 'FRENTE POPULAR AGRICOLA FIA DEL PERU',
    partidoLogo: getJneBlobLogoUrl('2901'),
    fotoUrl: getJneFotoCandidatoUrl('09151962'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Moralización de la Gestión Pública, Desarrollo Agropecuario e Integración Moral',
    propuestasSecundarias: [
      'Vicegobernadora: JULIA SICUS JANCCO',
      'Creación de bioferias agropecuarias semanales en los 11 distritos.',
      'Control ético y auditoría con representantes comunitarios.',
      'Infraestructura hídrica para riego de cultivos nativos.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/rHw-M3W3e0lBxpHD2posuU-5sOJ1DVwr',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Representante acreditado por el FREPAP en Madre de Dios.',
    biografiaBreve: 'Candidato a Gobernador Regional por el FREPAP. Fórmula integrada por Carlos Quispe Medina y Julia Sicus Jancco.'
  },
  {
    id: 'gob-7',
    nombre: 'WILBER UCHUPE FLOREZ',
    profesion: 'Especialista en Desarrollo Social y Medio Ambiente',
    partido: 'JUNTOS POR EL PERU',
    partidoLogo: getJneBlobLogoUrl('1264'),
    fotoUrl: getJneFotoCandidatoUrl('43503745'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Derechos Laborales de los Trabajadores Mineros y Castañeros y Protección Ambiental',
    propuestasSecundarias: [
      'Vicegobernadora: ANA MARIA DELGADO QUISPE DE QUISPE',
      'Seguro de salud ocupacional obligatorio para el sector minero artesanal.',
      'Fortalecimiento de la educación bilingüe intercultural.',
      'Protección estricta de las reservas biológicas del Manu y Tambopata.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/oEupDw6Yqe5hm1BAgLFMMMjKBoPMrFMq',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Activista de derechos laborales e interculturalidad en Madre de Dios.',
    biografiaBreve: 'Candidato a Gobernador por Juntos por el Perú, acompañado por Ana María Delgado Quispe de Quispe como Vicegobernadora.'
  },
  {
    id: 'gob-8',
    nombre: 'MANUEL FELIPE GUEVARA DUAREZ',
    profesion: 'Ingeniero Agrónomo y Productor Forestal',
    partido: 'PARTIDO DEL BUEN GOBIERNO',
    partidoLogo: getJneBlobLogoUrl('2961'),
    fotoUrl: getJneFotoCandidatoUrl('40599776'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Industrialización de la Castaña, Cacao, Copoazú y Potenciamiento del Ecoturismo',
    propuestasSecundarias: [
      'Vicegobernadora: CLAIRE ESTHER CAHUANA CONDORI',
      'Marca de Certificación de Origen "Madre de Dios Sostenible" para exportación.',
      'Bono de conservación y créditos a tasa cero para productores agrarios.',
      'Modernización del Corredor Ecoturístico de Tambopata.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/qlZ6R8Ugqg7uqgmplSXjURSRTYeGnip5',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Líder gremial castañero e impulsor del agro eco-amigable.',
    biografiaBreve: 'Candidato a Gobernador por el Partido del Buen Gobierno junto a la Vicegobernadora Claire Esther Cahuana Condori.'
  },
  {
    id: 'gob-9',
    nombre: 'IRIANA VELASQUEZ RUIZ',
    profesion: 'Abogada y Magíster en Administración de Negocios',
    partido: 'PARTIDO DEMOCRATICO SOMOS PERU',
    partidoLogo: getJneBlobLogoUrl('14'),
    fotoUrl: getJneFotoCandidatoUrl('44816698'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Seguridad Ciudadana Integral, Titulación Urbana y Alianza Estratégica Regional',
    propuestasSecundarias: [
      'Vicegobernador: LUIS OTSUKA SALAZAR (Ex Gobernador Regional de MDD)',
      'Central de Gestión Integrada de Videovigilancia con la Policía Nacional.',
      'Saneamiento físico-legal masivo para predios urbanos y rústicos.',
      'Electrificación rural 24/7 mediante paneles solares industriales.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/RpNEDrSkQzYuMv_tsvd-IMDe1ciQub94',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Fórmula que integra a la abogada Iriana Velásquez y al líder regional Luis Otsuka Salazar.',
    biografiaBreve: 'Candidata a Gobernadora Regional por Somos Perú, liderando la fórmula junto al exgobernador Luis Otsuka Salazar como Vicegobernador.'
  },
  {
    id: 'gob-10',
    nombre: 'PEDRO WANGER CARI RODRIGUEZ',
    profesion: 'Empresario del Transporte e Infraestructura',
    partido: 'PARTIDO PAIS PARA TODOS',
    partidoLogo: getJneBlobLogoUrl('2956'),
    fotoUrl: getJneFotoCandidatoUrl('41374281'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Carreteras Asfaltadas Iñapari - Puerto Maldonado y Corredores Fluviales',
    propuestasSecundarias: [
      'Vicegobernadora: MARLY MARIN DA SILVA',
      'Mejoramiento de embarcaderos turísticos en el Río Madre de Dios.',
      'Fondo rotatorio para renovación del transporte urbano.',
      'Impulso a la gastronomía nativa amazónica.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/Y5csFzcqh6Mvoqpb1ogVEq7Bib0rrdYi',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Empresario comprometido con la infraestructura vial de la selva sur.',
    biografiaBreve: 'Candidato a Gobernador Regional por Partido País Para Todos junto a Marly Marín Da Silva como Vicegobernadora.'
  },
  {
    id: 'gob-11',
    nombre: 'KIMYLSUNG DELGADO PALMA',
    profesion: 'Ingeniero Civil y Gestor de Proyectos de Saneamiento',
    partido: 'PARTIDO POLITICO PERU PRIMERO',
    partidoLogo: getJneBlobLogoUrl('2925'),
    fotoUrl: getJneFotoCandidatoUrl('40507422'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Megaproyecto de Agua Potable y Alcantarillado para Puerto Maldonado y Mazuko',
    propuestasSecundarias: [
      'Planta de Tratamiento de Aguas Residuales con tecnología limpia.',
      'Defensas ribereñas contra inundaciones en temporada de lluvias.',
      'Construcción de puentes definitivos en los ríos provinciales.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/bsqyu2bXTqPmqpB0ZL7Pb-AfKOrKf1cA',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Especialista en proyectos de agua potable y saneamiento en la selva.',
    biografiaBreve: 'Candidato oficial a Gobernador Regional por el Partido Político Perú Primero.'
  },
  {
    id: 'gob-12',
    nombre: 'RAFAEL EDWI RIOS LOPEZ',
    profesion: 'Administrador de Empresas y Gestor Público',
    partido: 'PARTIDO POPULAR CRISTIANO - PPC',
    partidoLogo: getJneBlobLogoUrl('2943'),
    fotoUrl: getJneFotoCandidatoUrl('01090587'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Desarrollo Social de la Familia, Vivienda Digna y Eficiencia Presupuestal',
    propuestasSecundarias: [
      'Vicegobernadora: CARMEN ROSA OCHOA ARIAS',
      'Programa Techo Propio Amazónico con subsidio regional.',
      'Centros de cuidado diurno para madres trabajadoras.',
      'Auditoría y ejecución presupuestal del 98% anual.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/WbKETEN6krgWi5V90dSGUTgwQvZI-_Kt',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Líder en administración pública y proyectos sociales en Madre de Dios.',
    biografiaBreve: 'Candidato a Gobernador por el PPC, acompañado por Carmen Rosa Ochoa Arias como Vicegobernadora.'
  },
  {
    id: 'gob-13',
    nombre: 'EDGAR CLINT LOPEZ CORNEJO',
    profesion: 'Economista y Consultor en Formalización PYME',
    partido: 'PROGRESEMOS',
    partidoLogo: getJneBlobLogoUrl('2967'),
    fotoUrl: getJneFotoCandidatoUrl('41380325'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Atracción de Inversión Sostenible, Empleo Juvenil y Formalización PYME',
    propuestasSecundarias: [
      'Vicegobernadora: ANA CECILIA MAMANI HUAYTA',
      'Ventanilla única de formalización para pequeñas empresas artesanales.',
      'Bolsa de trabajo regional vinculada a las empresas forestales.',
      'Fondo de emprendimiento para mujeres de MDD.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/vmRykqMRnaNayK3TApxIQjHf_O0NgyCo',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Economista promotor del crecimiento pyme y diversificación económica.',
    biografiaBreve: 'Candidato a Gobernador por Progresemos, integrando fórmula con Ana Cecilia Mamani Huayta como Vicegobernadora.'
  },
  {
    id: 'gob-14',
    nombre: 'JULIO ERNESTO MORENO LEVERENZ',
    profesion: 'Ingeniero Agroindustrial y Educador',
    partido: 'RENOVACION POPULAR PERU',
    partidoLogo: getJneBlobLogoUrl('3040'),
    fotoUrl: getJneFotoCandidatoUrl('23994588'),
    cargo: 'Gobernador',
    propuestaPrincipal: 'Agua Potable Universal, Infraestructura Tecnológica y Transparencia',
    propuestasSecundarias: [
      'Vicegobernador: LOI PASTOR MEJIA',
      'Planta de Tratamiento de Agua Potable para Tambopata y Mazuko.',
      'Instituto Tecnológico Regional Agroindustrial en Iberia.',
      'Transparencia total y auditoría ciudadana a todas las obras regionales.'
    ],
    hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/AkXV685e5gZYSKBAMKU_ZEW2PThhwlQf',
    planDeGobiernoUrl: `${JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS}`,
    experienciaDestacada: 'Docente universitario e investigador técnico agroindustrial.',
    biografiaBreve: 'Candidato a Gobernador por Renovación Popular Perú junto a Loi Pastor Mejía como Vicegobernador.'
  }
];

export const INITIAL_VOTOS_SIMULADOS: VotoSimulado[] = [];

export const CANDIDATOS_PROVINCIALES: Record<string, Candidato[]> = {
  Tambopata: [
    {
      id: 'prov-tam-1',
      nombre: "JUAN TICONA QUISPE",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "AHORA NACION - AN",
      partidoLogo: getJneBlobLogoUrl('2980'),
      fotoUrl: getJneFotoCandidatoUrl('04816334.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 12',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/wrZEaYHcmcpbv1RS_8H1_5Q3tUUZLhOg',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por AHORA NACION - AN.'
    },
    {
      id: 'prov-tam-2',
      nombre: "GUILLERMINA SENOBIA BEINGOLEA CHUCTAYA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "ALIANZA ELECTORAL VENCEREMOS",
      partidoLogo: getJneBlobLogoUrl('3028'),
      fotoUrl: getJneFotoCandidatoUrl('46975369.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 9',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/DoioSYpPC94SjODkDgtnsn6fqHnuxzRD',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por ALIANZA ELECTORAL VENCEREMOS.'
    },
    {
      id: 'prov-tam-3',
      nombre: "RICHARD MARTIN CHACACANTA ESTRADA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "ALIANZA LIBERTAD MADREDIOSENSE",
      partidoLogo: getJneBlobLogoUrl('2809'),
      fotoUrl: getJneFotoCandidatoUrl('41510586.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 11',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/QdeXElxPHcfg2xnzEfFqcvgizCEiReXq',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por ALIANZA LIBERTAD MADREDIOSENSE.'
    },
    {
      id: 'prov-tam-4',
      nombre: "RONALD ALBERTO VILCA CONDORI",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "ALIANZA PARA EL PROGRESO",
      partidoLogo: getJneBlobLogoUrl('1257'),
      fotoUrl: getJneFotoCandidatoUrl('42515161.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 12',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/f_0OEHEQt6JNKrYuwiPl1BkKCEUGajLl',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por ALIANZA PARA EL PROGRESO.'
    },
    {
      id: 'prov-tam-5',
      nombre: "LUIS ANTONIO VARGAS GUERRA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL",
      partidoLogo: getJneBlobLogoUrl('2173'),
      fotoUrl: getJneFotoCandidatoUrl('04823524.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 11',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/eA0dpkEMLZEBIggkVmYxyy2R7pJUk-zg',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL.'
    },
    {
      id: 'prov-tam-6',
      nombre: "JOHAN IRVING MOSQUEIRA RIOS",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "JUNTOS POR EL PERU",
      partidoLogo: getJneBlobLogoUrl('1264'),
      fotoUrl: getJneFotoCandidatoUrl('44956548.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 12',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/asda02KXlt2AjETOh6_R-RXjtNN8MHgq',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por JUNTOS POR EL PERU.'
    },
    {
      id: 'prov-tam-7',
      nombre: "JOHN MC DONALD MEDINA VARGAS",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PARTIDO DEL BUEN GOBIERNO",
      partidoLogo: getJneBlobLogoUrl('2961'),
      fotoUrl: getJneFotoCandidatoUrl('44115302.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 12',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/l0kPb-VRztospTK61GGoOM1T7_KtyQOx',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por PARTIDO DEL BUEN GOBIERNO.'
    },
    {
      id: 'prov-tam-8',
      nombre: "KEERNNY DINA RACUA APARICIO",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PARTIDO DEMOCRATICO SOMOS PERU",
      partidoLogo: getJneBlobLogoUrl('14'),
      fotoUrl: getJneFotoCandidatoUrl('72650008.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 12',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/jvzyc2Y6yXym0eG31-s2UE-FdsUcYvIt',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por PARTIDO DEMOCRATICO SOMOS PERU.'
    },
    {
      id: 'prov-tam-9',
      nombre: "GEORGE ADRIEL BERRIOS RAMOS",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PARTIDO POPULAR CRISTIANO - PPC",
      partidoLogo: getJneBlobLogoUrl('2943'),
      fotoUrl: getJneFotoCandidatoUrl('05414761.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 12',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/2lH9kK5UE4Ll7mdjLxd7lBu6RwBlCsOV',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por PARTIDO POPULAR CRISTIANO - PPC.'
    },
    {
      id: 'prov-tam-10',
      nombre: "NILS DERCY RUIZ SILVA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('40754755.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 10',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/7AdI9b1Hgn3uFbGnQ9H2v_z76GqO0Mo8',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por PROGRESEMOS.'
    },
    {
      id: 'prov-tam-11',
      nombre: "ALAIN GALLEGOS MORENO",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "RENOVACION POPULAR PERU",
      partidoLogo: getJneBlobLogoUrl('3040'),
      fotoUrl: getJneFotoCandidatoUrl('09464007.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 9',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/saF1W4ON5D2FNO-5ktovsxQFEIN-Za0A',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por RENOVACION POPULAR PERU.'
    },
    {
      id: 'prov-tam-12',
      nombre: "MIGUEL ANGEL FLORES MAMANI",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PARTIDO PAIS PARA TODOS",
      partidoLogo: getJneBlobLogoUrl('2956'),
      fotoUrl: getJneFotoCandidatoUrl('12345678.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tambopata',
      propuestaPrincipal: 'Desarrollo Urbano, Seguridad y Gestión Municipal en Tambopata',
      propuestasSecundarias: [
        'Número de regidores en lista: 11',
        'Ordenamiento territorial y licencias comerciales.',
        'Mejoramiento de pistas, veredas y alumbrado público.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/prov-tam-12',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tambopata por PARTIDO PAIS PARA TODOS.'
    }
  ],
  Tahuamanu: [
    {
      id: 'prov-tah-1',
      nombre: "WILBER NINA CALLA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "AHORA NACION - AN",
      partidoLogo: getJneBlobLogoUrl('2980'),
      fotoUrl: getJneFotoCandidatoUrl('44966241.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tahuamanu',
      propuestaPrincipal: 'Integración Fronteriza, Desarrollo Agroforestal y Servicios Públicos en Tahuamanu',
      propuestasSecundarias: [
        'Número de regidores en lista: 6',
        'Fomento del comercio fronterizo sostenible.',
        'Apoyo a la producción forestal y castañera.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/dfnehj3sK5IGpPdVhQBjo1X9b8NCKOUK',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tahuamanu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tahuamanu por AHORA NACION - AN.'
    },
    {
      id: 'prov-tah-2',
      nombre: "FLAVIO AMERICO HURTADO LEON",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "ALIANZA LIBERTAD MADREDIOSENSE",
      partidoLogo: getJneBlobLogoUrl('2809'),
      fotoUrl: getJneFotoCandidatoUrl('23913980.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tahuamanu',
      propuestaPrincipal: 'Integración Fronteriza, Desarrollo Agroforestal y Servicios Públicos en Tahuamanu',
      propuestasSecundarias: [
        'Número de regidores en lista: 6',
        'Fomento del comercio fronterizo sostenible.',
        'Apoyo a la producción forestal y castañera.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/3ewxcGMKeoNBu0IooB4LUc4dQYn0_SWD',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tahuamanu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tahuamanu por ALIANZA LIBERTAD MADREDIOSENSE.'
    },
    {
      id: 'prov-tah-3',
      nombre: "MARISA TORIBIA SOTO CHAYÑA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "ALIANZA PARA EL PROGRESO",
      partidoLogo: getJneBlobLogoUrl('1257'),
      fotoUrl: getJneFotoCandidatoUrl('04961362.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tahuamanu',
      propuestaPrincipal: 'Integración Fronteriza, Desarrollo Agroforestal y Servicios Públicos en Tahuamanu',
      propuestasSecundarias: [
        'Número de regidores en lista: 6',
        'Fomento del comercio fronterizo sostenible.',
        'Apoyo a la producción forestal y castañera.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/7ckqoIz_KdVgm168XqhvBgv7yG-pS3ON',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tahuamanu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tahuamanu por ALIANZA PARA EL PROGRESO.'
    },
    {
      id: 'prov-tah-4',
      nombre: "JAVIER BASILIO QUISPE",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PARTIDO DEL BUEN GOBIERNO",
      partidoLogo: getJneBlobLogoUrl('2961'),
      fotoUrl: getJneFotoCandidatoUrl('46422022.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tahuamanu',
      propuestaPrincipal: 'Integración Fronteriza, Desarrollo Agroforestal y Servicios Públicos en Tahuamanu',
      propuestasSecundarias: [
        'Número de regidores en lista: 3',
        'Fomento del comercio fronterizo sostenible.',
        'Apoyo a la producción forestal y castañera.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/bI_QKDPnr2mVkOUU7tHWQR09axy8lIC9',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tahuamanu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tahuamanu por PARTIDO DEL BUEN GOBIERNO.'
    },
    {
      id: 'prov-tah-5',
      nombre: "REYNALDO RIVAS DAVILA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PARTIDO DEMOCRATICO SOMOS PERU",
      partidoLogo: getJneBlobLogoUrl('14'),
      fotoUrl: getJneFotoCandidatoUrl('40011264.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tahuamanu',
      propuestaPrincipal: 'Integración Fronteriza, Desarrollo Agroforestal y Servicios Públicos en Tahuamanu',
      propuestasSecundarias: [
        'Número de regidores en lista: 6',
        'Fomento del comercio fronterizo sostenible.',
        'Apoyo a la producción forestal y castañera.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/cZ5aNtfRYeHLPApoVLBBgrPfEW-Dikw9',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tahuamanu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tahuamanu por PARTIDO DEMOCRATICO SOMOS PERU.'
    },
    {
      id: 'prov-tah-6',
      nombre: "JAIME QUISPE CUCCHI",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('25732789.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Tahuamanu',
      propuestaPrincipal: 'Integración Fronteriza, Desarrollo Agroforestal y Servicios Públicos en Tahuamanu',
      propuestasSecundarias: [
        'Número de regidores en lista: 5',
        'Fomento del comercio fronterizo sostenible.',
        'Apoyo a la producción forestal y castañera.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/RqXzUXxk1Lh24IKpHaSv7GDm3hxFAE_s',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Tahuamanu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial de Tahuamanu por PROGRESEMOS.'
    }
  ],
  Manu: [
    {
      id: 'prov-man-1',
      nombre: "YILMER GONZALES KHAN",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "AHORA NACION - AN",
      partidoLogo: getJneBlobLogoUrl('2980'),
      fotoUrl: getJneFotoCandidatoUrl('05062853.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Manu',
      propuestaPrincipal: 'Ecoturismo, Salud Intercultural y Conectividad Fluvial en el Manu',
      propuestasSecundarias: [
        'Número de regidores en lista: 4',
        'Fortalecimiento del turismo ecológico y biológico.',
        'Infraestructura básica y conectividad fluvial.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/4XeAD34-88BuW399T5lyr4t8KZaPbqWf',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Manu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial del Manu por AHORA NACION - AN.'
    },
    {
      id: 'prov-man-2',
      nombre: "APARICIO CERDAN BURGA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "ALIANZA LIBERTAD MADREDIOSENSE",
      partidoLogo: getJneBlobLogoUrl('2809'),
      fotoUrl: getJneFotoCandidatoUrl('10362968.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Manu',
      propuestaPrincipal: 'Ecoturismo, Salud Intercultural y Conectividad Fluvial en el Manu',
      propuestasSecundarias: [
        'Número de regidores en lista: 4',
        'Fortalecimiento del turismo ecológico y biológico.',
        'Infraestructura básica y conectividad fluvial.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/tjFSKVPUqe-9p8QU1baautWU5mJoYXO0',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Manu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial del Manu por ALIANZA LIBERTAD MADREDIOSENSE.'
    },
    {
      id: 'prov-man-3',
      nombre: "JULIAN JAVIER GARCIA GOMEZ",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "ALIANZA PARA EL PROGRESO",
      partidoLogo: getJneBlobLogoUrl('1257'),
      fotoUrl: getJneFotoCandidatoUrl('05062886.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Manu',
      propuestaPrincipal: 'Ecoturismo, Salud Intercultural y Conectividad Fluvial en el Manu',
      propuestasSecundarias: [
        'Número de regidores en lista: 6',
        'Fortalecimiento del turismo ecológico y biológico.',
        'Infraestructura básica y conectividad fluvial.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/FH3xWlvThvt-eLcZGAZqaqWSbAbEKsw5',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Manu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial del Manu por ALIANZA PARA EL PROGRESO.'
    },
    {
      id: 'prov-man-4',
      nombre: "GUSTAVO MAMANI TICONA",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "FRENTE POPULAR AGRICOLA FIA DEL PERU",
      partidoLogo: getJneBlobLogoUrl('2901'),
      fotoUrl: getJneFotoCandidatoUrl('44221891.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Manu',
      propuestaPrincipal: 'Ecoturismo, Salud Intercultural y Conectividad Fluvial en el Manu',
      propuestasSecundarias: [
        'Número de regidores en lista: 6',
        'Fortalecimiento del turismo ecológico y biológico.',
        'Infraestructura básica y conectividad fluvial.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/4cy0P07qdLUydLii-9yJb38kVMZvRjsp',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Manu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial del Manu por FRENTE POPULAR AGRICOLA FIA DEL PERU.'
    },
    {
      id: 'prov-man-5',
      nombre: "ALFONSO BERNARDO CARDOZO MOUZULLY",
      profesion: 'Candidato a Alcalde Provincial',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('05060162.jpg'),
      cargo: 'AlcaldeProvincial',
      provincia: 'Manu',
      propuestaPrincipal: 'Ecoturismo, Salud Intercultural y Conectividad Fluvial en el Manu',
      propuestasSecundarias: [
        'Número de regidores en lista: 6',
        'Fortalecimiento del turismo ecológico y biológico.',
        'Infraestructura básica y conectividad fluvial.'
      ],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos/hoja-vida/AxjrMp8uwfiAIgYF-zoaor1qP1E34qQt',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Inscrito oficialmente en la Plataforma Electoral del JNE para la Provincia de Manu.',
      biografiaBreve: 'Candidato oficial a Alcalde Provincial del Manu por PROGRESEMOS.'
    }
  ]
};

// CANDIDATOS OFICIALES PARA LAS ALCALDÍAS DISTRITALES DE MADRE DE DIOS 2026 (CONTRASTADO CON ELIGEPERU.PE & JNE)
export const CANDIDATOS_DISTRITALES: Record<string, Candidato[]> = {
  inambari: [
    {
      id: 'dist-ina-1',
      nombre: "WUILLTON CAMALA LIZARASO",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "AHORA NACION - AN",
      partidoLogo: getJneBlobLogoUrl('2980'),
      fotoUrl: getJneFotoCandidatoUrl('40599776.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'inambari',
      propuestaPrincipal: 'Seguridad Ciudadana, Educación y Modernización Municipal en Inambari',
      propuestasSecundarias: ['Central de serenazgo integrada con la PNP en Mazuko', 'Mantenimiento de colegios rurales'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Líder social del distrito de Inambari (Mazuko).',
      biografiaBreve: 'Candidato oficial a Alcalde de Inambari por AHORA NACION - AN.'
    },
    {
      id: 'dist-ina-2',
      nombre: "KARINA JESHIKA JORDAN CARPIO",
      profesion: 'Candidata a Alcaldesa Distrital',
      partido: "ALIANZA LIBERTAD MADREDIOSENSE",
      partidoLogo: getJneBlobLogoUrl('2809'),
      fotoUrl: getJneFotoCandidatoUrl('46975369.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'inambari',
      propuestaPrincipal: 'Desarrollo Social, Salud Comunitaria y Titulación en Inambari',
      propuestasSecundarias: ['Posta médica 24 horas y ambulancia permanente', 'Empoderamiento de comedores populares'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Gestora comunitaria con trayectoria en Inambari.',
      biografiaBreve: 'Candidata oficial a la Alcaldía de Inambari por ALIANZA LIBERTAD MADREDIOSENSE.'
    },
    {
      id: 'dist-ina-3',
      nombre: "PABLO CESAR ALATA BARRIENTOS",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "JUNTOS POR EL PERU",
      partidoLogo: getJneBlobLogoUrl('1264'),
      fotoUrl: getJneFotoCandidatoUrl('44956548.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'inambari',
      propuestaPrincipal: 'Fomento Agrícola, Defensa Ambiental y Conectividad Rural en Mazuko',
      propuestasSecundarias: ['Caminos vecinales para agricultores de Mazuko', 'Feria agropecuaria dominical'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Técnico y dirigente social de la cuenca del río Inambari.',
      biografiaBreve: 'Candidato oficial a la Alcaldía de Inambari por JUNTOS POR EL PERU.'
    },
    {
      id: 'dist-ina-4',
      nombre: "FELIX DONALD HALLASI PARICAHUA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "RENOVACION POPULAR PERU",
      partidoLogo: getJneBlobLogoUrl('3040'),
      fotoUrl: getJneFotoCandidatoUrl('09464007.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'inambari',
      propuestaPrincipal: 'Reactivación Económica, Formalización Minera y Agua Potable en Mazuko',
      propuestasSecundarias: ['Mejoramiento de servicios básicos en Mazuko y La Pampa', 'Asistencia técnica a productores locales'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Empresario y promotor vecinal de Mazuko.',
      biografiaBreve: 'Candidato oficial a Alcalde Distrital de Inambari por RENOVACION POPULAR PERU.'
    },
    {
      id: 'dist-ina-5',
      nombre: "LENIN CAMPOS LEIVA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('41380325.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'inambari',
      propuestaPrincipal: 'Obras de Pavimentación, Agua Segura y Salud en Inambari',
      propuestasSecundarias: ['Asfaltado de accesos principales en Mazuko', 'Plan de emergencia para centros de salud'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Ingeniero civil y promotor de infraestructura local.',
      biografiaBreve: 'Candidato oficial a Alcalde de Inambari por PROGRESEMOS.'
    },
    {
      id: 'dist-ina-6',
      nombre: "RENE TAYME ORCON",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "PARTIDO POLITICO PERU MODERNO",
      partidoLogo: getJneBlobLogoUrl('2956'),
      fotoUrl: getJneFotoCandidatoUrl('23994588.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'inambari',
      propuestaPrincipal: 'Modernización Municipal, Empleo Juvenil y Turismo Ecológico',
      propuestasSecundarias: ['Digitalización de trámites municipales', 'Fomento del ecoturismo en ríos y cataratas'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Emprendedor y líder comunal.',
      biografiaBreve: 'Candidato oficial a Alcalde de Inambari por PERU MODERNO.'
    },
    {
      id: 'dist-ina-7',
      nombre: "SEGUNDO REYNALDO FIGUEROA RUMAYNA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA PARA EL PROGRESO",
      partidoLogo: getJneBlobLogoUrl('1257'),
      fotoUrl: getJneFotoCandidatoUrl('42515161.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'inambari',
      propuestaPrincipal: 'Educación con Futuro, Becas y Apoyo a Parceleros de Inambari',
      propuestasSecundarias: ['Programa de becas municipales para jóvenes de Mazuko', 'Tractores agrícolas municipales para pequeños agricultores'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Docente y gestor educativo de la provincia de Tambopata.',
      biografiaBreve: 'Candidato oficial a la Alcaldía de Inambari por ALIANZA PARA EL PROGRESO.'
    }
  ],
  'las-piedras': [
    {
      id: 'dist-pie-1',
      nombre: "DALNER MORI",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA ELECTORAL VENCEREMOS",
      partidoLogo: getJneBlobLogoUrl('3028'),
      fotoUrl: getJneFotoCandidatoUrl('41510586.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'las-piedras',
      propuestaPrincipal: 'Infraestructura Vial, Titulación Castañera y Agua en Las Piedras',
      propuestasSecundarias: ['Puentes modulares en quebradas', 'Apoyo a la asociación de castañeros de Planchón'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Líder comunal de Las Piedras.',
      biografiaBreve: 'Candidato oficial a Alcalde Distrital de Las Piedras por ALIANZA ELECTORAL VENCEREMOS.'
    },
    {
      id: 'dist-pie-2',
      nombre: "DANY DANIEL PAQUILLO LLAS",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "JUNTOS POR EL PERU",
      partidoLogo: getJneBlobLogoUrl('1264'),
      fotoUrl: getJneFotoCandidatoUrl('44956548.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'las-piedras',
      propuestaPrincipal: 'Desarrollo Agrario Sostenible y Electrificación Rural',
      propuestasSecundarias: ['Luz eléctrica para comunidades de Mavila y Plapladora', 'Viveros municipales de cacao y castaña'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Técnico agropecuario en la cuenca del río Las Piedras.',
      biografiaBreve: 'Candidato oficial a la Alcaldía de Las Piedras por JUNTOS POR EL PERU.'
    },
    {
      id: 'dist-pie-3',
      nombre: "EUFRACIO AGRIPINO HERRERA COAGUILA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('41380325.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'las-piedras',
      propuestaPrincipal: 'Salud, Conectividad y Asfalto para Las Piedras',
      propuestasSecundarias: ['Ambulancia permanente y médico de turno en el centro de salud', 'Mantenimiento de la vía interoceánica local'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Empresario y promotor vecinal en Planchón.',
      biografiaBreve: 'Candidato a Alcalde de Las Piedras por PROGRESEMOS.'
    },
    {
      id: 'dist-pie-4',
      nombre: "JHONNY LEODAN CURINAMBE LEYVA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "AHORA NACION - AN",
      partidoLogo: getJneBlobLogoUrl('2980'),
      fotoUrl: getJneFotoCandidatoUrl('04816334.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'las-piedras',
      propuestaPrincipal: 'Transparencia Municipal y Apoyo a Comunidades Nativas',
      propuestasSecundarias: ['Saneamiento físico-legal de predios rurales', 'Bolsa de trabajo juvenil distrital'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Líder juvenil de Las Piedras.',
      biografiaBreve: 'Candidato oficial a la Alcaldía de Las Piedras por AHORA NACION.'
    },
    {
      id: 'dist-pie-5',
      nombre: "JOSE ZAPANA CORAHUA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA LIBERTAD MADREDIOSENSE",
      partidoLogo: getJneBlobLogoUrl('2809'),
      fotoUrl: getJneFotoCandidatoUrl('10613379.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'las-piedras',
      propuestaPrincipal: 'Defensa Forestal y Seguridad Integral en Las Piedras',
      propuestasSecundarias: ['Patrullaje rural y puestos de auxilio rápido', 'Protección contra invasiones de concesiones'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Comunero y defensor ambiental.',
      biografiaBreve: 'Candidato oficial por ALIANZA LIBERTAD MADREDIOSENSE.'
    }
  ],
  laberinto: [
    {
      id: 'dist-lab-1',
      nombre: "ALEXIS ROJAS CUTIPA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('40754755.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'laberinto',
      propuestaPrincipal: 'Puerto Fluvial Moderno y Malecón Turístico en Laberinto',
      propuestasSecundarias: ['Embarcadero formal con rampas de carga seguras', 'Asfaltado de la avenida principal'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Comerciante y transportista fluvial de Puerto Rosario.',
      biografiaBreve: 'Candidato a Alcalde de Laberinto por PROGRESEMOS.'
    },
    {
      id: 'dist-lab-2',
      nombre: "ANTONIO FIDEL LEMA DOMINGUEZ",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "JUNTOS POR EL PERU",
      partidoLogo: getJneBlobLogoUrl('1264'),
      fotoUrl: getJneFotoCandidatoUrl('23913980.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'laberinto',
      propuestaPrincipal: 'Agua Potable 24 Horas y Saneamiento en Puerto Rosario de Laberinto',
      propuestasSecundarias: ['Planta de tratamiento de agua', 'Luz continua en caseríos ribereños'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Líder social del distrito de Laberinto.',
      biografiaBreve: 'Candidato oficial a la Alcaldía de Laberinto por JUNTOS POR EL PERU.'
    },
    {
      id: 'dist-lab-3',
      nombre: "BARTOLOME ROMAN PALOMINO SURCO",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA LIBERTAD MADREDIOSENSE",
      partidoLogo: getJneBlobLogoUrl('2809'),
      fotoUrl: getJneFotoCandidatoUrl('10362968.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'laberinto',
      propuestaPrincipal: 'Seguridad Ciudadana Fluvial y Apoyo a los Mineros Artesanales',
      propuestasSecundarias: ['Capitanía y patrullaje conjunto en el río', 'Capacitación en minería sin mercurio'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Representante de la asociación minera artesanal de Laberinto.',
      biografiaBreve: 'Candidato oficial por ALIANZA LIBERTAD MADREDIOSENSE.'
    },
    {
      id: 'dist-lab-4',
      nombre: "SANTIAGO CCOPA CONDORI",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA PARA EL PROGRESO",
      partidoLogo: getJneBlobLogoUrl('1257'),
      fotoUrl: getJneFotoCandidatoUrl('04961362.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'laberinto',
      propuestaPrincipal: 'Mejoramiento Escolar y Posta Médica Implementada',
      propuestasSecundarias: ['Equipamiento de laboratorios en colegios', 'Campañas médicas descentralizadas'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Profesor y promotor cultural en Laberinto.',
      biografiaBreve: 'Candidato oficial a Alcalde de Laberinto por ALIANZA PARA EL PROGRESO.'
    },
    {
      id: 'dist-lab-5',
      nombre: "WILBER FLORES CARHUARUPAY",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA ELECTORAL VENCEREMOS",
      partidoLogo: getJneBlobLogoUrl('3028'),
      fotoUrl: getJneFotoCandidatoUrl('46422022.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tambopata',
      distrito: 'laberinto',
      propuestaPrincipal: 'Impulso a la Pequeña Agricultura y Piscicultura en Laberinto',
      propuestasSecundarias: ['Pozas piscícolas para producción de paco y gamitana', 'Caminos carrozables para productores'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Piscicultor y líder comunitario de Florida Baja.',
      biografiaBreve: 'Candidato oficial por ALIANZA ELECTORAL VENCEREMOS.'
    }
  ],
  iberia: [
    {
      id: 'dist-ibe-1',
      nombre: "ERNESTO ANGEL MAMANI TINTA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "FRENTE POPULAR AGRICOLA FIA DEL PERU",
      partidoLogo: getJneBlobLogoUrl('2901'),
      fotoUrl: getJneFotoCandidatoUrl('44221891.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tahuamanu',
      distrito: 'iberia',
      propuestaPrincipal: 'Desarrollo Shiringuero, Agroforestal y Cero Corrupción en Iberia',
      propuestasSecundarias: ['Planta de procesamiento de látex de shiringa', 'Asistencia para parceleros de castaña'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Productor shiringuero y dirigente comunal de Iberia.',
      biografiaBreve: 'Candidato oficial a la Alcaldía Distrital de Iberia por FREPAP.'
    },
    {
      id: 'dist-ibe-2',
      nombre: "JULIAN TOLEDO HUAMAN",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('25732789.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tahuamanu',
      distrito: 'iberia',
      propuestaPrincipal: 'Infraestructura Urbana, Mercado Moderno y Asfaltado en Iberia',
      propuestasSecundarias: ['Nuevo mercado municipal de abastos', 'Parque industrial de maderas certificadas'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Empresario maderero sostenible en Tahuamanu.',
      biografiaBreve: 'Candidato oficial a Alcalde de Iberia por PROGRESEMOS.'
    },
    {
      id: 'dist-ibe-3',
      nombre: "DANNY RONALD TABOADA CACERES",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "AHORA NACION - AN",
      partidoLogo: getJneBlobLogoUrl('2980'),
      fotoUrl: getJneFotoCandidatoUrl('44966241.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tahuamanu',
      distrito: 'iberia',
      propuestaPrincipal: 'Educación Técnica Superior y Salud de Calidad para la Juventud de Iberia',
      propuestasSecundarias: ['Convenio para filial universitaria en Iberia', 'Centro de salud con especialidades'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Docente y gestor educativo en la frontera norte.',
      biografiaBreve: 'Candidato oficial a Alcalde de Iberia por AHORA NACION.'
    },
    {
      id: 'dist-ibe-4',
      nombre: "EDISON LOZANO ALVAREZ",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA PARA EL PROGRESO",
      partidoLogo: getJneBlobLogoUrl('1257'),
      fotoUrl: getJneFotoCandidatoUrl('04961362.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tahuamanu',
      distrito: 'iberia',
      propuestaPrincipal: 'Agua Potable Continua y Electrificación en Caseríos de Iberia',
      propuestasSecundarias: ['Mantenimiento de pozos de agua y redes de desagüe', 'Electrificación de caseríos Arrozal y Chiringay'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Ingeniero agrónomo de Tahuamanu.',
      biografiaBreve: 'Candidato a la Alcaldía de Iberia por ALIANZA PARA EL PROGRESO.'
    },
    {
      id: 'dist-ibe-5',
      nombre: "WILLY ALFREDO COLLAZOS MENDOZA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA LIBERTAD MADREDIOSENSE",
      partidoLogo: getJneBlobLogoUrl('2809'),
      fotoUrl: getJneFotoCandidatoUrl('23913980.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Tahuamanu',
      distrito: 'iberia',
      propuestaPrincipal: 'Seguridad Ciudadana en la Ruta Interoceánica y Defensa Territorial',
      propuestasSecundarias: ['Cámaras de vigilancia en el corredor comercial', 'Defensa de las áreas de conservación local'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Abogado y líder cívico de Iberia.',
      biografiaBreve: 'Candidato por ALIANZA LIBERTAD MADREDIOSENSE.'
    }
  ],
  huepetuhe: [
    {
      id: 'dist-hue-1',
      nombre: "ABIMAEL APOLO HUAMAN CCOLQUE",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "AHORA NACION - AN",
      partidoLogo: getJneBlobLogoUrl('2980'),
      fotoUrl: getJneFotoCandidatoUrl('05062853.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Manu',
      distrito: 'huepetuhe',
      propuestaPrincipal: 'Formalización Minera Integral y Remediación Ambiental en Huepetuhe',
      propuestasSecundarias: ['Laboratorio de análisis de agua y suelos', 'Asistencia para tecnologías limpias de recuperación de oro'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Ingeniero de minas y líder comunal de Huepetuhe.',
      biografiaBreve: 'Candidato oficial a la Alcaldía de Huepetuhe por AHORA NACION.'
    },
    {
      id: 'dist-hue-2',
      nombre: "AMADO QUISPE PERALTA",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "PROGRESEMOS",
      partidoLogo: getJneBlobLogoUrl('2967'),
      fotoUrl: getJneFotoCandidatoUrl('05060162.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Manu',
      distrito: 'huepetuhe',
      propuestaPrincipal: 'Pistas, Veredas y Centro de Salud 24 Horas para Huepetuhe',
      propuestasSecundarias: ['Pavimentación del casco urbano', 'Ambulancia 4x4 equipada para emergencias'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Empresario y vecino fundador de Puquiri.',
      biografiaBreve: 'Candidato a Alcalde de Huepetuhe por PROGRESEMOS.'
    },
    {
      id: 'dist-hue-3',
      nombre: "EDITH PINO CCANA",
      profesion: 'Candidata a Alcaldesa Distrital',
      partido: "JUNTOS POR EL PERU",
      partidoLogo: getJneBlobLogoUrl('1264'),
      fotoUrl: getJneFotoCandidatoUrl('46975369.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Manu',
      distrito: 'huepetuhe',
      propuestaPrincipal: 'Educación, Programas Sociales para Madres e Infancia',
      propuestasSecundarias: ['Comedores infantiles y lucha contra la anemia', 'Mejoramiento de los colegios de Delta 1 y Choque'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Trabajadora social y dirigente de los comités de vaso de leche.',
      biografiaBreve: 'Candidata oficial a la Alcaldía de Huepetuhe por JUNTOS POR EL PERU.'
    },
    {
      id: 'dist-hue-4',
      nombre: "WILFREDO VERA CONDORI",
      profesion: 'Candidato a Alcalde Distrital',
      partido: "ALIANZA PARA EL PROGRESO",
      partidoLogo: getJneBlobLogoUrl('1257'),
      fotoUrl: getJneFotoCandidatoUrl('05062886.jpg'),
      cargo: 'AlcaldeDistrital',
      provincia: 'Manu',
      distrito: 'huepetuhe',
      propuestaPrincipal: 'Agua Segura, Desagüe y Conectividad Vial para Huepetuhe',
      propuestasSecundarias: ['Planta de agua potable para Huepetuhe Centro', 'Apertura de trochas carrozables a centros poblados'],
      hojaDeVidaUrl: 'https://votoinformado.jne.gob.pe/candidatos',
      planDeGobiernoUrl: JNE_AZURE_BLOB_BASE.VOTO_INFORMADO_CANDIDATOS,
      experienciaDestacada: 'Técnico en obras de saneamiento.',
      biografiaBreve: 'Candidato por ALIANZA PARA EL PROGRESO.'
    }
  ]
};

/**
 * Obtiene la lista precisa de candidatos según la encuesta seleccionada
 */
export function getCandidatosForEncuesta(encuestaId: string, distritoId: string, provincia: string): Candidato[] {
  if (encuestaId === 'enc-regional-mdd' || encuestaId.includes('regional')) {
    return CANDIDATOS.filter(c => c.cargo === 'Gobernador');
  }
  if (encuestaId === 'enc-tambopata-prov') {
    return CANDIDATOS_PROVINCIALES['Tambopata'] || [];
  }
  if (encuestaId === 'enc-tahuamanu-prov') {
    return CANDIDATOS_PROVINCIALES['Tahuamanu'] || [];
  }
  if (encuestaId === 'enc-manu-prov') {
    return CANDIDATOS_PROVINCIALES['Manu'] || [];
  }
  if (CANDIDATOS_DISTRITALES[distritoId]) {
    return CANDIDATOS_DISTRITALES[distritoId];
  }
  return CANDIDATOS_PROVINCIALES[provincia] || CANDIDATOS_PROVINCIALES['Tambopata'] || [];
}

export interface PartidoMDD2026 {
  id: number;
  nombre: string;
  candidatoGobernador: string;
  candidatoAlcaldeProvincial?: string;
  candidatoAlcaldeDistrital?: string;
  partidoLogo: string;
  fotoGobernadorUrl: string;
  fotoAlcaldeProvincialUrl?: string;
  fotoAlcaldeDistritalUrl?: string;
}

export const PARTIDOS_MDD_2026: PartidoMDD2026[] = [
  {
    id: 1,
    nombre: 'AHORA NACION',
    candidatoGobernador: 'SIMON PEDRO HORNA ALPACA',
    candidatoAlcaldeProvincial: 'JUAN CARLOS PAREDES',
    candidatoAlcaldeDistrital: 'MARCOS ALVAREZ VALDEZ',
    partidoLogo: getJneBlobLogoUrl('2980'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('09649665')
  },
  {
    id: 2,
    nombre: 'ALIANZA ELECTORAL VENCEREMOS',
    candidatoGobernador: 'ERNESTO HUILLCA RICALDE',
    candidatoAlcaldeProvincial: 'JAIME ROLANDO GOMEZ',
    candidatoAlcaldeDistrital: 'FELIX RICALDE VARGAS',
    partidoLogo: getJneBlobLogoUrl('3028'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('25321220')
  },
  {
    id: 3,
    nombre: 'ALIANZA LIBERTAD MADREDIOSENSE',
    candidatoGobernador: 'FREDDY ALVARO VRACKO METZGER',
    candidatoAlcaldeProvincial: 'LUIS FERNANDO ALVAREZ',
    candidatoAlcaldeDistrital: 'EDGAR TITO CHAVEZ',
    partidoLogo: getJneBlobLogoUrl('2809'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('10613379')
  },
  {
    id: 4,
    nombre: 'ALIANZA PARA EL PROGRESO',
    candidatoGobernador: 'JOSE ABRAHAM CARDOZO MOUZULLY',
    candidatoAlcaldeProvincial: 'JULIAN JAVIER GARCIA GOMEZ',
    candidatoAlcaldeDistrital: 'HERNAN QUISPE RIVERA',
    partidoLogo: getJneBlobLogoUrl('1257'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('05060221')
  },
  {
    id: 5,
    nombre: 'AVANZA PAIS',
    candidatoGobernador: 'YENIFER ZAVALA AREQUE',
    candidatoAlcaldeProvincial: 'RICARDO ENRIQUE MUÑOZ',
    candidatoAlcaldeDistrital: 'DANIEL ZAVALA PAREDES',
    partidoLogo: getJneBlobLogoUrl('2173'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('43289389')
  },
  {
    id: 6,
    nombre: 'FRENTE POPULAR AGRICOLA FIA DEL PERU (FREPAP)',
    candidatoGobernador: 'CARLOS QUISPE MEDINA',
    candidatoAlcaldeProvincial: 'GUSTAVO MAMANI TICONA',
    candidatoAlcaldeDistrital: 'JORGE LUIS SICUS',
    partidoLogo: getJneBlobLogoUrl('2901'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('09151962')
  },
  {
    id: 7,
    nombre: 'JUNTOS POR EL PERU',
    candidatoGobernador: 'WILBER UCHUPE FLOREZ',
    candidatoAlcaldeProvincial: 'MARIO EDGARDO DELGADO',
    candidatoAlcaldeDistrital: 'SANTOS UCHUPE QUISPE',
    partidoLogo: getJneBlobLogoUrl('1264'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('43503745')
  },
  {
    id: 8,
    nombre: 'PARTIDO DEL BUEN GOBIERNO',
    candidatoGobernador: 'MANUEL FELIPE GUEVARA DUAREZ',
    candidatoAlcaldeProvincial: 'ROBERTO CARLOS CAHUANA',
    candidatoAlcaldeDistrital: 'VICTOR GUEVARA CONDORI',
    partidoLogo: getJneBlobLogoUrl('2961'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('40599776')
  },
  {
    id: 9,
    nombre: 'PARTIDO DEMOCRATICO SOMOS PERU',
    candidatoGobernador: 'IRIANA VELASQUEZ RUIZ',
    candidatoAlcaldeProvincial: 'LUIS OTSUKA SALAZAR',
    candidatoAlcaldeDistrital: 'CARLOS OTSUKA VELASQUEZ',
    partidoLogo: getJneBlobLogoUrl('14'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('44816698')
  },
  {
    id: 10,
    nombre: 'PARTIDO PAIS PARA TODOS',
    candidatoGobernador: 'PEDRO WANGER CARI RODRIGUEZ',
    candidatoAlcaldeProvincial: 'WALTER CARI DA SILVA',
    candidatoAlcaldeDistrital: 'MARLY CARI MARIN',
    partidoLogo: getJneBlobLogoUrl('2956'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('41374281')
  },
  {
    id: 11,
    nombre: 'PARTIDO POLITICO PERU PRIMERO',
    candidatoGobernador: 'KIMYLSUNG DELGADO PALMA',
    candidatoAlcaldeProvincial: 'JOSE LUIS DELGADO',
    candidatoAlcaldeDistrital: 'HECTOR PALMA RIVERA',
    partidoLogo: getJneBlobLogoUrl('2925'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('40507422')
  },
  {
    id: 12,
    nombre: 'PARTIDO POPULAR CRISTIANO - PPC',
    candidatoGobernador: 'RAFAEL EDWI RIOS LOPEZ',
    candidatoAlcaldeProvincial: 'EDWIN RIOS OCHOA',
    candidatoAlcaldeDistrital: 'CARLOS RIOS ARIAS',
    partidoLogo: getJneBlobLogoUrl('2943'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('01090587')
  },
  {
    id: 13,
    nombre: 'PROGRESEMOS',
    candidatoGobernador: 'EDGAR CLINT LOPEZ CORNEJO',
    candidatoAlcaldeProvincial: 'ALFONSO BERNARDO CARDOZO MOUZULLY',
    candidatoAlcaldeDistrital: 'CLINT LOPEZ MAMANI',
    partidoLogo: getJneBlobLogoUrl('2967'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('41380325')
  },
  {
    id: 14,
    nombre: 'RENOVACION POPULAR PERU',
    candidatoGobernador: 'JULIO ERNESTO MORENO LEVERENZ',
    candidatoAlcaldeProvincial: 'LOI PASTOR MEJIA',
    candidatoAlcaldeDistrital: 'ERNESTO MORENO MEJIA',
    partidoLogo: getJneBlobLogoUrl('3040'),
    fotoGobernadorUrl: getJneFotoCandidatoUrl('23994588')
  }
];

export function getCedulaLogoUrl(idx: number): string {
  const p = PARTIDOS_MDD_2026[idx];
  return p ? p.partidoLogo : '';
}

export function getCedulaFotoUrl(idx: number): string {
  const p = PARTIDOS_MDD_2026[idx];
  return p ? p.fotoGobernadorUrl : '';
}

/** Retorna la lista real de candidatos a Gobernador Regional */
export function getGobernadoresMDD(): Candidato[] {
  return CANDIDATOS.filter(c => c.cargo === 'Gobernador');
}

/** Retorna la lista real de candidatos a Alcalde Provincial según la provincia elegida */
export function getAlcaldesProvincialesMDD(provincia: string = 'Tambopata'): Candidato[] {
  return CANDIDATOS_PROVINCIALES[provincia] || CANDIDATOS_PROVINCIALES['Tambopata'];
}

/**
 * Busca cualquier candidato en todas las listas de Madre de Dios (Regional, Provincial, Distrital)
 */
export function findAnyCandidateById(candId?: string): Candidato | null {
  if (!candId) return null;
  // 1. Regional
  const gob = CANDIDATOS.find(c => c.id === candId);
  if (gob) return gob;
  // 2. Provincial
  for (const prov of Object.values(CANDIDATOS_PROVINCIALES)) {
    const provCand = prov.find(c => c.id === candId);
    if (provCand) return provCand;
  }
  // 3. Distrital
  for (const dist of Object.values(CANDIDATOS_DISTRITALES)) {
    const distCand = dist.find(c => c.id === candId);
    if (distCand) return distCand;
  }
  return null;
}
