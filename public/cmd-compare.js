export const COMPARISON_LIMIT=32*1024*1024;

export async function readComparisonBytes(url,{signal,fetcher=fetch,maxBytes=COMPARISON_LIMIT}={}){
 signal?.throwIfAborted();
 const response=await fetcher(url,{signal});
 if(!response.ok)throw Error('Datei konnte nicht gelesen werden (HTTP '+response.status+').');
 if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw Error('Dateivergleich ist auf 32 MiB pro Datei begrenzt.');}
 if(!response.body)return new Uint8Array();
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('Dateivergleich ist auf 32 MiB pro Datei begrenzt.');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let position=0;for(const chunk of chunks){bytes.set(chunk,position);position+=chunk.length;}return bytes;
}

// Byte diagnostics never decode binary data through the text editor endpoint.
export async function compareBinary(left,right,{mode='fc',decimal=false,characters=false,lineNumbers=false,ignoreCase=false,lineLimit=0,leftName='Datei1',rightName='Datei2',print,signal}={}){
 if(!(left instanceof Uint8Array)||!(right instanceof Uint8Array))throw Error('Binärvergleich benötigt unveränderte Dateibytes.');
 if(!Number.isSafeInteger(lineLimit)||lineLimit<0)throw Error('COMP /N erwartet eine nichtnegative ganze Zeilenzahl.');
 signal?.throwIfAborted();print(mode==='comp'?'Vergleichen von '+leftName+' und '+rightName+'...':'Vergleichen der Dateien '+leftName+' und '+rightName);
 if(mode==='comp'&&!lineLimit&&left.length!==right.length){print('Dateien sind unterschiedlich groß.');return 1;}
 const hex=(value,width)=>value.toString(16).toUpperCase().padStart(width,'0'),fold=value=>ignoreCase&&value>=97&&value<=122?value-32:value,character=new TextDecoder('windows-1252'),display=value=>characters?character.decode(Uint8Array.of(value)):decimal?value:hex(value,0);
 let differences=0,line=1,rightLines=0,limitReached=false;
 for(let i=0;i<Math.min(left.length,right.length);i++){
  if(i%65536===0){signal?.throwIfAborted();if(i)await new Promise(resolve=>setTimeout(resolve,0));}
  if(mode==='comp'&&lineLimit&&line===lineLimit&&left[i]===10){limitReached=true;break;}
  if(mode==='comp'?fold(left[i])!==fold(right[i]):left[i]!==right[i]){
   differences++;
   if(mode==='comp'){print(lineNumbers?'Unterschied festgestellt bei ZEILE '+line:'Unterschied festgestellt bei OFFSET '+hex(i,0));print('Datei1 = '+display(left[i]));print('Datei2 = '+display(right[i]));if(differences===10){print('10 Unterschiede - Vergleich beendet');return 1;}}
   else{if(differences>65536)throw Error('Mehr als 65.536 Abweichungen; Vergleichsausgabe begrenzt.');print(hex(i,8)+': '+hex(left[i],2)+' '+hex(right[i],2));}
  }
  if(left[i]===10)line++;if(right[i]===10)rightLines++;
 }
 signal?.throwIfAborted();
 if(left.length!==right.length&&!(mode==='comp'&&limitReached)){
  if(mode==='comp')print((left.length<right.length?'Datei1 hat nur '+(line-1):'Datei2 hat nur '+rightLines)+' Zeilen.');
  else print('FC: '+(left.length>right.length?leftName:rightName)+' ist länger als '+(left.length>right.length?rightName:leftName));return 1;
 }
 if(!differences)print(mode==='comp'?'Dateien sind identisch':'FC: Keine Unterschiede gefunden.');
 return differences?1:0;
}

export function compOptions(options){
 const result={decimal:false,characters:false,lineNumbers:false,ignoreCase:false,lineLimit:0};
 for(const option of options){const value=option.toLowerCase();if(value==='/d'){result.decimal=true;}else if(value==='/a'){result.characters=true;}else if(value==='/l')result.lineNumbers=true;else if(value==='/c')result.ignoreCase=true;else if(['/off','/offline'].includes(value))continue;else if(/^\/n=[0-9]+$/.test(value)){result.lineLimit=Number(value.slice(3));if(!Number.isSafeInteger(result.lineLimit))throw Error('COMP /N erwartet eine nichtnegative ganze Zeilenzahl.');}else throw Error('COMP: Unbekannter Vergleichsschalter '+option);}
 return result;
}



