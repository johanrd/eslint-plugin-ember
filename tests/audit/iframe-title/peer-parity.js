// Audit fixture — peer-plugin parity for `ember/template-require-iframe-title`.
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/iframe-has-title-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/iframe-has-title.test.ts
//   - eslint-plugin-lit-a11y/tests/lib/rules/iframe-title.js

'use strict';

const rule = require('../../../lib/rules/template-require-iframe-title');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:iframe-title (gts)', rule, {
  valid: [
    // === Upstream parity — basic cases ===
    // jsx-a11y / vue-a11y / lit-a11y: valid (no iframe, or titled iframe).
    '<template><div /></template>',
    '<template><iframe title="Unique title" /></template>',

    // Dynamic title — jsx-a11y treats `title={foo}` as valid (expression is
    // assumed to yield a truthy string). vue-a11y: valid for `:title="foo"`.
    // lit-a11y: valid for `title=${foo}`. Ours: valid for `{{someValue}}`.
    '<template><iframe title={{someValue}} /></template>',

    // Ours: valid for concat-mustache (dynamic in concat).
    // No direct jsx-a11y analogue because JSX has no string-interpolation; but
    // the equivalent `title={`${foo}`}` is treated as valid by jsx-a11y.
    '<template><iframe title="{{someValue}}" /></template>',

    // === OUR behavior (no upstream peer equivalent) — exemptions ===
    // Our rule skips iframes that are aria-hidden or hidden.
    //   - jsx-a11y: does NOT exempt aria-hidden; `<iframe aria-hidden />`
    //     without a title is still flagged.
    //   - vue-a11y / lit-a11y: same — no aria-hidden/hidden exemption.
    // Intentional: matches ember-template-lint upstream behavior.
    '<template><iframe aria-hidden="true" /></template>',
    '<template><iframe hidden /></template>',
    '<template><iframe title="" aria-hidden /></template>',
    '<template><iframe title="" hidden /></template>',

    // === DIVERGENCE — dynamic values that jsx-a11y would flag ===
    // jsx-a11y flags (see invalid list there):
    //   - `<iframe title={undefined} />`
    //   - `<iframe title={42} />`
    //   - `<iframe title={''} />` / `<iframe title={``} />`
    // Because jsx-a11y calls `getLiteralPropValue` and checks if the result is
    // a truthy string. Ours only inspects the AST for `GlimmerBooleanLiteral`
    // and otherwise assumes dynamic mustaches are fine.
    // vue-a11y: same as jsx-a11y — flags `:title='2'` (numeric).
    // Net effect: we UNDER-flag these cases.
    '<template><iframe title={{undefined}} /></template>',
    '<template><iframe title={{42}} /></template>',
    '<template><iframe title={{""}} /></template>',

    // === Disambiguation — distinct titles across iframes (all valid) ===
    '<template><iframe title="foo" /><iframe title="bar" /></template>',
  ],

  invalid: [
    // === Upstream parity — missing title ===
    {
      code: '<template><iframe /></template>',
      output: null,
      errors: [{ messageId: 'missingTitle' }],
    },
    {
      code: '<template><iframe src="/content"></iframe></template>',
      output: null,
      errors: [{ messageId: 'missingTitle' }],
    },

    // === Upstream parity — empty title string ===
    // jsx-a11y, vue-a11y, lit-a11y all flag `title=""`.
    {
      code: '<template><iframe title="" /></template>',
      output: null,
      errors: [{ messageId: 'emptyTitle' }],
    },
    // Whitespace-only title — ours trims then flags empty.
    // jsx-a11y: `getLiteralPropValue("   ")` yields "   " which is truthy, so
    // jsx-a11y would NOT flag. vue-a11y similarly does not trim. Ours trims.
    // DIVERGENCE — we over-flag whitespace-only titles.
    {
      code: '<template><iframe title="   " /></template>',
      output: null,
      errors: [{ messageId: 'emptyTitle' }],
    },

    // === Upstream parity — title is literal boolean ===
    // jsx-a11y: `<iframe title={false} />` INVALID, `<iframe title={true} />`
    // INVALID (neither is a string). vue-a11y: same (`:title='true'` invalid).
    // Ours: flags ANY GlimmerBooleanLiteral (covers both true and false).
    // messageId is misleadingly named `dynamicFalseTitle` but matches both.
    {
      code: '<template><iframe title={{false}} /></template>',
      output: null,
      errors: [{ messageId: 'dynamicFalseTitle' }],
    },
    {
      code: '<template><iframe title={{true}} /></template>',
      output: null,
      errors: [{ messageId: 'dynamicFalseTitle' }],
    },
    // Concat form — `title="{{false}}"` is also flagged by our rule.
    {
      code: '<template><iframe title="{{false}}" /></template>',
      output: null,
      errors: [{ messageId: 'dynamicFalseTitle' }],
    },

    // === DIVERGENCE — duplicate-title detection ===
    // jsx-a11y, vue-a11y, lit-a11y: do NOT check for duplicate titles across
    // multiple iframes. Our rule does (inherited from ember-template-lint).
    // Captured here as one of our OVER-flagging cases (intentional extension).
    {
      code: '<template><iframe title="foo" /><iframe title="foo" /></template>',
      output: null,
      errors: [
        { message: 'This title is not unique. #1' },
        {
          message:
            '<iframe> elements must have a unique title property. Value title="foo" already used for different iframe. #1',
        },
      ],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:iframe-title (hbs)', rule, {
  valid: [
    '<iframe title="Welcome" />',
    '<iframe title={{someValue}} />',
    // DIVERGENCE — exempted (see gts section)
    '<iframe aria-hidden="true" />',
    '<iframe hidden />',
    // DIVERGENCE — dynamic non-string values that jsx-a11y would flag
    '<iframe title={{undefined}} />',
    '<iframe title={{42}} />',
  ],
  invalid: [
    {
      code: '<iframe />',
      output: null,
      errors: [{ messageId: 'missingTitle' }],
    },
    {
      code: '<iframe title="" />',
      output: null,
      errors: [{ messageId: 'emptyTitle' }],
    },
    {
      code: '<iframe title={{false}} />',
      output: null,
      errors: [{ messageId: 'dynamicFalseTitle' }],
    },
    // DIVERGENCE — duplicate detection (upstream does not check).
    {
      code: '<iframe title="foo" /><iframe title="foo" />',
      output: null,
      errors: [
        { message: 'This title is not unique. #1' },
        {
          message:
            '<iframe> elements must have a unique title property. Value title="foo" already used for different iframe. #1',
        },
      ],
    },
  ],
});
