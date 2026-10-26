import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCMD,cmdPath,cmdDisplay} from './public/cmd.js';

test('CMD navigiert mit Windows-Pfaden und startet Apps, Dateien und Verknüpfungen',async()=>{
 const nodes=[{id:'d',name:'Documents',kind:'folder',path:'/C/Users/alice/Documents'}, {id:'f',name:'Meine Datei.txt',kind:'file',path:'/C/Users/alice/Documents/Meine%20Datei.txt'}, {id:'l',name:'Fotos',kind:'link',path:'/C/Programme/Fotos'}];
 const output=[],started=[],opened=[];
 const cmd=createCMD({getNodes:()=>nodes,home:'/C/Users/alice/',print:x=>output.push(x),launch:(app,node)=>started.push([app,node?.id]),open:n=>opened.push(n.id),publicIP:async()=>'203.0.113.4',close:()=>{}});
 await cmd.execute('cd Documents');assert.equal(cmd.cwd,'/C/Users/alice/Documents');
 await cmd.execute('notepad.exe "Meine Datei.txt"');assert.deepEqual(started.pop(),['editor','f']);
 await cmd.execute('"Meine Datei.txt"');assert.equal(opened.pop(),'f');
 await cmd.execute('start "" vlc');assert.deepEqual(started.pop(),['media',undefined]);
 await cmd.execute('Fotos');assert.equal(opened.pop(),'l');
 await cmd.execute('cd /d C:\\Users\\alice');assert.equal(cmd.cwd,'/C/Users/alice');
 await cmd.execute('cd ..');assert.equal(cmd.cwd,'/C/Users');
 await cmd.execute('hostname');assert.equal(output.pop(),'Windows7');
 await cmd.execute('ipconfig');assert.match(output.pop(),/203\.0\.113\.4/);
 await cmd.execute('dir alice\\Documents');assert.match(output.pop(),/Meine Datei.txt/);
 await assert.rejects(cmd.execute('cd fehlt'),/Pfad/);
 await assert.rejects(cmd.execute('notepad fehlt.txt'),/nicht gefunden/);
 assert.equal(cmdDisplay(cmdPath('..\\..','/C/Users')),'C:\\');
});
