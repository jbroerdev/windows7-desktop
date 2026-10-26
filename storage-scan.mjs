import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createStorage } from './storage.mjs';

// Filesystem calls on a slow network drive must never occupy the HTTP thread.
export function scanStorage(options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: options });
    const timeout = setTimeout(() => {
      reject(new Error('Zeitlimit beim Dateiabgleich überschritten.'));
      void worker.terminate();
    }, 60000);
    worker.once('exit', () => clearTimeout(timeout));
    let completed = false;
    worker.once('message', result => { completed = true; resolve(result); });
    worker.once('error', reject);
    worker.once('exit', code => {
      if (!completed) reject(new Error(`Dateiabgleich wurde beendet (${code}).`));
    });
  });
}

if (!isMainThread) {
  const storage = createStorage(workerData);
  parentPort.postMessage(storage.refresh() ? workerData.db.nodes : null);
}
