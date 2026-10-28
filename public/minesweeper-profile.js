import{mineSettings,MinesweeperGame}from'./minesweeper-engine.js';
export function updateMineProfile(previous,data,now=new Date().toISOString()){
if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Ungültige Minesweeper-Daten.');const p={settings:mineSettings(previous?.settings),stats:structuredClone(previous?.stats||{}),events:Array.isArray(previous?.events)?previous.events.slice(-200):[],game:previous?.game||null};
if(data.settings!==undefined){const normalized=mineSettings(data.settings);if(JSON.stringify(normalized)!==JSON.stringify(data.settings))throw Error('Ungültige Minesweeper-Einstellungen.');p.settings=normalized;}
if(data.game!==undefined)p.game=data.game===null?null:MinesweeperGame.restore(data.game).snapshot();
if(data.reset===true){p.stats={};p.events=[];}
if(data.result){const r=data.result;if(typeof r.id!=='string'||r.id.length<1||r.id.length>100||!['beginner','intermediate','expert','custom'].includes(r.difficulty)||typeof r.won!=='boolean'||!Number.isInteger(r.seconds)||r.seconds<0||r.seconds>359999)throw Error('Ungültiges Spielergebnis.');if(!p.events.includes(r.id)){p.events.push(r.id);p.events=p.events.slice(-200);const s=p.stats[r.difficulty]||{played:0,won:0,streak:0,bestWin:0,bestLoss:0,times:[]};s.played++;if(r.won){s.won++;s.streak=Math.max(0,s.streak)+1;s.bestWin=Math.max(s.bestWin,s.streak);s.times.push({seconds:r.seconds,date:now});s.times.sort((a,b)=>a.seconds-b.seconds);s.times=s.times.slice(0,5);}else{s.streak=Math.min(0,s.streak)-1;s.bestLoss=Math.max(s.bestLoss,-s.streak);}p.stats[r.difficulty]=s;}}
return p;}
