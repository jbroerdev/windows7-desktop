export function cmdPath(value, cwd = '/C/') {
  value = value.replace(/^"|"$/g, '').replaceAll('\\', '/').replace(/^([a-z]):/i, '/$1');
  const parts = (value.startsWith('/') ? value : cwd + '/' + value).split('/');
  const result = [];
  for (const part of parts) { if (!part || part === '.') continue; if (part === '..') { if (result.length > 1) result.pop(); } else result.push(part); }
  return '/' + result.join('/');
}
export const cmdDisplay = path => path.replace(/^\/([a-z])(?:\/|$)/i, (_, drive) => drive.toUpperCase() + ':\\').replaceAll('/', '\\');
export function createCMD({ getNodes, home, print, launch, open, publicIP, close, mkdir, rename, remove, edit }) {
  let cwd = cmdPath(home || '/C/');
  const pathOf = n => { try { return cmdPath(decodeURIComponent(n.path)); } catch { return cmdPath(n.path); } };
  const find = value => { const path = cmdPath(value, cwd).toLowerCase(); return getNodes().find(n => pathOf(n).toLowerCase() === path); };
  const directory = path => /^\/[a-z]$/i.test(path) || getNodes().some(n => (n.kind === 'folder' && pathOf(n).toLowerCase() === path.toLowerCase()) || pathOf(n).toLowerCase().startsWith(path.toLowerCase() + '/'));
  const apps = { cmd:'terminal',terminal:'terminal',explorer:'explorer',notepad:'editor','notepad++':'editor',word:'office-text',winword:'office-text',writer:'office-text',excel:'office-sheet',powerpoint:'office-presentation',powerpnt:'office-presentation',vlc:'media',media:'media',fotoanzeige:'photo',photo:'photo',browser:'browser',iexplore:'browser','internet-explorer':'browser',taskmgr:'task-manager','task-manager':'task-manager' };
  return { get cwd() { return cwd; }, set cwd(value) { cwd=cmdPath(value); }, async execute(command) {
    command=command.replace(/^cd(?=\.\.|[\\/])/i,'cd ');
    let args = command.match(/"[^"]*"|[^\s"]+/g)?.map(v => v.replace(/^"|"$/g,'')) || [];
    if (!args.length) return;
    let name = args.shift(), verb = name.toLowerCase();
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
    if (verb === 'help' || verb === '/?') return print('CD [Pfad]   DIR [Pfad]   MKDIR [Ordner]   DEL [Datei]\nRENAME [Datei] [Neuer Name]   NANO [Textdatei]   CLS   HOSTNAME   IPCONFIG   EXIT\nProgramme: explorer, notepad, vlc, word, excel, powerpoint, browser, taskmgr\nDateien und Verknüpfungen: Namen oder Pfad eingeben. Pfade mit Leerzeichen in "Anführungszeichen" setzen.');
    if (verb === 'cd' || verb === 'chdir' || /^[a-z]:$/i.test(verb)) {
      if (args[0]?.toLowerCase() === '/d') args.shift();
      if (!args.length && !/^[a-z]:$/i.test(verb)) return print(cmdDisplay(cwd));
      const path = cmdPath(/^[a-z]:$/i.test(verb) ? name : args.join(' '), cwd);
      if (!directory(path)) throw Error('Das System kann den angegebenen Pfad nicht finden.');
      cwd = path; return;
    }
    if (verb === 'dir') { const path = cmdPath(args.join(' ') || '.', cwd); if (!directory(path)) throw Error('Pfad nicht gefunden.'); print(' Verzeichnis von ' + cmdDisplay(path)); for (const n of getNodes().filter(n => pathOf(n).slice(0,pathOf(n).lastIndexOf('/')).toLowerCase() === path.toLowerCase())) print((n.kind === 'folder' ? '<DIR>       ' : '            ') + n.name); return; }
    const executable=verb.replaceAll('\\','/').split('/').pop();
    const app = apps[executable.replace(/\.exe$/i,'')];
    if (app) { const file = args.length ? find(args.join(' ')) : null; if (args.length && !file) throw Error('Datei oder Pfad nicht gefunden.'); return launch(app,file); }
    const node = find(name) || getNodes().find(n => n.kind === 'link' && n.name.replace(/\.(lnk|url)$/i,'').toLowerCase() === verb);
    if (node) return node.kind === 'folder' ? launch('explorer',node) : open(node);
    throw Error('Der Befehl "' + name + '" ist entweder falsch geschrieben oder konnte nicht gefunden werden.');
  } };
}
