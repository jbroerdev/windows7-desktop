export const DEFAULT_TASKBAR=Object.freeze({locked:true,autoHide:false,smallIcons:false,position:'bottom',combine:'always',peek:true});
const positions=['bottom','left','right','top'],combinations=['always','when-full','never'];
const valid=(key,value)=>key==='position'?positions.includes(value):key==='combine'?combinations.includes(value):typeof value==='boolean';

export function normalizeTaskbar(value){
 const result={...DEFAULT_TASKBAR};
 if(value&&typeof value==='object'&&!Array.isArray(value))for(const key of Object.keys(DEFAULT_TASKBAR))if(Object.hasOwn(value,key)&&valid(key,value[key]))result[key]=value[key];
 return result;
}

// API updates remain partial, so changing one option cannot reset the others.
export function validateTaskbar(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!Object.hasOwn(DEFAULT_TASKBAR,key)||!valid(key,value[key])))throw Error('Ungültige Taskleisteneinstellungen.');
 return Object.fromEntries(Object.keys(value).map(key=>[key,value[key]]));
}

export function taskbarThickness(value){const prefs=normalizeTaskbar(value);return prefs.autoHide?2:['left','right'].includes(prefs.position)?prefs.smallIcons?42:62:prefs.smallIcons?30:40;}

export function taskbarWorkArea({width,height},value){
 width=Number.isFinite(width)?Math.max(0,Math.floor(width)):0;height=Number.isFinite(height)?Math.max(0,Math.floor(height)):0;
 const prefs=normalizeTaskbar(value),vertical=['left','right'].includes(prefs.position),thickness=Math.min(taskbarThickness(prefs),vertical?width:height);
 return{left:prefs.position==='left'?thickness:0,top:prefs.position==='top'?thickness:0,width:width-(vertical?thickness:0),height:height-(vertical?0:thickness)};
}
