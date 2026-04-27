// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// Scope caveat: we only check the subtree within the current .hbs template.
// Ember `{{yield}}` boundaries and component invocations hide descendants
// we can't see, so a truly-focusable child rendered by `<MyComponent>` under
// `aria-hidden` won't be caught. We deliberately accept that false-negative;
// the alternative is false-positive flagging of every component invocation
// under `aria-hidden`, which would be noise.

const { isNativeElement } = require('../utils/is-native-element');

const ALWAYS_FOCUSABLE_TAGS = new Set([
  'button',
  'select',
  'textarea',
  'iframe',
  'summary',
  'details',
]);

// Form controls that are not focusable when `disabled` is present.
// Per HTML §6.6.3 sequential focus-navigation rules, a disabled form
// control is removed from the sequential-focus order.
const DISABLED_SKIPS_FOCUS_TAGS = new Set(['button', 'input', 'select', 'textarea', 'fieldset']);

function getAttr(node, name) {
  return node.attributes?.find((attr) => attr.name === name);
}

// Normalize a static aria-hidden token per HTML attribute conventions:
// whitespace-trimmed, case-insensitive. Per WAI-ARIA 1.2, aria-hidden requires
// an explicit "true" value — empty string is invalid and must NOT be treated as
// truthy.
function normalizeToken(raw) {
  return String(raw).trim().toLowerCase();
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
    return normalizeToken(value.chars) === 'true';
  }
  if (value.type === 'GlimmerMustacheStatement' && value.path) {
    if (value.path.type === 'GlimmerBooleanLiteral') {
      return value.path.value === true;
    }
    if (value.path.type === 'GlimmerStringLiteral') {
      return normalizeToken(value.path.value) === 'true';
    }
  }
  if (value.type === 'GlimmerConcatStatement') {
    // Quoted-mustache form like aria-hidden="{{true}}" or aria-hidden="{{x}}".
    // Only resolve when the concat is a single static-literal part; any
    // dynamic path makes the runtime value unknown — we conservatively treat
    // it as NOT truthy (avoids false positives on dynamic values).
    const parts = value.parts || [];
    if (parts.length === 1) {
      const only = parts[0];
      if (only.type === 'GlimmerMustacheStatement' && only.path) {
        if (only.path.type === 'GlimmerBooleanLiteral') {
          return only.path.value === true;
        }
        if (only.path.type === 'GlimmerStringLiteral') {
          return normalizeToken(only.path.value) === 'true';
        }
      }
      if (only.type === 'GlimmerTextNode') {
        return normalizeToken(only.chars) === 'true';
      }
    }
    return false;
  }
  return false;
}

function classifyTabindexNumber(raw) {
  const trimmed = String(raw).trim();
  if (trimmed === '') {
    return 'dynamic';
  }
  const n = Number(trimmed);
  if (Number.isNaN(n)) {
    return 'dynamic';
  }
  return n >= 0 ? 'focusable' : 'non-focusable';
}

