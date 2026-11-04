import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCMD,cmdPath,cmdDisplay} from './public/cmd.js';
test('CMD batches, variables, pipes, quoted redirection and file callbacks',async()=>{const files=new Map([['/C/test.bat','@echo off\r\nset X=Hallo\r\ncall inner.cmd Welt\r\nfor %%i in (eins zwei) do echo %%i\r\ngoto ende\r\necho falsch\r\n:ende\r\necho %X%'],['/C/inner.cmd','@echo %1\r\nexit /b\r\necho falsch'],['/C/list.txt','z\na\nz']]),nodes=()=>[...files.keys()].map(path=>({id:path,path,kind:'file',name:path.split('/').at(-1)})),out=[],cmd=createCMD({home:'/C',getNodes:nodes,print:x=>out.push(x),read:n=>files.get(n.id),write:async(p,t)=>files.set(p,t)});await cmd.execute('call test.bat');assert.ok(out.includes('Welt'));assert.ok(out.includes('eins'));assert.ok(out.includes('Hallo'));assert.ok(!out.includes('falsch'));await cmd.execute('type list.txt | sort | find "z" > result.txt');assert.equal(files.get('/C/result.txt'),'z\nz\r\n');await cmd.execute('echo "a>b"');assert.ok(out.includes('a>b'));await cmd.execute('echo Ende >> result.txt');assert.match(files.get('/C/result.txt'),/Ende/);await assert.rejects(cmd.execute('format C:'),/noch nicht umgesetzt/);});

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

test('CMD Dateioperationen verwenden aktuelle Pfade und zitierte Namen',async()=>{
 const nodes=[{id:'d',name:'Documents',kind:'folder',path:'/C/Users/alice/Documents'},{id:'f',name:'Test Datei.txt',kind:'file',path:'/C/Users/alice/Documents/Test%20Datei.txt'}],calls=[];
 const cmd=createCMD({home:'/C/Users/alice/Documents',getNodes:()=>nodes,print:()=>{},mkdir:p=>calls.push(['mkdir',p]),rename:(n,name)=>calls.push(['rename',n.id,name]),remove:n=>calls.push(['del',n.id]),edit:(n,p)=>calls.push(['nano',n?.id,p])});
 await cmd.execute('mkdir "Neuer Ordner"');await cmd.execute('rename "Test Datei.txt" "Neu.txt"');await cmd.execute('del "Test Datei.txt"');await cmd.execute('nano "Test Datei.txt"');await cmd.execute('nano neu.txt');
 assert.deepEqual(calls,[['mkdir','/C/Users/alice/Documents/Neuer Ordner'],['rename','f','Neu.txt'],['del','f'],['nano','f','/C/Users/alice/Documents/Test Datei.txt'],['nano',undefined,'/C/Users/alice/Documents/neu.txt']]);
 await assert.rejects(cmd.execute('del fehlt.txt'),/nicht gefunden/);await assert.rejects(cmd.execute('del .'),/Dateien/);await assert.rejects(cmd.execute('rename "Test Datei.txt" ../anders'),/neuen Namen/);await assert.rejects(cmd.execute('mkdir'),/Syntax/);
});


test('HELP zeigt die deutsche Windows-Befehlsreferenz mit ausgerichteten Beschreibungen',async()=>{
 const out=[],cmd=createCMD({getNodes:()=>[],print:x=>out.push(x)});
 await cmd.execute('help');
 assert.equal(out.length,1);
 assert.ok(out[0].startsWith('Geben Sie HELP "Befehlsname" ein,'));
 assert.match(out[0],/ASSOC          Zeigt Dateierweiterungszuordnungen/);
 assert.match(out[0],/WMIC           Zeigt WMI-Informationen/);
 assert.ok(out[0].endsWith('Weitere Informationen finden Sie in der Befehlszeilenreferenz der Onlinehilfe.'));
 await cmd.execute('/?');assert.equal(out[1],out[0]);
});


