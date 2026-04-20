// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-invalid-role` (+ `ember/template-no-abstract-roles`)
// against jsx-a11y/aria-role, vuejs-accessibility/aria-role, lit-a11y/aria-role.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/aria-role-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/aria-role.test.ts
//   - eslint-plugin-lit-a11y/tests/lib/rules/aria-role.js

'use strict';

const rule = require('../../../lib/rules/template-no-invalid-role');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:aria-role (gts)', rule, {
  valid: [
    // === Upstream parity (valid in both jsx-a11y and us) ===
    // jsx-a11y: valid (base case, no role)
    '<template><div /></template>',
    '<template><div></div></template>',

    // jsx-a11y / vue-a11y / lit-a11y: valid (concrete, non-abstract, single role)
    '<template><div role="button"></div></template>',
    '<template><div role="progressbar"></div></template>',
    '<template><div role="navigation"></div></template>',
    '<template><div role="alert"></div></template>',
    '<template><div role="switch"></div></template>',

    // Dynamic role — both plugins and we skip
    '<template><div role={{this.role}}></div></template>',
    '<template><div role="{{if @open "dialog" "contentinfo"}}"></div></template>',

    // === DIVERGENCE — case-insensitivity ===
    // jsx-a11y: INVALID (`<div role="Button" />` is rejected, case-sensitive).
    // Our rule lowercases the role before lookup; we allow this. Intentional:
    // HTML attribute values are case-insensitive in many contexts, and the
    // existing test suite encodes this as an explicit design choice.
    '<template><div role="Button">Click</div></template>',
    '<template><div role="NAVIGATION">Nav</div></template>',

    // === DIVERGENCE — space-separated multiple roles ===
    // jsx-a11y: VALID — splits on whitespace, each token must be a valid role.
    //   `<div role="tabpanel row" />` → valid (both are roles).
    //   `<div role="doc-appendix doc-bibliography" />` → valid (DPUB-ARIA).
    // Our rule treats the whole string as one opaque role name and will flag
    // `"tabpanel row"` as invalid. This is a false positive.
    // (See invalid section below for the opposite side of this divergence.)

    // === DIVERGENCE — DPUB-ARIA (doc-*) roles ===
    // jsx-a11y: VALID — uses aria-query, which includes DPUB-ARIA roles.
    //   `<div role="doc-abstract" />` → valid.
    // Our rule: we'd flag this. Tracked below in invalid section.

    // === DIVERGENCE — Graphics-ARIA (graphics-*) roles on <svg> ===
    // jsx-a11y: VALID — `<svg role="graphics-document document" />`.
    // Our rule: would flag. Tracked below in invalid section.
  ],

  invalid: [
    // === Upstream parity (invalid in both jsx-a11y and us) ===
    {
      code: '<template><div role="foobar"></div></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    {
      code: '<template><div role="datepicker"></div></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    // jsx-a11y: invalid (`range` is an abstract role).
    // Ours: `range` is not in VALID_ROLES so we flag it as "not a valid ARIA role".
    // Upstream says "abstract role"; we conflate. Message wording differs.
    {
      code: '<template><div role="range"></div></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === DIVERGENCE — empty role string ===
    // jsx-a11y: INVALID — `<div role="" />` flagged.
    // vue-a11y: INVALID — same.
    // Our rule: early-return on empty/whitespace role (line 229 of rule). NO FLAG.
    // So this case reflects OUR (non-flagging) behavior with an explicit note.
    // (No invalid assertion possible here — we'd need to move this to valid,
    //  or fix the rule to flag.)

    // === DIVERGENCE — space-separated with at least one invalid token ===
    // jsx-a11y: INVALID — `<div role="tabpanel row foobar"></div>` flags because
    // it splits and `foobar` is not a role.
    // Our rule: flags because the ENTIRE string is not a known role. Message
    // says "Invalid ARIA role 'tabpanel row foobar'" which is technically wrong
    // (only 'foobar' is the problem), but the net effect (flag) matches.
    {
      code: '<template><div role="tabpanel row foobar"></div></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === DIVERGENCE — space-separated all-valid ===
    // jsx-a11y: VALID — `<div role="tabpanel row"></div>`.
    // Our rule: INVALID (flags the whole compound as unknown). FALSE POSITIVE.
    {
      code: '<template><div role="tabpanel row"></div></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === DIVERGENCE — DPUB-ARIA (doc-*) ===
    // jsx-a11y: VALID — `<div role="doc-abstract"></div>`.
    // Our rule: INVALID (doc-abstract not in VALID_ROLES). FALSE POSITIVE.
    {
      code: '<template><div role="doc-abstract"></div></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === DIVERGENCE — Graphics-ARIA on <svg> ===
    // jsx-a11y: VALID — `<svg role="graphics-document document" />`.
    // Our rule: INVALID (unknown roles). FALSE POSITIVE.
    {
      code: '<template><svg role="graphics-document document"></svg></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
  ],
});

// === DIVERGENCE — empty role string (captured as valid because we don't flag) ===
// Intentionally isolated so the intent is clear.
ruleTester.run('audit:aria-role empty string (gts)', rule, {
  valid: [
    // jsx-a11y + vue-a11y both flag this. We don't. This captures OUR behavior.
    '<template><div role=""></div></template>',
  ],
  invalid: [],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:aria-role (hbs)', rule, {
  valid: [
    '<div></div>',
    '<div role="button"></div>',
    '<div role="navigation"></div>',
    // DIVERGENCE case-insensitivity (see gts section).
    '<div role="Button"></div>',
    // DIVERGENCE empty string (we don't flag).
    '<div role=""></div>',
  ],
  invalid: [
    {
      code: '<div role="foobar"></div>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    // DIVERGENCES captured in hbs form:
    // space-separated all-valid — we flag; jsx-a11y doesn't.
    {
      code: '<div role="tabpanel row"></div>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    // DPUB-ARIA — we flag; jsx-a11y doesn't.
    {
      code: '<div role="doc-abstract"></div>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
  ],
});
