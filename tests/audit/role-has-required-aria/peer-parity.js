// Audit fixture — translates peer-plugin test cases into assertions against
// our rule (`ember/template-require-mandatory-role-attributes`). Runs as
// part of the default Vitest suite (via the `tests/**/*.js` include glob)
// and serves double-duty: (1) auditable record of peer-parity divergences,
// (2) regression coverage pinning CURRENT behavior. Each case encodes what
// OUR rule does today; divergences from upstream plugins are annotated as
// `DIVERGENCE —`. Peer-only constructs that can't be translated to Ember
// templates (JSX spread props, Vue v-bind, Angular `$event`, undefined-handler
// expression analysis) are marked `AUDIT-SKIP`.
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/src/rules/role-has-required-aria-props.js
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/role-has-required-aria-props-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/role-has-required-aria-props.ts
//   - angular-eslint-main/packages/eslint-plugin-template/src/rules/role-has-required-aria.ts
//   - angular-eslint-main/packages/eslint-plugin-template/tests/rules/role-has-required-aria/cases.ts
//   - eslint-plugin-lit-a11y/lib/rules/role-has-required-aria-attrs.js

'use strict';

const rule = require('../../../lib/rules/template-require-mandatory-role-attributes');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:role-has-required-aria (gts)', rule, {
  valid: [
    // === Upstream parity (valid everywhere) ===
    '<template><div /></template>',
    '<template><div role="button" /></template>', // no required props
    '<template><div role="heading" aria-level="2" /></template>',
    '<template><span role="button">X</span></template>',
    // checkbox with aria-checked — valid in all plugins.
    '<template><div role="checkbox" aria-checked="false" /></template>',
    // combobox with BOTH required props (jsx-a11y, vue, ours).
    '<template><div role="combobox" aria-expanded="false" aria-controls="id" /></template>',
    // scrollbar requires aria-valuenow, aria-valuemin, aria-valuemax, aria-controls, aria-orientation.
    // slider similarly — we leave the all-present case off for brevity.

    // Dynamic role — skipped by all.
    '<template><div role={{this.role}} /></template>',

    // Unknown role — jsx-a11y filters out unknown, we return null. Both allow.
    '<template><div role="foobar" /></template>',

    // === Parity — semantic-role exemptions via axobject-query ===
    // jsx-a11y, angular-eslint, and our rule all consult axobject-query's
    // elementAXObjects + AXObjectRoles to determine when a native element
    // implements a given ARIA role. Pairings we cover (non-exhaustive):
    //   input[type=checkbox] → checkbox, switch (CheckBoxRole + SwitchRole)
    //   input[type=radio]    → radio            (RadioButtonRole)
    //   input[type=range]    → slider           (SliderRole)
    //   input[type=number]   → spinbutton       (SpinButtonRole)
    //   input[type=text]     → textbox          (TextFieldRole)
    //   input[type=search]   → searchbox        (SearchBoxRole)
    // vue-a11y: VALID only for {role: switch, type: checkbox} via its hardcoded
    //   `filterRequiredPropsExceptions`. Narrower than axobject-query coverage.
    '<template><input type="checkbox" role="switch" /></template>',
    '<template><input type="checkbox" role="checkbox" /></template>',
    '<template><input type="radio" role="radio" /></template>',
    '<template><input type="range" role="slider" /></template>',
    // HTML type keyword values are ASCII case-insensitive.
    '<template><input type="CHECKBOX" role="switch" /></template>',

    // === Parity — input + menuitemcheckbox/menuitemradio flagged ===
    // Neither axobject-query's MenuItemCheckBoxRole nor MenuItemRadioRole
    //   lists an <input> HTML concept; they only have ARIA concepts. So
    //   jsx-a11y / angular / ours all flag these pairings (captured in the
    //   `invalid` section below).

    // === Parity — space-separated role tokens ===
    // jsx-a11y + vue: split on whitespace, validate each token.
    // Our rule (post-PR): split on whitespace, walk for first RECOGNISED
    //   (non-abstract) role per WAI-ARIA §4.1 fallback. Diverges slightly —
    //   we validate only the PRIMARY (first recognised); peers validate
    //   every token. For `"combobox listbox"`, we flag missing aria-expanded
    //   /aria-controls for combobox; jsx-a11y also flags listbox's required
    //   aria-controls separately. Still: both flag. Captured below in invalid.

    // === Parity — case-insensitivity on role value ===
    // jsx-a11y + vue + angular: lowercase the role value before lookup.
    // Our rule (post-PR): same — splitRoleTokens() lowercases before
    //   walking. `<div role="COMBOBOX" />` flags as combobox. Captured
    //   below in invalid.
  ],

  invalid: [
    // === Upstream parity (invalid everywhere) ===
    {
      code: '<template><div role="slider" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<template><div role="checkbox" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<template><div role="combobox" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<template><div role="scrollbar" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<template><div role="heading" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<template><div role="option" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },

    // === DIVERGENCE — partial attrs present, still missing one ===
    // jsx-a11y flags `<div role="scrollbar" aria-valuemax aria-valuemin />`
    //   (missing aria-controls/aria-orientation/aria-valuenow).
    // Our rule: also flags — missing-attrs list non-empty. Parity.
    {
      code: '<template><div role="combobox" aria-controls="x" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },

    // === Pairings NOT exempt — axobject-query does not list them ===
    // Semantic-role exemption is driven by axobject-query's `elementAXObjects`
    // + `AXObjectRoles` maps — see `isSemanticRoleElement()` in the rule
    // source. Pairings the AX-tree data does not list (such as
    // `input[type=checkbox] role=radio` or `input[type=radio] role=switch`)
    // fall through to the normal required-attribute check and are flagged
    // for missing `aria-checked`.
    {
      code: '<template><input type="checkbox" role="radio" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<template><input type="radio" role="switch" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // Bare `<input role="switch">` (no `type`) has no exempt pairing either —
    // the element defaults to `type=text`, which axobject-query does not map
    // to the switch role.
    {
      code: '<template><input role="switch" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // Role-fallback list: split on whitespace, validate the first recognised
    // role (combobox). Matches jsx-a11y's detection on this case.
    {
      code: '<template><div role="combobox listbox" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // Case-insensitive role matching — uppercase values resolve the same.
    {
      code: '<template><div role="COMBOBOX" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<template><div role="SLIDER" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:role-has-required-aria (hbs)', rule, {
  valid: [
    '<div />',
    '<div role="button" />',
    '<div role="heading" aria-level="2" />',
    '<div role="combobox" aria-expanded="false" aria-controls="id" />',
    // Parity: axobject-query-backed semantic-role exemptions.
    '<input type="checkbox" role="switch" />',
    '<input type="range" role="slider" />',
    // Unknown role — both peers and ours allow (no required-attrs check).
    '<div role="foobar" />',
  ],
  invalid: [
    {
      code: '<div role="slider" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<div role="checkbox" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<div role="heading" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // Pairings NOT recognized by axobject-query's elementAXObjects remain
    //   flagged. Our rule (and jsx-a11y/angular) share the same authority
    //   here; the examples below are genuinely undocumented concept-chain
    //   pairings, not divergences.
    {
      code: '<input type="checkbox" role="radio" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    {
      code: '<input role="switch" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // Role-fallback list — first recognised role (combobox) missing attrs.
    {
      code: '<div role="combobox listbox" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // Case-insensitive role matching.
    {
      code: '<div role="COMBOBOX" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
  ],
});
