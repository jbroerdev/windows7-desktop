// Optional asset-authoring helper; install sharp locally or supply SHARP_MODULE.
import{createRequire}from'node:module';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE||'sharp');
for(const size of[16,48])await sharp('public/icons/minesweeper.svg').resize(size,size).png().toFile('public/icons/minesweeper'+(size===16?'-16':'')+'.png');