function tabIndexSignal(node) {
  const attr = getAttr(node, 'tabindex');
  if (!attr) {
    return 'absent';
  }
  const value = attr.value;
  if (!value) {
    return 'dynamic';
  }
  if (value.type === 'GlimmerTextNode') {
    return classifyTabindexNumber(value.chars);
  }
  if (value.type === 'GlimmerMustacheStatement' && value.path) {
    if (value.path.type === 'GlimmerStringLiteral') {
      return classifyTabindexNumber(value.path.value);
    }
    if (value.path.type === 'GlimmerNumberLiteral') {
      return classifyTabindexNumber(String(value.path.value));
    }
    return 'dynamic';
  }
  if (value.type === 'GlimmerConcatStatement') {
    // Quoted-mustache form like tabindex="{{0}}" or tabindex="{{x}}".
    // Only resolve single static-literal parts; anything else is dynamic.
    const parts = value.parts || [];
    if (parts.length === 1) {
      const only = parts[0];
      if (only.type === 'GlimmerTextNode') {
        return classifyTabindexNumber(only.chars);
      }
      if (only.type === 'GlimmerMustacheStatement' && only.path) {
        if (only.path.type === 'GlimmerStringLiteral') {
          return classifyTabindexNumber(only.path.value);
        }
        if (only.path.type === 'GlimmerNumberLiteral') {
          return classifyTabindexNumber(String(only.path.value));
        }
      }
    }
    return 'dynamic';
  }
  return 'dynamic';
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
    // Valueless attribute (e.g. `contenteditable`) — empty string per HTML,
    // which enables editing.
    return true;
  }
  if (attr.value.type === 'GlimmerTextNode') {
    const chars = attr.value.chars.toLowerCase();
    return chars !== 'false';
  }
  if (attr.value.type === 'GlimmerMustacheStatement' && attr.value.path) {
    if (attr.value.path.type === 'GlimmerBooleanLiteral') {
      return attr.value.path.value === true;
    }
    if (attr.value.path.type === 'GlimmerStringLiteral') {
      return attr.value.path.value.trim().toLowerCase() !== 'false';
    }
  }
  return false;
}

function isImplicitlyFocusable(node, sourceCode) {
  if (!isNativeElement(node, sourceCode)) {
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

function isDisabled(node) {
  const attr = getAttr(node, 'disabled');
  if (!attr) {
    return false;
  }
  const value = attr.value;
  // Bare `disabled` (no value) or static "" / "disabled" — disabled is truthy.
  if (!value) {
    return true;
  }
  if (value.type === 'GlimmerTextNode') {
    // Per HTML, presence implies disabled regardless of value content.
    return true;
  }
  if (value.type === 'GlimmerMustacheStatement' && value.path) {
    if (value.path.type === 'GlimmerBooleanLiteral') {
      return value.path.value === true;
    }
    if (value.path.type === 'GlimmerStringLiteral') {
      return value.path.value.trim().toLowerCase() !== 'false';
    }
    // Dynamic — unknown; don't claim disabled.
    return false;
  }
  return false;
}

function isFocusable(node, sourceCode) {
  // Disabled form controls are not in the sequential-focus order, per HTML.
  if (DISABLED_SKIPS_FOCUS_TAGS.has(node.tag) && isDisabled(node)) {
    return false;
  }
  const tabSignal = tabIndexSignal(node);
  if (tabSignal === 'focusable') {
    return true;
  }
  if (tabSignal === 'non-focusable' || tabSignal === 'dynamic') {
    return false;
  }
  return isImplicitlyFocusable(node, sourceCode);
}

// Yield descendant GlimmerElementNodes, but stop the descent at component
// boundaries — we can only reason about what's in the current template.
// `sourceCode` enables the scope-aware check in `isNativeElement`.
function* walkElementDescendants(node, sourceCode) {
  if (!node.children) {
    return;
  }
  for (const child of node.children) {
    if (!child || child.type !== 'GlimmerElementNode') {
      continue;
    }
    if (!isNativeElement(child, sourceCode)) {
      // Don't yield the component itself (it's not a native focusable), and
      // don't recurse — the component owns its own subtree.
      continue;
    }
    yield child;
    yield* walkElementDescendants(child, sourceCode);
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
    const sourceCode = context.sourceCode || context.getSourceCode();
    return {
      GlimmerElementNode(node) {
        if (!isAriaHiddenTruthy(node)) {
          return;
        }
        if (isFocusable(node, sourceCode)) {
          const attr = getAttr(node, 'aria-hidden');
          context.report({ node: attr || node, messageId: 'self' });
          return;
        }
        for (const descendant of walkElementDescendants(node, sourceCode)) {
          if (isFocusable(descendant, sourceCode)) {
            context.report({ node: descendant, messageId: 'descendant' });
          }
        }
      },
    };
  },
};
