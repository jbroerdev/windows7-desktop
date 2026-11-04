import test from 'node:test';
import assert from 'node:assert/strict';
import{compareBinary,readComparisonBytes,compareText,fcTextOptions,compOptions,comparisonTargetName}from './public/cmd-compare.js';
import{createCMD}from './public/cmd.js';

test('binary FC preserves invalid text bytes, offsets, unequal lengths and equal files',async()=>{
 const out=[],print=line=>out.push(line),bytes=values=>Uint8Array.from(values);
 assert.equal(await compareBinary(bytes([0,255,254]),bytes([0,254,255]),{print}),1);assert.ok(out.includes('00000001: FF FE'));assert.ok(out.includes('00000002: FE FF'));
 out.length=0;assert.equal(await compareBinary(bytes([0]),bytes([0,1]),{leftName:'A',rightName:'B',print}),1);assert.ok(out.includes('FC: B ist länger als A'));
 out.length=0;assert.equal(await compareBinary(bytes([255,0]),bytes([255,0]),{print}),0);assert.ok(out.includes('FC: Keine Unterschiede gefunden.'));
});
test('COMP reports decimal bytes, different sizes and stops at ten mismatches',async()=>{
 const out=[],print=line=>out.push(line);assert.equal(await compareBinary(new Uint8Array([255]),new Uint8Array([254]),{mode:'comp',decimal:true,print}),1);assert.ok(out.includes('Datei1 = 255'));assert.ok(out.includes('Datei2 = 254'));out.length=0;await compareBinary(new Uint8Array(11),new Uint8Array(11).fill(1),{mode:'comp',print});assert.equal(out.filter(line=>line.startsWith('Unterschied festgestellt')).length,10);assert.match(out.at(-1),/10 Unterschiede/);out.length=0;await compareBinary(new Uint8Array(1),new Uint8Array(2),{mode:'comp',print});assert.match(out.at(-1),/unterschiedlich groß/);
});
test('byte download keeps raw chunks and rejects HTTP errors, oversize streams and cancellation',async()=>{
 const result=await readComparisonBytes('/download/id',{fetcher:async()=>new Response(Uint8Array.from([0,255,254]))});assert.deepEqual([...result],[0,255,254]);await assert.rejects(readComparisonBytes('/download/id',{fetcher:async()=>new Response('',{status:403})}),/HTTP 403/);let cancelled=false;const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(4));},cancel(){cancelled=true;}});await assert.rejects(readComparisonBytes('/download/id',{maxBytes:3,fetcher:async()=>new Response(stream)}),/begrenzt/);assert.equal(cancelled,true);const controller=new AbortController();controller.abort();await assert.rejects(compareBinary(new Uint8Array(1),new Uint8Array(1),{signal:controller.signal,print(){}}),/abort/i);
});
test('CMD binary comparisons bypass profile native dispatch and preserve FC status for IF and chains',async()=>{
 const nodes=[{id:'a',name:'A.bin',path:'/C/Docs/A.bin',kind:'file',size:1},{id:'b',name:'B.bin',path:'/C/Docs/B.bin',kind:'file',size:1}],out=[],native=[],cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s),readBytes:async n=>new Uint8Array([n.id==='a'?255:254]),native:async command=>{native.push(command);return{handled:false};}});
 await cmd.execute('fc A.bin B.bin');assert.ok(out.includes('00000000: FF FE'));assert.equal(native.length,0);await cmd.execute('if errorlevel 1 echo different');assert.ok(out.includes('different'));out.length=0;await cmd.execute('fc /B A.bin A.bin && echo same');assert.ok(out.includes('same'));await assert.rejects(cmd.execute('fc /B A.bin Missing.bin'));await cmd.execute('if errorlevel 2 echo failed');assert.ok(out.includes('failed'));await assert.rejects(cmd.execute('fc /Z A.bin B.bin'),/unterstützt derzeit/);await cmd.execute('comp /D A.bin B.bin');assert.ok(out.includes('Datei1 = 255'));
});


