const { elementRoles, roles } = require('aria-query');
const { AXObjects, elementAXObjects } = require('axobject-query');
const { INTERACTIVE_ROLES } = require('../utils/interactive-roles');
const { isNativeElement } = require('../utils/is-native-element');

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

// Element+role pairings that are valid by spec even though the element's
// default ARIA role is non-interactive. Two authorities agree on this list:
//
//   1. ARIA in HTML §5 "Allowed descendants of ARIA roles" / the conformance
//      table at https://www.w3.org/TR/html-aria/#docconformance — defines
//      which non-default roles each HTML element may carry.
//
//   2. jsx-a11y :recommended `allowedInvalidRoles` config
//      (eslint-plugin-jsx-a11y/src/index.js) — editorial distillation of the
//      same spec table into the roles most commonly used in real apps.
//
// Row-by-row rationale (both authorities concur unless noted):
//   ul/ol + menu/menubar/tablist/tree/treegrid/listbox/radiogroup:
//     List repurposed as an ARIA composite widget container. WAI-ARIA APG
//     navigation-menu, tree, tabs, and listbox patterns all use <ul>/<ol>.
//   li + menuitem/menuitemcheckbox/menuitemradio/option/row/tab/treeitem:
//     List item serving as a child of the composite widget above.
//   table + grid:
//     Data table promoted to an interactive ARIA grid (ARIA 1.2 §5.4).
//   td + gridcell:
//     Table cell inside an ARIA grid (aria-query also models this).
//   fieldset + radiogroup:
//     Fieldset semantically wrapping a radio group (jsx-a11y :recommended).
const ALLOWED_ROLE_OVERRIDE = new Map([
  ['ul', new Set(['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'])],
  ['ol', new Set(['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'])],
  [
    'li',
    new Set(['menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'row', 'tab', 'treeitem']),
  ],
  ['table', new Set(['grid'])],
  ['td', new Set(['gridcell'])],
  ['fieldset', new Set(['radiogroup'])],
]);

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
    const sourceCode = context.sourceCode;
    return {
      GlimmerElementNode(node) {
        if (!isNativeElement(node, sourceCode)) {
          return;
        }

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
          if (INTERACTIVE_ROLES.has(token) && !ALLOWED_ROLE_OVERRIDE.get(tag)?.has(token)) {
            context.report({ node, messageId: 'mismatch', data: { tag: node.tag, role: token } });
          }
          return;
        }
      },
    };
  },
};
