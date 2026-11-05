const SKIN_CLASS = 'win7-scrollbars';
const OWNED_SCROLLBAR_SELECTOR = '.cp-sharing-scroll, .cp-sharing-scrollbar';

/** Apply the Windows 7 scrollbar skin to one explicitly chosen scroll container. */
export function applyWin7ScrollbarSkin(element) {
  if (!element || typeof element !== 'object' || !element.classList?.add || !element.classList?.contains) {
    return { applied: false, reason: 'invalid-element', restore() {} };
  }

  if (element.matches?.(OWNED_SCROLLBAR_SELECTOR) || element.closest?.(OWNED_SCROLLBAR_SELECTOR)) {
    return { applied: false, reason: 'owned-scrollbar-ui', restore() {} };
  }

  if (element.tagName?.toLowerCase() === 'iframe') {
    return { applied: false, reason: 'iframe-document-boundary', restore() {} };
  }

  const alreadyApplied = element.classList.contains(SKIN_CLASS);
  element.classList.add(SKIN_CLASS);
  let restored = false;

  return {
    applied: true,
    reason: null,
    restore() {
      if (restored) return;
      restored = true;
      if (!alreadyApplied) element.classList.remove(SKIN_CLASS);
    },
  };
}

/** Remove the skin class from one explicitly chosen scroll container. */
export function removeWin7ScrollbarSkin(element) {
  if (!element?.classList?.remove) return false;
  const hadSkin = element.classList.contains(SKIN_CLASS);
  if (hadSkin) element.classList.remove(SKIN_CLASS);
  return hadSkin;
}

export const WIN7_SCROLLBAR_SKIN_CLASS = SKIN_CLASS;
