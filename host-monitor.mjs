import {readFile} from 'node:fs/promises';

// The host publishes metrics, never Docker credentials or a control socket.
export async function readHostMonitor(file, now=Date.now()) {
  try {
    const raw=await readFile(file,'utf8');
    if(raw.length>4*1024*1024)return null;
    const value=JSON.parse(raw), age=now-Date.parse(value.generatedAt);
    if(value.version!==1||!Number.isFinite(age)||age< -5000||age>15000||!value.host||!Array.isArray(value.processes))return null;
    return value;
  } catch { return null; }
}
