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
