const { dom, roles } = require('aria-query');

// Native elements with default interactive semantics — tabindex here is fine.
const INHERENTLY_INTERACTIVE_TAGS = new Set([
  'button',
  'details',
  'embed',
  'iframe',
  'input',
  'select',
  'summary',
  'textarea',
]);

// Interactive ARIA roles (widget/command/composite/input/range subtypes) —
// tabindex is required for widget keyboard access, so allow it when present.
const INTERACTIVE_ROLES = buildInteractiveRoleSet();

function buildInteractiveRoleSet() {
  const result = new Set();
  for (const [role, def] of roles) {
    if (def.abstract) {
      continue;
    }
    const ancestors = new Set();
    for (const chain of def.superClass || []) {
      for (const cls of chain) {
        ancestors.add(cls);
      }
    }
    if (
      ancestors.has('widget') ||
      ancestors.has('command') ||
      ancestors.has('composite') ||
      ancestors.has('input') ||
      ancestors.has('range')
    ) {
      result.add(role);
    }
  }
  // toolbar is practically widget-like — see jsx-a11y's note.
  result.add('toolbar');
  return result;
}

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function getTextAttrValue(attr) {
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

function isInteractiveElement(node) {
  const tag = node.tag?.toLowerCase();
  if (INHERENTLY_INTERACTIVE_TAGS.has(tag)) {
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

// Returns "interactive", "non-interactive", or "unknown" (dynamic value).
function roleStatus(node) {
  const attr = findAttr(node, 'role');
  if (!attr) {
    return 'non-interactive';
  }
  if (attr.value?.type !== 'GlimmerTextNode') {
    // Dynamic role — can't statically tell. Be conservative: skip flagging.
    return 'unknown';
  }
  const tokens = attr.value.chars.trim().toLowerCase().split(/\s+/u);
  return tokens.some((t) => INTERACTIVE_ROLES.has(t)) ? 'interactive' : 'non-interactive';
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow tabindex on non-interactive elements (elements without interactive native semantics or interactive ARIA role)',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-noninteractive-tabindex.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      noNonInteractiveTabindex:
        'tabindex on non-interactive element <{{tag}}> — tabindex should only be used on interactive elements or non-interactive elements with an explicit interactive role.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        const tabindex = findAttr(node, 'tabindex');
        if (!tabindex) {
          return;
        }

        const tag = node.tag?.toLowerCase();
        if (!tag) {
          return;
        }

        // Skip components and custom elements (not in aria-query's dom map).
        if (!dom.has(tag)) {
          return;
        }

        if (isInteractiveElement(node)) {
          return;
        }

        const status = roleStatus(node);
        if (status === 'interactive' || status === 'unknown') {
          return;
        }

        context.report({
          node: tabindex,
          messageId: 'noNonInteractiveTabindex',
          data: { tag: node.tag },
        });
      },
    };
  },
};
