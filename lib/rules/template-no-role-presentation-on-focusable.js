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

function hasPresentationRole(node) {
  const attr = findAttr(node, 'role');
  if (!attr || attr.value?.type !== 'GlimmerTextNode') {
    return false;
  }
  return attr.value.chars
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .some((t) => t === 'presentation' || t === 'none');
}

function isFocusable(node) {
  const tag = node.tag?.toLowerCase();
  if (!tag) {
    return false;
  }

  if (findAttr(node, 'tabindex')) {
    return true;
  }
  if (INHERENTLY_FOCUSABLE_TAGS.has(tag)) {
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
      description: 'disallow role="presentation" / role="none" on focusable elements',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-role-presentation-on-focusable.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      invalidPresentation:
        'role="presentation"/"none" must not be used on focusable elements — stripping semantics from a focusable element leaves it announced as text while keyboard users can still focus it.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (!hasPresentationRole(node)) {
          return;
        }
        if (isFocusable(node)) {
          context.report({ node, messageId: 'invalidPresentation' });
        }
      },
    };
  },
};
