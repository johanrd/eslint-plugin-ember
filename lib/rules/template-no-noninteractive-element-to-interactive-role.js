const { roles } = require('aria-query');
const { AXObjects, elementAXObjects } = require('axobject-query');
const { INTERACTIVE_ROLES } = require('../utils/interactive-roles');

// Elements with inherent non-interactive accessibility-tree semantics, derived
// from axobject-query: tags whose AXObjects all have type "window" or
// "structure" (no "widget" participants). This is the exact source jsx-a11y,
// vuejs-accessibility, and @angular-eslint/template use to answer the same
// question. Yields headings, landmarks, lists, tables, forms, <img>, etc.
const NON_INTERACTIVE_TAGS = buildNonInteractiveTagSet();

function buildNonInteractiveTagSet() {
  const nonInteractiveAXObjects = new Set(
    [...AXObjects.keys()].filter((name) =>
      ['window', 'structure'].includes(AXObjects.get(name).type)
    )
  );
  const tags = new Set();
  for (const [schema, axObjectsArr] of elementAXObjects) {
    // Only consider elements with no attribute constraints (e.g., always
    // non-interactive regardless of attrs). This keeps the set simple and
    // conservative — dependent variants (e.g., <a href>) are excluded.
    if (schema.attributes && schema.attributes.length > 0) {
      continue;
    }
    if ([...axObjectsArr].every((o) => nonInteractiveAXObjects.has(o))) {
      tags.add(schema.name);
    }
  }
  return tags;
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
