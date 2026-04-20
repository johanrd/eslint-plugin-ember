// Audit fixture — peer-plugin parity for `ember/template-no-empty-headings`.
// These tests encode the CURRENT behavior of our rule. Each divergence from an
// upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/heading-has-content-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/heading-has-content.test.ts

'use strict';

const rule = require('../../../lib/rules/template-no-empty-headings');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:heading-content (gts)', rule, {
  valid: [
    // === Upstream parity — heading with content ===
    // jsx-a11y / vue-a11y: valid.
    '<template><div /></template>',
    '<template><h1>Foo</h1></template>',
    '<template><h2>Foo</h2></template>',
    '<template><h3>Foo</h3></template>',
    '<template><h4>Foo</h4></template>',
    '<template><h5>Foo</h5></template>',
    '<template><h6>Foo</h6></template>',
    '<template><h6>123</h6></template>',
    '<template><h1><Bar /></h1></template>',
    '<template><h1>{{foo}}</h1></template>',
    '<template><h1>{{foo.bar}}</h1></template>',

    // === Upstream parity — aria-hidden="true" heading is exempt ===
    // jsx-a11y: `isHiddenFromScreenReader` applies to the heading itself.
    // vue-a11y: same. Ours: same.
    '<template><h1 aria-hidden="true">Anything</h1></template>',

    // Our rule additionally skips `hidden` attr on heading (upstream agnostic
    // but equivalent accessibility semantics).
    '<template><h1 hidden></h1></template>',
    '<template><h4 hidden></h4></template>',

    // === Mixed hidden/visible children ===
    // Ours: visible sibling provides content → valid.
    '<template><h1><span aria-hidden="true">Hidden</span>Visible</h1></template>',
    '<template><h1><span aria-hidden="true">Hidden</span><span>Visible</span></h1></template>',

    // === role="heading" ===
    // jsx-a11y: does NOT check `<div role="heading">` (only literal h1–h6).
    // vue-a11y: same.
    // Ours: DOES check role="heading" (extension). Captured as valid when
    // content is present; invalid cases appear below.
    '<template><div role="heading" aria-level="1">Accessible Text</div></template>',

    // === DIVERGENCE — boolean `aria-hidden` (no value) on heading ===
    // jsx-a11y: valid — `<h1 aria-hidden />` is treated as hidden, so the
    //   heading is exempt.
    // Ours: INVALID — we require `aria-hidden="true"` as a text value; a
    //   value-less boolean attribute does not match, so the heading is still
    //   checked for content, and <h1 aria-hidden /> has no content.
    // (See invalid section for the concrete case.)

    // === DIVERGENCE — boolean `aria-hidden` on CHILD ===
    // jsx-a11y: `<h1><Bar aria-hidden /></h1>` INVALID — child is hidden,
    //   heading has no accessible content.
    // Ours: VALID — `aria-hidden` without value-"true" is not treated as
    //   hidden. So the child `<Bar />` counts as content (PascalCase → component).
    // Captured here as UNDER-flagging.
    '<template><h1><Bar aria-hidden /></h1></template>',
  ],

  invalid: [
    // === Upstream parity — empty heading ===
    {
      code: '<template><h1 /></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },
    {
      code: '<template><h1></h1></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },
    // vue-a11y: `<h1>   </h1>` invalid (whitespace-only). Ours: same.
    {
      code: '<template><h2>   </h2></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },
    // vue-a11y: `<h1><span /></h1>` invalid (nested empty element). Ours: same.
    {
      code: '<template><h1><span /></h1></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },

    // === Upstream parity — child is aria-hidden="true" text ===
    // vue-a11y: invalid for `<h1><span aria-hidden='true'>test</span></h1>`.
    // jsx-a11y: invalid for `<h1><Bar aria-hidden /></h1>` (boolean form, see
    //   divergence above). For the value-"true" form jsx-a11y lacks a direct
    //   test case, but their `isHiddenFromScreenReader` treats it as hidden.
    // Ours: flag when the only content is aria-hidden="true".
    {
      code: '<template><h1><span aria-hidden="true">Hidden</span></h1></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },

    // === DIVERGENCE — boolean `aria-hidden` on HEADING itself ===
    // jsx-a11y: VALID (hides the heading). Ours: INVALID (we require
    //   "true" as a text value to skip the check). FALSE POSITIVE.
    {
      code: '<template><h1 aria-hidden /></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },

    // === Upstream parity — hidden input child ===
    // jsx-a11y: `<h1><input type="hidden" /></h1>` INVALID (input hidden is
    //   not accessible content).
    // Ours: INVALID too — `<input>` is not a text/mustache/component so it
    //   contributes nothing to accessible content.
    {
      code: '<template><h1><input type="hidden" /></h1></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },

    // === DIVERGENCE — `{{undefined}}` mustache ===
    // jsx-a11y: `<h1>{undefined}</h1>` INVALID — JSX expression evaluates to
    //   no rendered content, they flag it.
    // Ours: VALID — ANY GlimmerMustacheStatement counts as potential content,
    //   we don't peek inside. Captured here as UNDER-flagging.
    //   (Intentionally NOT asserted here because it would pass in `valid`.)

    // === role="heading" extension — our rule flags empty ones ===
    {
      code: '<template><div role="heading" aria-level="1"></div></template>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },
  ],
});

// === DIVERGENCE — `{{undefined}}` mustache passes for us ===
// Captured separately so the divergence is explicit.
ruleTester.run('audit:heading-content mustache-undefined (gts)', rule, {
  valid: [
    // jsx-a11y flags `<h1>{undefined}</h1>`; we consider any mustache as
    // potential content. UNDER-flagging.
    '<template><h1>{{undefined}}</h1></template>',
  ],
  invalid: [],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:heading-content (hbs)', rule, {
  valid: [
    '<h1>Foo</h1>',
    '<h2>{{this.title}}</h2>',
    '<h1 aria-hidden="true"></h1>',
    '<h1 hidden></h1>',
    // DIVERGENCE — `{{undefined}}` is accepted (see gts section)
    '<h1>{{undefined}}</h1>',
    // DIVERGENCE — boolean aria-hidden on child does NOT hide for us
    '<h1><Bar aria-hidden /></h1>',
  ],
  invalid: [
    {
      code: '<h1 />',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },
    {
      code: '<h1><span aria-hidden="true">x</span></h1>',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },
    // DIVERGENCE — boolean aria-hidden on heading itself: we flag, jsx-a11y doesn't.
    {
      code: '<h1 aria-hidden />',
      output: null,
      errors: [{ messageId: 'emptyHeading' }],
    },
  ],
});