test('FC text resynchronizes inserted and changed lines with native-style context and numbered blocks',async()=>{
 const out=[],print=line=>out.push(line),left='alpha\r\nbeta\r\ngamma\r\ndelta\r\nepsilon\r\n';
 assert.equal(await compareText(left,'alpha\nINSERT\nbeta\ngamma\ndelta\nepsilon\n',{leftName:'A',rightName:'B',lineNumbers:true,print}),1);
 assert.deepEqual(out.slice(1),['***** A','    1:  alpha','    2:  beta','***** B','    1:  alpha','    2:  INSERT','    3:  beta','*****','']);
 out.length=0;await compareText(left,'alpha\nchanged\ngamma\n',{leftName:'A',rightName:'B',print});
 assert.deepEqual(out.slice(1),['***** A','alpha','beta','gamma','***** B','alpha','changed','gamma','*****','','***** A','delta','epsilon','***** B','*****','']);
});

test('FC text switches normalize case whitespace and tab stops without losing original diagnostics',async()=>{
 const out=[],print=line=>out.push(line);
 assert.equal(await compareText('A\tB\n','a       b\n',{...fcTextOptions(['/C']),print}),0);
 assert.equal(await compareText(' A \t B \n','a b\n',{...fcTextOptions(['/W','/C','/T']),print}),0);
 assert.equal(await compareText('A\tB\n','A       B\n',{...fcTextOptions(['/T']),print}),1);
 out.length=0;assert.equal(await compareText('alpha\n','alpha\n1\n2\n3\n4\n5\n',{...fcTextOptions(['/A']),leftName:'A',rightName:'B',print}),1);
 assert.deepEqual(out.slice(1),['***** A','***** B','1','...','5','*****','']);
 assert.throws(()=>fcTextOptions(['/LB0']),/positive/);assert.throws(()=>fcTextOptions(['/Z']),/Unbekannter/);
});

test('FC line buffer failures stop comparison and custom synchronization avoids accidental single-line anchors',async()=>{
 const out=[],print=line=>out.push(line);
 assert.equal(await compareText('alpha\nbeta\ngamma\ndelta\n','alpha\nchanged\ngamma\ndelta\n',{...fcTextOptions(['/LB1']),leftName:'A',rightName:'B',print}),1);
 assert.deepEqual(out.slice(1),['Neusynchronisation fehlgeschlagen. Dateien sind zu verschieden.','***** A','beta','***** B','changed','*****','']);
 out.length=0;await compareText('start\na\nSAME\nx\nend\nlast\n','start\nb\nSAME\ny\nend\nlast\n',{print});
 assert.equal(out.filter(line=>line.startsWith('***** ')).length,2);assert.equal(out.filter(line=>line==='SAME').length,2);
 out.length=0;await compareText('start\na\nSAME\nx\nend\nlast\n','start\nb\nSAME\ny\nend\nlast\n',{...fcTextOptions(['/1']),print});assert.equal(out.filter(line=>line.startsWith('***** ')).length,4);
 const controller=new AbortController();controller.abort();await assert.rejects(compareText('a','b',{print,signal:controller.signal}),/abort/i);
});

test('CMD FC text switches and Unicode bytes retain real status for IF and command chains',async()=>{
 const nodes=[{id:'a',name:'A.txt',path:'/C/Docs/A.txt',kind:'file'},{id:'b',name:'B.txt',path:'/C/Docs/B.txt',kind:'file'}],out=[];
 const cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s),read:async n=>n.id==='a'?'A\tB':'a       b',readBytes:async()=>Uint8Array.from([255,254,196,0,32,0,228,0])});
 await cmd.execute('fc /C /N A.txt B.txt && echo SAME');assert.ok(out.includes('SAME'));
 out.length=0;await cmd.execute('fc /U A.txt B.txt && echo UNICODE');assert.ok(out.includes('UNICODE'));assert.ok(out.includes('FC: Keine Unterschiede gefunden.'));
 await assert.rejects(cmd.execute('fc /LB0 A.txt B.txt'),/positive/);await cmd.execute('if errorlevel 2 echo FAILED');assert.ok(out.includes('FAILED'));
});


