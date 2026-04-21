'use strict';

/**
 * Native-interactive HTML element classification, shared across rules that need to
 * ask "does this HTML tag natively expose interactive UI to keyboard / AT users?".
 *
 * The set is hand-curated rather than derived from a single authority because
 * aria-query, axobject-query, HTML-AAM, WAI-ARIA, and browser reality disagree on
 * several rows. Decision rationale is documented per-tag:
 *
 * | Element                                         | Behavior             | Rationale |
 * |-------------------------------------------------|----------------------|-----------|
 * | button, select, textarea, iframe, embed,        | Interactive          | aria-query/axobject-query widget + universally-accepted |
 * | summary, details                                |                      |           |
 * | input (except type=hidden)                      | Interactive          | Same as above, minus hidden |
 * | option, datalist                                | Interactive          | aria-query roles option/listbox; axobject widget; HTML-AAM |
 * | a[href], area[href]                             | Interactive (cond.)  | HTML-AAM: anchor interactivity requires href |
 * | audio[controls], video[controls]                | Interactive          | Browsers only render focusable UI with `controls` |
 * | audio, video (no controls)                      | NOT interactive      | No keyboard semantics without controls; browsers agree |
 * | object                                          | Interactive          | axobject-query EmbeddedObjectRole |
 * | canvas                                          | Interactive          | axobject-query CanvasRole widget; bias toward no-FP |
 * | input[type=hidden]                              | NOT interactive      | HTML spec: no UI, no focus, no AT exposure |
 * | menuitem                                        | NOT interactive      | Deprecated; no longer rendered in Chrome/Edge/Safari/FF |
 * | label                                           | NOT interactive      | axobject-query LabelRole is structure, not widget |
 */

// Unconditionally-interactive HTML tags (no attribute dependencies).
const UNCONDITIONAL_INTERACTIVE_TAGS = new Set([
  'button',
  'select',
  'textarea',
  'iframe',
  'embed',
  'summary',
  'details',
  'option',
  'datalist',
  'object',
  'canvas',
]);

/**
 * Determine whether a Glimmer element node represents a natively-interactive
 * HTML element.
 *
 * @param {object} node                 Glimmer `ElementNode` (has a string `tag`).
 * @param {Function} getTextAttrValue   Helper (node, attrName) -> string | undefined
 *                                      that returns the text value of a static
 *                                      attribute, or undefined for dynamic / missing.
 * @returns {boolean}                   True if the element is natively interactive.
 */
function isNativeInteractive(node, getTextAttrValue) {
  const rawTag = node && node.tag;
  if (typeof rawTag !== 'string' || rawTag.length === 0) {
    return false;
  }
  const tag = rawTag.toLowerCase();

  // Unconditional interactive tags.
  if (UNCONDITIONAL_INTERACTIVE_TAGS.has(tag)) {
    return true;
  }

  // <input> is interactive unless type="hidden" (HTML spec: no UI/focus/AT exposure).
  if (tag === 'input') {
    const type = getTextAttrValue(node, 'type');
    return type !== 'hidden';
  }

  // <a> and <area> are interactive only when an href is present (HTML-AAM).
  if (tag === 'a' || tag === 'area') {
    return hasAttribute(node, 'href');
  }

  // <audio>/<video> are only interactive when `controls` is present.
  if (tag === 'audio' || tag === 'video') {
    return hasAttribute(node, 'controls');
  }

  return false;
}

function hasAttribute(node, name) {
  return Boolean(node.attributes && node.attributes.some((a) => a.name === name));
}

module.exports = {
  isNativeInteractive,
};