test('CMD conditionals, grouped commands and numeric loops use real command status',async()=>{
 const out=[],nodes=[{id:'f',name:'yes.txt',kind:'file',path:'/C/yes.txt'}];
 const cmd=createCMD({home:'/C',getNodes:()=>nodes,print:x=>out.push(x),native:async command=>command==='failure'?{handled:true,exitCode:5}:undefined});
 await cmd.execute('failure && echo wrong || echo recovered');assert.deepEqual(out,['recovered']);
 await cmd.execute('if exist yes.txt echo exists');
 await cmd.execute('if not exist missing.txt echo absent');
 await cmd.execute('set choice=YES');await cmd.execute('if /i "%choice%"=="yes" (echo first & echo second) else (echo wrong)');
 await cmd.execute('for /l %i in (3,-1,1) do (echo %i & echo loop)');
 assert.deepEqual(out,['recovered','exists','absent','first','second','3','loop','2','loop','1','loop']);
 await cmd.execute('failure');await cmd.execute('if errorlevel 5 echo failed');assert.equal(out.at(-1),'failed');
 await cmd.execute('echo one ^& two ^| three ^> four');assert.equal(out.at(-1),'one & two | three > four');
 await assert.rejects(cmd.execute('for /l %i in (0,0,2) do echo %i'),/Schritt/);
});


test('CMD multiline batches, local variables, directory stack and completion',async()=>{
 const script='@echo off\nsetlocal\nset X=inside\nif defined X (\n echo first\n echo second\n) else (\n echo wrong\n)\nfor /l %%i in (1,1,2) do (\n echo %%i\n)\nendlocal\necho %X%';
 const nodes=[{id:'b',path:'/C/demo.cmd',name:'demo.cmd',kind:'file'},{id:'f',path:'/C/My Folder',name:'My Folder',kind:'folder'},{id:'t',path:'/C/My Folder/hello.txt',name:'hello.txt',kind:'file'}],out=[];
 const cmd=createCMD({home:'/C',getNodes:()=>nodes,read:async()=>script,print:x=>out.push(x)});
 await cmd.execute('set X=outside');await cmd.execute('call demo.cmd');assert.deepEqual(out,['first','second','1','2','outside']);
 assert.deepEqual(cmd.complete('type My'),['type "My Folder"']);
 await cmd.execute('pushd "My Folder"');assert.equal(cmd.cwd,'/C/My Folder');assert.deepEqual(cmd.complete('type he'),['type hello.txt']);await cmd.execute('popd');assert.equal(cmd.cwd,'/C');
});


test('CMD cancellation interrupts timeout and leaves the next command usable',async()=>{
 const out=[],cmd=createCMD({getNodes:()=>[],print:x=>out.push(x)});
 const job=cmd.execute('timeout /t 300 & echo wrong');cmd.cancel();await assert.rejects(job,/\^C/);
 await cmd.execute('echo recovered');assert.equal(out.at(-1),'recovered');assert.ok(!out.includes('wrong'));
});


test('FOR /F parses files, quoted strings and command output with tokens',async()=>{
 const out=[],cmd=createCMD({home:'/C',getNodes:()=>[{id:'f',path:'/C/input.txt',name:'input.txt',kind:'file'}],read:async()=>';comment\na,one\nb,two',print:x=>out.push(x)});
 await cmd.execute('for /f "tokens=1,2 delims=," %a in (input.txt) do echo %a:%b');
 await cmd.execute('for /f "tokens=2" %a in ("hello world") do echo %a');
 await cmd.execute("for /f %a in ('echo command') do echo %a");
 await cmd.execute('if 12 GTR 2 echo numeric');assert.deepEqual(out,['a:one','b:two','world','command','numeric']);
});


test('Batch subroutines return to their caller, conditional GOTO and SHIFT keep frame parameters',async()=>{
 const out=[],node={id:'batch',path:'/C/Tools/sub.cmd',name:'sub.cmd',kind:'file'};
 const source='@echo off\ncall :work first second\necho returned\nif exist C:\\Tools\\sub.cmd goto done\necho wrong\n:done\necho %~dp0\nexit /b\n:work\necho %1\nshift\necho %1\ncall :nested child\necho resumed\nexit /b 7\n:nested\necho %1\ngoto :eof';
 const cmd=createCMD({home:'/C',getNodes:()=>[node],read:async()=>source,print:x=>out.push(x)});
 await cmd.execute('call C:\\Tools\\sub.cmd');
 assert.deepEqual(out,['first','second','child','resumed','returned','C:\\Tools\\']);
 await cmd.execute('echo still usable');assert.equal(out.at(-1),'still usable');
});

test('FOR file masks, recursive and directory enumeration use accessible nodes only',async()=>{
 const out=[],nodes=[{id:'d',name:'Docs',path:'/C/Docs',kind:'folder'},{id:'a',name:'a.TXT',path:'/C/a.TXT',kind:'file'},{id:'b',name:'b.txt',path:'/C/Docs/b.txt',kind:'file'},{id:'c',name:'notes',path:'/C/notes',kind:'file'}];
 const cmd=createCMD({home:'/C',getNodes:()=>nodes,read:async n=>n.name,print:x=>out.push(x)});
 await cmd.execute('for %i in (*.txt) do echo %i');await cmd.execute('for /d %i in (*) do echo %i');await cmd.execute('for /r %i in (*.txt) do echo %i');await cmd.execute('type *.*');
 assert.deepEqual(out,['a.TXT','Docs','C:\\a.TXT','C:\\Docs\\b.txt','a.TXT','notes']);
});