test('FC destination masks overlay source fields using observed native naming rules',()=>{
 for(const[mask,source,result]of[['*.bak','long.name.txt','long.name.bak'],['?.bak','aa.txt','a.bak'],['b*.bak','aa.txt','ba.bak'],['*.?ak','long.name.txt','long.name.tak'],['*x.bak','aa.txt','aa.bak'],['*','aa.txt','aa.txt'],['*.*','nodot','nodot'],['*.backup','aa.txt','aa.backup']])assert.equal(comparisonTargetName(mask,source),result);
 assert.throws(()=>comparisonTargetName('new*.bak','aa.txt'),/nicht so erweitert/);assert.throws(()=>comparisonTargetName('????.bak','aa.txt'),/nicht so erweitert/);
});

test('FC wildcard pairs preserve names, compare every matching source and aggregate differences and errors',async()=>{
 const files=new Map([['/C/Docs/left/aa.txt','same\n'],['/C/Docs/left/ab.txt','same\n'],['/C/Docs/left/long.name.txt','same\n'],['/C/Docs/right/aa.bak','same\n'],['/C/Docs/right/ab.bak','changed\n'],['/C/Docs/right/long.name.bak','same\n']]),out=[],native=[];
 const nodes=()=>[{id:'left',path:'/C/Docs/left',kind:'folder'},{id:'right',path:'/C/Docs/right',kind:'folder'},...[...files.keys()].map(path=>({id:path,path,name:path.split('/').at(-1),kind:'file'}))];
 const cmd=createCMD({home:'/C/Docs',getNodes:nodes,print:s=>out.push(s),read:async n=>files.get(n.id),native:async command=>{native.push(command);return{handled:false};}});
 await cmd.execute('fc left/*.txt right/*.bak');assert.equal(native.length,0);assert.equal(out.filter(s=>s.startsWith('Vergleichen der Dateien ')).length,3);assert.ok(out.some(s=>s.includes('long.name.bak')));await cmd.execute('if errorlevel 1 echo DIFFERENT');assert.ok(out.includes('DIFFERENT'));
 files.delete('/C/Docs/right/ab.bak');out.length=0;await cmd.execute('fc left/*.txt right/*.bak');assert.equal(out.filter(s=>s.startsWith('Vergleichen der Dateien ')).length,2);assert.ok(out.some(s=>s==='FC: Datei nicht gefunden.'));await cmd.execute('if errorlevel 2 echo ERROR');assert.ok(out.includes('ERROR'));assert.ok(out.some(s=>s.includes('long.name.bak')));
 out.length=0;await cmd.execute('fc left/*.txt right/aa.bak && echo ALLSAME');assert.ok(out.includes('ALLSAME'));assert.equal(out.filter(s=>s.startsWith('Vergleichen der Dateien ')).length,3);
 await assert.rejects(cmd.execute('fc left/missing*.txt right/*.bak'),/Datei nicht gefunden/);
});

test('FC wildcard auto mode uses each actual extension and never includes deeper directories',async()=>{
 const files=new Map([['/C/Docs/left/a.bin',Uint8Array.from([0,255])],['/C/Docs/left/a.txt','same'],['/C/Docs/left/sub/hidden.txt','do not read'],['/C/Docs/right/a.bin',Uint8Array.from([0,254])],['/C/Docs/right/a.txt','same']]),out=[],byteReads=[],textReads=[];
 const nodes=()=>[{id:'left',path:'/C/Docs/left',kind:'folder'},{id:'right',path:'/C/Docs/right',kind:'folder'},...[...files.keys()].map(path=>({id:path,path,name:path.split('/').at(-1),kind:'file'}))];
 const cmd=createCMD({home:'/C/Docs',getNodes:nodes,print:s=>out.push(s),read:async n=>{textReads.push(n.id);return files.get(n.id);},readBytes:async n=>{byteReads.push(n.id);return files.get(n.id);}});
 await cmd.execute('fc left/*.* right/*.*');assert.ok(out.includes('00000001: FF FE'));assert.equal(byteReads.length,2);assert.equal(textReads.length,2);assert.ok(!textReads.some(path=>path.includes('hidden')));assert.equal(out.filter(s=>s.startsWith('Vergleichen der Dateien ')).length,2);
});


