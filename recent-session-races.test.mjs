/**
 * Node-only client race tests. Run with:
 *   node --test recent-session-races.test.mjs
 * This file needs no browser or network service and can join the default CI suite.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecentActivity} from './public/recent-activity.js';

const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
const empty={programs:[],documents:[],pinnedDocuments:[],unavailablePinnedDocuments:[]};

test('a delayed personal history response is discarded after logout',async()=>{
 let state={authenticated:true,userId:'alice',readonly:false,shareEditing:false,desktop:{}};
 const pending=deferred();let changes=0;
 const activity=createRecentActivity({getState:()=>state,onChange:()=>changes++,request:()=>pending.promise});
 const refresh=activity.refresh(),before=changes;
 state={...state,authenticated:false,userId:null};
 pending.resolve({programs:[{appId:'editor',count:3}],documents:[{id:'private',appId:'editor'}]});
 await refresh;
 assert.equal(activity.token(),null);
 assert.deepEqual(activity.snapshot(),empty);
 assert.equal(changes,before,'late response must not notify a signed-out shell');
});

test('a delayed personal response is discarded when the same user enters Share',async()=>{
 let state={authenticated:true,userId:'alice',readonly:false,shareEditing:false,desktop:{}};
 const pending=deferred();let changes=0;
 const activity=createRecentActivity({getState:()=>state,onChange:()=>changes++,request:()=>pending.promise});
 const refresh=activity.refresh(),before=changes;
 state={...state,readonly:true,shareEditing:true};
 pending.resolve({programs:[{appId:'editor',count:4}],documents:[{id:'private',appId:'editor'}]});
 await refresh;
 assert.equal(activity.token(),null);
 assert.deepEqual(activity.snapshot(),empty);
 assert.equal(changes,before,'late personal data must not notify the Share shell');
});

test('an in-flight personal mutation cannot repopulate the client after Share starts',async()=>{
 let state={authenticated:true,userId:'alice',readonly:false,shareEditing:false,desktop:{}};
 const pending=deferred(),started=deferred(),requests=[];
 const activity=createRecentActivity({getState:()=>state,request:(path,data)=>{requests.push({path,data});started.resolve();return pending.promise;}});
 const mutation=activity.program('editor');
 await started.promise;
 assert.equal(requests.length,1);
 assert.equal(requests[0].data.profileId,'alice');
 state={...state,readonly:true,shareEditing:true};
 pending.resolve({programs:[{appId:'editor',count:1}],documents:[]});
 await mutation;
 assert.deepEqual(activity.snapshot(),empty);
 await activity.document('private','editor');
 assert.equal(requests.length,1,'new Share-mode events must not reach the personal endpoint');
});
