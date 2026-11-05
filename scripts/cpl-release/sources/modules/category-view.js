import{getControlPanelCategory}from'./control-panel-category-catalog.js';

const styleHref='/control-panel-category-view.css';
function ensureStyles(doc){if(doc.querySelector(`link[data-cp-category-style="${styleHref}"]`))return;const link=doc.createElement('link');link.rel='stylesheet';link.href=styleHref;link.dataset.cpCategoryStyle=styleHref;doc.head.append(link);}
function isAvailable(availableTargets,target){return availableTargets instanceof Set?availableTargets.has(target):!!availableTargets&&Object.prototype.hasOwnProperty.call(availableTargets,target)&&availableTargets[target]===true;}

export function renderControlPanelCategory({categoryId,onNavigate,availableTargets={},document:doc=globalThis.document}){
 ensureStyles(doc);
 const root=doc.createElement('section');root.className='cp-category-native';root.dataset.categoryId=categoryId||'';
 const category=getControlPanelCategory(categoryId);
 if(!category){root.classList.add('cp-category-unknown');const title=doc.createElement('h2');title.textContent='Systemsteuerung';const message=doc.createElement('p');message.textContent='Diese Kategorie ist nicht verfügbar.';root.append(title,message);return root;}
 const header=doc.createElement('header');header.className='cp-category-heading';const icon=doc.createElement('img');icon.src=category.icon;icon.alt='';icon.width=48;icon.height=48;const title=doc.createElement('h2');title.textContent=category.title;header.append(icon,title);root.append(header);
 const groups=doc.createElement('div');groups.className='cp-category-groups';
 for(const groupData of category.groups){
  const group=doc.createElement('section');group.className='cp-category-group';const heading=doc.createElement('h3');heading.textContent=groupData.title;group.append(heading);
  const list=doc.createElement('ul');
  for(const itemData of groupData.items){const row=doc.createElement('li'),target=itemData.target,available=typeof onNavigate==='function'&&isAvailable(availableTargets,target),item=doc.createElement(available?'button':'span');item.className='cp-category-link';item.textContent=itemData.label;
   if(available){item.type='button';item.addEventListener('click',()=>onNavigate(target));}
   else{item.classList.add('is-unavailable');item.setAttribute('aria-disabled','true');item.title='Noch nicht in dieser Webumgebung verfügbar.';}
   row.append(item);list.append(row);
  }
  group.append(list);groups.append(group);
 }
 root.append(groups);return root;
}
