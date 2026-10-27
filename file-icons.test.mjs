import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {fileIcon,supportedFileExtensions} from './public/file-icons.js';
test('Dateitypen behalten Zuordnung, Großschreibung und sicheren Rückfall',async()=>{
 assert.match(fileIcon('Foto.HEIC'),/\/image\.ico/);assert.match(fileIcon('film.M2TS'),/\/video\.ico/);assert.match(fileIcon('musik.opus'),/\/audio\.ico/);
 assert.match(fileIcon('Dokument.DOCX'),/word-file\.png/);assert.match(fileIcon('Tabelle.xlsx',true),/excel-file-16\.png/);
 assert.match(fileIcon('font.otf'),/\/font-otf\.ico/);assert.match(fileIcon('tool.ps1'),/\/powershell\.ico/);assert.match(fileIcon('readme'),/\/text\.ico/);assert.match(fileIcon('.gitignore'),/\/text\.ico/);
 assert.match(fileIcon('unbekannt.blabla'),/\/file\.ico/);assert.match(fileIcon('ohne-endung'),/\/file\.ico/);assert.ok(supportedFileExtensions.length>200);
 for(const ext of [...supportedFileExtensions,'unknown'])for(const small of [false,true])await access('public'+fileIcon('Test.'+ext,small).split('?')[0]);
});
