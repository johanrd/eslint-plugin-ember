// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-require-aria-activedescendant-tabindex`
// against jsx-a11y/aria-activedescendant-has-tabindex and
// lit-a11y/aria-activedescendant-has-tabindex.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files:
//   - context/eslint-plugin-jsx-a11y-main/__tests__/src/rules/aria-activedescendant-has-tabindex-test.js
//   - context/eslint-plugin-lit-a11y/tests/lib/rules/aria-activedescendant-has-tabindex.js

'use strict';

const rule = require('../../../lib/rules/template-require-aria-activedescendant-tabindex');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:aria-activedescendant-has-tabindex (gts)', rule, {
  valid: [
    // === Upstream parity ===
    // Base cases — no aria-activedescendant, rule doesn't fire.
    '<template><div /></template>',
    '<template><input /></template>',
    '<template><div tabindex="0" /></template>',

    // jsx-a11y + lit-a11y: VALID — div with aria-activedescendant + tabindex=0.
    '<template><div aria-activedescendant="someID" tabindex="0"></div></template>',
    // jsx-a11y + lit-a11y: VALID — tabindex=0 as mustache-number.
    '<template><div aria-activedescendant="someID" tabindex={{0}}></div></template>',

    // jsx-a11y + lit-a11y: VALID — div with positive tabindex (this rule only
    // requires tabbability; positivity is another rule's concern).
    '<template><div aria-activedescendant="someID" tabindex="1"></div></template>',
    '<template><div aria-activedescendant="someID" tabindex={{1}}></div></template>',

    // jsx-a11y + lit-a11y: VALID — interactive element without tabindex.
    '<template><input aria-activedescendant="someID" /></template>',
    // With tabindex=0 or positive — still valid for interactive or non-interactive.
    '<template><input aria-activedescendant="someID" tabindex="0" /></template>',
    '<template><input aria-activedescendant="someID" tabindex="1" /></template>',

    // Custom component (unknown tag) — jsx-a11y skips dom.has(type) check,
    // our rule also skips via HTML_TAGS.has(node.tag) check.
    '<template><CustomComponent aria-activedescendant="choice1" /></template>',
    '<template><CustomComponent aria-activedescendant="option1" tabIndex="-1" /></template>',
    '<template><CustomComponent aria-activedescendant={{foo}} tabindex={{bar}} /></template>',

    // === DIVERGENCE — tabindex="-1" on non-interactive element ===
    // jsx-a11y + lit-a11y: VALID — they allow `tabIndex >= -1`, so -1 is OK.
    //   `<div aria-activedescendant={id} tabIndex={-1} />` → valid.
    // Our rule: INVALID — we require tabindexValue >= 0 (i.e. `tabindex < 0`
    // triggers). -1 is rejected. Divergence captured in invalid section below.
  ],
  invalid: [
    // === Upstream parity ===
    // jsx-a11y + lit-a11y: INVALID — non-interactive element with
    // aria-activedescendant and no tabindex.
    {
      code: '<template><div aria-activedescendant={{bar}} /></template>',
      output: '<template><div aria-activedescendant={{bar}} tabindex="0" /></template>',
      errors: [{ messageId: 'missingTabindex' }],
    },

    // === DIVERGENCE — tabindex="-1" / tabindex={{-1}} on non-interactive ===
    // jsx-a11y + lit-a11y: VALID (they accept `>= -1`).
    // Our rule: INVALID — flags any tabindex < 0. Arguably a bug: -1 is the
    // canonical "focusable-but-not-in-tab-order" value, which is exactly what
    // you want for a composite widget using aria-activedescendant with roving
    // focus on a wrapper. Our autofix rewrites -1 to 0, changing semantics.
    {
      code: '<template><div aria-activedescendant={{foo}} tabindex={{-1}}></div></template>',
      output: '<template><div aria-activedescendant={{foo}} tabindex="0"></div></template>',
      errors: [{ messageId: 'missingTabindex' }],
    },
    // Same divergence, text-node form (tabindex="-1" would also flag; only
    // -2 is covered below since -1 isn't tested in main suite — add here).
    {
      code: '<template><div aria-activedescendant="id" tabindex="-1"></div></template>',
      output: '<template><div aria-activedescendant="id" tabindex="0"></div></template>',
      errors: [{ messageId: 'missingTabindex' }],
    },

    // tabindex < -1 on non-interactive — INVALID in both upstream and ours.
    {
      code: '<template><input aria-activedescendant="option0" tabindex="-2" /></template>',
      output: '<template><input aria-activedescendant="option0" tabindex="0" /></template>',
      errors: [{ messageId: 'missingTabindex' }],
    },
    {
      code: '<template><div aria-activedescendant="fixme" tabindex=-100></div></template>',
      output: '<template><div aria-activedescendant="fixme" tabindex="0"></div></template>',
      errors: [{ messageId: 'missingTabindex' }],
    },

    // === DIVERGENCE — interactive element <button> with explicit negative tabindex ===
    // jsx-a11y: would NOT flag `<button aria-activedescendant="x" tabIndex={-1} />`
    //   because getTabIndex returns -1 and -1 >= -1, so no report. (In fact jsx-a11y
    //   treats ANY tabindex value that isn't < -1 as OK.)
    // Our rule: flags because `tabindexValue < 0` → regardless of interactivity.
    // This is captured in existing tests and carried here.
    {
      code: '<template><button aria-activedescendant="x" tabindex="-1"></button></template>',
      output: '<template><button aria-activedescendant="x" tabindex="0"></button></template>',
      errors: [{ messageId: 'missingTabindex' }],
    },

    // Our rule also flags `<a aria-activedescendant>` without tabindex even when
    // <a> without href is non-interactive. jsx-a11y would treat <a> without href
    // as non-interactive → flag (same outcome). <a> WITH href is interactive for
    // both plugins → jsx-a11y skips; ours also skips via isInteractiveElement.
    {
      code: '<template><a aria-activedescendant="x"></a></template>',
      output: '<template><a aria-activedescendant="x" tabindex="0"></a></template>',
      errors: [{ messageId: 'missingTabindex' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:aria-activedescendant-has-tabindex (hbs)', rule, {
  valid: [
    '<div></div>',
    '<input />',
    '<div tabindex="0"></div>',
    '<div aria-activedescendant="some-id" tabindex="0"></div>',
    '<div aria-activedescendant="some-id" tabindex={{0}}></div>',
    '<div aria-activedescendant="some-id" tabindex="1"></div>',
    '<input aria-activedescendant="some-id" />',
    '<input aria-activedescendant={{foo}} tabindex={{0}} />',
    '<CustomComponent aria-activedescendant="choice1" />',
    '<CustomComponent aria-activedescendant="option1" tabIndex="-1" />',
  ],
  invalid: [
    // DIVERGENCE — tabindex="-1" on non-interactive element. Upstream VALID, ours INVALID.
    {
      code: '<div aria-activedescendant="id" tabindex="-1"></div>',
      output: '<div aria-activedescendant="id" tabindex="0"></div>',
      errors: [{ messageId: 'missingTabindex' }],
    },
    // tabindex < -1 — upstream parity INVALID.
    {
      code: '<input aria-activedescendant="option0" tabindex="-2" />',
      output: '<input aria-activedescendant="option0" tabindex="0" />',
      errors: [{ messageId: 'missingTabindex' }],
    },
    // No tabindex on non-interactive — upstream parity INVALID.
    {
      code: '<div aria-activedescendant={{bar}} />',
      output: '<div aria-activedescendant={{bar}} tabindex="0" />',
      errors: [{ messageId: 'missingTabindex' }],
    },
  ],
});
