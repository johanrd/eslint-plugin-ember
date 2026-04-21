// Native interactive elements that are focusable by default.
const INHERENTLY_FOCUSABLE_TAGS = new Set([
  'button',
  'details',
  'embed',
  'iframe',
  'input',
  'select',
  'summary',
  'textarea',
]);

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function getTextAttrValue(attr) {
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

function isAriaHiddenTruthy(node) {
  const attr = findAttr(node, 'aria-hidden');
  if (!attr) {
    return false;
  }
  const value = attr.value;
  // Valueless or empty-string → truthy boolean attr. Matches jsx-a11y/vue-a11y.
  if (!value || (value.type === 'GlimmerTextNode' && value.chars === '')) {
    return true;
  }
  if (value.type === 'GlimmerTextNode') {
    return value.chars === 'true';
  }
  if (value.type === 'GlimmerMustacheStatement' && value.path) {
    if (value.path.type === 'GlimmerBooleanLiteral') {
      return value.path.value === true;
    }
    if (value.path.type === 'GlimmerStringLiteral') {
      return value.path.value === 'true';
    }
  }
  return false;
}

function isFocusable(node) {
  const tag = node.tag?.toLowerCase();
  if (!tag) {
    return false;
  }

  // Opt-out via tabindex="-1" makes the element programmatically focusable
  // (still reachable via .focus()) but removes it from the tab order.
  // `aria-hidden` on such an element is still problematic — if it can receive
  // focus, assistive tech should be able to see it. Match jsx-a11y: flag any
  // tabindex that's not "undefined" (i.e. any tabindex attribute at all).
  const tabindex = findAttr(node, 'tabindex');
  if (tabindex) {
    return true;
  }

  if (INHERENTLY_FOCUSABLE_TAGS.has(tag)) {
    // <input type="hidden"> is not focusable.
    if (tag === 'input') {
      const type = getTextAttrValue(findAttr(node, 'type'));
      if (type === 'hidden') {
        return false;
      }
    }
    return true;
  }

  if (tag === 'a' && findAttr(node, 'href')) {
    return true;
  }

  return false;
}

// A tag name is "opaque" if we cannot statically know what element it renders.
// This covers component invocations (PascalCase), argument/this/path-based
// dynamic tags, and namespace-pathed tags. Per WAI-ARIA 1.2 §aria-hidden, we
// conservatively do not descend into these branches (bias toward no-FP).
function isOpaqueTag(tag) {
  if (!tag) {
    return true;
  }
  if (/^[A-Z]/.test(tag)) {
    return true;
  }
  if (tag.startsWith('@') || tag.startsWith('this.')) {
    return true;
  }
  if (tag.includes('.') || tag.includes('::')) {
    return true;
  }
  return false;
}

// Per WAI-ARIA 1.2 §aria-hidden: "Authors SHOULD NOT use aria-hidden='true' on
// any element that has focus or may receive focus". A focusable descendant of
// an aria-hidden ancestor can still receive focus (aria-hidden does not remove
// elements from the tab order), so the ancestor hides AT-visible content that
// remains keyboard-reachable — a keyboard trap.
function hasFocusableDescendant(node) {
  const children = node.children;
  if (!children || children.length === 0) {
    return false;
  }
  for (const child of children) {
    if (child.type !== 'GlimmerElementNode') {
      // Skip TextNode, GlimmerMustacheStatement (dynamic content), yield
      // expressions, and anything else whose rendered element we can't inspect.
      continue;
    }
    if (isOpaqueTag(child.tag)) {
      // Component / dynamic tag — opaque. Don't recurse.
      continue;
    }
    if (isFocusable(child)) {
      return true;
    }
    if (hasFocusableDescendant(child)) {
      return true;
    }
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow aria-hidden="true" on focusable elements',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-aria-hidden-on-focusable.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      noAriaHiddenOnFocusable:
        'aria-hidden="true" must not be set on focusable elements — it creates a keyboard trap (element reachable via Tab but hidden from assistive tech).',
      noAriaHiddenOnAncestorOfFocusable:
        'aria-hidden="true" must not be set on an element that contains focusable descendants — the descendants remain keyboard-reachable but are hidden from assistive tech.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (!isAriaHiddenTruthy(node)) {
          return;
        }
        if (isFocusable(node)) {
          context.report({ node, messageId: 'noAriaHiddenOnFocusable' });
          return;
        }
        if (hasFocusableDescendant(node)) {
          context.report({ node, messageId: 'noAriaHiddenOnAncestorOfFocusable' });
        }
      },
    };
  },
};
