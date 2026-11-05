export const DEFAULT_START_MENU=Object.freeze({recentPrograms:true,recentDocuments:true});
export function normalizeStartMenu(value){
 const result={...DEFAULT_START_MENU};
 if(value&&typeof value==='object'&&!Array.isArray(value))for(const key of Object.keys(result))if(typeof value[key]==='boolean')result[key]=value[key];
 return result;
}
export function validateStartMenu(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!Object.hasOwn(DEFAULT_START_MENU,key)||typeof value[key]!=='boolean'))throw Error('Ungültige Startmenüeinstellungen.');
 return {...value};
}
