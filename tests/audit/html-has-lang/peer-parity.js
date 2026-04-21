// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-require-lang-attribute` against
// jsx-a11y/html-has-lang, jsx-a11y/lang, and lit-a11y/valid-lang.
//
// Our rule merges the presence check (jsx-a11y/html-has-lang,
// lit-a11y/valid-lang) and the BCP-47 value validation
// (jsx-a11y/lang, lit-a11y/valid-lang) into a single rule. The
// `validateValues: false` option disables the BCP-47 check, matching
// upstream ember-template-lint's `require-lang-attribute` default.
//
// These tests are NOT part of the main suite and do not run in CI. They
// encode the CURRENT behavior of our rule so that running this file
// reports pass. Each divergence from an upstream plugin is annotated as
// "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/html-has-lang-test.js
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/lang-test.js
//   - eslint-plugin-lit-a11y/tests/lib/rules/valid-lang.js

'use strict';

const rule = require('../../../lib/rules/template-require-lang-attribute');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:html-has-lang (gts)', rule, {
  valid: [
    // === Upstream parity: presence (jsx-a11y/html-has-lang valid cases) ===
    // jsx-a11y: `<div />` — not an <html> element, ignored.
    '<template><div></div></template>',
    // jsx-a11y: `<html lang="en" />` — present + valid BCP-47.
    '<template><html lang="en"></html></template>',
    // jsx-a11y: `<html lang="en-US" />`.
    '<template><html lang="en-US"></html></template>',
    // jsx-a11y: `<html lang={foo} />` — dynamic value; skipped.
    '<template><html lang={{this.foo}}></html></template>',

    // === Upstream parity: BCP-47 values (jsx-a11y/lang valid cases) ===
    // jsx-a11y/lang: `<html lang="zh-Hans" />`.
    '<template><html lang="zh-Hans"></html></template>',
    // jsx-a11y/lang: `<html lang="zh-Hant-HK" />`.
    '<template><html lang="zh-Hant-HK"></html></template>',
    // jsx-a11y/lang: `<html lang="zh-yue-Hant" />`.
    '<template><html lang="zh-yue-Hant"></html></template>',
    // jsx-a11y/lang: `<html lang="ja-Latn" />`.
    '<template><html lang="ja-Latn"></html></template>',

    // === Upstream parity: presence on non-<html> (jsx-a11y/lang valid) ===
    // jsx-a11y/lang: `<div />;`, `<div foo="bar" />;`, `<div lang="foo" />;`
    //   — `<div>` is not validated (we only enforce on <html>, same as
    //   jsx-a11y's targeted rules).
    '<template><div></div></template>',
    '<template><div foo="bar"></div></template>',
    '<template><div lang="foo"></div></template>',

    // === Upstream parity: lit-a11y/valid-lang valid cases ===
    // lit-a11y: `html\`<html lang='en'></html>\``.
    // (already covered above by `<html lang="en">`)
    // lit-a11y: `html\`<div lang='en'></div>\`` — <div>, ignored.
    '<template><div lang="en"></div></template>',
    // lit-a11y: `html\`<html lang="${\'en\'}"></html>\`` — dynamic; skipped.
    // (already covered above by `<html lang={{this.foo}}>`)

    // === `validateValues: false` — parity with jsx-a11y/html-has-lang ===
    // With value validation disabled, we only enforce presence (same as
    // jsx-a11y/html-has-lang alone). Upstream `html-has-lang` accepts
    // `<html lang="foo" />` because it does not validate the value.
    {
      code: '<template><html lang="foo"></html></template>',
      options: [{ validateValues: false }],
    },
    {
      code: '<template><html lang="zz-LL"></html></template>',
      options: [{ validateValues: false }],
    },
  ],

  invalid: [
    // === Upstream parity: presence (jsx-a11y/html-has-lang invalid) ===
    // jsx-a11y: `<html />` — missing lang.
    {
      code: '<template><html></html></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === Upstream parity: BCP-47 value (jsx-a11y/lang invalid) ===
    // jsx-a11y/lang: `<html lang="foo" />`.
    {
      code: '<template><html lang="foo"></html></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    // jsx-a11y/lang: `<html lang="zz-LL" />` — `zz` is not a registered
    // ISO 639 primary subtag and `LL` is not an ISO 3166 region.
    {
      code: '<template><html lang="zz-LL"></html></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === Upstream parity: lit-a11y/valid-lang invalid ===
    // lit-a11y: `html\`<html></html>\`` → noLangPresent.
    // (covered above by `<html></html>` empty)
    // lit-a11y: `html\`<html lang='invalid-lang'></html>\`` → invalidLang.
    {
      code: '<template><html lang="invalid-lang"></html></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === DIVERGENCE — valueless lang attribute ===
    // jsx-a11y/html-has-lang: VALID — `<html lang />` is treated as a
    //   present (boolean) attribute; the presence rule passes.
    // Our rule: INVALID — we require a non-empty string value. Template
    //   attributes with no value are reported. This is captured in the
    //   gts section below with `<html lang=""></html>` (the closest
    //   glimmer analog; a bare `<html lang>` is unusual in templates).
    {
      code: '<template><html lang=""></html></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },

    // === DIVERGENCE — dynamic value resolving to an invalid tag ===
    // lit-a11y/valid-lang: INVALID — `html\`<html lang=${"foobar"}></html>\``
    //   and `html\`<html lang=${1}></html>\`` are both flagged. lit-a11y
    //   inspects the template expression's resolved value.
    // Our rule: VALID — any non-text value (e.g. `{{this.foo}}`) is
    //   skipped entirely; we do not trace `mustache` expression contents.
    //   Captured as a valid-side divergence note; no invalid assertion.
  ],
});

// === DIVERGENCE — valueless lang attribute (captured in isolation) ===
// jsx-a11y/html-has-lang considers `<html lang />` valid (the attribute
// is present). Our rule requires a non-empty value; we'd flag it. The
// glimmer parser treats a bare attribute as having no value, which our
// rule reports. This block pins OUR behavior for the analog we can
// actually express in glimmer syntax.
ruleTester.run('audit:html-has-lang valueless (gts)', rule, {
  valid: [],
  invalid: [
    {
      code: '<template><html lang></html></template>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:html-has-lang (hbs)', rule, {
  valid: [
    // Upstream parity (jsx-a11y/html-has-lang + /lang + lit-a11y/valid-lang)
    '<div></div>',
    '<html lang="en"></html>',
    '<html lang="en-US"></html>',
    '<html lang="zh-Hans"></html>',
    '<html lang="zh-Hant-HK"></html>',
    '<html lang="zh-yue-Hant"></html>',
    '<html lang="ja-Latn"></html>',
    '<html lang={{this.foo}}></html>',
    '<div foo="bar"></div>',
    '<div lang="foo"></div>',
    '<div lang="en"></div>',
    // validateValues: false parity with jsx-a11y/html-has-lang
    {
      code: '<html lang="foo"></html>',
      options: [{ validateValues: false }],
    },
  ],
  invalid: [
    // Presence
    {
      code: '<html></html>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    // BCP-47 value
    {
      code: '<html lang="foo"></html>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    {
      code: '<html lang="zz-LL"></html>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    {
      code: '<html lang="invalid-lang"></html>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    // DIVERGENCE — valueless / empty: jsx-a11y/html-has-lang accepts
    // `<html lang />` (boolean present); we flag.
    {
      code: '<html lang=""></html>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
    {
      code: '<html lang></html>',
      output: null,
      errors: [{ messageId: 'invalid' }],
    },
  ],
});
