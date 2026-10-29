import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.env.SM64_BUILD_DIR||'/game';
const allowed=new Set(['index.html','sm64.eu.f3dex2e.js','sm64.eu.f3dex2e.wasm','sm64.eu.f3dex2e.data']);
http.createServer(async(req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}if(name==='health'){await fs.access(path.join(root,'index.html'));await fs.access(path.join(root,'sm64.eu.f3dex2e.wasm'));res.writeHead(200);return res.end('ready');}if(!allowed.has(name)){res.writeHead(404);return res.end();}const bytes=await fs.readFile(path.join(root,name));res.writeHead(200,{'Content-Length':bytes.length,'X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(503);res.end('Game build unavailable');}}).listen(Number(process.env.PORT||3004),'0.0.0.0');
