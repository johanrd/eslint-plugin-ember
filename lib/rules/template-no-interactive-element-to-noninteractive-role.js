const { roles } = require('aria-query');
const { AXObjects, elementAXObjects } = require('axobject-query');
const { INTERACTIVE_ROLES } = require('../utils/interactive-roles');

// Native elements with inherent interactive semantics per axobject-query —
// elements whose AXObjects include a widget type. This is the same data source
// jsx-a11y, @angular-eslint/template, and lit-a11y use. `<a>` is handled
// separately because it's only interactive when `href` is present.
const INHERENTLY_INTERACTIVE_TAGS = buildInteractiveTagSet();

function buildInteractiveTagSet() {
  const interactiveAXObjects = new Set(
    [...AXObjects.keys()].filter((name) => AXObjects.get(name).type === 'widget')
  );
  const tags = new Set();
  for (const [schema, axObjectsArr] of elementAXObjects) {
    // Only consider elements with no attribute constraints — unconditionally
    // interactive by element type (separately handles <a href>).
    if (schema.attributes && schema.attributes.length > 0) {
      continue;
    }
    if ([...axObjectsArr].some((o) => interactiveAXObjects.has(o))) {
      tags.add(schema.name);
    }
  }
  return tags;
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
  if (!tag) {
    return false;
  }
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
      description: 'disallow native interactive elements being assigned non-interactive ARIA roles',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-interactive-element-to-noninteractive-role.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      mismatch:
        'Interactive element <{{tag}}> should not have a non-interactive role "{{role}}". Native interactive semantics are lost.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (!isInteractiveElement(node)) {
          return;
        }

        const tokens = getRoleTokens(node);
        if (!tokens) {
          return;
        }

        // Pick the first token that's a known role (matching ARIA 1.2 §5.4
        // role-fallback behavior — UAs use the first recognised role).
        for (const token of tokens) {
          if (token === 'presentation' || token === 'none') {
            context.report({ node, messageId: 'mismatch', data: { tag: node.tag, role: token } });
            return;
          }
          const def = roles.get(token);
          if (!def || def.abstract) {
            continue;
          }
          if (!INTERACTIVE_ROLES.has(token)) {
            context.report({ node, messageId: 'mismatch', data: { tag: node.tag, role: token } });
          }
          return;
        }
      },
    };
  },
};
