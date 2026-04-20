// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-accesskey-attribute` against
// jsx-a11y/no-access-key, vuejs-accessibility/no-access-key, lit-a11y/no-access-key.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files:
//   - context/eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-access-key-test.js
//   - context/eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/no-access-key.test.ts
//   - context/eslint-plugin-lit-a11y/tests/lib/rules/no-access-key.js

'use strict';

const rule = require('../../../lib/rules/template-no-accesskey-attribute');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-access-key (gts)', rule, {
  valid: [
    // === Upstream parity ===
    // No accesskey attribute — all plugins and ours skip.
    '<template><div /></template>',
    '<template><button>Click</button></template>',
    '<template><a href="#">Home</a></template>',

    // === DIVERGENCE — accesskey with empty/undefined value ===
    // jsx-a11y: VALID — `<div accessKey={undefined} />` (value-checked, so
    //   undefined → no report). Similarly `<div accessKey="" />` would be valid
    //   since getPropValue returns falsy.
    // vue-a11y: VALID — `<div accesskey />` (boolean-ish attr without value).
    //   See their test: `valid: ["<div />", "<div accesskey />"]`.
    // Our rule: INVALID (we flag on attribute PRESENCE, regardless of value).
    // Captured in invalid section below. Divergence — our rule is stricter.
  ],
  invalid: [
    // === Upstream parity (invalid in all plugins + ours) ===
    {
      code: '<template><div accesskey="h"></div></template>',
      output: '<template><div></div></template>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    {
      code: '<template><a href="#" accesskey="h">Home</a></template>',
      output: '<template><a href="#">Home</a></template>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    {
      code: '<template><button accesskey="s">Save</button></template>',
      output: '<template><button>Save</button></template>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    // Dynamic mustache value — jsx-a11y: flag (accessKey={accessKey}). Ours: flag.
    {
      code: '<template><button accesskey={{someKey}}></button></template>',
      output: '<template><button></button></template>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    // Concat with mustache — vue-a11y: flag `<div :accesskey='h' />`. Ours: flag.
    {
      code: '<template><button accesskey="{{someKey}}"></button></template>',
      output: '<template><button></button></template>',
      errors: [{ messageId: 'noAccesskey' }],
    },

    // === DIVERGENCE — boolean attribute without value ===
    // vue-a11y: VALID — `<div accesskey />` (see their valid cases). They treat
    //   this as no accesskey actually set (no value string to attribute).
    // jsx-a11y: would also treat `accessKey` without value as valid (getPropValue
    //   returns null/true-ish but the `accessKeyValue` check bypasses when falsy).
    //   Actually jsx-a11y test only covers valued forms; behavior with bare attr
    //   is not explicitly tested but code path would accept it.
    // Our rule: INVALID — flags any presence, including valueless. This is
    //   arguably the correct strict position: HTML parses `accesskey` without
    //   value as empty-string access key, which still registers with the UA.
    //   Divergence noted; intentional-strict.
    {
      code: '<template><button accesskey></button></template>',
      output: '<template><button></button></template>',
      errors: [{ messageId: 'noAccesskey' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-access-key (hbs)', rule, {
  valid: [
    '<div></div>',
    '<button>Click</button>',
    '<a href="#">Home</a>',
  ],
  invalid: [
    {
      code: '<div accesskey="h"></div>',
      output: '<div></div>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    {
      code: '<a href="#" accesskey="h">Home</a>',
      output: '<a href="#">Home</a>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    // Boolean attribute — DIVERGENCE: vue-a11y VALID, ours INVALID.
    {
      code: '<button accesskey></button>',
      output: '<button></button>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    // Dynamic mustache — parity INVALID.
    {
      code: '<button accesskey={{someKey}}></button>',
      output: '<button></button>',
      errors: [{ messageId: 'noAccesskey' }],
    },
    {
      code: '<button accesskey="{{someKey}}"></button>',
      output: '<button></button>',
      errors: [{ messageId: 'noAccesskey' }],
    },
  ],
});
