import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createNetworkAdapters,createNetworkAliasStore,requestNetworkHost} from './network-adapters.mjs';

const actor={id:'admin-profile',role:'admin'};
const inventory=()=>({schemaVersion:1,scope:'host',generatedAt:new Date(0).toISOString(),revision:'a'.repeat(64),capabilities:{readAdapters:true,diagnose:true,configureIpv4:false,enable:false,disable:false},adapters:[{id:'2:020000000001',name:'eth0',dnsServers:null,routes:null,capabilities:{configureIpv4:false,enable:false,disable:false}}]});
const request=(action,value={},more={})=>({action,value,actor,authorized:()=>true,...more});
const rejectsStatus=(promise,status)=>assert.rejects(promise,error=>error.status===status);

test('canonical snapshot and detail preserve unavailable fields and derive owner',async()=>{
 const calls=[];const service=createNetworkAdapters({host:async(...args)=>{calls.push(args);return inventory();}});
 const data=await service.handle(request('snapshot'));
 assert.equal(data.adapters[0].displayName,'eth0');assert.equal(data.adapters[0].routes,null);assert.equal(data.aliasRevision,0);assert.equal(data.capabilities.setDisplayName,false);
 assert.deepEqual(calls,[['snapshot',{owner:actor.id,admin:true}]]);
 const detail=await service.handle(request('detail',{adapterId:data.adapters[0].id}));assert.equal(detail.adapter.name,'eth0');assert.equal(detail.capabilities.setDisplayName,false);
 await rejectsStatus(service.handle(request('detail',{adapterId:'missing'})),404);
});

test('reject every nonpersonal or nonadmin actor before provider access',async()=>{
 let calls=0;const service=createNetworkAdapters({host:async()=>{calls++;return inventory();}});
 for(const forbidden of [null,{...actor,shareEditing:true},{...actor,readonly:true},{...actor,authenticated:false},{...actor,role:'user'}])await assert.rejects(service.handle(request('snapshot',{}, {actor:forbidden})));
 assert.equal(calls,0);
});

test('profile revocation during host await prevents response',async()=>{
 let active=true;const service=createNetworkAdapters({host:async()=>{active=false;return inventory();}});
 await rejectsStatus(service.handle(request('snapshot',{}, {authorized:()=>active})),409);
});

test('strict values reject client envelope and unstripped profileId',async()=>{
 const service=createNetworkAdapters({host:async()=>inventory()});
 for(const value of [{admin:true},{owner:'other'},{profileId:actor.id}])await rejectsStatus(service.handle(request('snapshot',value)),400);
 await rejectsStatus(service.handle(request('diagnose',{kind:'ping',target:'example.org;id'})),400);
 await rejectsStatus(service.handle(request('diagnose',{kind:'ping',target:'-c'})),400);
 await rejectsStatus(service.handle(request('diagnose',{kind:'dns',target:'example.org',profileId:actor.id})),400);
});

test('diagnose sends typed fixed protocol and preserves nonzero completion',async()=>{
 const calls=[];const service=createNetworkAdapters({host:async(kind,body)=>{calls.push([kind,body]);return{kind:body.kind,target:body.target,output:'unreachable',exitCode:1};}});
 const result=await service.handle(request('diagnose',{kind:'ping',target:'192.0.2.1'}));
 assert.equal(result.exitCode,1);assert.equal(result.internetConnectivity,'not-tested');assert.deepEqual(calls,[['diagnose',{kind:'ping',target:'192.0.2.1',owner:actor.id,admin:true}]]);
});

test('persistent labels, CAS serialization, removal, and revision separation',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'network-alias-'));
 try{
  const file=path.join(dir,'aliases.json'),aliasStore=createNetworkAliasStore(file),service=createNetworkAdapters({host:async()=>inventory(),aliasStore});
  const id=inventory().adapters[0].id;
  const outcomes=await Promise.allSettled(['First','Second'].map(displayName=>service.handle(request('label',{adapterId:id,displayName,expectedRevision:0}))));
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.status,409);
  const data=await createNetworkAdapters({host:async()=>inventory(),aliasStore:createNetworkAliasStore(file)}).handle(request('snapshot'));
  assert.equal(data.aliasRevision,1);assert.equal(data.revision,'a'.repeat(64));assert.equal(data.adapters[0].displayName,'First');
  const detail=await service.handle(request('detail',{adapterId:id}));assert.equal(detail.capabilities.setDisplayName,true);assert.equal(detail.adapter.displayName,'First');assert.equal(detail.aliasRevision,1);
  await service.handle(request('label',{adapterId:id,displayName:'  ',expectedRevision:1}));assert.equal((await service.handle(request('snapshot'))).adapters[0].displayName,'eth0');
  await rejectsStatus(service.handle(request('label',{adapterId:'missing',displayName:'x',expectedRevision:2})),404);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('revoked alias write leaves persisted state unchanged',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'network-alias-'));
 try{const store=createNetworkAliasStore(path.join(dir,'aliases.json'));let checks=0;await rejectsStatus(store.update('adapter','Name',0,()=>++checks<3),409);assert.equal((await store.read()).revision,0);assert.deepEqual(await fs.readdir(dir),[]);}finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('malformed host response fails closed',async()=>{
 for(const value of [null,{}, {...inventory(),scope:'browser'},{...inventory(),revision:'wrong'},{...inventory(),adapters:[{id:'bad/id',name:'eth0'}]}])await rejectsStatus(createNetworkAdapters({host:async()=>value}).handle(request('snapshot')),502);
});

test('mutation transport stays disabled and absent socket is explicit',()=>{
 assert.throws(()=>requestNetworkHost('apply',{}, {socket:'anything'}),error=>error.status===501);
 assert.throws(()=>requestNetworkHost('snapshot',{}, {socket:''}),error=>error.status===503);
});

test('German validation messages retain exact Unicode characters',async()=>{
 const service=createNetworkAdapters({host:async()=>inventory()});
 await assert.rejects(service.handle(request('snapshot',{admin:true})),error=>error.message==='Ungültige Netzwerkanfrage.');
 await assert.rejects(service.handle(request('snapshot',{}, {authorized:()=>false})),error=>error.message==='Das persönliche Profil wurde gewechselt.');
});
