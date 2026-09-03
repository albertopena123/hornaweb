import type { VotoSimulado } from '../types';

export interface VoteLockRecord {
  voteId: string;
  timestamp: number; // Unix timestamp ms
  expiresAt: number; // Unix timestamp ms (timestamp + 24h)
  ip: string;
  fingerprint: string;
  distrito: string;
  provincia: string;
  candidatoGobernadorId: string;
  candidatoAlcaldeId?: string;
  receiptNumber: string;
}

export interface VoteLockStatus {
  isLocked: boolean;
  remainingSeconds: number;
  remainingFormatted: string;
  record: VoteLockRecord | null;
  clientIp: string;
}

let cachedClientIp: string = '190.235.14.88';
let cachedVisitorId: string = '';

export function getDeviceFingerprintSync(): string {
  if (cachedVisitorId) return cachedVisitorId;
  if (typeof window === 'undefined') return 'FP-SERVER';
  try {
    const screenDetails = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const navDetails = `${navigator.userAgent}-${navigator.language}-${new Date().getTimezoneOffset()}`;
    let hash = 0;
    const str = `${screenDetails}|${navDetails}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    cachedVisitorId = `FP-${Math.abs(hash).toString(16).toUpperCase()}`;
    return cachedVisitorId;
  } catch {
    return `FP-${Date.now().toString(36)}`;
  }
}

export function getDeviceFingerprint(): string {
  return cachedVisitorId || getDeviceFingerprintSync();
}

export async function fetchClientIp(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.ip) {
        cachedClientIp = data.ip;
        return data.ip;
      }
    }
  } catch {
    // fallback
  }
  return cachedClientIp;
}

if (typeof window !== 'undefined') {
  fetchClientIp().catch(() => {});
}

export function formatTimeRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0h 0m 0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function getVoteLockStatus(_scope: string = 'regional'): VoteLockStatus {
  return {
    isLocked: false,
    remainingSeconds: 0,
    remainingFormatted: '0h 0m 0s',
    record: null,
    clientIp: cachedClientIp
  };
}

export function recordUserVote(voto: VotoSimulado, clientIp?: string, _scope: string = 'regional'): VoteLockRecord {
  const now = Date.now();
  const cooldownHours = 24;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const expiresAt = now + cooldownMs;
  const ip = clientIp || cachedClientIp;
  const fingerprint = getDeviceFingerprint();
  const receiptNumber = `ACTA-MDD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    voteId: voto.id,
    timestamp: now,
    expiresAt,
    ip,
    fingerprint,
    distrito: voto.distrito,
    provincia: voto.provincia,
    candidatoGobernadorId: voto.candidatoGobernadorId,
    candidatoAlcaldeId: voto.candidatoAlcaldeId,
    receiptNumber
  };
}

export interface DualVoteLockStatus {
  regional: VoteLockStatus;
  provincial: VoteLockStatus;
  bothLocked: boolean;
}

export async function checkDualServerVoteLock(): Promise<DualVoteLockStatus> {
  const defStatus = (): VoteLockStatus => ({
    isLocked: false,
    remainingSeconds: 0,
    remainingFormatted: '0h 0m 0s',
    record: null,
    clientIp: cachedClientIp
  });

  return {
    regional: defStatus(),
    provincial: defStatus(),
    bothLocked: false
  };
}

export function clearVoteLock(_scope?: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('voto_informado_mdd_lock_v2');
      localStorage.removeItem('voto_informado_mdd_vote_lock');
      localStorage.removeItem('voto_mdd_lock_regional');
      localStorage.removeItem('voto_mdd_lock_tambopata');
      localStorage.removeItem('voto_mdd_user_receipts');
    }
  } catch {}
}
