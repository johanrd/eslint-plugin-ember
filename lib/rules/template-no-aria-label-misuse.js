// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// Flags `aria-label` / `aria-labelledby` on elements that cannot be named
// per the ARIA spec (landmarks, interactive, labelable, or roled/tabindexed
// elements are the valid carriers; a plain <div> or <span> without role
// cannot).
//
// We don't carry a full MDN metadata table — the interactive / labelable
// sets below are derived from the HTML spec's "interactive content" and
// "labelable" categories and hand-coded.

const ALLOWLIST = new Set([
  'main',
  'nav',
  'table',
  'td',
  'th',
  'aside',
  'header',
  'footer',
  'section',
  'article',
  'dialog',
  'form',
  'iframe',
  'img',
  'area',
  'fieldset',
  'summary',
  'figure',
]);

const LABELABLE_TAGS = new Set([
  'button',
  'input',
  'meter',
  'output',
  'progress',
  'select',
  'textarea',
]);

const INHERENTLY_INTERACTIVE = new Set([
  'button',
  'details',
  'embed',
  'iframe',
  'keygen',
  'label',
  'select',
  'textarea',
]);

function findAttr(node, name) {
  return node.attributes?.find((attr) => attr.name === name);
}

function hasStaticAttr(node, name) {
  return Boolean(findAttr(node, name));
}

function getStaticAttrString(node, name) {
  const attr = findAttr(node, name);
  if (!attr || !attr.value || attr.value.type !== 'GlimmerTextNode') {
    return null;
  }
  return attr.value.chars;
}

function isInputHidden(node) {
  if (node.tag !== 'input') {
    return false;
  }
  const t = getStaticAttrString(node, 'type');
  return t !== null && t.toLowerCase() === 'hidden';
}

function isInteractiveAnchor(node) {
  return (node.tag === 'a' || node.tag === 'area') && hasStaticAttr(node, 'href');
}

function isInteractiveMedia(node) {
  return (node.tag === 'audio' || node.tag === 'video') && hasStaticAttr(node, 'controls');
}

function isInteractiveInput(node) {
  return node.tag === 'input' && !isInputHidden(node);
}

function isInteractiveImg(node) {
  return node.tag === 'img' && hasStaticAttr(node, 'usemap');
}

function isInteractive(node) {
  if (INHERENTLY_INTERACTIVE.has(node.tag)) {
    return true;
  }
  if (isInteractiveAnchor(node)) {
    return true;
  }
  if (isInteractiveMedia(node)) {
    return true;
  }
  if (isInteractiveInput(node)) {
    return true;
  }
  if (isInteractiveImg(node)) {
    return true;
  }
  return false;
}

function isLabelable(node) {
  return LABELABLE_TAGS.has(node.tag) && !isInputHidden(node);
}

function isHtmlElement(node) {
  const tag = node.tag || '';
  return /^[a-z]/.test(tag) && !tag.includes('.') && !tag.startsWith('@');
}

function isNameableUsage(node) {
  if (!isHtmlElement(node)) {
    // Unknown component — we can't judge its accessibility tree.
    return true;
  }
  if (ALLOWLIST.has(node.tag)) {
    return true;
  }
  if (hasStaticAttr(node, 'role')) {
    return true;
  }
  if (hasStaticAttr(node, 'tabindex')) {
    return true;
  }
  if (isInteractive(node)) {
    return true;
  }
  if (isLabelable(node)) {
    return true;
  }
  return false;
}

function hasNonEmptyAttr(node, name) {
  const attr = findAttr(node, name);
  if (!attr) {
    return false;
  }
  if (!attr.value) {
    return true;
  }
  if (attr.value.type === 'GlimmerTextNode') {
    return attr.value.chars !== '';
  }
  // Mustache — treat as non-empty; the author has declared intent.
  return true;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow aria-label and aria-labelledby on elements that cannot be named',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-aria-label-misuse.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      misuse:
        '`{{attr}}` cannot be used on `<{{tag}}>` without an interactive role, tabindex, or role attribute',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (!isHtmlElement(node)) {
          return;
        }
        if (isNameableUsage(node)) {
          return;
        }
        for (const key of ['aria-label', 'aria-labelledby']) {
          if (hasNonEmptyAttr(node, key)) {
            const attr = findAttr(node, key);
            context.report({
              node: attr,
              messageId: 'misuse',
              data: { attr: key, tag: node.tag },
            });
          }
        }
      },
    };
  },
};
