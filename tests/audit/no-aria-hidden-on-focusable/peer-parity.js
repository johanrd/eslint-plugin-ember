// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-aria-hidden-on-focusable` against
// jsx-a11y/no-aria-hidden-on-focusable and
// vuejs-accessibility/no-aria-hidden-on-focusable.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-aria-hidden-on-focusable-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/no-aria-hidden-on-focusable.test.ts

'use strict';

const rule = require('../../../lib/rules/template-no-aria-hidden-on-focusable');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-aria-hidden-on-focusable (gts)', rule, {
  valid: [
    // === Upstream parity (valid in both jsx-a11y and us) ===
    // jsx-a11y: valid — `<div>` is not focusable by default.
    '<template><div aria-hidden="true" /></template>',

    // jsx-a11y: valid — `<img>` is not focusable by default.
    '<template><img aria-hidden="true" /></template>',

    // jsx-a11y: valid — aria-hidden="false" is an explicit opt-out.
    '<template><a aria-hidden="false" href="#"></a></template>',

    // jsx-a11y: valid — no aria-hidden on a focusable element.
    '<template><button></button></template>',
    '<template><a href="/"></a></template>',

    // === jsx-a11y `<div onClick={...} aria-hidden="true" />` ===
    // jsx-a11y: valid — `<div>` with an onClick is still not in the rule's
    // focusable set (event handlers don't add tabindex). In HBS the rough
    // analogue is `{{on "click" this.fn}}`. Our rule also ignores modifiers,
    // so it's still valid.
    '<template><div {{on "click" this.handler}} aria-hidden="true"></div></template>',

    // vue-a11y: valid — no aria-hidden anywhere.
    `<template>
      <div>
        <button>Submit</button>
      </div>
    </template>`,

    // vue-a11y: valid — `<a>` with tabindex="-1" but no aria-hidden.
    '<template><a href="#" tabindex="-1">link</a></template>',
  ],

  invalid: [
    // === Upstream parity (invalid in both jsx-a11y and us) ===
    // jsx-a11y: `<div aria-hidden tabIndex="0">` → focusable via tabindex.
    {
      code: '<template><div aria-hidden="true" tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // jsx-a11y: `<input>` is inherently focusable.
    {
      code: '<template><input aria-hidden="true" /></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // jsx-a11y: `<a href>` is focusable.
    {
      code: '<template><a href="/" aria-hidden="true"></a></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // jsx-a11y: `<button>` is inherently focusable.
    {
      code: '<template><button aria-hidden="true"></button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // jsx-a11y: `<textarea>` is inherently focusable.
    {
      code: '<template><textarea aria-hidden="true"></textarea></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // jsx-a11y: `<p tabindex="0" aria-hidden>` — tabindex makes it focusable.
    {
      code: '<template><p tabindex="0" aria-hidden="true">text</p></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },

    // vue-a11y: `<button type aria-hidden>` — inherently focusable.
    {
      code: '<template><button type="button" aria-hidden="true">Submit</button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // vue-a11y: `<a href aria-hidden>` — focusable.
    {
      code: '<template><a href="#" aria-hidden="true">Link</a></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // vue-a11y: `<span tabindex="0" aria-hidden>` — tabindex makes focusable.
    {
      code: '<template><span tabindex="0" aria-hidden="true"><em>Icon</em></span></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },

    // === Upstream parity with vue-a11y descendant-focusable check (G5.1) ===
    // vue-a11y: INVALID when aria-hidden is on an ancestor and a focusable
    //   descendant exists. Our rule now matches this via hasFocusableDescendant.
    //   Per WAI-ARIA 1.2 §aria-hidden "may receive focus", a focusable
    //   descendant beneath an aria-hidden ancestor is keyboard-reachable while
    //   hidden from AT — a keyboard trap.
    {
      code: '<template><div aria-hidden="true"><button>Submit</button></div></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnAncestorOfFocusable' }],
    },

    // === DIVERGENCE — `tabindex="-1"` on an inherently focusable element ===
    // This is the load-bearing, intentional divergence that PR #19 encodes.
    // jsx-a11y: VALID — `<button aria-hidden="true" tabIndex="-1" />` is
    //   accepted; the author has acknowledged the element is "escorted out"
    //   of the tab order.
    // vue-a11y: VALID — same: `<button tabindex="-1" aria-hidden="true">`
    //   is accepted.
    // Our rule: INVALID. Rationale (see lib/rules/template-no-aria-hidden-on-focusable.js
    //   lines 54-62): tabindex="-1" still makes the element *programmatically*
    //   focusable (reachable via `.focus()` and click). Combined with
    //   aria-hidden="true" this creates a keyboard trap / AT-invisibility
    //   mismatch. Our rule flags any tabindex attribute on an aria-hidden
    //   element regardless of value.
    // This is the DIVERGENCE the PR is defending.
    {
      code: '<template><button aria-hidden="true" tabindex="-1"></button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<template><button tabindex="-1" aria-hidden="true">Press</button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },

    // === DIVERGENCE (extended by G5.1) — tabindex="-1" on a DESCENDANT ===
    // Same rationale as above, applied through hasFocusableDescendant: our
    // `isFocusable` treats any tabindex (including "-1") as programmatically
    // focusable. vue-a11y considers these VALID (descendant is "escorted out"
    // of tab order). We flag.
    {
      code: `<template>
      <div aria-hidden="true">
        <button tabindex="-1">Some text</button>
      </div>
    </template>`,
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnAncestorOfFocusable' }],
    },
    {
      code: `<template>
      <div aria-hidden="true">
        <a href="#" tabindex="-1">Link</a>
      </div>
    </template>`,
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnAncestorOfFocusable' }],
    },
  ],
});

// === DIVERGENCE — `<a>` without `href` ===
// jsx-a11y: has no case for `<a aria-hidden="true">` without href. By its
//   focusable table, an anchor without href is not focusable → not flagged.
// Our rule matches: `a` tag requires an `href` attr to be focusable. Captured
// in main rule tests, no extra case needed here.
//
// === DIVERGENCE — `<input type="hidden">` ===
// jsx-a11y: has no explicit case for this. Our rule special-cases
//   `<input type="hidden">` as non-focusable. Captured in main rule tests.

// === PARITY — vue-a11y descendant-focusable check (G5.1, PR #19 follow-up) ===
// vue-a11y: INVALID when aria-hidden is on an ancestor and a focusable
//   descendant exists:
//     `<div aria-hidden="true"><button>Submit</button></div>`  → flagged
//   Its rule descends into children and fires on the aria-hidden ancestor
//   if any descendant is focusable.
// Our rule: now INVALID — matches vue-a11y. Per WAI-ARIA 1.2 §aria-hidden
//   "may receive focus" we flag via `hasFocusableDescendant` under the
//   `noAriaHiddenOnAncestorOfFocusable` messageId. The parity case is in the
//   invalid[] block above. Component/dynamic descendants remain opaque
//   (no-FP bias).

// === AUDIT-SKIP — curly-literal aria-hidden value forms ===
// jsx-a11y: tests use string-literal `aria-hidden="true"`. It also recognizes
//   JSX expression forms like `aria-hidden={true}` and `aria-hidden={"true"}`.
//   Our rule's `isAriaHiddenTruthy` handles the HBS equivalents
//   (`{{true}}` and `{{"true"}}`), but neither peer plugin's upstream suite
//   has cases for those forms, so there is nothing to translate here. These
//   forms are exercised by the main rule tests.

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-aria-hidden-on-focusable (hbs)', rule, {
  valid: [
    // Upstream parity (valid in both).
    '<div aria-hidden="true"></div>',
    '<img aria-hidden="true" />',
    '<a aria-hidden="false" href="#"></a>',
    '<button></button>',
    '<a href="/"></a>',
  ],
  invalid: [
    {
      code: '<div aria-hidden="true" tabindex="0"></div>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<input aria-hidden="true" />',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<a href="/" aria-hidden="true"></a>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<button aria-hidden="true"></button>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<textarea aria-hidden="true"></textarea>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<p tabindex="0" aria-hidden="true">text</p>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // DIVERGENCE — tabindex="-1" on an inherently focusable element.
    // jsx-a11y + vue-a11y: valid. Ours: invalid. Load-bearing.
    {
      code: '<button aria-hidden="true" tabindex="-1"></button>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<button tabindex="-1" aria-hidden="true">Press</button>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    // G5.1 parity — aria-hidden ancestor with focusable descendant.
    {
      code: '<div aria-hidden="true"><button>Submit</button></div>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnAncestorOfFocusable' }],
    },
    // G5.1 — DIVERGENCE extended: descendant with tabindex="-1".
    {
      code: '<div aria-hidden="true"><button tabindex="-1">Some text</button></div>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnAncestorOfFocusable' }],
    },
    {
      code: '<div aria-hidden="true"><a href="#" tabindex="-1">Link</a></div>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnAncestorOfFocusable' }],
    },
  ],
});
