import fs from'node:fs/promises';
for(const[remote,local]of [['command-bar-bg.png','command-bar.png'],['command-bar-btn-hover.png','command-hover.png'],['details-pane-bg.png','details-pane.png'],['item-hot-bg.png','item-hover.png'],['item-sel-bg.png','item-selected.png']]){const r=await fetch('https://mirrors.equipable.org/'+remote);if(!r.ok)throw Error(remote+': '+r.status);await fs.writeFile('public/icons/aero/'+local,Buffer.from(await r.arrayBuffer()));}
console.log('Imported reference Explorer surface artwork');
