// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// Scope caveat: we only check the subtree within the current .hbs template.
// Ember `{{yield}}` boundaries and component invocations hide descendants
// we can't see, so a truly-focusable child rendered by `<MyComponent>` under
// `aria-hidden` won't be caught. We deliberately accept that false-negative;
// the alternative is false-positive flagging of every component invocation
// under `aria-hidden`, which would be noise.

const ALWAYS_FOCUSABLE_TAGS = new Set([
  'button',
  'select',
  'textarea',
  'iframe',
  'summary',
  'details',
]);

function getAttr(node, name) {
  return node.attributes?.find((attr) => attr.name === name);
}

function isAriaHiddenTruthy(node) {
  const attr = getAttr(node, 'aria-hidden');
  if (!attr) {
    return false;
  }
  const value = attr.value;
  if (!value) {
    return true;
  }
  if (value.type === 'GlimmerTextNode') {
    const chars = value.chars.toLowerCase();
    return chars === '' || chars === 'true';
  }
  if (value.type === 'GlimmerMustacheStatement' && value.path) {
    if (value.path.type === 'GlimmerBooleanLiteral') {
      return value.path.value === true;
    }
    if (value.path.type === 'GlimmerStringLiteral') {
      return value.path.value.toLowerCase() === 'true';
    }
  }
  return false;
}

function tabIndexSignal(node) {
  const attr = getAttr(node, 'tabindex');
  if (!attr) {
    return 'absent';
  }
  if (!attr.value || attr.value.type !== 'GlimmerTextNode') {
    return 'dynamic';
  }
  const raw = attr.value.chars.trim();
  if (raw === '') {
    return 'dynamic';
  }
  const n = Number(raw);
  if (Number.isNaN(n)) {
    return 'dynamic';
  }
  return n >= 0 ? 'focusable' : 'non-focusable';
}

function isHtmlElementNode(node) {
  if (!node || node.type !== 'GlimmerElementNode') {
    return false;
  }
  // PascalCase / namespaced / this.- / @arg — treat as a component, not HTML.
  const tag = node.tag || '';
  return Boolean(/^[a-z]/.test(tag) && !tag.includes('.') && !tag.startsWith('@'));
}

function isAnchorOrAreaFocusable(node) {
  return (node.tag === 'a' || node.tag === 'area') && Boolean(getAttr(node, 'href'));
}

function isInputFocusable(node) {
  if (node.tag !== 'input') {
    return false;
  }
  const typeAttr = getAttr(node, 'type');
  if (!typeAttr || !typeAttr.value || typeAttr.value.type !== 'GlimmerTextNode') {
    // No explicit or static type — default is `text`, which is focusable.
    return true;
  }
  return typeAttr.value.chars.toLowerCase() !== 'hidden';
}

function isMediaFocusable(node) {
  if (node.tag !== 'audio' && node.tag !== 'video') {
    return false;
  }
  return Boolean(getAttr(node, 'controls'));
}

function isContentEditable(node) {
  const attr = getAttr(node, 'contenteditable');
  if (!attr) {
    return false;
  }
  if (!attr.value) {
    return true;
  }
  if (attr.value.type === 'GlimmerTextNode') {
    const chars = attr.value.chars.toLowerCase();
    return chars !== 'false';
  }
  return false;
}

function isImplicitlyFocusable(node) {
  if (!isHtmlElementNode(node)) {
    return false;
  }
  if (ALWAYS_FOCUSABLE_TAGS.has(node.tag)) {
    return true;
  }
  if (isAnchorOrAreaFocusable(node)) {
    return true;
  }
  if (isInputFocusable(node)) {
    return true;
  }
  if (isMediaFocusable(node)) {
    return true;
  }
  if (isContentEditable(node)) {
    return true;
  }
  return false;
}

function isFocusable(node) {
  const tabSignal = tabIndexSignal(node);
  if (tabSignal === 'focusable') {
    return true;
  }
  if (tabSignal === 'non-focusable' || tabSignal === 'dynamic') {
    return false;
  }
  return isImplicitlyFocusable(node);
}

function* walkElementDescendants(node) {
  if (!node.children) {
    return;
  }
  for (const child of node.children) {
    if (!child || child.type !== 'GlimmerElementNode') {
      continue;
    }
    yield child;
    yield* walkElementDescendants(child);
  }
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow aria-hidden on focusable elements',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-aria-hidden-focusable.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      self: '`aria-hidden` cannot be used on focusable elements',
      descendant: '`aria-hidden` on an ancestor hides this focusable element from assistive tech',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (!isAriaHiddenTruthy(node)) {
          return;
        }
        if (isFocusable(node)) {
          const attr = getAttr(node, 'aria-hidden');
          context.report({ node: attr || node, messageId: 'self' });
          return;
        }
        for (const descendant of walkElementDescendants(node)) {
          if (isFocusable(descendant)) {
            context.report({ node: descendant, messageId: 'descendant' });
          }
        }
      },
    };
  },
};
