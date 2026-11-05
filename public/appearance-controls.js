import{aeroColors,normalizeAppearance,applyAppearance,hexToHsv,hsvToHex}from'/appearance.js';

// One preview owner per document; disposing an old page cannot overwrite a new preview.
const owners=new WeakMap();
export function createAppearanceControls({getAppearance,getContextKey,canEdit,save,onClose,document:doc=globalThis.document}){
 const root=doc.documentElement,owner={},context=getContextKey();let disposed=false,busy=false;
 let draft=normalizeAppearance(getAppearance()),channels=hexToHsv(draft.color);
 const el=(tag,text,cls)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 const panel=el('section',undefined,'aero-colors'),grid=el('div',undefined,'aero-color-grid'),current=el('p'),transparencyLabel=el('label','Transparenz aktivieren','aero-transparency'),transparent=el('input'),intensityLabel=el('label','Farbintensität:','aero-intensity'),intensity=el('input'),intensityValue=el('output'),mixer=el('details',undefined,'aero-mixer'),summary=el('summary','Farbmixer einblenden'),fields=el('div'),notice=el('p','','account-status'),actions=el('div',undefined,'aero-color-actions');
 transparent.type='checkbox';transparencyLabel.prepend(transparent);intensity.type='range';intensity.min='0';intensity.max='100';intensity.step='1';intensity.setAttribute('aria-label','Farbintensität');intensityLabel.append(intensity,intensityValue);mixer.append(summary,fields);notice.setAttribute('role','status');panel.append(grid,current,transparencyLabel,intensityLabel,mixer,notice,actions);
 const currentContext=()=>!disposed&&getContextKey()===context;
 function release(){if(owners.get(root)!==owner)return;owners.delete(root);delete root.dataset.appearancePreview;applyAppearance(getAppearance(),root);}
 function permitted(){if(!currentContext()){release();lock();return false;}return canEdit();}
 function lock(){for(const input of panel.querySelectorAll('button,input'))input.disabled=busy||!currentContext()||!canEdit();cancel.disabled=busy||!currentContext();panel.setAttribute('aria-busy',String(busy));}
 function preview(){
  if(!currentContext()){release();lock();return;}if(busy)return;
  if(canEdit()){owners.set(root,owner);root.dataset.appearancePreview='true';applyAppearance(draft,root);}
  current.textContent='Aktuelle Farbe: '+(aeroColors.find(([,hex])=>hex===draft.color)?.[0]||'Benutzerdefiniert');
  for(const tile of grid.children)tile.setAttribute('aria-pressed',String(tile.dataset.color===draft.color));
  intensity.value=draft.intensity;intensityValue.textContent=draft.intensity+' %';transparent.checked=draft.transparency;
  sliders.forEach((slider,i)=>{slider.input.value=channels[i];slider.value.textContent=slider.input.value;});
  panel.style.setProperty('--color-hue',channels[0]+'deg');
 }
 for(const[name,color]of aeroColors){const tile=el('button',undefined,'aero-color-swatch'),glass=el('span');tile.type='button';tile.title=name;tile.dataset.color=color;tile.setAttribute('aria-label','Fensterfarbe '+name);glass.style.backgroundColor=color+'40';glass.style.setProperty('--swatch-color',color);tile.append(glass);tile.onclick=()=>{if(!permitted()||busy)return;draft.color=color;channels=hexToHsv(color);preview();};grid.append(tile);}
 const sliders=[];
 for(const[name,max]of[['Farbton',360],['Sättigung',100],['Helligkeit',100]]){
  const label=el('label',name),input=el('input'),value=el('output'),index=sliders.length;input.type='range';input.min='0';input.max=String(max);input.step='1';input.dataset.colorChannel=name;input.setAttribute('aria-label',name);input.oninput=()=>{if(!permitted()||busy)return;channels[index]=Number(input.value);draft.color=hsvToHex(...channels);preview();};label.append(input,value);fields.append(label);sliders.push({input,value});
 }
 transparent.onchange=()=>{if(!permitted()||busy)return;draft.transparency=transparent.checked;preview();};
 intensity.oninput=()=>{if(!permitted()||busy)return;draft.intensity=Number(intensity.value);preview();};
 mixer.ontoggle=()=>summary.textContent=mixer.open?'Farbmixer ausblenden':'Farbmixer einblenden';
 const commit=el('button','Änderungen speichern','account-action'),cancel=el('button','Abbrechen','account-action');commit.type=cancel.type='button';actions.append(commit,cancel);
 const controller=new AbortController();
 commit.onclick=async()=>{
  if(!permitted()||busy)return;
  const snapshot={...draft};busy=true;notice.textContent='Änderungen werden gespeichert …';lock();
  try{await save(snapshot,{contextKey:context,signal:controller.signal});if(!currentContext())return;notice.textContent='Fensterfarbe und Transparenz gespeichert.';release();await onClose('saved');}
  catch(error){if(currentContext()&&!controller.signal.aborted)notice.textContent=error.message||'Speichern fehlgeschlagen.';}
  finally{busy=false;if(currentContext())lock();}
 };
 cancel.onclick=async()=>{if(busy||!currentContext())return;release();try{await onClose('cancel');}catch(error){if(currentContext())notice.textContent=error.message;}};
 function dispose(){if(disposed)return;controller.abort();release();disposed=true;lock();}
 function refreshContext(){if(!currentContext()){release();lock();}}
 lock();preview();return{element:panel,dispose,refreshContext};
}
