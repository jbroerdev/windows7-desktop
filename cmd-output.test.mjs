import test from 'node:test';
import assert from 'node:assert/strict';
import{createCMDOutput}from './public/cmd-output.js';

function fixture(){
 const tasks=[],frames=[],nodes=[];let rewrites=0,reads=0,text='';
 const output={ownerDocument:{createTextNode:value=>({textContent:value})},append(node){nodes.push(node);text+=node.textContent;},get textContent(){return text;},set textContent(value){rewrites++;text=value;nodes.length=0;}};
 const screen={scrollTop:0,get scrollHeight(){reads++;return 1234;}};
 const writer=createCMDOutput(output,screen,{enqueue:callback=>tasks.push(callback),frame:callback=>frames.push(callback)});
 const run=queue=>{while(queue.length)queue.shift()();};
 return{writer,output,screen,nodes,tasks,frames,run,get rewrites(){return rewrites;},get reads(){return reads;}};
}

test('large CMD output preserves every byte and batches DOM writes and scrolling',()=>{
 const f=fixture();for(let i=0;i<65536;i++)f.writer.print(i.toString(16)+': FF FE');
 assert.equal(f.tasks.length,1);assert.equal(f.nodes.length,0);assert.equal(f.reads,0);
 f.run(f.tasks);assert.equal(f.nodes.length,1);assert.equal(f.rewrites,0);assert.equal(f.frames.length,1);assert.equal(f.reads,0);
 assert.equal(f.output.textContent.split('\n').length,65537);assert.ok(f.output.textContent.endsWith('ffff: FF FE\n'));
 f.run(f.frames);assert.equal(f.reads,1);assert.equal(f.screen.scrollTop,1234);
});

test('clear restore and immediate workspace snapshots cannot leak buffered output across profiles',()=>{
 const f=fixture();f.writer.print('old profile');f.writer.replace('restored\n');f.writer.print('raw',{raw:true});f.writer.print(' output');
 assert.equal(f.writer.snapshot(),'restored\nraw output\n');f.run(f.tasks);assert.equal(f.output.textContent,'restored\nraw output\n');
 f.writer.print('discard');f.writer.print(null);f.writer.print('new profile');f.run(f.tasks);assert.equal(f.writer.snapshot(),'new profile\n');
 f.writer.print('next');f.run(f.tasks);assert.equal(f.writer.snapshot(),'new profile\nnext\n');
 assert.equal(f.frames.length,1);f.run(f.frames);assert.equal(f.reads,1);
});
