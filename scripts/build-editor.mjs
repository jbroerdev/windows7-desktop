import{build}from'esbuild';
await build({entryPoints:['editor-src.mjs'],bundle:true,format:'esm',target:'es2022',outfile:'public/editor.bundle.js',minify:true,legalComments:'eof'});
