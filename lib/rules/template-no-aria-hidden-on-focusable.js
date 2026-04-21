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
        }
      },
    };
  },
};
