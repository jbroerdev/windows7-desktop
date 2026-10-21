import fs from'node:fs/promises';import path from'node:path';
const root=process.argv[2];if(!root)throw Error('Usage: node scripts/import-navigation-sprite.mjs <rinfox-checkout>');
await fs.copyFile(path.join(root,'rinfox/English/chrome/images/navigation.png'),'public/icons/aero/navigation-states.png');
console.log('Imported RinFox navigation states (29px cells)');
