import{compareBinary,compareText,fcTextOptions,compOptions,comparisonTargetName,COMPARISON_LIMIT}from'./cmd-compare.js';
export function cmdPath(value, cwd = '/C/') {
  value = value.replace(/^"|"$/g, '').replaceAll('\\', '/').replace(/^([a-z]):/i, '/$1');
  const parts = (value.startsWith('/') ? value : cwd + '/' + value).split('/');
  const result = [];
  for (const part of parts) { if (!part || part === '.') continue; if (part === '..') { if (result.length > 1) result.pop(); } else result.push(part); }
  return '/' + result.join('/');
}
export const cmdDisplay = path => path.replace(/^\/([a-z])(?:\/|$)/i, (_, drive) => drive.toUpperCase() + ':\\').replaceAll('/', '\\');
export function createCMD({ getNodes, home, print, launch, open, publicIP, close, mkdir, rename, remove, edit, ...hooks }) {
  let cwd = cmdPath(home || '/C/');
  const pathOf = n => { try { return cmdPath(decodeURIComponent(n.path)); } catch { return cmdPath(n.path); } };
  const find = value => { const path = cmdPath(value, cwd).toLowerCase(); return getNodes().find(n => pathOf(n).toLowerCase() === path); };
  const parameter=(value,modifiers,script=false,search)=>{
   if(value===undefined||value==='')return '';
   let text=String(value).replace(/^"|"$/g,''),flags=modifiers.toLowerCase();
   if(/[as]/.test(flags))throw Error('Kurznamen und vollständige Dateiattribute sind für CMD-Variablen noch nicht verfügbar.');
   if(search){const directories=env[search.toUpperCase()];if(!directories)return '';let found;for(const directory of directories.split(';')){const candidate=find(cmdPath(text,cmdPath(directory.trim().replace(/^"|"$/g,''),cwd)));if(candidate&&candidate.kind!=='folder'){found=candidate;break;}}if(!found)return '';text=pathOf(found);script=true;if(!flags)flags='f';}
   if(!flags)return text;
   const path=script?text:cmdPath(text,cwd),full=cmdDisplay(path),split=full.lastIndexOf('\\'),name=full.slice(split+1),dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,extension=dot>0?name.slice(dot):'',node=find(path),parts=[];
   if(flags.includes('t')&&node?.modified)parts.push(cmdDirectoryDate(node.modified).trim());if(flags.includes('z')&&Number.isFinite(node?.size))parts.push(String(node.size));
   const selected=flags.includes('f')?full:(flags.includes('d')?full.slice(0,2):'')+(flags.includes('p')?full.slice(2,split+1):'')+(flags.includes('n')?stem:'')+(flags.includes('x')?extension:'');if(selected)parts.push(selected);return parts.filter(Boolean).join(' ');
  };
  const forParameter=(body,variable,value)=>body.replace(new RegExp('%{1,2}(?:~([fFdDpPnNxXzZtTaAsS]*)(?:\\$([a-zA-Z_][a-zA-Z_0-9]*):)?'+variable+'|'+variable+')','g'),(_m,modifiers,search)=>modifiers===undefined?value:parameter(value,modifiers,false,search));
  const profileComparisonCommand=command=>{const words=command.match(/"[^"]*"|[^\s"]+/g)?.map(v=>v.replace(/^"|"$/g,''))||[];if(!['fc','comp'].includes(words.shift()?.toLowerCase()))return false;const files=words.filter(v=>!/^\/[a-z0-9=]+$/i.test(v));return files.length===2&&files.every(value=>{const node=find(value);if(['file','folder'].includes(node?.kind)&&!node.virtual&&!node.id?.startsWith('host:'))return true;const path=cmdPath(value,cwd),parent=path.slice(0,path.lastIndexOf('/'));return parent.toLowerCase()===cmdPath(home||'/C/').toLowerCase()||getNodes().some(n=>n.kind==='folder'&&!n.virtual&&!n.id?.startsWith('host:')&&pathOf(n).toLowerCase()===parent.toLowerCase());});};
  const matching=(pattern,kind)=>{const target=cmdPath(pattern,cwd);return getNodes().filter(n=>(!kind||n.kind===kind)&&cmdWildcard(target,pathOf(n))).sort((a,b)=>pathOf(a).localeCompare(pathOf(b)));};
  const directory = path => /^\/[a-z]$/i.test(path) || getNodes().some(n => (n.kind === 'folder' && pathOf(n).toLowerCase() === path.toLowerCase()) || pathOf(n).toLowerCase().startsWith(path.toLowerCase() + '/'));
  const profileTransferCommand=command=>{
   if(!hooks.transfer)return false;const words=command.match(/"[^"]*"|[^\s"]+/g)?.map(v=>v.replace(/^"|"$/g,''))||[],verb=words.shift()?.toLowerCase(),args=words.filter(x=>!/^\/(-?y|s|e|i|h|r|k)$/i.test(x));if(!['copy','xcopy','move','replace'].includes(verb)||args.length!==2)return false;
   const known=value=>cmdPath(home||'/C/').toLowerCase()===value.toLowerCase()||getNodes().some(n=>n.kind==='folder'&&!n.virtual&&!n.id?.startsWith('host:')&&pathOf(n).toLowerCase()===value.toLowerCase()),source=find(args[0]),sourcePath=cmdPath(args[0],cwd),dest=cmdPath(args[1],cwd),parent=dest.slice(0,dest.lastIndexOf('/'));
   return (source&&!source.id?.startsWith('host:')||/[*?]/.test(args[0])&&known(sourcePath.slice(0,sourcePath.lastIndexOf('/'))))&&(known(dest)||known(parent));
  };
  const profileDirectoryCommand=command=>{const words=command.match(/"[^"]*"|[^\s"]+/g)?.map(v=>v.replace(/^"|"$/g,''))||[];if(words.shift()?.toLowerCase()!=='dir')return false;const known=value=>cmdPath(home||'/C/').toLowerCase()===value.toLowerCase()||getNodes().some(n=>n.kind==='folder'&&!n.virtual&&!n.id?.startsWith('host:')&&pathOf(n).toLowerCase()===value.toLowerCase());let options;try{options=cmdDirectoryOptions(words);}catch{const targets=words.filter(v=>!v.startsWith('/'));return(targets.length?targets:['.']).every(value=>{const path=cmdPath(value,cwd);return known(path)||known(path.slice(0,path.lastIndexOf('/')));});}return options.targets.every(value=>{const path=cmdPath(value,cwd);return known(path)||known(path.slice(0,path.lastIndexOf('/')));});};
  async function listDirectory(args){
   const options=cmdDirectoryOptions(args);if(options.pause&&!hooks.pause)throw Error('Tastatureingabe für DIR /P ist nicht verbunden.');let lines=0;const emit=async text=>{print(text);if(options.pause&&++lines%23===0){print('Drücken Sie eine beliebige Taste . . .');await hooks.pause(controller.signal);}controller.signal.throwIfAborted();};
   const allowed=n=>options.attributes.every(({attribute,negate})=>(attribute==='D'?n.kind==='folder':!!n.hidden)!==negate)&&(!options.defaultAttributes||!n.hidden),ext=n=>n.name.includes('.')?n.name.slice(n.name.lastIndexOf('.')+1):'',compare=(a,b)=>{for(const {field,reverse}of options.order){const delta=field==='G'?Number(b.kind==='folder')-Number(a.kind==='folder'):field==='S'?(Number.isFinite(a.size)?a.size:Infinity)-(Number.isFinite(b.size)?b.size:Infinity):field==='D'?cmdModifiedTime(a)-cmdModifiedTime(b):field==='E'?ext(a).localeCompare(ext(b),'de',{sensitivity:'base'}):a.name.localeCompare(b.name,'de',{numeric:true,sensitivity:'base'});if(delta&&!Number.isNaN(delta))return reverse?-delta:delta;}return a.name.localeCompare(b.name,'de',{numeric:true,sensitivity:'base'});};
   for(const value of options.targets){const requested=cmdPath(value,cwd),root=directory(requested)?requested:requested.slice(0,requested.lastIndexOf('/')),mask=directory(requested)?'*.*':requested.slice(requested.lastIndexOf('/')+1);if(!directory(root))throw Error('Pfad nicht gefunden.');const folders=[root];if(options.recursive)folders.push(...getNodes().filter(n=>n.kind==='folder'&&!n.virtual&&pathOf(n).toLowerCase().startsWith(root.toLowerCase()+'/')&&(!options.defaultAttributes||!getNodes().some(parent=>parent.kind==='folder'&&parent.hidden&&pathOf(parent).toLowerCase().startsWith(root.toLowerCase()+'/')&&(pathOf(n).toLowerCase()===pathOf(parent).toLowerCase()||pathOf(n).toLowerCase().startsWith(pathOf(parent).toLowerCase()+'/'))))).map(pathOf).sort((a,b)=>a.localeCompare(b,'de',{numeric:true})));let total=0;
    for(const folder of [...new Set(folders)]){controller.signal.throwIfAborted();const entries=getNodes().filter(n=>!n.virtual&&pathOf(n).slice(0,pathOf(n).lastIndexOf('/')).toLowerCase()===folder.toLowerCase()&&cmdWildcard(mask,n.name)&&allowed(n)).sort(options.lower&&!options.order.length?()=>0:compare);if(!entries.length)continue;total+=entries.length;if(!options.bare)await emit(' Verzeichnis von '+cmdDisplay(folder));const display=n=>options.lower?n.name.toLowerCase():n.name;
     if(options.wide&&!options.bare){const names=entries.map(n=>n.kind==='folder'?'['+display(n)+']':display(n)),width=Math.max(14,...names.map(n=>n.length+2));for(let i=0;i<names.length;i+=5)await emit(names.slice(i,i+5).map(n=>n.padEnd(width)).join('').trimEnd());}
     else for(const n of entries)await emit(options.bare?(options.recursive?(options.lower?cmdDisplay(pathOf(n)).toLowerCase():cmdDisplay(pathOf(n))):display(n)):cmdDirectoryDate(n.modified)+'  '+(n.kind==='folder'?'    <DIR>      ':Number.isFinite(n.size)?String(n.size).padStart(14)+' ':'               ')+display(n));
    }if(!total)throw Error('Datei nicht gefunden.');
   }
  }
  const apps = { control:'control-panel',systemsteuerung:'control-panel', cmd:'terminal',terminal:'terminal',explorer:'explorer',notepad:'editor','notepad++':'editor',word:'office-text',winword:'office-text',writer:'office-text',excel:'office-sheet',powerpoint:'office-presentation',powerpnt:'office-presentation',vlc:'media',media:'media',fotoanzeige:'photo',photo:'photo',browser:'browser',iexplore:'browser','internet-explorer':'browser',taskmgr:'task-manager','task-manager':'task-manager' };
  const shell={ get cwd() { return cwd; }, set cwd(value) { cwd=cmdPath(value); }, async execute(command) {
    command=command.replace(/^cd(?=\.\.|[\\/])/i,'cd ');
    let args = command.match(/"[^"]*"|[^\s"]+/g)?.map(v => v.replace(/^"|"$/g,'')) || [];
    if (!args.length) return;
    let name = args.shift(), verb = name.toLowerCase();
    const extension=await extended(verb,args,command);if(extension)return extension;
    if (verb === 'start') { if (args[0] === '') args.shift(); name = args.shift() || 'cmd'; verb = name.toLowerCase(); }
    if (['mkdir','md','rename','ren','del','erase','nano'].includes(verb)) {
      const renameCommand=['rename','ren'].includes(verb);if(args.length!==(renameCommand?2:1))throw Error(renameCommand?'Syntax: rename "Dateiname" "Neuer Name"':'Syntax: '+verb+' "Name oder Pfad"');
      const path=cmdPath(args[0],cwd),node=find(args[0]);
      if(verb==='mkdir'||verb==='md'){if(node)throw Error('Datei oder Ordner existiert bereits.');return mkdir(path);}
      if(verb==='nano'){if(node&&node.kind!=='file')throw Error('Bitte eine Textdatei auswählen.');return edit(node,path);}
      if(!node)throw Error('Datei oder Pfad nicht gefunden.');
      if(renameCommand){if(/[\\/]/.test(args[1])||['.','..'].includes(args[1]))throw Error('Bitte nur den neuen Namen angeben.');return rename(node,args[1]);}
      if(node.kind==='folder')throw Error('DEL löscht Dateien. Bitte einen Dateinamen angeben.');return remove(node);
    }
    if (verb === 'hostname') return print('Windows7');
    if (verb === 'ipconfig') return print('Windows-IP-Konfiguration\n\n   Öffentliche IP-Adresse . . . . . : ' + await publicIP());
    if (verb === 'cls') return print(null);
    if (verb === 'exit') return close();
    if (verb === 'echo') return print(args.join(' '));
    if (verb === 'help' || verb === '/?') return print(CMD_HELP);
    if (verb === 'cd' || verb === 'chdir' || /^[a-z]:$/i.test(verb)) {
      if (args[0]?.toLowerCase() === '/d') args.shift();
      if (!args.length && !/^[a-z]:$/i.test(verb)) return print(cmdDisplay(cwd));
      const path = cmdPath(/^[a-z]:$/i.test(verb) ? name : args.join(' '), cwd);
      if (!directory(path)) throw Error('Das System kann den angegebenen Pfad nicht finden.');
      cwd = path; return;
    }
    if (verb === 'dir') return listDirectory(args);
    const executable=verb.replaceAll('\\','/').split('/').pop();
    const app = apps[executable.replace(/\.exe$/i,'')];
    if (app) { const file = args.length ? find(args.join(' ')) : null; if (args.length && !file) throw Error('Datei oder Pfad nicht gefunden.'); return launch(app,file); }
    const node = find(name) || getNodes().find(n => n.kind === 'link' && n.name.replace(/\.(lnk|url)$/i,'').toLowerCase() === verb);
    if(node&&/\.(bat|cmd)$/i.test(node.name))return batch(node,args);
    if (node) return node.kind === 'folder' ? launch('explorer',node) : open(node);
    throw Error('Der Befehl "' + name + '" ist entweder falsch geschrieben oder konnte nicht gefunden werden.');
  } };
  const env={USERNAME:decodeURIComponent(home||'').split('/').filter(Boolean).at(-1)||'User',USERPROFILE:cmdDisplay(cmdPath(home||'/C/')),COMPUTERNAME:'Windows7',OS:'Windows_NT',ERRORLEVEL:'0'};
  let depth=0,steps=0,echo=true;const frames=[];const localEnvironments=[],directoryStack=[];
  const read=async value=>{const n=typeof value==='string'?find(value):value;if(!n||n.kind!=='file')throw Error('Datei nicht gefunden.');if(!hooks.read)throw Error('Dateizugriff ist nicht verbunden.');return hooks.read(n);};
  async function batch(node,args=[],label){
    if(depth>=8)throw Error('Maximal 8 verschachtelte Batchdateien.');
    const lines=cmdBatchLines(await read(node)),localDepth=localEnvironments.length,frame={node,args:[...args],lines,index:0,exit:false,jump:null};
    const labelIndex=name=>lines.findIndex(line=>line.trim().toLowerCase()===':'+name.replace(/^:/,'').toLowerCase());
    if(label){const target=labelIndex(label);if(target<0)throw Error('Sprungmarke nicht gefunden: '+label);frame.index=target+1;}
    depth++;frames.push(frame);
    try{
      for(;frame.index<lines.length&&!frame.exit;frame.index++){
        let line=lines[frame.index].trim();if(!line||line.startsWith(':')||/^rem(?: |$)/i.test(line))continue;
        if(++steps>2000)throw Error('Batch-Limit von 2.000 Befehlen erreicht.');
        line=line.replace(/%~([fdpnxztas]*)(?:\$([a-z_][a-z_0-9]*):)?([0-9])/gi,(_m,modifiers,search,n)=>parameter(n==='0'?(modifiers?pathOf(node):node.name):frame.args[Number(n)-1],modifiers,n==='0',search)).replace(/%\*/g,()=>frame.args.join(' ')).replace(/%([0-9])/g,(_m,n)=>n==='0'?node.name:frame.args[Number(n)-1]||'');
        if(echo&&!line.startsWith('@'))print(cmdDisplay(cwd)+'>'+line);
        await shell.execute(line.replace(/^@/,''));
        if(frame.jump!==null){frame.index=frame.jump;frame.jump=null;}
      }
    }finally{while(localEnvironments.length>localDepth){const previous=localEnvironments.pop(),code=env.ERRORLEVEL;for(const k of Object.keys(env))delete env[k];Object.assign(env,previous,{ERRORLEVEL:code});}frames.pop();depth--;}
  }
  const original=shell.execute.bind(shell);
  shell.execute=async command=>{
   try{
    command=String(command).trim();
    if(!depth)steps=0;
    const chain=cmdChain(command);
    if(chain.length>1){let failure;for(const item of chain){if(frames.at(-1)?.exit||frames.at(-1)?.jump!==null&&frames.at(-1)?.jump!==undefined)break;if(item.when==='&&'&&env.ERRORLEVEL!=='0'||item.when==='||'&&env.ERRORLEVEL==='0')continue;try{await shell.execute(item.text);failure=null;}catch(error){failure=error;if(error.message==='^C')throw error;if(!error.cmdReported){print(error.message);error.cmdReported=true;}}}if(failure)throw failure;return;}
    command=command.replace(/%([^%]+)%/g,(m,k)=>env[k.toUpperCase()]??m);
    if(command.startsWith('(')&&command.endsWith(')'))return shell.execute(command.slice(1,-1));
    if(/^comp(?:\s|$)/i.test(command)&&hooks.readLine&&!command.match(/(?:^|\s)\/\?(?:\s|$)/)){
      const words=command.match(/"[^"]*"|[^\s"]+/g)?.slice(1).map(value=>value.replace(/^"|"$/g,''))||[];let options=words.filter(value=>/^\/[a-z0-9=]+$/i.test(value)),files=words.filter(value=>!options.includes(value)),status=0;
      const ask=async question=>{controller.signal.throwIfAborted();const response=await hooks.readLine(question,controller.signal);controller.signal.throwIfAborted();return String(response).trim();};
      const filename=async question=>{let value='';while(!value)value=(await ask(question)).replace(/^"|"$/g,'');return value;};
      const readOptions=async()=>{const updated=[];let next;while(next=await ask('Option: ')){const values=next.match(/\S+/g);compOptions(values);updated.push(...values);}if(updated.length)options=updated;};
      if(files.length<2){while(files.length<2)files.push(await filename(files.length?'Name der zweiten zu vergleichenden Datei: ':'Name der ersten zu vergleichenden Datei: '));await readOptions();}
      while(true){
       while(files.length<2)files.push(await filename(files.length?'Name der zweiten zu vergleichenden Datei: ':'Name der ersten zu vergleichenden Datei: '));
       try{status=(await extended('comp',[...files,...options],command)).cmdExitCode??0;}catch(error){if(controller.signal.aborted)throw error;status=error.cmdExitCode??2;print(error.message);}
       env.ERRORLEVEL=String(status);let answer='';while(!/^[jn]$/i.test(answer))answer=await ask('Weitere Dateien vergleichen (J/N) ? ');
       if(answer.toLowerCase()==='n')return;
       files=[await filename('Name der ersten zu vergleichenden Datei: '),await filename('Name der zweiten zu vergleichenden Datei: ')];
       await readOptions();
      }
    }
    if(/^if\s/i.test(command)){
      let rest=command.slice(2).trim(),ignore=false,invert=false,match,condition;
      if(/^\/i\s/i.test(rest)){ignore=true;rest=rest.slice(2).trim();}
      if(/^not\s/i.test(rest)){invert=true;rest=rest.slice(3).trim();}
      if(match=rest.match(/^exist\s+("[^"]*"|\S+)\s+([\s\S]+)$/i))condition=matching(match[1].replace(/^"|"$/g,'')).length>0||!/[?*]/.test(match[1])&&directory(cmdPath(match[1].replace(/^"|"$/g,''),cwd));
      else if(match=rest.match(/^defined\s+(\S+)\s+([\s\S]+)$/i))condition=Object.hasOwn(env,match[1].toUpperCase())&&env[match[1].toUpperCase()]!=='';
      else if(match=rest.match(/^errorlevel\s+(-?\d+)\s+([\s\S]+)$/i))condition=Number(env.ERRORLEVEL)>=Number(match[1]);
      else if(match=rest.match(/^("[^"]*"|[^\s=]+)\s*==\s*("[^"]*"|\S+)\s+([\s\S]+)$/i)){const left=match[1],right=match[2];condition=ignore?left.toLowerCase()===right.toLowerCase():left===right;match=[match[0],null,match[3]];}
      else if(match=rest.match(/^("[^"]*"|\S+)\s+(equ|neq|lss|leq|gtr|geq)\s+("[^"]*"|\S+)\s+([\s\S]+)$/i)){let left=match[1].replace(/^"|"$/g,''),right=match[3].replace(/^"|"$/g,'');if(/^-?\d+$/.test(left)&&/^-?\d+$/.test(right)){left=Number(left);right=Number(right);}else if(ignore){left=left.toLowerCase();right=right.toLowerCase();}condition=({equ:()=>left===right,neq:()=>left!==right,lss:()=>left<right,leq:()=>left<=right,gtr:()=>left>right,geq:()=>left>=right})[match[2].toLowerCase()]();match=[match[0],null,match[4]];}
      else throw Error('Syntax: IF [NOT] EXIST Datei Befehl, IF ERRORLEVEL Zahl Befehl oder IF Zeichenfolge==Zeichenfolge Befehl');
      let action=match[2],otherwise;const branches=action.match(/^\(([\s\S]*)\)\s+else\s+\(([\s\S]*)\)$/i);if(branches){action=branches[1];otherwise=branches[2];}
      if(condition!==invert)return shell.execute(action);if(otherwise!==undefined)return shell.execute(otherwise);return;
    }
    if(/^for\s/i.test(command)){
      const parsed=command.match(/^for\s+\/f\s+(?:"([^"]*)"\s+)?%{1,2}([a-z])\s+in\s+\(([\s\S]*)\)\s+do\s+([\s\S]+)$/i);
      if(parsed){
        const options={tokens:'1',delims:' \t',skip:0,eol:';',usebackq:false},spec=parsed[1]||'';
        for(const opt of spec.matchAll(/(?:^|\s)(tokens|delims|skip|eol)=([\s\S]*?)(?=\s+(?:tokens|delims|skip|eol)=|\s+usebackq(?:\s|$)|$)|(?:^|\s)(usebackq)(?=\s|$)/gi)){if(opt[3])options.usebackq=true;else options[opt[1].toLowerCase()]=opt[2];}
        options.skip=Number(options.skip);if(!Number.isInteger(options.skip)||options.skip<0)throw Error('FOR /F: SKIP erwartet eine nichtnegative Zahl.');
        let source=parsed[3].trim(),data;
        const commandQuote=options.usebackq?'`':"'",stringQuote=options.usebackq?"'":'"';
        if(source.startsWith(commandQuote)&&source.endsWith(commandQuote)){const outer=print,lines=[];try{print=x=>{if(x!==null)lines.push(String(x));};await shell.execute(source.slice(1,-1));data=lines.join('\n');}finally{print=outer;}}
        else if(source.startsWith(stringQuote)&&source.endsWith(stringQuote))data=source.slice(1,-1);
        else{const files=source.match(/"[^"]*"|\S+/g)||[];data=(await Promise.all(files.map(file=>read(file.replace(/^"|"$/g,''))))).join('\n');}
        const tokenNumbers=[];let remainder=false;for(const part of options.tokens.split(',')){if(part==='*'){remainder=true;continue;}const range=part.match(/^(\d+)(?:-(\d+))?(\*)?$/);if(!range)throw Error('FOR /F: ungültige TOKENS.');const first=Number(range[1]),last=Number(range[2]||range[1]);if(first<1||last<first||last>31)throw Error('FOR /F: TOKENS müssen zwischen 1 und 31 liegen.');for(let n=first;n<=last;n++)tokenNumbers.push(n);if(range[3])remainder=true;}
        const delimiters=new Set(options.delims);
        let count=0;for(const line of data.split(/\r?\n/).slice(options.skip)){
          const fields=[];let position=0;while(position<line.length){while(delimiters.has(line[position]))position++;if(position>=line.length)break;const start=position;while(position<line.length&&!delimiters.has(line[position]))position++;fields.push({value:line.slice(start,position),start});}
          if(!fields.length||options.eol&&fields[0].value.startsWith(options.eol[0]))continue;
          if(++count>200)throw Error('Maximal 200 Schleifendurchläufe.');
          const values=tokenNumbers.map(n=>fields[n-1]?.value||'');if(remainder){const rest=fields[tokenNumbers.length?Math.max(...tokenNumbers):0];values.push(rest?line.slice(rest.start):'');}
          let body=parsed[4];values.forEach((value,i)=>{const variable=String.fromCharCode(parsed[2].charCodeAt(0)+i);body=forParameter(body,variable,value);});await shell.execute(body);
        }
        return;
      }

      const m=command.match(/^for\s+(?:(\/[ldr])\s+(?:("[^"]*"|[^%\s]+)\s+)?)?%{1,2}([a-z])\s+in\s+\(([^)]*)\)\s+do\s+([\s\S]+)$/i);if(!m)throw Error('Syntax: FOR [/L | /D | /R [Pfad]] %i IN (Werte) DO Befehl');
      const mode=m[1]?.toLowerCase(),raw=m[4].match(/"[^"]*"|\S+/g)||[];let values=[];
      if(mode==='/l'){const nums=m[4].split(',').map(x=>Number(x.trim()));if(m[2]||nums.length!==3||nums.some(x=>!Number.isSafeInteger(x))||nums[1]===0)throw Error('FOR /L erwartet (Start,Schritt,Ende) mit Schritt ungleich 0.');const [start,step,end]=nums;for(let v=start;step>0?v<=end:v>=end;v+=step){if(values.length>=200)throw Error('Maximal 200 Schleifendurchläufe.');values.push(String(v));}}
      else if(mode==='/r'){
        const root=cmdPath((m[2]||'.').replace(/^"|"$/g,''),cwd);if(!directory(root))throw Error('Pfad nicht gefunden.');
        const folders=[root,...getNodes().filter(n=>n.kind==='folder'&&pathOf(n).toLowerCase().startsWith(root.toLowerCase()+'/')).map(pathOf)].sort();
        for(const folder of folders)for(const token of raw){const pattern=token.replace(/^"|"$/g,'');if(pattern==='.')values.push(cmdDisplay(folder));else for(const n of getNodes().filter(n=>n.kind==='file'&&cmdWildcard(cmdPath(pattern,folder),pathOf(n))).sort((a,b)=>pathOf(a).localeCompare(pathOf(b))))values.push(cmdDisplay(pathOf(n)));}
      }else{
        if(m[2])throw Error('Nur FOR /R unterstützt einen zusätzlichen Suchpfad.');
        for(const token of raw){const pattern=token.replace(/^"|"$/g,'');if(/[*?]/.test(pattern)){const matches=matching(pattern,mode==='/d'?'folder':'file');const separator=Math.max(pattern.lastIndexOf('\\'),pattern.lastIndexOf('/')),base=pattern.slice(0,separator+1);values.push(...matches.map(n=>base+n.name));}else values.push(pattern);}
      }
      if(values.length>200)throw Error('Maximal 200 Schleifendurchläufe.');
      for(const v of values)await shell.execute(forParameter(m[5],m[3],v));return;
    }

    const redirection=cmdRedirect(command),pipes=splitCommand(redirection?redirection[1]:command,'|');
    if(pipes.length>1||redirection){let stdin='',output=[];const outer=print;try{for(const [index,part] of pipes.entries()){hooks.stdin=stdin;output=[];print=(value,format)=>{if(value!==null)output.push(String(value)+(format?.raw?'':'\n'));};await shell.execute(part.trim()+(/^(find|sort)\b/i.test(part.trim())&&index>0?' "@@STDIN@@"':''));stdin=output.join('').replace(/\n$/,'');}if(redirection){if(!hooks.write)throw Error('Schreibzugriff ist nicht verbunden.');const target=cmdPath(redirection[3].trim().replace(/^"|"$/g,''),cwd),old=redirection[2]==='>>'&&find(target)?await read(target):'';await hooks.write(target,old+stdin+'\r\n');}else outer(stdin);}finally{print=outer;delete hooks.stdin;}return;}
      if(hooks.native&&!profileTransferCommand(command)&&!profileDirectoryCommand(command)&&!profileComparisonCommand(command)&&!(hooks.stdin!==undefined&&/^(find|sort)\b/i.test(command))){const native=await hooks.native(command,cwd,{signal:controller.signal,onOutput:chunk=>print(chunk,{raw:true})});if(native?.handled){if(native.cwd)cwd=cmdPath('/C'+native.cwd);if(native.output)print(native.output);env.ERRORLEVEL=String(native.exitCode??0);return;}}
      const result=await original(command.replace(/\^(.)/gs,'$1'));
      if(Number.isInteger(result?.cmdExitCode))env.ERRORLEVEL=String(result.cmdExitCode);else if(!/^(?:exit\s+\/b|call\s|goto\s)/i.test(command))env.ERRORLEVEL='0';
   }catch(error){env.ERRORLEVEL=String(error.cmdExitCode??1);throw error;}
  };
  async function extended(verb,args,command){
    if(args.includes('/?')&&CMD_COMMANDS.includes(verb)){print(verb.toUpperCase()+' — '+(CMD_DESCRIPTIONS[verb]||'Windows-Webdesktop-Befehl')+'\n'+(CMD_PENDING.includes(verb)?'Noch nicht als Funktion umgesetzt; siehe WINDOWS7-TODO.md.':'HELP zeigt die verfügbaren Befehle.'));return true;}
    const text=()=>args.join(' '),need=n=>{if(args.length<n)throw Error('Zu wenige Parameter. '+verb.toUpperCase()+' /?');};
    if(verb==='cmd'&&args.length){if(!/^\/[ck]$/i.test(args[0]))throw Error('CMD /C Befehl oder CMD /K Befehl');await shell.execute(args.slice(1).join(' '));return true;}
    if(verb==='rem'||verb.startsWith('::'))return true;
    if(verb==='setlocal'){localEnvironments.push({...env});return true;}
    if(verb==='endlocal'){const previous=localEnvironments.pop();if(previous){for(const k of Object.keys(env))delete env[k];Object.assign(env,previous);}return true;}
    if(verb==='pushd'){need(1);const target=cmdPath(text(),cwd);if(!directory(target))throw Error('Pfad nicht gefunden.');directoryStack.push(cwd);cwd=target;return true;}
    if(verb==='popd'){if(directoryStack.length)cwd=directoryStack.pop();return true;}

    if(verb==='echo'&&/^(on|off)$/i.test(text())){echo=text().toLowerCase()==='on';return true;}
    if(verb==='echo.'||verb==='echo('){print('');return true;}
    if(verb==='set'){if(!args.length)print(Object.entries(env).map(([k,v])=>k+'='+v).join('\n'));else{const [k,...v]=text().replace(/^"|"$/g,'').split('=');if(!v.length)print(env[k.toUpperCase()]||'');else env[k.toUpperCase()]=v.join('=');}return true;}
    if(verb==='ver'){print('Microsoft Windows [Version 6.1.7601]');return true;}
    if(verb==='title'){hooks.title?.(text());return true;}
    if(verb==='prompt'){hooks.prompt?.(text()||'$P$G');return true;}
    if(verb==='color'){const code=text()||'07';if(!/^[0-9a-f]{2}$/i.test(code)||code[0].toLowerCase()===code[1].toLowerCase())throw Error('COLOR erwartet zwei unterschiedliche Hex-Ziffern (z. B. 0A).');hooks.color?.(code);return true;}
    if(verb==='date'||verb==='time'){if(args.length&&args[0].toLowerCase()!=='/t')throw Error('Systemzeit ändern: bitte Datum und Uhrzeit in der Systemsteuerung öffnen.');print(verb==='date'?new Date().toLocaleDateString('de-DE'):new Date().toLocaleTimeString('de-DE'));return true;}
    if(verb==='timeout'){const seconds=Number(args[0]?.toLowerCase()==='/t'?args[1]:args[0]);if(!Number.isInteger(seconds)||seconds<0||seconds>300)throw Error('TIMEOUT /T Sekunden (0–300)');print('Warte '+seconds+' Sekunden …');await waitFor(seconds*1000);return true;}
    if(verb==='pause'){if(!hooks.pause)throw Error('Tastatureingabe ist nicht verbunden.');print('Drücken Sie eine beliebige Taste . . .');await hooks.pause?.(controller.signal);return true;}
    if(verb==='call'){need(1);if(args[0].startsWith(':')){const frame=frames.at(-1);if(!frame)throw Error('CALL :Label ist nur in Batchdateien möglich.');await batch(frame.node,args.slice(1),args[0]);return true;}const n=find(args[0]);if(!n||!/\.(bat|cmd)$/i.test(n.name))throw Error('Batchdatei nicht gefunden.');await batch(n,args.slice(1));return true;}
    if(verb==='exit'&&args[0]?.toLowerCase()==='/b'){if(args[1]!==undefined)env.ERRORLEVEL=String(Number.parseInt(args[1],10)||0);if(frames.length)frames.at(-1).exit=true;return true;}
    if(verb==='goto'){need(1);const frame=frames.at(-1);if(!frame)throw Error('GOTO ist nur in Batchdateien möglich.');if(text().toLowerCase()===':eof'){frame.exit=true;return true;}const target=frame.lines.findIndex(line=>line.trim().toLowerCase()===':'+text().replace(/^:/,'').toLowerCase());if(target<0)throw Error('Sprungmarke nicht gefunden: '+text());frame.jump=target;return true;}
    if(verb==='shift'){const frame=frames.at(-1);if(!frame)throw Error('SHIFT ist nur in Batchdateien möglich.');frame.args.shift();return true;}
    if(verb==='type'){need(1);for(const arg of args){const files=/[*?]/.test(arg)?matching(arg,'file'):[find(arg)];if(!files.length||!files[0])throw Error('Datei nicht gefunden.');for(const file of files)print(await read(file));}return true;}

    if(verb==='find'||verb==='sort'){const piped=args.includes('@@STDIN@@'),source=piped?hooks.stdin||'':await read(args.at(-1)),lines=source.split(/\r?\n/);if(verb==='sort'){lines.sort((a,b)=>a.localeCompare(b,'de'));if(args.some(a=>a.toLowerCase()==='/r'))lines.reverse();print(lines.join('\n'));}else{const needle=args.find(a=>!a.startsWith('/')&&a!=='@@STDIN@@'&&(piped||a!==args.at(-1)))||args[0],ignore=args.some(a=>a.toLowerCase()==='/i'),inverse=args.some(a=>a.toLowerCase()==='/v'),found=lines.filter(line=>(ignore?line.toLowerCase().includes(needle.toLowerCase()):line.includes(needle))!==inverse);print(args.some(a=>a.toLowerCase()==='/c')?String(found.length):found.join('\n'));}return true;}
    if(['fc','comp'].includes(verb)){
     try{const options=args.filter(v=>/^\/[a-z0-9=]+$/i.test(v)),files=args.filter(v=>!options.includes(v));if(files.length!==2||options.some(v=>!(verb==='fc'?/^\/(?:[abclntuw]|lb[0-9]+|[0-9]+|off(?:line)?)$/i:/^\/(?:[dalc]|n=[0-9]+|off(?:line)?)$/i).test(v)))throw Error(verb==='fc'?'FC unterstützt derzeit /B oder /A /C /L /LBn /N /T /U /W /nnnn mit zwei Dateien.':'COMP unterstützt derzeit /D /A /L /C /N=Zeilen mit zwei Dateien.');const comparePair=async files=>{const binary=verb==='comp'||options.some(v=>/^\/b$/i.test(v))||!options.some(v=>/^\/[lu]$/i.test(v))&&/\.(exe|com|sys|obj|lib|bin)$/i.test(files[0]);if(options.some(v=>/^\/b$/i.test(v))&&options.some(v=>/^\/l$/i.test(v)))throw Error('FC /B und /L dürfen nicht kombiniert werden.');
      if(binary&&verb==='fc'&&options.some(v=>!/^\/(?:b|off(?:line)?)$/i.test(v)))throw Error('FC: Textvergleichsschalter benötigen /L oder eine Textdatei.');
      if(binary){if(!hooks.readBytes)throw Error('Binärer Dateizugriff ist nicht verbunden.');const bytes=[];for(const value of files){const node=find(value);if(node?.kind!=='file')throw Error('Datei nicht gefunden.');if(node.size>COMPARISON_LIMIT)throw Error('Dateivergleich ist auf 32 MiB pro Datei begrenzt.');bytes.push(await hooks.readBytes(node,controller.signal));controller.signal.throwIfAborted();}return await compareBinary(bytes[0],bytes[1],{mode:verb,...(verb==='comp'?compOptions(options):{}),leftName:files[0],rightName:files[1],print,signal:controller.signal});}
      const settings=fcTextOptions(options),contents=[];for(const value of files){if(settings.unicode){if(!hooks.readBytes)throw Error('FC /U benötigt unveränderte UTF-16-Dateibytes.');const node=find(value);if(node?.kind!=='file')throw Error('Datei nicht gefunden.');if(node.size>COMPARISON_LIMIT)throw Error('Dateivergleich ist auf 32 MiB pro Datei begrenzt.');const bytes=await hooks.readBytes(node,controller.signal);contents.push(new TextDecoder('utf-16le').decode(bytes));}else contents.push(await read(value));controller.signal.throwIfAborted();}return await compareText(contents[0],contents[1],{...settings,leftName:files[0],rightName:files[1],print,signal:controller.signal});
      };
      if(verb==='comp')for(let index=0;index<files.length;index++){const path=cmdPath(files[index],cwd);if(directory(path))files[index]=cmdDisplay(path)+'/*.*';}
      const hasPattern=files.some(value=>/[*?]/.test(value));if(!hasPattern)return{cmdExitCode:await comparePair(files)};
      const sourcePattern=/[*?]/.test(files[0]),sources=sourcePattern?matching(files[0],'file'):[find(files[0])];
      if(!sources.length||!sources[0])throw Error('Datei nicht gefunden: '+files[0]);
      const target=cmdPath(files[1],cwd),split=target.lastIndexOf('/'),targetFolder=target.slice(0,split+1),targetMask=target.slice(split+1);let status=0;
      for(const node of sources){controller.signal.throwIfAborted();try{
       if(node.kind!=='file'||node.id?.startsWith('host:'))throw Error('Keine lesbare Profildatei.');
       const left=sourcePattern?cmdDisplay(pathOf(node)):files[0],right=/[*?]/.test(targetMask)?cmdDisplay(targetFolder+comparisonTargetName(targetMask,node.name)):files[1];
       status=Math.max(status,await comparePair([left,right]));
      }catch(error){if(controller.signal.aborted)throw error;print(verb.toUpperCase()+': '+error.message);status=2;}}
      return{cmdExitCode:status};
     }catch(error){error.cmdExitCode=2;throw error;}
    }
    if(verb==='diskcomp'){need(2);const a=await read(args[0]),b=await read(args[1]);print(a===b?'FC: Keine Unterschiede gefunden.':'Dateien unterscheiden sich.\n'+a+'\n*****\n'+b);return true;}
    if(verb==='tree'){const base=cmdPath(args.find(a=>!/^\/[af]$/i.test(a))||'.',cwd);if(!directory(base))throw Error('Pfad nicht gefunden.');print(cmdDisplay(base));for(const n of getNodes().filter(n=>pathOf(n).startsWith(base+'/')&&(n.kind==='folder'||args.some(a=>a.toLowerCase()==='/f'))).sort((a,b)=>pathOf(a).localeCompare(pathOf(b))))print('  '.repeat(pathOf(n).slice(base.length+1).split('/').length-1)+'+---'+n.name);return true;}
    if(['copy','xcopy','move','replace'].includes(verb)){
     const a=args.filter(x=>!/^\/(-?y|s|e|i|h|r|k)$/i.test(x));if(a.length!==2)throw Error('Syntax: '+verb+' "Quelle" "Ziel"');if(!hooks.transfer)throw Error('Dateiübertragung ist nicht verbunden.');
     const wildcard=/[*?]/.test(a[0]),sourcePath=cmdPath(a[0],cwd),sourceFolder=verb==='xcopy'?(wildcard?find(sourcePath.slice(0,sourcePath.lastIndexOf('/'))):find(a[0])):null,xcopy=sourceFolder?.kind==='folder'?{pattern:wildcard?sourcePath.slice(sourcePath.lastIndexOf('/')+1):'*.*',recursive:args.some(x=>/^\/[se]$/i.test(x)),empty:args.some(x=>/^\/e$/i.test(x)),assumeDirectory:args.some(x=>/^\/i$/i.test(x))}:undefined,sources=xcopy?[sourceFolder]:wildcard?matching(a[0]).filter(n=>n.kind!=='folder'&&!n.virtual&&!n.system):[find(a[0])];if(!sources.length||!sources[0])throw Error('Quelldatei nicht gefunden.');if(sources.length>10000)throw Error('Maximal 10000 Quelldateien je Befehl.');
     const dest=cmdPath(a[1],cwd),destNode=find(a[1]);if((wildcard||xcopy)&&!xcopy?.assumeDirectory&&!(destNode?.kind==='folder'&&!destNode.virtual)&&dest.toLowerCase()!==cmdPath(home||'/C/').toLowerCase())throw Error('Für Dateimuster muss das Ziel ein vorhandener Profilordner sein. Zusammenfügen mehrerer Dateien ist noch nicht umgesetzt.');
     const preset=verb==='replace'?[]:(env.COPYCMD||'').match(/\/-?y\b/gi)||[],switches=[...preset,...args.filter(x=>/^\/-?y$/i.test(x))],overwrite=switches.length?(switches.at(-1).toLowerCase()==='/y'?'replace':'prompt'):frames.length&&['copy','move'].includes(verb)?'replace':'prompt',batch=sources.length>1?crypto.randomUUID():undefined;let completed=0;
     try{for(const n of sources){controller.signal.throwIfAborted();const result=await hooks.transfer(n,dest,verb==='move',verb==='replace',{overwrite,batch,xcopy});if(result?.cancelled)throw Error('Vorgang abgebrochen.');if(!result?.skipped)completed+=result?.completedFiles??1;}}
     catch(error){if(completed)throw new Error(completed+(completed===1?' Eintrag':' Einträge')+' bereits verarbeitet. '+(controller.signal.aborted?'Vorgang abgebrochen.':error.message),{cause:error});throw error;}print(completed+' '+(completed===1?'Eintrag':'Einträge')+' verarbeitet.');return true;
    }
    if(verb==='rd'||verb==='rmdir'){need(1);const n=find(args.find(a=>!/^\/[sq]$/i.test(a)));if(!n||n.kind!=='folder')throw Error('Ordner nicht gefunden.');if(!args.some(a=>a.toLowerCase()==='/s')&&getNodes().some(x=>pathOf(x).startsWith(pathOf(n)+'/')))throw Error('Das Verzeichnis ist nicht leer. Für Unterordner /S angeben.');await remove(n);return true;}
    if(verb==='tasklist'){if(!hooks.tasks)throw Error('Taskmanager ist nicht verbunden.');const data=await hooks.tasks();print('Abbildname                 PID / Fenster-ID');for(const app of data?.applications||[])print(app.title+'    '+app.id);for(const p of data?.processes||[])print(p.name+'    '+p.pid);return true;}
    if(verb==='taskkill'){const index=args.findIndex(a=>/^\/(im|pid)$/i.test(a));if(index<0)throw Error('TASKKILL /IM Fenstername oder /PID Fenster-ID');const target=args[index+1],apps=(await hooks.tasks?.())?.applications||[],matches=apps.filter(a=>a.id===target||a.appId===target||a.title.toLowerCase()===target?.toLowerCase());if(!matches.length)throw Error('Kein passendes Desktop-Fenster. Host-Prozesse werden hier nicht beendet.');for(const app of matches)hooks.kill?.(app.id);print('Task beendet.');return true;}
    if(['systeminfo','getmac','netstat','route','driverquery','chkdsk','vol','attrib','compact','verify','ftype','gpresult','gpupdate','w32tm','netsh','chkntfs','mode','mountvol','label'].includes(verb)&&hooks.info){print(await hooks.info(verb,args));return true;}
    if(verb==='perfmon'){await launch('task-manager');return true;}
    if(CMD_PENDING.includes(verb))throw Error(verb.toUpperCase()+': Diese Funktion ist noch nicht umgesetzt. Der Ausbau ist in WINDOWS7-TODO.md erfasst.');
    return false;
  }
  let controller=new AbortController(),running=0;
  const execute=shell.execute;
  shell.execute=async command=>{if(frames.at(-1)?.exit)return;if(!running)controller=new AbortController();if(controller.signal.aborted)throw Error('^C');running++;try{const result=await execute(command);if(controller.signal.aborted)throw Error('^C');return result;}finally{running--;}};
  shell.cancel=()=>controller.abort();
  async function waitFor(ms){if(hooks.wait)return hooks.wait(ms,controller.signal);return new Promise((resolve,reject)=>{const done=()=>{controller.signal.removeEventListener('abort',abort);resolve();},timer=setTimeout(done,ms),abort=()=>{clearTimeout(timer);reject(Error('^C'));};controller.signal.addEventListener('abort',abort,{once:true});});}
  shell.complete=value=>{
    const match=value.match(/(?:^|\s)("[^"]*|[^\s"]*)$/);if(!match)return[];
    const raw=match[1],typed=raw.replace(/^"/,''),slash=Math.max(typed.lastIndexOf('\\'),typed.lastIndexOf('/')),base=slash<0?'':typed.slice(0,slash+1),prefix=typed.slice(slash+1).toLowerCase(),folder=cmdPath(base||'.',cwd),lead=value.slice(0,value.length-raw.length);
    return getNodes().filter(n=>pathOf(n).slice(0,pathOf(n).lastIndexOf('/')).toLowerCase()===folder.toLowerCase()&&n.name.toLowerCase().startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name)).map(n=>{const path=base+n.name;return lead+(raw.startsWith('"')||/\s/.test(path)?'"'+path+'"':path);});
  };
  return shell;
}

export function cmdWildcard(pattern,value){
 const escape=text=>text.replace(/[.+^${}()|[\]\\]/g,'\\$&');
 const source=pattern.split('/').map(part=>part==='*.*'?'[^/]*':escape(part).replace(/\*/g,'[^/]*').replace(/\?/g,'[^/]')).join('/');
 return new RegExp('^'+source+'$','i').test(value);
}

function cmdBatchLines(text){const result=[];let pending='',level=0,quoted=false,previousContinued=false;for(const source of text.split(/\r?\n/)){const line=source.trim();if(!pending&&(!line||line.startsWith(':')||/^rem(?: |$)/i.test(line))){result.push(line);continue;}const continued=/\^$/.test(line);const part=continued?line.slice(0,-1):line;pending+=(pending?(/\($/.test(pending)||/^\)/.test(part)||previousContinued?' ':' & '):'')+part;for(let i=0;i<part.length;i++){if(part[i]==='^'){i++;continue;}if(part[i]==='"')quoted=!quoted;if(!quoted){if(part[i]==='(')level++;else if(part[i]===')')level--;}}previousContinued=continued;if(level<0)throw Error('Unerwartete schließende Klammer in Batchdatei.');if(!level&&!continued){result.push(pending);pending='';quoted=false;}}if(level||pending)throw Error('Unvollständiger Befehlsblock in Batchdatei.');return result;}
// Only split unquoted operators at the current parenthesis level. Caret escapes
// remain intact until command execution, so escaped pipes/redirections are literal.
function cmdChain(text){const parts=[];let quoted=false,level=0,start=0,when='&';for(let i=0;i<text.length;i++){const c=text[i];if(c==='^'){i++;continue;}if(c==='"')quoted=!quoted;if(quoted)continue;if(c==='(')level++;else if(c===')')level--;if(level===0&&(c==='&'||c==='|'&&text[i+1]==='|')){parts.push({text:text.slice(start,i).trim(),when});when=text[i+1]===c?c+c:c;if(when.length===2)i++;start=i+1;}}parts.push({text:text.slice(start).trim(),when});return parts;}
function splitCommand(text,separator){const parts=[];let quoted=false,start=0,level=0;for(let i=0;i<text.length;i++){if(text[i]==='^'){i++;continue;}if(text[i]==='"')quoted=!quoted;if(!quoted){if(text[i]==='(')level++;else if(text[i]===')')level--;if(!level&&text[i]===separator){parts.push(text.slice(start,i));start=i+1;}}}parts.push(text.slice(start));return parts;}

const CMD_PENDING=['runas','shutdown','ftp','nslookup','pathping','ping','telnet','tftp','tracert','diskcopy','expand','defrag','diskpart','format','reg'];
const CMD_DESCRIPTIONS={call:'Batchdatei ausführen',type:'Textdatei anzeigen',copy:'Dateien kopieren',move:'Dateien verschieben',tasklist:'Desktop-Fenster und Host-Prozesse anzeigen',taskkill:'Desktop-Fenster schließen',color:'Konsolenfarben ändern',for:'FOR %i IN (Werte) DO Befehl',find:'FIND [/I] [/V] [/C] "Text" Datei',sort:'SORT [/R] Datei'};
const CMD_COMMANDS=('call cd cls cmd color date dir echo exit find hostname pause runas shutdown sort start taskkill tasklist time timeout title ver w32tm ftp ftype getmac ipconfig netsh netstat nslookup pathping ping route systeminfo telnet tftp tracert attrib comp compact copy xcopy diskcomp diskcopy erase del expand fc mkdir move rename replace rmdir rd tree type chkdsk chkntfs defrag diskpart driverquery format label mode mountvol verify vol for gpresult gpupdate perfmon prompt reg set rem').split(' ');
const CMD_HELP="Geben Sie HELP \"Befehlsname\" ein, um weitere Informationen zu einem bestimmten\nBefehl anzuzeigen.\nASSOC          Zeigt Dateierweiterungszuordnungen an bzw. ändert sie.\nATTRIB         Zeigt Dateiattribute an bzw. ändert sie.\nBREAK          Schaltet die erweiterte Überprüfung für STRG+C ein bzw. aus.\nBOOTCFG        Legt Eigenschaften zur Steuerung des Startladenvorganges in der\n               Startdatenbank fest.\nCACLS          Zeigt Datei-ACLs (Access Control List) an bzw. ändert sie.\nCALL           Ruft eine Batchdatei von einer anderen Batchdatei aus auf.\nCD             Zeigt den Namen des aktuellen Verzeichnisses an bzw. ändert\n               diesen.\nCHCP           Zeigt die aktive Codepagenummer an bzw. legt sie fest.\nCHDIR          Zeigt den Namen des aktuellen Verzeichnisses an bzw. ändert\n               es.\nCHKDSK         Überprüft einen Datenträger und zeigt einen Statusbericht an.\nCHKNTFS        Zeigt die Überprüfung des Datenträgers beim Start an bzw.\n               verändert sie.\nCLS            Löscht den Bildschirminhalt.\nCMD            Startet eine neue Instanz des Windows-Befehlsinterpreters.\nCOLOR          Legt die Hintergrund- und Vordergrundfarben für die Konsole\n               fest.\nCOMP           Vergleicht den Inhalt zweier Dateien oder Sätze von Dateien.\nCOMPACT        Zeigt die Komprimierung von Dateien auf NTFS-Partitionen an bzw.\n               ändert sie.\nCONVERT        Konvertiert FAT-Volumes in NTFS. Das aktuelle Laufwerk kann\n               nicht konvertiert werden.\nCOPY           Kopiert eine oder mehrere Dateien an eine andere Stelle.\nDATE           Zeigt das Datum an bzw. legt es fest.\nDEL            Löscht eine oder mehrere Dateien.\nDIR            Listet die Dateien und Unterverzeichnisse eines Verzeichnisses\n               auf.\nDISKPART       Zeigt Eigenschaften von Festplattenpartitionen an bzw.\n               konfiguriert sie.\nDOSKEY         Bearbeitet Befehlseingaben, erinnert Windows-Befehle und\n               erstellt Macros.\nDRIVERQUERY    Zeigt aktuellen Gerätetreiberstatus und Eigenschaften an.\nECHO           Zeigt Meldungen an bzw. schaltet die Befehlsanzeige ein oder\n               aus.\nENDLOCAL       Beendet den lokalen Gültigkeitsbereich von Umgebungsänderungen\n               in einer Batchdatei.\nERASE          Löscht eine oder mehrere Dateien.\nEXIT           Beendet das Programm CMD.EXE (Befehlsinterpreter).\nFC             Vergleicht zwei oder mehr Sätze von Dateien und zeigt die\n               Unterschiede an.\nFIND           Sucht eine Zeichenkette in einer oder mehreren Datei(en).\nFINDSTR        Sucht Zeichenketten in Dateien.\nFOR            Führt einen angegebenen Befehl für jede Datei in einem\n               Dateiensatz aus.\nFORMAT         Formatiert einen Datenträger für die Verwendung mit Windows.\nFSUTIL         Zeigt die Dateisystemeigenschaften an bzw konfiguriert sie.\nFTYPE          Zeigt die Dateitypen an, die bei den Zuordnungen für die\n               Dateierweiterungen verwendet werden bzw. ändert sie.\nGOTO           Setzt den Windows-Befehlsinterpreter auf eine markierte Zeile in\n               einem Batchprogramm.\nGPRESULT       Zeigt Gruppenrichtlinieninformationen für Computer oder Benutzer\n               an.\nHELP           Zeigt Hilfeinformationen zu Windows-Befehlen an.\nICACLS         Anzeigen, Ändern, Sichern oder Wiederherstellen von ACLs für\n               Dateien und Verzeichnisse.\nIF             Verarbeitet Ausdrücke in einer Batchdatei abhängig von\n               Bedingungen.\nLABEL          Erstellt, ändert oder löscht die Bezeichnung eines Volumes.\nMD             Erstellt ein Verzeichnis.\nMKDIR          Erstellt ein Verzeichnis.\nMKLINK         Erstellt symbolische Links und feste Links.\nMODE           Konfiguriert ein Systemgerät.\nMORE           Zeigt Ausgabe auf dem Bildschirm seitenweise an.\nMOVE           Verschiebt ein oder mehrere Dateien von einem Verzeichnis in\n               ein anderes.\nOPENFILES      Zeigt Dateien, die von Remotebenutzern zur Dateifreigabe\n               geöffnet wurden an.\nPATH           Legt den Suchpfad für ausführbare Dateien fest o. zeigt ihn an.\nPAUSE          Hält die Ausführung einer Batchdatei an und zeigt e. Meldung an.\nPOPD           Wechselt zu dem Verzeichnis, das durch\n               PUSHD gespeichert wurde.\nPRINT          Druckt eine Textdatei.\nPROMPT         Ändert die Eingabeaufforderung.\nPUSHD          Speichert das aktuelle Verzeichnis, und wechselt zu einem\n               anderen Verzeichnis.\nRD             Entfernt ein Verzeichnis.\nRECOVER        Stellt lesbare Daten von einem beschädigten Datenträger wieder\n               her.\nREM            Leitet Kommentare in einer Batchdatei bzw. CONFIG.SYS ein.\nREN            Benennt eine Datei bzw. Dateien um.\nRENAME         Benennt eine Datei bzw. Dateien um.\nREPLACE        Ersetzt Dateien.\nRMDIR          Löscht ein Verzeichnis.\nROBOCOPY       Erweitertes Hilfsprogramm zum Kopieren von Dateien\n               und Verzeichnisstrukturen\nSET            Setzt oder löscht die Umgebungsvariablen bzw. zeigt sie an.\nSETLOCAL       Startet die Begrenzung des Gültigkeitsbereiches von\n               Umgebungsänderungen in einer Batchdatei.\nSC             Zeigt  Dienste (=Hintergrundprozess) an bzw. konfiguriert sie.\nSCHTASKS       Erstellt Zeitpläne für auf dem Computer auszuführende Befehle\n               und Programme.\nSHIFT          Verändert die Position ersetzbarer Parameter in Batchdateien.\nSHUTDOWN       Ermöglicht lokales oder ferngesteuertes Herunterfahren des\n               Computers.\nSORT           Sortiert die Eingabe.\nSTART          Startet ein eigenes Fenster, um ein bestimmtes Programm oder\n               einen Befehl auszuführen.\nSUBST          Ordnet einen Pfad einem Laufwerkbuchstaben zu.\nSYSTEMINFO     Zeigt computerspezifische Eigenschaften und Konfigurationen an.\nTASKLIST       Zeigt alle zurzeit laufenden Aufgaben inklusive der Dienste an.\nTASKKILL       Bricht einen laufenden Prozess oder eine Anwendung ab oder\n               beendet ihn bzw. sie.\nTIME           Zeigt die Systemzeit an bzw. legt sie fest.\nTITLE          Bestimmt den Fenstertitel des Eingabeaufforderungsfensters.\nTREE           Zeigt die Ordnerstruktur eines Laufwerks oder Pfads grafisch an.\nTYPE           Zeigt den Inhalt einer Textdatei an.\nVER            Zeigt die Windows-Version an.\nVERIFY         Legt fest, ob das ordnungsgemäße Schreiben von Dateien auf\n               den Datenträger überprüft werden soll.\nVOL            Zeigt die Volumebezeichnung und die Seriennummer des\n               Datenträgers an.\nXCOPY          Kopiert Dateien und Verzeichnisstrukturen.\nWMIC           Zeigt WMI-Informationen in der interaktiven Befehlsshell an.\n\nWeitere Informationen finden Sie in der Befehlszeilenreferenz der Onlinehilfe.";

function cmdRedirect(text){let quoted=false;for(let i=0;i<text.length;i++){if(text[i]==='^'){i++;continue;}if(text[i]==='"')quoted=!quoted;if(!quoted&&text[i]==='>'){const append=text[i+1]==='>';return [text,text.slice(0,i),append?'>>':'>',text.slice(i+(append?2:1))];}}return null;}


export function cmdDirectoryOptions(args){
 const options={targets:[],bare:false,recursive:false,wide:false,lower:false,pause:false,defaultAttributes:true,attributes:[],order:[]};
 for(const arg of args.flatMap(value=>/^\/(?:[bswlp]|[ao](?::?[-a-z]*))\//i.test(value)?value.slice(1).split('/').map(part=>'/'+part):[value])){if(/^\/[bswlp]$/i.test(arg)){const key={b:'bare',s:'recursive',w:'wide',l:'lower',p:'pause'}[arg[1].toLowerCase()];options[key]=true;continue;}
  if(/^\/a(?::?[a-z-]*)$/i.test(arg)){options.defaultAttributes=false;const spec=arg.slice(2).replace(/^:/,'').toUpperCase();if(!/^(?:-?[DH])*$/.test(spec))throw Error('DIR /A unterstützt derzeit D (Ordner) und H (ausgeblendet).');for(const value of spec.match(/-?[DH]/g)||[])options.attributes.push({attribute:value.at(-1),negate:value.startsWith('-')});continue;}
  if(/^\/o(?::?[a-z-]*)$/i.test(arg)){const spec=arg.slice(2).replace(/^:/,'').toUpperCase()||'GN';if(!/^(?:-?[NESGD])+$/.test(spec))throw Error('DIR /O unterstützt derzeit N, E, S, G und D.');options.order=(spec.match(/-?[NESGD]/g)||[]).map(value=>({field:value.at(-1),reverse:value.startsWith('-')}));continue;}
  if(/^\/t:w$/i.test(arg))continue;
  if(arg.startsWith('/')&&!/^\/[a-z](?:\/|$)/i.test(arg))throw Error('Ungültiger DIR-Parameter: '+arg);options.targets.push(arg);
 }if(!options.targets.length)options.targets.push('.');if(options.targets.length>32)throw Error('Maximal 32 DIR-Pfade je Befehl.');return options;
}

function cmdModifiedTime(node){const time=Date.parse(node.modified);return Number.isFinite(time)?time:Infinity;}
export function cmdDirectoryDate(value){const date=new Date(value);if(!value||!Number.isFinite(+date))return '                 ';const pad=n=>String(n).padStart(2,'0');return pad(date.getDate())+'.'+pad(date.getMonth()+1)+'.'+date.getFullYear()+'  '+pad(date.getHours())+':'+pad(date.getMinutes());}