test('FOR /F remainder preserves repeated delimiters and leading comment delimiters',async()=>{
 const seen=[],cmd=createCMD({getNodes:()=>[],print:()=>{},native:async command=>{seen.push(command);return{handled:true};}});
 await cmd.execute('for /f "tokens=1,* delims=," %a in ("first,,remaining,,,text") do capture %b');
 assert.deepEqual(seen,['capture remaining,,,text']);
});


test('Pipelines capture actual native output and preserve role-checked native dispatch',async()=>{
 const out=[],seen=[],cmd=createCMD({getNodes:()=>[],print:x=>out.push(x),native:async command=>{seen.push(command);return{handled:true,output:'host-alpha\nhost-beta',exitCode:0};}});
 await cmd.execute('hostname | find "beta"');assert.deepEqual(out,['host-beta']);assert.deepEqual(seen,['hostname']);
});


test('Command chains retain visible errors even when a following command succeeds',async()=>{
 const out=[],cmd=createCMD({home:'/C',getNodes:()=>[],print:x=>out.push(x)});
 await cmd.execute('pushd missing & echo continued');assert.match(out[0],/Pfad nicht gefunden/);assert.equal(out[1],'continued');
});


test('live native chunks keep raw byte boundaries when piped through FIND',async()=>{
 const out=[],cmd=createCMD({getNodes:()=>[],print:x=>out.push(x),native:async(command,cwd,{onOutput})=>{onOutput('host-');onOutput('stream\nother\n');return{handled:true,exitCode:0};}});
 await cmd.execute('hostname | find "host-stream"');assert.deepEqual(out,['host-stream']);
});


test('DIR combines masks, recursion, attributes, bare output and Windows sorting',async()=>{
 const nodes=[{id:'docs',kind:'folder',name:'Docs',path:'/C/Docs'},{id:'a',kind:'file',name:'A.txt',path:'/C/Docs/A.txt',size:30},{id:'b',kind:'file',name:'B.TXT',path:'/C/Docs/B.TXT',size:10},{id:'bin',kind:'file',name:'File.bin',path:'/C/Docs/File.bin',size:20},{id:'hide',kind:'file',name:'Secret.txt',path:'/C/Docs/Secret.txt',hidden:true,size:100},{id:'folder',kind:'folder',name:'Sub',path:'/C/Docs/Sub'},{id:'deep',kind:'file',name:'Deep.txt',path:'/C/Docs/Sub/Deep.txt',size:2},{id:'hiddenFolder',kind:'folder',name:'Hidden',path:'/C/Docs/Hidden',hidden:true},{id:'hiddenSub',kind:'folder',name:'Inside',path:'/C/Docs/Hidden/Inside'},{id:'hiddenFile',kind:'file',name:'Private.txt',path:'/C/Docs/Hidden/Inside/Private.txt',size:5}],output=[],native=[];
 const cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>output.push(s),native:async command=>{native.push(command);return{handled:true,output:'host'};}}),run=async command=>{output.length=0;await cmd.execute(command);return[...output];};
 assert.deepEqual(await run('dir /B *.txt /O:-N'),['B.TXT','A.txt']);assert.deepEqual(await run('dir /B /A:D /ON'),['Hidden','Sub']);assert.deepEqual(await run('dir /B /A:H'),['Hidden','Secret.txt']);assert.deepEqual(await run('dir /B /A:-D /OS'),['B.TXT','File.bin','A.txt','Secret.txt']);assert.deepEqual(await run('dir /B /S *.txt'),['C:\\Docs\\A.txt','C:\\Docs\\B.TXT','C:\\Docs\\Sub\\Deep.txt']);
 const all=await run('dir /B /S /A *.txt');assert.ok(all.includes('C:\\Docs\\Hidden\\Inside\\Private.txt'));assert.ok(all.includes('C:\\Docs\\Secret.txt'));const wide=await run('dir /W /L');assert.ok(wide.some(s=>s.includes('[sub]')&&s.includes('a.txt')));assert.ok((await run('dir /B /S /L *.TXT')).every(s=>s===s.toLowerCase()));
 assert.deepEqual(await run('dir /B/S/O:N *.txt'),['C:\\Docs\\A.txt','C:\\Docs\\B.TXT','C:\\Docs\\Sub\\Deep.txt']);assert.equal(native.length,0);await run('dir C:/Outside');assert.equal(native.length,1);await assert.rejects(run('dir /B *.missing'),/Datei nicht gefunden/);await assert.rejects(cmd.execute('dir /A:R'),/unterstützt derzeit/);
});

