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
// `tooltip` is also added — ARIA 1.2 doesn't cleanly categorize tooltip under
// the widget taxonomy (aria-query's superClass is `structure/section`), but
// tooltips with interactive content (close buttons, links) are common and our
// existing test suite treats them as interactive.
module.exports.INTERACTIVE_ROLES = buildInteractiveRoleSet();

function buildInteractiveRoleSet() {
  const result = new Set(['toolbar', 'tooltip']);
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
