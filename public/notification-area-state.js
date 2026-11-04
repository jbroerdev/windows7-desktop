export const DEFAULT_NOTIFICATION_AREA=Object.freeze({clock:true,volume:'show',alwaysShow:false});
const valid=(key,value)=>key==='volume'?['show','overflow','off'].includes(value):typeof value==='boolean';
export function normalizeNotificationArea(value){const result={...DEFAULT_NOTIFICATION_AREA};if(value&&typeof value==='object'&&!Array.isArray(value))for(const key of Object.keys(result))if(Object.hasOwn(value,key)&&valid(key,value[key]))result[key]=value[key];return result;}
export function validateNotificationArea(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!Object.hasOwn(DEFAULT_NOTIFICATION_AREA,key)||!valid(key,value[key])))throw Error('Ungültige Infobereichseinstellungen.');return{...value};}
export function effectiveNotificationArea(value){const result=normalizeNotificationArea(value);if(result.alwaysShow&&result.volume==='overflow')result.volume='show';return result;}
