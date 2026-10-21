export const CELL={width:88,height:94,padding:8};
export function arrangeIcons(ids,saved,width,height){
  const columns=Math.max(1,Math.floor((width-CELL.padding*2)/CELL.width));
  const rows=Math.max(1,Math.floor((height-CELL.padding*2)/CELL.height));
  const used=new Set(),result={};
  const valid=p=>p&&Number.isInteger(p.col)&&Number.isInteger(p.row)&&p.col>=0&&p.row>=0&&p.col<columns&&p.row<rows;
  for(const id of ids){const p=saved[id];if(valid(p)&&!used.has(p.col+','+p.row)){result[id]={...p};used.add(p.col+','+p.row);}}
  for(const id of ids){if(result[id])continue;let index=0;while(used.has(Math.floor(index/rows)+','+index%rows))index++;const p={col:Math.floor(index/rows),row:index%rows};result[id]=p;used.add(p.col+','+p.row);}
  return result;
}
export function moveIcon(positions,id,col,row){const next=structuredClone(positions),old=next[id];if(!old)return next;const other=Object.keys(next).find(key=>key!==id&&next[key].col===col&&next[key].row===row);if(other)next[other]=old;next[id]={col,row};return next;}
