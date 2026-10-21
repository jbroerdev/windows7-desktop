import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.argv[2];if(!root)throw Error('Usage: node scripts/import-aero-assets.mjs <theme-directory>');
const out=new URL('../public/icons/aero/',import.meta.url);await fs.mkdir(out,{recursive:true});
const names=['titlebar-focused-middle','titlebar-unfocused-middle','border-focused-left','border-focused-right','border-focused-bottom','border-unfocused-left','border-unfocused-right','border-unfocused-bottom'];
for(const name of names)await fs.copyFile(path.join(root,'metacity-1',name+'.png'),new URL(name+'.png',out));
for(const name of ['minimize','maximize','unmaximize','close'])for(const suffix of ['','-hover','-active','-unfocused'])await fs.copyFile(path.join(root,'metacity-1',name+suffix+'.png'),new URL(name+suffix+'.png',out));
await fs.copyFile(path.join(root,'gtk-2.0/Toolbar/toolbar-light.png'),new URL('toolbar.png',out));
console.log('Imported 25 Aero frame and toolbar assets');
