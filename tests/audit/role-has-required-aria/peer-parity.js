// Audit fixture — peer-plugin parity for
// `ember/template-require-mandatory-role-attributes`.
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/src/rules/role-has-required-aria-props.js
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/role-has-required-aria-props-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/role-has-required-aria-props.ts
//   - angular-eslint-main/packages/eslint-plugin-template/src/rules/role-has-required-aria.ts
//   - angular-eslint-main/packages/eslint-plugin-template/tests/rules/role-has-required-aria/cases.ts
//   - eslint-plugin-lit-a11y/lib/rules/role-has-required-aria-attrs.js
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule. Each divergence from an upstream plugin is
// annotated as "DIVERGENCE —".

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

    // === DIVERGENCE — <input type="checkbox" role="switch"> ===
    // jsx-a11y: VALID via `isSemanticRoleElement` (semantic input[type=checkbox]
    //   counts as already-declaring aria-checked via its `checked` state).
    // vue-a11y: VALID via explicit carve-out in filterRequiredPropsExceptions.
    // angular: VALID via isSemanticRoleElement.
    // Our rule: INVALID — we treat every element generically and `switch` has
    //   `aria-checked` as a required prop. Captured in invalid section below.

    // === Partial parity — space-separated role tokens ===
    // jsx-a11y + vue: split on whitespace, validate EACH recognised token.
    // Our rule: splits on whitespace, validates only the FIRST recognised
    //   token (ARIA 1.2 §4.1 role-fallback semantics — UA picks the first
    //   recognised role). So `<div role="button combobox">` — which has
    //   "button" as the first recognised token (no required attrs) —
    //   remains valid for us but jsx-a11y would flag it for missing
    //   combobox attrs.
    '<template><div role="button combobox" /></template>',
    // Both-token case where the first token HAS no required attrs: valid
    //   for us, invalid for jsx-a11y.
    '<template><div role="heading button" aria-level="2" /></template>',
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

    // === Partial parity — partial attrs present, still missing one ===
    // jsx-a11y flags `<div role="scrollbar" aria-valuemax aria-valuemin />`
    //   (missing aria-controls/aria-orientation/aria-valuenow).
    // Our rule: also flags — missing-attrs list non-empty. Parity.
    {
      code: '<template><div role="combobox" aria-controls="x" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },

    // === Parity — case-insensitive role comparison ===
    // jsx-a11y + vue + angular lowercase the role value before lookup.
    // Our rule now does the same, so `<div role="COMBOBOX" />` → INVALID
    //   (missing aria-expanded / aria-controls).
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

    // === Parity — whitespace-separated roles, first recognised validated ===
    // `<div role="combobox listbox">` — both tokens are recognised roles
    //   with required attrs. Per ARIA role-fallback semantics we validate
    //   the first recognised token (combobox). jsx-a11y validates every
    //   token; both plugins end up flagging this same code (though our
    //   error names `combobox`, jsx-a11y may cite all missing attrs).
    {
      code: '<template><div role="combobox listbox" /></template>',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },

    // === DIVERGENCE — input[type=checkbox] role="switch" ===
    // jsx-a11y / vue / angular: VALID (semantic exception).
    // Our rule: INVALID (missing aria-checked). FALSE POSITIVE.
    //   (This PR does not fix the semantic-input exception; separate
    //   fix lives on fix/role-required-aria-checkbox-switch.)
    {
      code: '<template><input type="checkbox" role="switch" /></template>',
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
    // Partial-parity: role-fallback validates only the first recognised
    //   token. `<div role="button combobox">` is valid for us (first
    //   recognised token "button" needs no attrs) but flagged by jsx-a11y.
    '<div role="button combobox" />',
    //   unknown role
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
    // Parity — case-insensitive comparison.
    {
      code: '<div role="COMBOBOX" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // Parity — whitespace-separated roles, first recognised validated.
    {
      code: '<div role="combobox listbox" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
    // DIVERGENCE: semantic input exception — jsx-a11y/vue/angular say VALID.
    {
      code: '<input type="checkbox" role="switch" />',
      output: null,
      errors: [{ messageId: 'missingAttributes' }],
    },
  ],
});
