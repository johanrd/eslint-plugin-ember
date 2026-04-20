// Audit fixture — peer-plugin parity for
// `ember/template-no-aria-unsupported-elements`.
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/src/rules/aria-unsupported-elements.js
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/aria-unsupported-elements-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/aria-unsupported-elements.ts
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/aria-unsupported-elements.test.ts
//   - eslint-plugin-lit-a11y/lib/rules/aria-unsupported-elements.js
//   - eslint-plugin-lit-a11y/tests/lib/rules/aria-unsupported-elements.js
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".

'use strict';

const rule = require('../../../lib/rules/template-no-aria-unsupported-elements');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:aria-unsupported-elements (gts)', rule, {
  valid: [
    // === Upstream parity (valid in jsx-a11y / vue-a11y / lit-a11y and us) ===
    // Non-reserved elements with ARIA attributes — all plugins allow these.
    '<template><div role="button" aria-label="Submit"></div></template>',
    '<template><button aria-pressed="true">Toggle</button></template>',
    '<template><input aria-label="Username" /></template>',

    // Reserved elements with NO aria/role attrs — all plugins allow these.
    '<template><meta charset="utf-8" /></template>',
    '<template><script src="./foo.js"></script></template>',
    '<template><style></style></template>',
    '<template><link rel="stylesheet" href="a.css" /></template>',
    '<template><base href="/" /></template>',
    '<template><title>Page</title></template>',

    // === DIVERGENCE — reserved elements we do NOT cover ===
    // aria-query marks these as `reserved`, so jsx-a11y + vue-a11y flag ARIA
    // attributes on them. Our ELEMENTS_WITHOUT_ARIA_SUPPORT set is narrower
    // (only meta/html/script/style/title/base/head/link). These pass for us.
    //
    //   reserved per aria-query but not in our set:
    //     col, colgroup, noembed, noscript, param, picture, source, track
    '<template><col aria-hidden="true" /></template>',
    '<template><colgroup role="presentation"></colgroup></template>',
    '<template><source aria-label="audio" src="a.mp3" /></template>',
    '<template><track aria-hidden="true" src="cap.vtt" /></template>',
    '<template><param role="presentation" name="x" value="y" /></template>',
    '<template><picture aria-label="photo"></picture></template>',
    '<template><noscript aria-hidden="true"></noscript></template>',
  ],

  invalid: [
    // === Upstream parity (invalid in jsx-a11y / vue-a11y / lit-a11y and us) ===
    {
      code: '<template><meta role="button" /></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<template><meta charset="UTF-8" aria-hidden="false" /></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<template><script aria-label="Script"></script></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<template><script role="foo"></script></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<template><style role="presentation"></style></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<template><style aria-hidden="true"></style></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    // Multiple offenders on a single element — each flagged separately.
    {
      code: '<template><style role="foo" aria-hidden="foo"></style></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }, { messageId: 'unsupported' }],
    },

    // Elements in our set that overlap with upstream: html/head/link/base/title
    {
      code: '<template><link rel="stylesheet" aria-hidden="true" /></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<template><title role="presentation">X</title></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },

    // === DIVERGENCE — non-standard aria-* attribute names ===
    // jsx-a11y + vue-a11y: use `aria.has(name)` — unknown `aria-foobar` is
    //   NOT flagged (it isn't considered an ARIA attribute at all).
    // Our rule: flags anything that starts with `aria-`. This is a small
    //   overreach (we flag `aria-foobar` on <meta>) but arguably reasonable.
    {
      code: '<template><meta aria-foobar="x" /></template>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:aria-unsupported-elements (hbs)', rule, {
  valid: [
    '<div role="button" aria-label="Submit"></div>',
    '<meta charset="utf-8" />',
    // DIVERGENCE: reserved-per-aria-query elements we don't cover (see gts).
    '<col aria-hidden="true" />',
    '<source aria-label="x" src="a.mp3" />',
  ],
  invalid: [
    {
      code: '<meta role="button" />',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<script aria-label="Script"></script>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    {
      code: '<style role="presentation"></style>',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
    // DIVERGENCE: unknown aria-* still flagged by us (jsx/vue would not flag).
    {
      code: '<meta aria-foobar="x" />',
      output: null,
      errors: [{ messageId: 'unsupported' }],
    },
  ],
});
