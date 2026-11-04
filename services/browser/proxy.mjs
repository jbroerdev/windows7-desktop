// Chromium can reach the network only through this proxy. Resolve and pin each
// connection to a public address, including CONNECT, redirects and subresources.
import http from 'node:http';
import net from 'node:net';
import {lookup} from 'node:dns/promises';
import {publicIP,webURL} from './security.mjs';
export async function publicAddress(host){const addresses=await lookup(host.replace(/^\[|\]$/g,''),{all:true});if(!addresses.length||addresses.some(a=>!publicIP(a.address)))throw Error('Private Netzwerkziele sind gesperrt.');return addresses[0];}
export function createProxy(){
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(webURL(req.url));if(url.protocol!=='http:'||url.port&&url.port!=='80')throw Error('Port gesperrt.');const address=await publicAddress(url.hostname);
  const headers={...req.headers,host:url.host};delete headers['proxy-authorization'];delete headers['proxy-connection'];
  const upstream=http.request({host:address.address,family:address.family,port:80,path:url.pathname+url.search,method:req.method,headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.setTimeout(30000,()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
 }catch{res.writeHead(403);res.end('Dieses Netzwerkziel ist gesperrt.');}});
 server.on('connect',async(req,client,head)=>{try{const url=new URL('https://'+req.url);if(url.port&&url.port!=='443')throw Error('Port gesperrt.');const a=await publicAddress(url.hostname);const upstream=net.connect({host:a.address,family:a.family,port:443});upstream.on('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);});upstream.on('error',()=>client.destroy());client.on('error',()=>upstream.destroy());client.on('close',()=>upstream.destroy());upstream.setTimeout(120000,()=>upstream.destroy());}catch{client.end('HTTP/1.1 403 Forbidden\r\n\r\n');}});
 return server;
}
