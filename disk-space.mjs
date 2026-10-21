import {statfs} from 'node:fs/promises';

export async function diskSpace(root){
  const info=await statfs(root,{bigint:true});
  const total=info.blocks*info.bsize;
  if(total<=0n)throw Error('Speichergröße nicht verfügbar.');
  // bavail is the space available to the container's unprivileged user.
  const available=info.bavail*info.bsize;
  const free=available<0n?0n:available>total?total:available;
  const totalBytes=Number(total),freeBytes=Number(free),usedBytes=Number(total-free);
  return {available:true,totalBytes,freeBytes,usedBytes,usedPercent:usedBytes/totalBytes*100};
}
