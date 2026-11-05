import {applyWin7ScrollbarSkin, WIN7_SCROLLBAR_SKIN_CLASS} from '/win7-scrollbars.js';

const installed = new WeakMap();
const marker = 'data-win7-scrollbars-managed';
const scrollable = /^(auto|scroll|overlay)$/;

/** Theme real scroll containers without replacing their layout or input handlers. */
export function installDesktopScrollbars({document: doc = document, stylesheet = '/win7-scrollbars.css', scopeSelector = null, observeFrames = true, includeDocumentViewport = true} = {}) {
  if (installed.has(doc)) return installed.get(doc);
  const records = new Map();
  let disposed = false;

  function adopt(document) {
    if (disposed || !document?.documentElement || records.has(document)) return;
    // App frames which run their own desktop entry point already manage themselves.
    if (document.documentElement.hasAttribute(marker)) return;
    const view = document.defaultView;
    if (!view?.MutationObserver || !view.getComputedStyle) return;
    document.documentElement.setAttribute(marker, '');
    const handles = new Map(), frames = new Map(), pending = new Set();
    let scheduled = null, active = true;
    let ownedLink = null;
    if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === new URL(stylesheet, doc.baseURI).href)) {
      ownedLink = document.createElement('link');
      ownedLink.rel = 'stylesheet';
      ownedLink.href = new URL(stylesheet, doc.baseURI).href;
      (document.head || document.documentElement).append(ownedLink);
    }

    function frame(element) {
      if (frames.has(element)) return;
      let previous = null;
      const load = () => {
        if (previous) records.get(previous)?.dispose();
        previous = null;
        try {
          const child = element.contentDocument;
          if (child?.documentElement) { previous = child; adopt(child); }
        } catch { /* Cross-origin documents require their application's own theme hook. */ }
      };
      element.addEventListener('load', load);
      frames.set(element, () => {
        element.removeEventListener('load', load);
        if (previous) records.get(previous)?.dispose();
      });
      load();
    }

    function inspect(element) {
      if (!active || element.nodeType !== 1 || !element.isConnected) return;
      if (scopeSelector && !element.matches(scopeSelector) && !element.closest(scopeSelector)) {
        handles.get(element)?.restore(); handles.delete(element);
        return;
      }
      if (element.tagName.toLowerCase() === 'iframe') { if (observeFrames) frame(element); return; }
      const style = view.getComputedStyle(element);
      if ((includeDocumentViewport && (element === document.documentElement || element === document.scrollingElement)) || scrollable.test(style.overflowX) || scrollable.test(style.overflowY)) {
        if (!handles.has(element)) {
          const handle = applyWin7ScrollbarSkin(element);
          if (handle.applied) handles.set(element, handle);
        }
      } else if (handles.has(element)) { handles.get(element).restore(); handles.delete(element); }
    }
    function scan(root) {
      inspect(root);
      for (const element of root.querySelectorAll?.('*') || []) inspect(element);
    }
    function flush() {
      scheduled = null;
      for (const root of pending) scan(root);
      pending.clear();
      for (const [element, handle] of handles) if (!element.isConnected) { handle.restore(); handles.delete(element); }
      for (const [element, release] of frames) if (!element.isConnected) { release(); frames.delete(element); }
    }
    function queue(root) {
      if (!active) return;
      pending.add(root);
      if (scheduled === null) scheduled = view.requestAnimationFrame(flush);
    }
    const withoutSkin = value => String(value || '').split(/\s+/).filter(value => value && value !== WIN7_SCROLLBAR_SKIN_CLASS).sort().join(' ');
    const observer = new view.MutationObserver(changes => {
      for (const change of changes) {
        if (change.type === 'attributes') {
          if (change.attributeName !== 'class' || withoutSkin(change.oldValue) !== withoutSkin(change.target.getAttribute('class'))) queue(change.target);
        }
        else {
          for (const node of change.addedNodes) if (node.nodeType === 1) queue(node);
          // Removed trees are released by flush, without retaining a full detached tree.
          if (change.removedNodes.length && scheduled === null) scheduled = view.requestAnimationFrame(flush);
        }
      }
    });
    // Ignore our own class changes, while retaining application-driven overflow changes.
    observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class']});
    const loaded = event => { if (event.target?.tagName === 'LINK') queue(document.documentElement); };
    const resized = () => queue(document.documentElement);
    document.addEventListener('load', loaded, true);
    view.addEventListener('resize', resized);
    const record = {dispose() {
      if (!active) return;
      active = false;
      observer.disconnect();
      document.removeEventListener('load', loaded, true);
      view.removeEventListener('resize', resized);
      if (scheduled !== null) view.cancelAnimationFrame(scheduled);
      pending.clear();
      for (const release of frames.values()) release();
      for (const handle of handles.values()) handle.restore();
      frames.clear(); handles.clear();
      ownedLink?.remove();
      document.documentElement.removeAttribute(marker);
      records.delete(document);
    }};
    records.set(document, record);
    scan(document.documentElement);
  }

  const controller = {dispose() {
    if (disposed) return;
    disposed = true;
    for (const record of [...records.values()]) record.dispose();
    installed.delete(doc);
  }};
  installed.set(doc, controller);
  adopt(doc);
  return controller;
}