test('COMP supports character and line diagnostics, case folding and first-line limits',async()=>{
 const bytes=text=>new TextEncoder().encode(text),out=[],print=line=>out.push(line),a=bytes('one\r\nAA\r\n'),b=bytes('one\r\nAa\r\n');
 assert.equal(await compareBinary(a,b,{mode:'comp',...compOptions(['/A','/L']),print}),1);assert.ok(out.includes('Unterschied festgestellt bei ZEILE 2'));assert.ok(out.includes('Datei1 = A'));assert.ok(out.includes('Datei2 = a'));
 for(const options of [['/A','/D'],['/D','/A']]){out.length=0;await compareBinary(a,b,{mode:'comp',...compOptions(options),print});assert.ok(out.includes('Datei1 = A'));assert.ok(out.includes('Datei2 = a'));assert.equal(out[0],'Vergleichen von Datei1 und Datei2...');assert.ok(out.includes('Unterschied festgestellt bei OFFSET 6'));}
 out.length=0;assert.equal(await compareBinary(a,b,{mode:'comp',...compOptions(['/C']),print}),0);assert.ok(out.includes('Dateien sind identisch'));
 out.length=0;assert.equal(await compareBinary(a,bytes('one\r\nAalong\r\n'),{mode:'comp',...compOptions(['/N=1']),print}),0);assert.ok(out.includes('Dateien sind identisch'));
 out.length=0;await compareBinary(a,bytes('one\r\nAalong\r\n'),{mode:'comp',...compOptions(['/N=2','/L']),print});assert.equal(out.filter(line=>line==='Unterschied festgestellt bei ZEILE 2').length,2);assert.ok(out.includes('Datei1 = D'));assert.ok(out.includes('Datei2 = 6C'));
});

test('COMP handles zero limits and early EOF with the observed native size and line rules',async()=>{
 const bytes=text=>new TextEncoder().encode(text),out=[],print=line=>out.push(line);
 assert.equal(await compareBinary(bytes('a'),bytes('ab'),{mode:'comp',...compOptions(['/N=1']),print}),1);assert.ok(out.includes('Datei1 hat nur 0 Zeilen.'));
 out.length=0;assert.equal(await compareBinary(bytes('a'),bytes('ab'),{mode:'comp',...compOptions(['/N=0']),print}),1);assert.ok(out.includes('Dateien sind unterschiedlich groß.'));
 out.length=0;assert.equal(await compareBinary(bytes('a\nb'),bytes('a\nb'),{mode:'comp',...compOptions(['/N=3']),print}),0);
 assert.throws(()=>compOptions(['/N=99999999999999999999']),/nichtnegative/);assert.throws(()=>compOptions(['/N=-1']),/Unbekannter/);assert.equal(compOptions(['/A','/D']).characters,true);assert.equal(compOptions(['/D','/A']).characters,true);
});

test('COMP switches pass unchanged bytes through CMD and preserve comparison status',async()=>{
 const out=[],files=new Map([['a','ONE\r\nAA\r\n'],['b','one\r\nAa\r\n']]),nodes=[{id:'a',path:'/C/Docs/A.txt',name:'A.txt',kind:'file'},{id:'b',path:'/C/Docs/B.txt',name:'B.txt',kind:'file'}];
 const cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s),readBytes:async n=>new TextEncoder().encode(files.get(n.id))});
 await cmd.execute('comp /C /L A.txt B.txt && echo CASESAME');assert.ok(out.includes('CASESAME'));
 out.length=0;await cmd.execute('comp /A /L A.txt B.txt');assert.ok(out.includes('Unterschied festgestellt bei ZEILE 1'));assert.ok(out.includes('Datei1 = O'));await cmd.execute('if errorlevel 1 echo DIFFERENT');assert.ok(out.includes('DIFFERENT'));
 await assert.rejects(cmd.execute('comp /N=99999999999999999999 A.txt B.txt'),/nichtnegative/);await cmd.execute('if errorlevel 2 echo INVALID');assert.ok(out.includes('INVALID'));
});


