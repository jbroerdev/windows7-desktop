// Native Windows 7 icon families shared by Explorer, Desktop and file dialogs.
const families={
 text:'txt text log md markdown rst rstx nfo diz readme license cfg conf config ini inf properties env gitignore gitattributes editorconfig toml yaml yml json jsonc jsonl ndjson xml xsd xsl xslt dtd rss atom manifest csv tsv tab sql sqlite-schema srt vtt ass ssa lrc cue m3u m3u8 pls',
 image:'jpg jpeg jpe jfif png apng gif bmp dib rle webp avif heic heif tiff tif ico cur ani svg svgz raw dng cr2 cr3 nef nrw arw orf rw2 raf pef psd xcf tga pcx wmf emf eps',
 audio:'mp3 mp2 mp1 wav wave wma aac m4a m4b m4p flac ogg oga opus aif aiff aifc au snd amr ac3 eac3 dts mid midi rmi ape alac aob cda',
 video:'mp4 m4v m4p avi mkv webm mov qt wmv asf mpg mpeg mpe m1v m2v m2ts mts ts vob ogv flv f4v 3gp 3g2 divx rm rmvb',
 application:'exe com scr cpl',library:'dll ocx sys drv ax acm so dylib',settings:'reg pol dat db bak tmp cache bin idx',installer:'msi msp msu appx appxbundle msix msixbundle cab',disc:'iso img nrg mdf mds vhd vhdx vdi vmdk dmg',
 font:'fon fnt', 'font-ttf':'ttf', 'font-otf':'otf', 'font-collection':'ttc otc',contact:'contact vcf vcard',shortcut:'lnk url website',powershell:'ps1 psm1 psd1 ps1xml psc1 psc2',script:'bat cmd vbs vbe wsf wsh js jse mjs cjs ts tsx jsx py pyw pyi rb pl pm php phtml asp aspx jsp java c h cc cpp cxx hpp cs go rs swift kt kts sh bash zsh fish lua r ps',journal:'jnt jtp',richtext:'rtf wri'
};
const mapping=new Map();for(const [family,extensions]of Object.entries(families))for(const ext of extensions.split(' '))mapping.set(ext,family);
for(const ext of ['m3u','m3u8','pls','asx','wpl','xspf'])mapping.set(ext,'playlist');
const associated={
 'word-file':'doc docx docm dot dotx dotm odt ott', 'excel-file':'xls xlsx xlsm xlsb xlt xltx xltm ods ots xlam xla csv tsv', 'powerpoint-file':'ppt pptx pptm pps ppsx ppsm pot potx potm odp otp',
 archive:'zip zipx 7z rar tar gz gzip bz bz2 bzip2 xz zst zstd lz lzma tgz tbz tbz2 txz jar war ear apk ar deb rpm',pdf:'pdf xps oxps',java:'jar class',link:'htm html xhtml mhtml mht'
};
const associatedMap=new Map();for(const [family,extensions]of Object.entries(associated))for(const ext of extensions.split(' '))associatedMap.set(ext,family);
export const supportedFileExtensions=[...new Set([...mapping.keys(),...associatedMap.keys()])].sort();
export function fileIcon(name,small=false){
 const normalized=String(name||'').toLowerCase(),base=normalized.split(/[\\/]/).pop();
 const ext=base.includes('.')?base.split('.').pop():['readme','license','makefile','dockerfile','changelog','authors','copying'].includes(base)?'txt':'';
 const associated=associatedMap.get(ext);if(associated)return '/icons/'+associated+(small?'-16':'')+'.png?v=9';
 return '/icons/filetypes/'+(mapping.get(ext)||'file')+'.ico?v=1';
}
