const { roles } = require('aria-query');

// Interactive ARIA roles — the set of concrete roles whose taxonomy in WAI-ARIA
// includes a widget / command / composite / input / range ancestor. Derived from
// aria-query so the list stays current with ARIA spec updates (including
// DPUB-ARIA and Graphics-ARIA additions) without hand maintenance.
//
// `tooltip` and `toolbar` are added explicitly:
//   - `tooltip`: ARIA 1.2 §5.4 lists tooltip among widget roles, but aria-query's
//     superClass chain doesn't include `widget` for it. Practitioner convention
//     (and jsx-a11y/vuejs-accessibility) treats it as interactive.
//   - `toolbar`: does not descend from `widget` in aria-query, but supports
//     `aria-activedescendant` and is widget-like in practice. jsx-a11y adds it
//     with the same rationale.
module.exports.INTERACTIVE_ROLES = buildInteractiveRoleSet();

function buildInteractiveRoleSet() {
  const result = new Set(['tooltip', 'toolbar']);
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
