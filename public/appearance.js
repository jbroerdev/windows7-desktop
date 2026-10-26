export const defaultAppearance={color:'#69a4c9',intensity:50,transparency:true};
export const aeroColors=[['Himmel','#69a4c9'],['Abenddämmerung','#4967a7'],['Meer','#479ca0'],['Blätter','#648c51'],['Limette','#9dad3e'],['Sonne','#e3c34b'],['Kürbis','#cf873b'],['Rubin','#b74444'],['Fuchsia','#bd4986'],['Rosa','#dba4ae'],['Violett','#80569e'],['Lavendel','#ada1c9'],['Sand','#b8aa8a'],['Schokolade','#825e48'],['Schiefer','#70838e'],['Frost','#d6e4ea']];
export function validateAppearance(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!/^#[0-9a-f]{6}$/i.test(value.color)||!Number.isInteger(value.intensity)||value.intensity<0||value.intensity>100||typeof value.transparency!=='boolean')throw Error('Ungültige Fensterfarbe.');
 return {color:value.color.toLowerCase(),intensity:value.intensity,transparency:value.transparency};
}
export function normalizeAppearance(value){try{return validateAppearance(value);}catch{return {...defaultAppearance};}}
export function applyAppearance(value,root=globalThis.document?.documentElement){
 const settings=normalizeAppearance(value);if(!root)return settings;
 const rgb=settings.color.slice(1).match(/../g).map(v=>parseInt(v,16));
 const weight=.25+settings.intensity*.0075,tint=settings.transparency?rgb:rgb.map(v=>Math.round(255*(1-weight)+v*weight));
 const variables={'--aero-rgb':tint.join(' '),'--aero-dark-rgb':tint.map(v=>Math.round(v*.43)).join(' '),'--aero-alpha':settings.transparency?String(.16+settings.intensity*.006):'1','--aero-shell-alpha':settings.transparency?String(.35+settings.intensity*.0045):'1','--aero-blur':settings.transparency?'14px':'0px','--aero-edge':`rgb(${rgb.map(v=>Math.round(v*.48)).join(' ')})`};
 for(const[key,value]of Object.entries(variables))root.style.setProperty(key,value);
 root.dataset.aeroTransparency=String(settings.transparency);return settings;
}
export function hexToHsl(hex){const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;}return [Math.round(h),Math.round(s*100),Math.round(l*100)];}
export function hslToHex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);}
