export type CargoElectoral = 'Gobernador' | 'AlcaldeProvincial' | 'AlcaldeDistrital';

export interface Candidato {
  id: string;
  nombre: string;
  profesion: string;
  partido: string;
  partidoLogo: string;
  fotoUrl: string;
  cargo: CargoElectoral;
  provincia?: string;
  distrito?: string;
  propuestaPrincipal: string;
  propuestasSecundarias: string[];
  hojaDeVidaUrl: string;
  planDeGobiernoUrl: string;
  experienciaDestacada: string;
  biografiaBreve: string;
}

export interface DistritoMDD {
  id: string;
  nombre: string;
  provincia: 'Tambopata' | 'Tahuamanu' | 'Manu';
  lat: number;
  lng: number;
  poblacionElectoralAprox: number;
  centrosPoblados: string[];
}

export interface VotoSimulado {
  id: string;
  timestamp: string;
  provincia: string;
  distrito: string;
  sectorOBarrio: string;
  lat: number;
  lng: number;
  precisionGPS?: number;
  candidatoGobernadorId: string;
  candidatoAlcaldeId?: string;
  rangoEdad: '18-25' | '26-40' | '41-60' | '60+';
  edad?: number;
  sexo?: 'Masculino' | 'Femenino' | 'Otro' | string;
  temaPrioritario: 'Salud' | 'Mineria Formal' | 'Carreteras/Conectividad' | 'Seguridad' | 'Educación' | 'Medio Ambiente/Turismo';
}

export interface EstadisticaZona {
  distritoId: string;
  nombreDistrito: string;
  provincia: string;
  totalVotos: number;
  porcentajeParticipacion: number;
  candidatoLiderGobernador: string;
  votosGobernador: Record<string, number>;
}
