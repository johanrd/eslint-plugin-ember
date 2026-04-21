const { roles } = require('aria-query');

// Elements with inherent non-interactive semantics. Assigning an interactive
// role here is a mismatch — the element contributes no interactive behavior
// to back the role, so users get a widget with no keyboard/focus support.
// Sourced from WAI-ARIA 1.2 and HTML-AAM; this set is the common, spec-backed
// subset (headings, landmarks, text structure, forms, tables, lists). We
// intentionally omit <div>/<span>/<p> — ARIA 1.2 assigns those the "generic"
// role, which doesn't carry non-interactive semantics.
const NON_INTERACTIVE_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'article',
  'aside',
  'nav',
  'main',
  'section',
  'header',
  'footer',
  'address',
  'figure',
  'figcaption',
  'blockquote',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'tbody',
  'tfoot',
  'thead',
  'tr',
  'th',
  'caption',
  'fieldset',
  'legend',
  'form',
  'img',
]);

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
  return result;
}

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function getRoleTokens(node) {
  const attr = findAttr(node, 'role');
  if (!attr || attr.value?.type !== 'GlimmerTextNode') {
    return undefined;
  }
  const chars = attr.value.chars.trim();
  if (!chars) {
    return undefined;
  }
  return chars.toLowerCase().split(/\s+/u);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow non-interactive elements from being assigned interactive ARIA roles',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-noninteractive-element-to-interactive-role.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      mismatch:
        'Non-interactive element <{{tag}}> should not have an interactive role "{{role}}". The native element contributes no interactive behavior to back the role.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        const tag = node.tag?.toLowerCase();
        if (!tag || !NON_INTERACTIVE_TAGS.has(tag)) {
          return;
        }

        const tokens = getRoleTokens(node);
        if (!tokens) {
          return;
        }

        // Use the first recognised role (ARIA 1.2 §5.4 role-fallback).
        for (const token of tokens) {
          const def = roles.get(token);
          if (!def || def.abstract) {
            continue;
          }
          if (INTERACTIVE_ROLES.has(token)) {
            context.report({ node, messageId: 'mismatch', data: { tag: node.tag, role: token } });
          }
          return;
        }
      },
    };
  },
};