test('DIR bare output can feed FOR F and pipes, with pause and cancellation',async()=>{
 const nodes=[{id:'docs',kind:'folder',name:'Docs',path:'/C/Docs'},...Array.from({length:25},(_,i)=>({id:String(i),kind:'file',name:'File'+i+'.txt',path:'/C/Docs/File'+i+'.txt',size:i}))],out=[];let pauses=0,cmd;cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s),pause:async()=>{pauses++;}});await cmd.execute('dir /B /P');assert.equal(pauses,1);out.length=0;await cmd.execute('dir /B | find "File2"');assert.match(out.join('\n'),/File20.txt/);assert.ok(!out.join('\n').includes('Verzeichnis von'));out.length=0;await cmd.execute("for /f \"delims=\" %i in ('dir /B /A:-D File?.txt') do echo ROW=%i");assert.equal(out.filter(line=>line.startsWith('ROW=')).length,10);
 cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:()=>{},pause:async()=>cmd.cancel()});await assert.rejects(cmd.execute('dir /B /P'),/aborted|\^C/);
});

test('DIR displays actual modification time and sorts by date without substituting import dates',async()=>{
 const nodes=[{id:'d',name:'Docs',kind:'folder',path:'/C/Docs'},{id:'a',name:'A.txt',kind:'file',path:'/C/Docs/A.txt',size:3,modified:'2021-05-06T07:08:00Z',created:'1999-01-01T00:00:00Z'},{id:'b',name:'B.txt',kind:'file',path:'/C/Docs/B.txt',size:5,modified:'2020-01-02T03:04:00Z'},{id:'c',name:'Unknown.txt',kind:'file',path:'/C/Docs/Unknown.txt',created:'1999-01-01T00:00:00Z'}],out=[],cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s)});
 await cmd.execute('dir /B /O:D');assert.deepEqual(out,['B.txt','A.txt','Unknown.txt']);out.length=0;await cmd.execute('dir /B /O:-D');assert.deepEqual(out,['Unknown.txt','A.txt','B.txt']);out.length=0;await cmd.execute('dir /T:W');const date=new Date(nodes[1].modified),pad=n=>String(n).padStart(2,'0');assert.ok(out.some(line=>line.startsWith('06.05.2021  '+pad(date.getHours())+':'+pad(date.getMinutes()))&&line.endsWith('3 A.txt')));assert.ok(out.find(line=>line.endsWith('Unknown.txt')).trim()==='Unknown.txt');assert.ok(!out.join('\n').includes('1999'));await assert.rejects(cmd.execute('dir /T:C'),/Ungültiger DIR-Parameter/);
});

test('FOR path modifiers work in normal and F loops with actual metadata and case-sensitive variables',async()=>{
 const nodes=[{id:'docs',kind:'folder',name:'Docs',path:'/C/Docs'},{id:'f',kind:'file',name:'Report One.txt',path:'/C/Docs/Report%20One.txt',size:42,modified:'2020-01-02T03:04:00Z'}],out=[],cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s)});
 await cmd.execute('for %I in ("Report One.txt") do echo %~fI;%~dI;%~pI;%~nI;%~xI;%~nxI;%~zI');assert.equal(out.pop(),'C:\\Docs\\Report One.txt;C:;\\Docs\\;Report One;.txt;Report One.txt;42');
 await cmd.execute('for /f "delims=" %I in ("Report One.txt") do echo %~dpI;%~zI');assert.equal(out.pop(),'C:\\Docs\\;42');
 await cmd.execute('for %I in ("Report One.txt") do echo %~tI');assert.match(out.pop(),/^02\.01\.2020\s+\d{2}:\d{2}$/);
 await cmd.execute('for %I in (missing.txt) do echo [%~zI]');assert.equal(out.pop(),'[]');await cmd.execute('for %I in (Report.txt) do echo %~nxI:%~nxi');assert.equal(out.pop(),'Report.txt:%~nxi');await cmd.execute('for %I in (100%I.txt) do echo %~nxI');assert.equal(out.pop(),'100%I.txt');await assert.rejects(cmd.execute('for %I in (Report.txt) do echo %~sI'),/Kurznamen/);
});

