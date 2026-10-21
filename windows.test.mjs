import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constrainBounds,resizeBounds,snapBounds} from './public/window-manager.js';
import {photoLayout,zoomAt} from './public/photo-geometry.js';

test('Fenster bleiben nach Verschieben und Verkleinern des Bildschirms erreichbar',()=>{
  assert.deepEqual(constrainBounds({left:-80,top:900,width:900,height:800},{width:700,height:500}),
    {left:-80,top:469,width:700,height:500});
  assert.deepEqual(constrainBounds({left:900,top:700,width:20,height:10},{width:1000,height:700}),
    {left:900,top:669,width:320,height:200});
  assert.equal(constrainBounds({left:20,top:30,width:500,height:400},{width:280,height:180},480,330).width,280);
});

test('Freie Fenster können hinter die Taskleiste und seitlich aus dem Bildschirm gezogen werden',()=>{
  const viewport={width:1000,height:700};
  const behind=constrainBounds({left:100,top:600,width:500,height:400},viewport);
  assert.equal(behind.top,600);
  assert.ok(behind.top+behind.height>viewport.height);
  assert.equal(constrainBounds({...behind,left:-900},viewport).left,-404);
  assert.equal(constrainBounds({...behind,left:2000},viewport).left,904);
  assert.equal(constrainBounds({...behind,top:2000},viewport).top,669);
});

test('Größenänderung hält die gegenüberliegende Ecke und die Mindestgröße',()=>{
  const start={left:100,top:100,width:300,height:200};
  assert.deepEqual(resizeBounds(start,'nw',500,400,200,120),{left:200,top:180,width:200,height:120});
  assert.deepEqual(resizeBounds(start,'se',80,60,200,120),{left:100,top:100,width:380,height:260});
});

test('Andocken verwendet genau zwei Bildschirmhälften ohne Überlappung',()=>{
  const viewport={width:1075,height:760},left=snapBounds('left',viewport),right=snapBounds('right',viewport);
  assert.deepEqual(left,{left:0,top:0,width:537,height:760});
  assert.deepEqual(right,{left:537,top:0,width:538,height:760});
  assert.equal(left.left+left.width,right.left);assert.equal(right.left+right.width,viewport.width);
});

test('Foto einpassen berücksichtigt Drehung und veränderte Fenstergröße',()=>{
  const input={width:1600,height:900,viewportWidth:800,viewportHeight:600};
  assert.equal(photoLayout(input).scale,776/1600);
  const rotated=photoLayout({...input,angle:90});
  assert.equal(rotated.scale,576/1600);
  assert.ok(rotated.width<=600);
  const smaller=photoLayout({...input,viewportWidth:400,viewportHeight:300});
  assert.ok(smaller.scale<rotated.scale);
  assert.equal(photoLayout({...input,viewportWidth:0}),null);
});

test('Foto lässt sich nicht aus der Ansicht schieben; Zoom bleibt am Mauspunkt',()=>{
  const p=photoLayout({width:1600,height:900,viewportWidth:800,viewportHeight:600,mode:'manual',scale:1,x:9000,y:-9000});
  assert.equal(p.x,400);assert.equal(p.y,-150);
  const small=photoLayout({width:100,height:100,viewportWidth:800,viewportHeight:600,mode:'manual',scale:1,x:80,y:40});
  assert.equal(Math.abs(small.x),0);assert.equal(Math.abs(small.y),0);
  const next=zoomAt({scale:1,nextScale:2,x:10,y:20,anchorX:100,anchorY:50});
  assert.equal((100-next.x)/next.scale,(100-10)/1);
  assert.equal((50-next.y)/next.scale,(50-20)/1);
});
