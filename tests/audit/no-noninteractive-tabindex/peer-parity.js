// Audit fixture — translated test cases from jsx-a11y to measure behavioral
// parity of `ember/template-no-noninteractive-tabindex` against
// jsx-a11y/no-noninteractive-tabindex.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from jsx-a11y is annotated as "DIVERGENCE —".
//
// Source file (context/ checkout):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-noninteractive-tabindex-test.js
//
// Translation notes:
//   - JSX `tabIndex="0"` → HBS `tabindex="0"`. Peer tests use camelCase
//     `tabIndex`; Ember is lowercase `tabindex`.
//   - JSX `{0}` / `{-1}` literal expressions → HBS `{{0}}` / `{{-1}}`.
//
// Rule-option notes:
//   - jsx-a11y ships two configs: `recommended` (with `roles: ['tabpanel']`
//     and `allowExpressionValues: true`) and `strict` (no options). Our rule
//     takes no options. We map jsx-a11y's RECOMMENDED config for
//     `allowExpressionValues`-style behavior (dynamic role expressions pass),
//     and jsx-a11y's STRICT config for `tabpanel` (it's flagged). Where these
//     collide we note the specific divergence.

'use strict';

const rule = require('../../../lib/rules/template-no-noninteractive-tabindex');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-noninteractive-tabindex (gts)', rule, {
  valid: [
    // === Upstream parity (alwaysValid — valid in jsx-a11y and ours) ===

    // Component with tabindex — jsx-a11y: skipped (unknown component).
    // Ours: skipped (not in aria-query dom map).
    '<template><MyButton tabindex={{0}} /></template>',

    // No tabindex — rule doesn't fire.
    '<template><button /></template>',

    // Interactive native element with tabindex — valid.
    '<template><button tabindex="0" /></template>',
    '<template><button tabindex={{0}} /></template>',

    // No tabindex on non-interactive element — valid.
    '<template><div /></template>',

    // tabindex="-1" exemption — focusable but out of tab order. Valid in both.
    // (jsx-a11y: `getTabIndex` returns -1, rule short-circuits. Ours:
    // `getStaticTabindexValue === -1` short-circuit added in PR #24.)
    '<template><div tabindex="-1" /></template>',

    // Non-interactive element made interactive via role — valid.
    '<template><div role="button" tabindex="0"></div></template>',

    // Non-interactive role + tabindex="-1" — valid via -1 exemption.
    '<template><div role="article" tabindex="-1"></div></template>',

    // Non-interactive native element + tabindex="-1" — valid via -1 exemption.
    '<template><article tabindex="-1"></article></template>',

    // === DIVERGENCE — components whose name lowercases to a native tag ===
    // jsx-a11y `components` setting maps `<Article>` → `article`, then treats
    // it like the native tag. Without such a setting jsx-a11y would treat
    // `<Article>` as an opaque component and skip.
    // Our rule lowercases `node.tag` before the `dom.has(tag)` check, so
    // `<Article>` becomes `article` and IS validated against the dom map.
    // This has two effects:
    //   (a) `<Article tabindex="-1" />` passes via the tabindex=-1 exemption
    //       (valid in jsx-a11y too, so no visible divergence here).
    //   (b) `<Article tabindex={{0}} />` is FLAGGED by our rule (see invalid
    //       section below). jsx-a11y without `components` setting: VALID (opaque
    //       component skip). jsx-a11y with `components: {Article: 'article'}`
    //       setting: INVALID. Our rule: INVALID regardless — false positive
    //       for the no-settings case.
    // Components whose name does NOT collide with a native tag (e.g.
    // `<MyButton>` → `mybutton` which is not in the dom map) are correctly
    // skipped.
    '<template><Article tabindex="-1" /></template>',

    // === Upstream parity (jsx-a11y recommended valid) ===

    // jsx-a11y recommended: `tabpanel` whitelisted via `roles` option → valid.
    // jsx-a11y strict: `tabpanel` flagged (it's not an interactive role).
    // Our rule has no options and treats `tabpanel` as non-interactive per
    // aria-query's role graph. See the invalid section for the strict-side
    // assertion.

    // jsx-a11y recommended: dynamic role expressions pass because
    // `allowExpressionValues: true`. Our rule conservatively skips dynamic
    // roles too. Parity with recommended config.
    '<template><div role={{this.role}} tabindex="0"></div></template>',

    // === DIVERGENCE — tabpanel tabindex classification ===
    // jsx-a11y recommended: `<div role="tabpanel" tabindex="0" />` VALID
    //   (tabpanel is in the recommended `roles` whitelist).
    // jsx-a11y strict: INVALID.
    // Our rule: INVALID (tabpanel is not in INTERACTIVE_ROLES). We match
    // jsx-a11y strict, diverge from recommended. Captured in invalid section.
  ],

  invalid: [
    // === Upstream parity (neverValid — invalid in jsx-a11y and ours) ===

    // Plain non-interactive element with tabindex="0" — invalid.
    {
      code: '<template><div tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },

    // Non-interactive role doesn't rescue tabindex="0" — invalid.
    {
      code: '<template><div role="article" tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },

    // Non-interactive native element with tabindex="0" — invalid.
    {
      code: '<template><article tabindex="0"></article></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },

    // Mustache-number form — parity invalid.
    {
      code: '<template><article tabindex={{0}}></article></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },

    // === DIVERGENCE — tabpanel in strict mode ===
    // jsx-a11y strict: INVALID (tabpanel not interactive).
    // jsx-a11y recommended: VALID (`roles: ['tabpanel']` whitelist).
    // Our rule: INVALID. Matches jsx-a11y strict, diverges from recommended.
    {
      code: '<template><div role="tabpanel" tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },

    // === DIVERGENCE — jsx-a11y strict: expressions as role values ===
    // jsx-a11y strict: `<div role={ROLE_BUTTON} ... tabIndex="0" />` INVALID
    //   because `allowExpressionValues` defaults to false and `isNonLiteralProperty`
    //   flags the expression role as unknown.
    // jsx-a11y recommended: VALID (allowExpressionValues: true).
    // Our rule: VALID — we conservatively skip dynamic roles. No invalid
    //   assertion here; captured as a comment only. Our behavior matches
    //   jsx-a11y RECOMMENDED, not strict.

    // === DIVERGENCE — component name collides with a native tag ===
    // `<Article tabIndex={0} />` — classifications:
    //   jsx-a11y without `components` setting: VALID (opaque component skip).
    //   jsx-a11y with `components: {Article: 'article'}`: INVALID (article
    //     is non-interactive).
    //   Our rule: INVALID unconditionally. We lowercase `node.tag` before the
    //     `dom.has(tag)` check, so `Article` → `article` is found in the dom
    //     map and validated like the native tag. This is a FALSE POSITIVE
    //     relative to jsx-a11y's no-settings default, and accidental parity
    //     with jsx-a11y's components-configured mode.
    //   Components whose lowercased name doesn't collide with a native tag
    //     (e.g. `<MyButton>`) are correctly skipped.
    {
      code: '<template><Article tabindex={{0}} /></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-noninteractive-tabindex (hbs)', rule, {
  valid: [
    // Parity — interactive native element / role / tabindex="-1" exemption.
    '<button tabindex="0"></button>',
    '<div />',
    '<div tabindex="-1"></div>',
    '<div role="button" tabindex="0"></div>',
    '<article tabindex="-1"></article>',
    // Dynamic role — parity with jsx-a11y recommended (allowExpressionValues: true).
    '<div role={{this.role}} tabindex="0"></div>',
    // Non-tag-colliding component — skipped (not in aria-query dom map).
    // Parity with jsx-a11y's no-settings default.
    // (Components whose lowercased name collides with a native tag diverge;
    //  see `<Article tabindex={{0}} />` in the gts invalid section.)
    '<MyButton tabindex="0" />',
  ],
  invalid: [
    // Parity — neverValid cases in hbs form.
    {
      code: '<div tabindex="0"></div>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<div role="article" tabindex="0"></div>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<article tabindex="0"></article>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // DIVERGENCE — tabpanel strict-mode classification (see gts section).
    {
      code: '<div role="tabpanel" tabindex="0"></div>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
  ],
});
