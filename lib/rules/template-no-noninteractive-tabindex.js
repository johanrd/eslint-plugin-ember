const { dom, roles } = require('aria-query');
const { isComponentInvocation } = require('../utils/is-component-invocation');
const { isNativeInteractive } = require('../utils/native-interactive-elements');

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

function getStaticTabindexValue(attr) {
  const value = attr?.value;
  if (!value) {
    return undefined;
  }
  if (value.type === 'GlimmerTextNode') {
    const parsed = Number.parseInt(value.chars, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value.type === 'GlimmerMustacheStatement' && value.path) {
    if (value.path.type === 'GlimmerNumberLiteral') {
      return value.path.value;
    }
    if (value.path.type === 'GlimmerStringLiteral') {
      const parsed = Number.parseInt(value.path.value, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

function getTextAttrValue(node, name) {
  const attr = findAttr(node, name);
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
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

        // Skip component invocations (PascalCase, named-arg, this-path,
        // dot-path, named-block). Fixes the <Article tabindex={{0}}> FP where
        // a PascalCase component name collided with a native tag after
        // lowercasing.
        if (isComponentInvocation(node)) {
          return;
        }

        const tag = node.tag?.toLowerCase();
        if (!tag) {
          return;
        }

        // Skip custom elements (not in aria-query's dom map).
        if (!dom.has(tag)) {
          return;
        }

        if (isNativeInteractive(node, getTextAttrValue)) {
          return;
        }

        const status = roleStatus(node);
        if (status === 'interactive' || status === 'unknown') {
          return;
        }

        // `tabindex="-1"` is the canonical "focusable but not in tab order"
        // pattern (scroll-to-focus targets, focus restoration, composite-widget
        // children). Matches jsx-a11y's same exemption and is consistent with
        // `template-require-aria-activedescendant-tabindex`.
        if (getStaticTabindexValue(tabindex) === -1) {
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
