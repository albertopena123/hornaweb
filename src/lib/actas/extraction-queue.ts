/**
 * Limita cuántas extracciones de acta con IA (spawns del CLI de Claude o
 * llamadas a la API) corren en paralelo en este proceso de Node.
 *
 * Sin este límite, una ráfaga de personeros usando "Analizar con IA" al
 * mismo tiempo (hasta ~120 llamadas posibles la noche de la elección, con
 * 62 personeros activos x 2 actas cada uno) saturaría la VM y aumentaría la
 * chance de que cada llamada individual choque contra CLI_TIMEOUT_MS.
 *
 * Es un semáforo simple en memoria (no una cola distribuida): alcanza porque
 * el despliegue actual corre un solo proceso Next.js (ver deploy-to-server.py).
 */

const MAX_CONCURRENT = Math.max(1, Number(process.env.ACTA_IA_CONCURRENCY || 2));
const MAX_QUEUE_LENGTH = Math.max(1, Number(process.env.ACTA_IA_MAX_QUEUE || 20));

export class QueueFullError extends Error {}

let active = 0;
const waiting: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  if (waiting.length >= MAX_QUEUE_LENGTH) {
    throw new QueueFullError(
      `Hay demasiadas actas procesándose con IA en este momento (${active} en curso, ${waiting.length} en cola). Intenta de nuevo en un par de minutos.`,
    );
  }
  await new Promise<void>((resolve) => {
    waiting.push(() => {
      active++;
      resolve();
    });
  });
}

function release(): void {
  active--;
  const next = waiting.shift();
  if (next) next();
}

export async function runQueuedExtraction<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export function getExtractionQueueStats() {
  return { active, waitingCount: waiting.length, maxConcurrent: MAX_CONCURRENT };
}
