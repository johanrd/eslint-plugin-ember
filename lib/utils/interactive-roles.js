'use strict';

const { roles } = require('aria-query');

// Interactive ARIA roles — concrete roles whose taxonomy descends from `widget`
// in aria-query. This is the same derivation jsx-a11y and lit-a11y use (they
// define the canonical peer-plugin behavior here):
//   https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/src/util/isInteractiveRole.js
//   https://github.com/open-wc/open-wc/blob/main/packages/eslint-plugin-lit-a11y/lib/utils/isInteractiveElement.js
//
// `toolbar` is added explicitly — it does not descend from `widget` per
// aria-query's taxonomy, but supports `aria-activedescendant` and is widget-
// like in practice. jsx-a11y and lit-a11y add it for the same reason.
//
// `tooltip` is intentionally NOT added. Per WAI-ARIA 1.2 §5.3.3 — Document
// Structure Roles (https://www.w3.org/TR/wai-aria-1.2/#tooltip), tooltip is
// a document-structure role, not a widget; the spec says "document structures
// are not usually interactive." jsx-a11y and lit-a11y agree.
module.exports.INTERACTIVE_ROLES = buildInteractiveRoleSet();

// Composite-widget child map — for each composite-widget parent role, the
// set of child roles that are legitimately nested inside it per ARIA's
// "Required Owned Elements" (aria-query's `requiredOwnedElements`). Closed
// transitively over chains of composite widgets (e.g. `grid` owns `row`,
// `row` owns `gridcell` / `columnheader` / `rowheader`, so `grid` transitively
// allows all of them).
//
// This drives the nested-interactive exception so canonical composite-widget
// patterns (`listbox > option`, `tablist > tab`, `tree > treeitem`,
// `grid > row > gridcell`, `radiogroup > radio`, etc.) are not flagged.
module.exports.COMPOSITE_WIDGET_CHILDREN = buildCompositeWidgetChildren();

function buildInteractiveRoleSet() {
  const result = new Set(['toolbar']);
  for (const [role, def] of roles) {
    if (def.abstract) {
      continue;
    }
    const descendsFromWidget = (def.superClass || []).some((chain) => chain.includes('widget'));
    if (descendsFromWidget) {
      result.add(role);
    }
  }
  return result;
}

function buildCompositeWidgetChildren() {
  const own = new Map();
  for (const [role, def] of roles) {
    if (def.abstract) {
      continue;
    }
    const owned = def.requiredOwnedElements;
    if (!owned || owned.length === 0) {
      continue;
    }
    const kids = new Set();
    for (const chain of owned) {
      for (const child of chain) {
        kids.add(child);
      }
    }
    own.set(role, kids);
  }

  const direct = new Map();
  for (const [role, def] of roles) {
    if (def.abstract) {
      continue;
    }
    const merged = new Set(own.get(role) || []);
    for (const chain of def.superClass || []) {
      for (const ancestor of chain) {
        const inherited = own.get(ancestor);
        if (inherited) {
          for (const child of inherited) {
            merged.add(child);
          }
        }
      }
    }
    if (merged.size > 0) {
      direct.set(role, merged);
    }
  }

  const closed = new Map();
  function expand(role, visited) {
    if (closed.has(role)) {
      return closed.get(role);
    }
    const out = new Set();
    const kids = direct.get(role);
    if (!kids) {
      closed.set(role, out);
      return out;
    }
    for (const child of kids) {
      out.add(child);
      if (!visited.has(child)) {
        for (const grandchild of expand(child, new Set([...visited, child]))) {
          out.add(grandchild);
        }
      }
    }
    closed.set(role, out);
    return out;
  }
  for (const role of direct.keys()) {
    expand(role, new Set([role]));
  }
  return closed;
}
