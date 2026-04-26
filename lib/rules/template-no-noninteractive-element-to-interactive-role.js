const { elementRoles, roles } = require('aria-query');
const { AXObjects, elementAXObjects } = require('axobject-query');
const { INTERACTIVE_ROLES } = require('../utils/interactive-roles');

// Elements with inherent non-interactive accessibility-tree semantics. We
// union two derivations to match jsx-a11y's `isNonInteractiveElement`
// (src/util/isNonInteractiveElement.js), which consults both aria-query's
// elementRoles and axobject-query's elementAXObjects:
//
//   1. aria-query elementRoles: tags that map to at least one non-interactive
//      role (neither a widget descendant nor `generic`) and never to an
//      interactive role. Covers HTML-AAM mappings that axobject-query doesn't
//      (e.g. `section` → `region`, `fieldset` → `group`, `code`/`em`/`strong`
//      → `code`/`emphasis`/`strong`, `tbody`/`tfoot`/`thead` → `rowgroup`).
//
//   2. axobject-query elementAXObjects: tags whose AXObjects are exclusively
//      `window`/`structure` (no `widget` participants). Covers tags without
//      an aria-query elementRoles mapping (`abbr`, `br`, `figcaption`,
//      `iframe`, `label`, `legend`, `marquee`, `ruby`, `tr`, etc.).
//
// `header` is excluded: its mapping depends on nesting context (`banner` only
// as direct child of body), which this rule cannot statically verify. This
// matches jsx-a11y's explicit `if (tagName === 'header') return false` carve-
// out in isNonInteractiveElement.js.
const NON_INTERACTIVE_TAGS = buildNonInteractiveTagSet();

function buildNonInteractiveTagSet() {
  const tags = new Set();

  // Derivation 1 — aria-query elementRoles.
  const nonInteractiveAriaRoles = new Set();
  for (const [role, def] of roles) {
    if (def.abstract) {
      continue;
    }
    // `generic` carries no semantics (WAI-ARIA 1.2 §5.3.3), so elements whose
    // only role is `generic` (div/span/header/body/pre/q/samp/b/i/u/...) must
    // not be classified as non-interactive — giving them any role is fine.
    if (role === 'generic') {
      continue;
    }
    const descendsFromWidget = (def.superClass || []).some((chain) => chain.includes('widget'));
    if (!descendsFromWidget) {
      nonInteractiveAriaRoles.add(role);
    }
  }
  const tagsWithOnlyNonInteractiveRole = new Set();
  const tagsWithAnyInteractiveRole = new Set();
  for (const [schema, rolesSet] of elementRoles) {
    const roleList = [...rolesSet];
    if (roleList.length > 0 && roleList.every((r) => nonInteractiveAriaRoles.has(r))) {
      tagsWithOnlyNonInteractiveRole.add(schema.name);
    }
    if (roleList.some((r) => INTERACTIVE_ROLES.has(r))) {
      tagsWithAnyInteractiveRole.add(schema.name);
    }
  }
  for (const tag of tagsWithOnlyNonInteractiveRole) {
    if (!tagsWithAnyInteractiveRole.has(tag)) {
      tags.add(tag);
    }
  }

  // Derivation 2 — axobject-query elementAXObjects (unconstrained only).
  const nonInteractiveAXObjects = new Set(
    [...AXObjects.keys()].filter((name) =>
      ['window', 'structure'].includes(AXObjects.get(name).type)
    )
  );
  for (const [schema, axObjectsArr] of elementAXObjects) {
    if (schema.attributes && schema.attributes.length > 0) {
      continue;
    }
    if ([...axObjectsArr].every((o) => nonInteractiveAXObjects.has(o))) {
      tags.add(schema.name);
    }
  }

  // Exclude `header` — its role depends on ancestry (banner when direct child
  // of body, generic otherwise). Matches jsx-a11y's carve-out.
  tags.delete('header');

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