export function fcTextOptions(options){
 const result={abbreviated:false,ignoreCase:false,lineNumbers:false,keepTabs:false,unicode:false,compressSpace:false,buffer:100,sync:2};
 for(const option of options){const value=option.toLowerCase();
  if(['/l','/off','/offline'].includes(value))continue;
  const key={'/a':'abbreviated','/c':'ignoreCase','/n':'lineNumbers','/t':'keepTabs','/u':'unicode','/w':'compressSpace'}[value];
  if(key){result[key]=true;continue;}
  const buffer=value.match(/^\/lb([0-9]+)$/),sync=value.match(/^\/([0-9]+)$/);
  if(buffer||sync){const number=Number((buffer||sync)[1]);if(!Number.isSafeInteger(number)||number<1)throw Error('FC: Puffer- und Synchronisationslängen müssen positive ganze Zahlen sein.');result[buffer?'buffer':'sync']=number;continue;}
  throw Error('FC: Unbekannter Textvergleichsschalter '+option);
 }
 return result;
}

export async function compareText(left,right,{leftName='Datei1',rightName='Datei2',print,signal,...options}={}){
 signal?.throwIfAborted();const settings={...fcTextOptions([]),...options};
 const lines=text=>{const result=String(text).replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);if(result.at(-1)==='')result.pop();return result;};
 const a=lines(left),b=lines(right);
 const normalize=line=>{
  if(!settings.keepTabs){let column=0;line=[...line].map(char=>{if(char==='\t'){const count=8-column%8;column+=count;return' '.repeat(count);}column++;return char;}).join('');}
  if(settings.compressSpace)line=line.replace(/[ \t]+/g,' ').replace(/^ | $/g,'');
  return settings.ignoreCase?line.toUpperCase():line;
 };
 const na=a.map(normalize),nb=b.map(normalize);let i=0,j=0,different=false,iterations=0;
 const emit=(values,start,end)=>{const indices=[];for(let k=start;k<end;k++)indices.push(k);const abbreviated=settings.abbreviated&&indices.length>3,chosen=abbreviated?[indices[0],null,indices.at(-1)]:indices;for(const k of chosen)print(k===null?'...':(settings.lineNumbers?String(k+1).padStart(5,' ')+':  ':'')+values[k]);};
 const block=(fromA,toA,fromB,toB)=>{print('***** '+leftName);emit(a,fromA,toA);print('***** '+rightName);emit(b,fromB,toB);print('*****');print('');};
 signal?.throwIfAborted();print('Vergleichen der Dateien '+leftName+' und '+rightName);
 while(i<a.length||j<b.length){
  signal?.throwIfAborted();if(++iterations%256===0)await new Promise(resolve=>setTimeout(resolve,0));
  if(i<a.length&&j<b.length&&na[i]===nb[j]){i++;j++;continue;}
  different=true;const endA=Math.min(a.length,i+settings.buffer),endB=Math.min(b.length,j+settings.buffer);let anchor;
  // Search by increasing total displacement, so an inserted line does not shift every following line.
  for(let displacement=1;displacement<=endA-i+endB-j&&!anchor;displacement++){
   if(displacement%64===0){signal?.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,0));}
   for(let da=Math.max(0,displacement-(endB-j-1));da<=Math.min(displacement,endA-i-1);da++){
    const db=displacement-da,x=i+da,y=j+db;if(y>=endB||na[x]!==nb[y])continue;
    let matched=0;while(matched<settings.sync&&x+matched<endA&&y+matched<endB&&na[x+matched]===nb[y+matched])matched++;
    if(matched>=settings.sync||matched>0&&(x+matched===a.length||y+matched===b.length)){anchor=[x,y];break;}
   }
  }
  if(anchor){const context=i>0&&j>0?1:0;block(i-context,anchor[0]+1,j-context,anchor[1]+1);[i,j]=anchor;continue;}
  const failed=endA<a.length||endB<b.length;
  if(failed)print('Neusynchronisation fehlgeschlagen. Dateien sind zu verschieden.');
  const context=!failed&&i<a.length&&j<b.length&&i>0&&j>0?1:0;
  block(i-context,endA,j-context,endB);if(failed)return 1;i=endA;j=endB;
 }
 if(!different)print('FC: Keine Unterschiede gefunden.');return different?1:0;
}


// FC overlays the destination mask on the source name; it does not glob every
// destination or append a prefix. An asterisk consumes the rest of that field.
export function comparisonTargetName(pattern,source){
 if(!/[*?]/.test(pattern))return pattern;
 const field=(mask,value)=>{let result='',position=0;for(const char of mask){if(char==='*'){if(position>value.length)throw Error('Zweiter Dateiname konnte nicht so erweitert werden, dass er zum ersten passt.');return result+value.slice(position);}if(char==='?'){if(position>=value.length)throw Error('Zweiter Dateiname konnte nicht so erweitert werden, dass er zum ersten passt.');result+=value[position];}else result+=char;position++;}return result;};
 const dot=pattern.lastIndexOf('.');if(dot<0)return field(pattern,source);
 const sourceDot=source.lastIndexOf('.'),stem=sourceDot<0?source:source.slice(0,sourceDot),extension=sourceDot<0?'':source.slice(sourceDot+1);
 return(field(pattern.slice(0,dot),stem)+'.'+field(pattern.slice(dot+1),extension)).replace(/\.$/,'');
}
