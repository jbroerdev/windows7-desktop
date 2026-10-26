import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAppearance,normalizeAppearance,applyAppearance,hexToHsl,hslToHex,defaultAppearance} from './public/appearance.js';
test('Aero accepts bounded settings, rejects CSS injection, and converts mixer colors',()=>{
 assert.deepEqual(validateAppearance({color:'#AA3377',intensity:75,transparency:false}),{color:'#aa3377',intensity:75,transparency:false});
 for(const value of [null,[],{color:'red;display:none',intensity:50,transparency:true},{color:'#112233',intensity:101,transparency:true},{color:'#112233',intensity:50,transparency:'false'}])assert.throws(()=>validateAppearance(value));
 assert.deepEqual(normalizeAppearance(null),defaultAppearance);
 for(const [hex,hsl] of [['#ff0000',[0,100,50]],['#00ff00',[120,100,50]],['#0000ff',[240,100,50]],['#808080',[0,0,50]]]){assert.deepEqual(hexToHsl(hex),hsl);assert.equal(hslToHex(...hsl),hex);}
 const values={},root={dataset:{},style:{setProperty:(key,value)=>values[key]=value}};
 applyAppearance({color:'#ff0000',intensity:100,transparency:false},root);assert.equal(values['--aero-alpha'],'1');assert.equal(values['--aero-shell-alpha'],'1');assert.equal(values['--aero-blur'],'0px');
 applyAppearance(defaultAppearance,root);assert.equal(values['--aero-blur'],'14px');assert.ok(Number(values['--aero-alpha'])<1);assert.equal(root.dataset.aeroTransparency,'true');
});
