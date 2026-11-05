import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  applyWin7ScrollbarSkin,
  removeWin7ScrollbarSkin,
  WIN7_SCROLLBAR_SKIN_CLASS,
} from './public/win7-scrollbars.js';

class FakeClassList {
  values = new Set();
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

function element({ tagName = 'DIV', classes = [], matches = false, closest = false } = {}) {
  const classList = new FakeClassList();
  for (const name of classes) classList.add(name);
  return {
    tagName,
    classList,
    matches: () => matches,
    closest: () => closest ? {} : null,
  };
}

test('applies only to the selected element and restores only its own change', () => {
  const target = element();
  const result = applyWin7ScrollbarSkin(target);
  assert.equal(result.applied, true);
  assert.equal(target.classList.contains(WIN7_SCROLLBAR_SKIN_CLASS), true);
  result.restore();
  result.restore();
  assert.equal(target.classList.contains(WIN7_SCROLLBAR_SKIN_CLASS), false);

  const preexisting = element({ classes: [WIN7_SCROLLBAR_SKIN_CLASS] });
  const preserved = applyWin7ScrollbarSkin(preexisting);
  preserved.restore();
  assert.equal(preexisting.classList.contains(WIN7_SCROLLBAR_SKIN_CLASS), true);
});

test('does not duplicate the dedicated Sharing scrollbar or style iframe contents', () => {
  for (const target of [element({ matches: true }), element({ closest: true })]) {
    const result = applyWin7ScrollbarSkin(target);
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'owned-scrollbar-ui');
  }
  const iframe = applyWin7ScrollbarSkin(element({ tagName: 'IFRAME' }));
  assert.equal(iframe.applied, false);
  assert.equal(iframe.reason, 'iframe-document-boundary');
});

test('removes the skin explicitly and reports whether it changed the target', () => {
  const target = element({ classes: [WIN7_SCROLLBAR_SKIN_CLASS] });
  assert.equal(removeWin7ScrollbarSkin(target), true);
  assert.equal(removeWin7ScrollbarSkin(target), false);
  assert.equal(removeWin7ScrollbarSkin(null), false);
});

test('CSS has the 17px Win7 geometry, native-state styling, browser fallback and forced-colors path', async () => {
  const css = await readFile(new URL('./public/win7-scrollbars.css', import.meta.url), 'utf8');
  assert.match(css, /::-webkit-scrollbar\s*\{\s*width:\s*17px;\s*height:\s*17px;/);
  assert.match(css, /::-webkit-scrollbar-button[\s\S]*?width:\s*17px;\s*height:\s*17px;/);
  assert.match(css, /::-webkit-scrollbar-button\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /::-webkit-scrollbar-button:vertical:decrement:start/);
  assert.match(css, /::-webkit-scrollbar-button:vertical:increment:end/);
  assert.match(css, /::-webkit-scrollbar-button:horizontal:decrement:start/);
  assert.match(css, /::-webkit-scrollbar-button:horizontal:increment:end/);
  assert.match(css, /::-webkit-scrollbar-button:vertical:decrement\s*\{\s*background-image:\s*[\s\S]*linear-gradient/);
  assert.doesNotMatch(css, /url\s*\(/i);
  assert.match(css, /::-webkit-scrollbar-corner/);
  assert.match(css, /::-webkit-scrollbar-thumb:hover/);
  assert.match(css, /::-webkit-scrollbar-button:hover/);
  assert.match(css, /scrollbar-color:\s*#c5c5c5 #f1f1f1/);
  assert.match(css, /scrollbar-width:\s*auto/);
  assert.match(css, /@supports\s+selector\(::-webkit-scrollbar\)[\s\S]*?scrollbar-color:\s*auto/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /:not\(\.cp-sharing-scroll\)/);
  assert.doesNotMatch(css, /overscroll-behavior|addEventListener\(['"](?:wheel|keydown|pointer)/);
});