test('COMP expands source and destination directories and byte-compares each corresponding wildcard pair',async()=>{
 const files=new Map([['/C/Docs/left/a.txt','same'],['/C/Docs/left/b.txt','SAME'],['/C/Docs/right/a.txt','same'],['/C/Docs/right/b.txt','same'],['/C/Docs/right/a.bak','same'],['/C/Docs/right/b.bak','SAME']]),out=[],native=[],read=[];
 const nodes=()=>[{id:'left',path:'/C/Docs/left',kind:'folder'},{id:'right',path:'/C/Docs/right',kind:'folder'},...[...files.keys()].map(path=>({id:path,path,name:path.split('/').at(-1),kind:'file'}))];
 const cmd=createCMD({home:'/C/Docs',getNodes:nodes,print:s=>out.push(s),readBytes:async n=>{read.push(n.id);return new TextEncoder().encode(files.get(n.id));},native:async command=>{native.push(command);return{handled:false};}});
 await cmd.execute('comp /C left right && echo DIRECTORIES_SAME');assert.ok(out.includes('DIRECTORIES_SAME'));assert.equal(out.filter(line=>line.startsWith('Vergleichen von ')).length,2);assert.equal(native.filter(command=>/^comp\b/i.test(command)).length,0);
 out.length=0;await cmd.execute('comp left/*.txt right/*.bak && echo MASKS_SAME');assert.ok(out.includes('MASKS_SAME'));assert.equal(out.filter(line=>line.startsWith('Vergleichen von ')).length,2);
 out.length=0;files.delete('/C/Docs/right/a.txt');await cmd.execute('comp left right');await cmd.execute('if errorlevel 2 echo MISSING');assert.ok(out.includes('MISSING'));assert.ok(read.includes('/C/Docs/right/b.txt'));
});


test('interactive COMP asks for missing filenames repeats on J and keeps options until changed',async()=>{
 const out=[],questions=[],responses=['A.txt','B.txt','','invalid','J','A.txt','B.txt','/C','','N'],nodes=[{id:'a',path:'/C/Docs/A.txt',name:'A.txt',kind:'file'},{id:'b',path:'/C/Docs/B.txt',name:'B.txt',kind:'file'}];
 const cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s),readBytes:async n=>new TextEncoder().encode(n.id==='a'?'A':'a'),readLine:async question=>{questions.push(question);assert.ok(responses.length);return responses.shift();},native:async command=>{if(/^comp/i.test(command))throw Error('Interactive profile comparison must not become a host command');return{handled:false};}});
 await cmd.execute('comp && echo CASESAME');assert.ok(out.includes('CASESAME'));assert.ok(out.includes('Datei1 = 41'));assert.ok(out.includes('Dateien sind identisch'));assert.equal(questions.filter(q=>q.startsWith('Weitere')).length,3);assert.equal(responses.length,0);
});

test('interactive COMP cancellation leaves the next command usable',async()=>{
 const out=[],cmd=createCMD({home:'/C/Docs',getNodes:()=>[],print:s=>out.push(s),readLine:(_question,signal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('^C')),{once:true}))});
 const pending=cmd.execute('comp');await new Promise(resolve=>setImmediate(resolve));cmd.cancel();await assert.rejects(pending,/\^C/);await cmd.execute('echo RESTORED');assert.ok(out.includes('RESTORED'));
});


test('interactive COMP retains prior switches when the next option prompt is left empty',async()=>{
 const responses=['J','A.txt','B.txt','','N'],out=[],nodes=[{id:'a',path:'/C/Docs/A.txt',name:'A.txt',kind:'file'},{id:'b',path:'/C/Docs/B.txt',name:'B.txt',kind:'file'}];
 const cmd=createCMD({home:'/C/Docs',getNodes:()=>nodes,print:s=>out.push(s),readBytes:async n=>new TextEncoder().encode(n.id==='a'?'A':'a'),readLine:async()=>{assert.ok(responses.length);return responses.shift();}});
 await cmd.execute('comp /C A.txt B.txt && echo RETAINED');assert.equal(out.filter(line=>line==='Dateien sind identisch').length,2);assert.ok(out.includes('RETAINED'));
});
