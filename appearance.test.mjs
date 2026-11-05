import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAppearance,normalizeAppearance,applyAppearance,hexToHsl,hslToHex,hexToHsv,hsvToHex,defaultAppearance} from './public/appearance.js';
test('Aero accepts bounded settings, rejects CSS injection, and converts mixer colors',()=>{
 assert.deepEqual(validateAppearance({color:'#AA3377',intensity:75,transparency:false}),{color:'#aa3377',intensity:75,transparency:false});
 for(const value of [null,[],{color:'red;display:none',intensity:50,transparency:true},{color:'#112233',intensity:101,transparency:true},{color:'#112233',intensity:50,transparency:'false'}])assert.throws(()=>validateAppearance(value));
 assert.deepEqual(normalizeAppearance(null),defaultAppearance);
 for(const [hex,hsl] of [['#ff0000',[0,100,50]],['#00ff00',[120,100,50]],['#0000ff',[240,100,50]],['#808080',[0,0,50]]]){assert.deepEqual(hexToHsl(hex),hsl);assert.equal(hslToHex(...hsl),hex);}
 const values={},root={dataset:{},style:{setProperty:(key,value)=>values[key]=value}};
 applyAppearance({color:'#ff0000',intensity:100,transparency:false},root);assert.equal(values['--aero-alpha'],'1');assert.equal(values['--aero-shell-alpha'],'1');assert.equal(values['--aero-blur'],'0px');
 applyAppearance(defaultAppearance,root);assert.equal(values['--aero-blur'],'14px');assert.ok(Number(values['--aero-alpha'])<1);assert.equal(root.dataset.aeroTransparency,'true');
});

test('native Himmel default preserves explicit saved colors without migration',()=>{
 assert.equal(defaultAppearance.color,'#74b8fc');
 const saved={color:'#69a4c9',intensity:50,transparency:true};
 assert.deepEqual(normalizeAppearance(saved),saved);
 const values={},root={dataset:{},style:{setProperty:(key,value)=>values[key]=value}};
 applyAppearance(saved,root);assert.equal(values['--aero-rgb'],'105 164 201');
 applyAppearance(null,root);assert.equal(values['--aero-rgb'],'116 184 252');
 assert.equal(saved.color,'#69a4c9');
});

test('brightness uses HSB endpoints while legacy HSL exports remain unchanged',()=>{
 assert.equal(hsvToHex(120,100,100),'#00ff00');assert.equal(hsvToHex(120,0,100),'#ffffff');assert.equal(hsvToHex(240,100,0),'#000000');assert.equal(hsvToHex(360,100,100),'#ff0000');assert.equal(hslToHex(120,100,100),'#ffffff');
});
test('saved RGB colors round trip through the mixer and invalid channels fail closed',()=>{
 for(const color of ['#74b8fc','#69a4c9','#010203','#123456','#fedcba','#ff0000','#00ff00','#0000ff','#808080','#000000','#ffffff'])assert.equal(hsvToHex(...hexToHsv(color)),color);
 for(const channels of [[NaN,50,50],[0,-1,50],[0,50,101],[361,50,50],['120',50,50]])assert.throws(()=>hsvToHex(...channels));assert.throws(()=>hexToHsv('red; display:none'));
});