test('batch parameter modifiers resolve script zero independently from cwd and honor SHIFT',async()=>{
 const script={id:'bat',name:'Run.cmd',kind:'file',path:'/C/Scripts/Run.cmd'},file={id:'f',name:'Report One.txt',kind:'file',path:'/C/Docs/Report%20One.txt',size:42},out=[];
 const cmd=createCMD({home:'/C/Docs',getNodes:()=>[script,file],print:s=>out.push(s),read:()=> '@echo off\necho %~f0\necho %~dp0\necho %~nx0\necho %~nx1\necho %~z1\nshift\necho %~n1\necho [%~f9]'});
 await cmd.execute('call C:\\Scripts\\Run.cmd "Report One.txt" Other.bin');assert.deepEqual(out,['C:\\Scripts\\Run.cmd','C:\\Scripts\\','Run.cmd','Report One.txt','42','Other','[]']);
});

test('parameter PATH searches respect directory order, accessible files and variable scope',async()=>{
 const files=[{id:'a',name:'Tool.exe',path:'/C/Tools%20A/Tool.exe',kind:'file',size:4},{id:'b',name:'Tool.exe',path:'/C/ToolsB/Tool.exe',kind:'file',size:7},{id:'folder',name:'OnlyFolder',path:'/C/ToolsB/OnlyFolder',kind:'folder'},{id:'cmd',name:'Find.cmd',path:'/C/Find.cmd',kind:'file'}],out=[],cmd=createCMD({home:'/C/Docs',getNodes:()=>files,print:s=>out.push(s),read:()=> '@echo off\necho %~$TOOLS:1\necho %~dp$TOOLS:1\necho %~z$TOOLS:1'});
 await cmd.execute('set TOOLS=C:\\Missing;C:\\Tools A;C:\\ToolsB');await cmd.execute('for %I in (tool.exe) do echo %~$TOOLS:I');assert.equal(out.pop(),'C:\\Tools A\\Tool.exe');await cmd.execute('for %I in (tool.exe) do echo %~dp$tools:I');assert.equal(out.pop(),'C:\\Tools A\\');await cmd.execute('call C:\\Find.cmd Tool.exe');assert.deepEqual(out.splice(0),['C:\\Tools A\\Tool.exe','C:\\Tools A\\','4']);await cmd.execute('setlocal');await cmd.execute('set TOOLS=C:\\ToolsB');await cmd.execute('for %I in (Tool.exe) do echo %~z$TOOLS:I');assert.equal(out.pop(),'7');await cmd.execute('endlocal');await cmd.execute('for %I in (Tool.exe) do echo %~z$TOOLS:I');assert.equal(out.pop(),'4');for(const value of ['Missing.exe','OnlyFolder']){await cmd.execute('for %I in ('+value+') do echo [%~$TOOLS:I]');assert.equal(out.pop(),'[]');}await cmd.execute('for %I in (Tool.exe) do echo [%~$UNDEFINED:I]');assert.equal(out.pop(),'[]');files.push({id:'local',name:'Tool.exe',path:'/C/Docs/Tool.exe',kind:'file'});await cmd.execute('set TOOLS=');await cmd.execute('for %I in (Tool.exe) do echo [%~$TOOLS:I]');assert.equal(out.pop(),'[]');
});


test('redirection and parser failures set ERRORLEVEL before conditional chains continue',async()=>{
 const out=[],writes=[],cmd=createCMD({home:'/C/Docs',getNodes:()=>[],print:line=>out.push(line),write:async(path,text)=>{writes.push(path);if(path.includes('missing'))throw Error('Zielordner nicht gefunden.');}});
 await cmd.execute('(echo data) > missing/result.txt && echo MUST_NOT_RUN || echo RECOVERED');
 assert.ok(!out.includes('MUST_NOT_RUN'));assert.ok(out.includes('RECOVERED'));assert.equal(out.filter(line=>line==='Zielordner nicht gefunden.').length,1);
 await assert.rejects(cmd.execute('echo data > missing/other.txt'),/Zielordner/);await cmd.execute('if errorlevel 1 echo REDIRECTION_FAILED');assert.ok(out.includes('REDIRECTION_FAILED'));
 out.length=0;await cmd.execute('for /L %i in (1,0,2) do echo %i && echo MUST_NOT_RUN || echo INVALID_LOOP');assert.ok(!out.includes('MUST_NOT_RUN'));assert.ok(out.includes('INVALID_LOOP'));
});
