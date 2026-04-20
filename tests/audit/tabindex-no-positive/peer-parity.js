// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-positive-tabindex` against
// jsx-a11y/tabindex-no-positive, vuejs-accessibility/tabindex-no-positive,
// angular-eslint/no-positive-tabindex, lit-a11y/tabindex-no-positive.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files:
//   - context/eslint-plugin-jsx-a11y-main/__tests__/src/rules/tabindex-no-positive-test.js
//   - context/eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/tabindex-no-positive.test.ts
//   - context/angular-eslint-main/packages/eslint-plugin-template/tests/rules/no-positive-tabindex/cases.ts
//   - context/eslint-plugin-lit-a11y/tests/lib/rules/tabindex-no-positive.js

'use strict';

const rule = require('../../../lib/rules/template-no-positive-tabindex');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:tabindex-no-positive (gts)', rule, {
  valid: [
    // === Upstream parity ===
    // No tabindex attribute.
    '<template><div /></template>',
    '<template><div id="main" /></template>',

    // tabindex=0 and tabindex=-1 — valid in all plugins + ours.
    '<template><div tabindex="0" /></template>',
    '<template><div tabindex="-1" /></template>',
    '<template><button tabindex="0"></button></template>',
    '<template><button tabindex="-1"></button></template>',
    '<template><button tabindex={{-1}}>baz</button></template>',
    '<template><button tabindex={{"-1"}}>baz</button></template>',
    '<template><button tabindex="{{-1}}">baz</button></template>',
    '<template><button tabindex="{{"-1"}}">baz</button></template>',

    // Conditional expressions with all-safe branches — ours VALID.
    // (Not directly tested by peers; encodes our specific glimmer handling.)
    '<template><button tabindex="{{if this.show -1}}">baz</button></template>',
    '<template><button tabindex="{{if this.show "-1" "0"}}">baz</button></template>',
    '<template><button tabindex={{if this.show -1}}>baz</button></template>',
    '<template><button tabindex={{if this.show "-1" "0"}}>baz</button></template>',

    // === DIVERGENCE — non-numeric literal string as tabindex ===
    // jsx-a11y: VALID — `<div tabIndex={"foobar"} />` passes because
    //   `isNaN(Number("foobar"))` → skip. Intent: only literal numeric positive
    //   values are flagged; anything non-numeric is assumed to be a user error
    //   the rule can't confirm, so it stays silent.
    // Our rule: INVALID (mustBeNegativeNumeric). We treat non-numeric as a
    //   violation. This catches more bugs but produces false positives for
    //   interpolation or empty strings.
    // (Captured in invalid section — `<button tabindex="text">`.)

    // === DIVERGENCE — dynamic expression as tabindex value ===
    // jsx-a11y: VALID — `<div tabIndex={bar} />`, `<div tabIndex={bar()} />`,
    //   `<div tabIndex={null} />` all pass.
    // vue-a11y: VALID — `<span :tabindex='number' />`.
    // angular-eslint: VALID — `<span [attr.tabindex]="tabIndex" />`.
    // Our rule: INVALID (mustBeNegativeNumeric). We flag any non-literal.
    //   This is stricter; captured below.

    // === DIVERGENCE — tabindex without value ===
    // angular-eslint: VALID — `<span tabindex></span>` (no value at all).
    // Our rule: actually INVALID in glimmer — bare attribute yields a non-null
    //   value shape (empty GlimmerTextNode) that falls through to
    //   mustBeNegativeNumeric. Divergence captured in invalid section.
  ],

  invalid: [
    // === Upstream parity (all plugins + ours: INVALID) ===
    {
      code: '<template><div tabindex="1" /></template>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },
    {
      code: '<template><button tabindex="1"></button></template>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },
    // jsx-a11y uses `tabIndex={1}`; our equivalent is `tabindex={{1}}`.
    // Because jsx-a11y uses getLiteralPropValue, {1} resolves to 1.
    // For us, literal number in mustache → positive flag.
    // (See valid for our mustache-with-string-"-1" handling.)

    // Positive in various forms — parity INVALID.
    {
      code: '<template><button tabindex="{{5}}"></button></template>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },

    // Conditional with at-least-one-positive-branch — our rule flags.
    // jsx-a11y / vue-a11y / angular don't have direct analogues for Ember's
    // {{if ...}} helper; angular's template binding is value-based and wouldn't
    // flag `[attr.tabindex]="cond ? 1 : -1"` the same way. No divergence
    // claim — this is idiom-specific coverage.
    {
      code: '<template><button tabindex="{{if a 1 -1}}"></button></template>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },
    {
      code: '<template><button tabindex="{{if a -1 1}}"></button></template>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },
    {
      code: '<template><button tabindex="{{if a 1}}"></button></template>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },
    {
      code: '<template><button tabindex="{{unless a 1}}"></button></template>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },

    // === DIVERGENCE — non-numeric literal string ===
    // jsx-a11y: VALID (`<div tabIndex="foobar" />` is NOT in invalid; their
    //   rule uses `isNaN(value) || value <= 0 → skip`).
    // lit-a11y: INVALID — they DO flag `tabindex='foo'` with messageId
    //   'tabindexNoPositive' (aligns with ours).
    // Our rule: INVALID (mustBeNegativeNumeric). Lit-a11y parity, jsx-a11y/
    //   vue-a11y/angular divergence.
    {
      code: '<template><button tabindex="text"></button></template>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },

    // === DIVERGENCE — dynamic expression as tabindex ===
    // jsx-a11y: VALID — `<div tabIndex={bar} />`, `<div tabIndex={null} />`.
    // vue-a11y: VALID — `<span :tabindex='number' />`.
    // angular: VALID — `<span [attr.tabindex]="tabIndex" />`.
    // lit-a11y: VALID — `html\`<div tabindex=${foo}></div>\`` is in their valid.
    // Our rule: INVALID (mustBeNegativeNumeric). Divergence from all 4 peers.
    {
      code: '<template><button tabindex={{someProperty}}></button></template>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },
    // Boolean mustache — no peer directly models this, but lit-a11y flags
    // `tabindex="${true}"` as tabindexNoPositive (parity with ours).
    {
      code: '<template><button tabindex={{true}}></button></template>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },
    {
      code: '<template><button tabindex="{{false}}"></button></template>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },

    // === DIVERGENCE — valueless tabindex (e.g. `<span tabindex></span>`) ===
    // angular-eslint: VALID.
    // Our rule: INVALID (mustBeNegativeNumeric). The glimmer parser yields a
    //   non-null `value` for bare attributes so our early-return doesn't fire.
    {
      code: '<template><span tabindex></span></template>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:tabindex-no-positive (hbs)', rule, {
  valid: [
    '<div></div>',
    '<div id="main"></div>',
    '<div tabindex="0"></div>',
    '<div tabindex="-1"></div>',
    '<button tabindex="0"></button>',
    '<button tabindex="-1"></button>',
    '<button tabindex={{-1}}>baz</button>',
    '<button tabindex="{{-1}}">baz</button>',
    '<button tabindex="{{if this.show -1}}">baz</button>',
  ],
  invalid: [
    // Parity — positive integer.
    {
      code: '<button tabindex="1"></button>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },
    {
      code: '<button tabindex="{{5}}"></button>',
      output: null,
      errors: [{ messageId: 'positive' }],
    },
    // DIVERGENCE — non-numeric string. jsx-a11y/vue-a11y/angular VALID, ours + lit-a11y INVALID.
    {
      code: '<button tabindex="text"></button>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },
    // DIVERGENCE — dynamic value. jsx-a11y/vue-a11y/angular/lit-a11y VALID, ours INVALID.
    {
      code: '<button tabindex={{someProperty}}></button>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },
    // DIVERGENCE — valueless tabindex. angular VALID, ours INVALID.
    {
      code: '<span tabindex></span>',
      output: null,
      errors: [{ messageId: 'mustBeNegativeNumeric' }],
    },
  ],
});
