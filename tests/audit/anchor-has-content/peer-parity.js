// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity against jsx-a11y/anchor-has-content and
// vuejs-accessibility/anchor-has-content.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our closest related rule (`ember/template-link-href-attributes`)
// so that running this file reports pass. Each divergence from an upstream plugin
// is annotated.
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/anchor-has-content-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/anchor-has-content.test.ts
//
// SCOPE NOTE:
// Our plugin has no dedicated `anchor-has-content` rule. The closest relative is
// `template-link-href-attributes`, which checks ONLY that an `<a>` element has
// an `href` attribute (it does NOT check the anchor's accessible name/content).
// So the upstream rule and ours overlap only incidentally.
//
// For this audit each peer case is categorized as:
//
//   PARITY                — upstream and ours agree (often coincidentally: many
//                           peer valid cases have no `href`, which OUR rule
//                           flags even though the peer doesn't).
//   DIVERGENCE (stricter) — peer says VALID (anchor has content), but our rule
//                           FLAGS because there is no `href`.
//   MISSING-COVERAGE      — peer says INVALID on content/accessible-name grounds.
//                           To isolate this from our href check, we add an `href`
//                           so our rule stays silent. The absence of a flag
//                           documents what a future ported rule would need to
//                           catch.
//   AUDIT-SKIP            — peer case relies on framework-specific features with
//                           no HBS equivalent (JSX `dangerouslySetInnerHTML`,
//                           `children` prop, Vue `v-text` / `v-html` / `<slot/>`,
//                           per-plugin `components` settings, etc.).

'use strict';

const rule = require('../../../lib/rules/template-link-href-attributes');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:anchor-has-content (gts)', rule, {
  valid: [
    // === PARITY — non-anchor elements ===
    // jsx-a11y: VALID — `<div />` is not an anchor.
    // Ours: not an `<a>`, rule does not fire.
    '<template><div /></template>',

    // === PARITY — custom component named differently ===
    // jsx-a11y: VALID — `<Link />` without `components` mapping is not treated
    // as an anchor.
    // vue-a11y: `<VAnchor />` without `components` option — same story.
    // Ours: we only target lowercase `<a>`. No flag.
    '<template><Link /></template>',
    '<template><VAnchor /></template>',

    // === MISSING-COVERAGE — href present, content present (true valid) ===
    // These have both href AND content, so both upstream and ours accept them.
    // They are included so the audit has a positive-control row and to make the
    // MISSING-COVERAGE cases below easy to compare (same href shape, empty or
    // inaccessible content).
    '<template><a href="#">Foo</a></template>',
    '<template><a href="#"><Bar /></a></template>',
    '<template><a href="#">{{@foo}}</a></template>',
    '<template><a href="#">{{@foo.bar}}</a></template>',
    '<template><a href="#" title={{@title}}></a></template>',
    '<template><a href="#" aria-label={{@ariaLabel}}></a></template>',
    '<template><a href="#" title={{@title}} aria-label={{@ariaLabel}}></a></template>',
    '<template><a href="#" aria-label="This is my label"></a></template>',
    '<template><a href="#"><img alt="foo" /></a></template>',

    // === MISSING-COVERAGE — empty or inaccessible content ===
    // These have an `href` (so our href check does NOT fire), yet upstream
    // peers would flag them because the accessible name is empty. Our rule
    // currently reports NO error. Each of these documents a gap that a future
    // `anchor-has-content` port would need to fill.
    //
    // MISSING-COVERAGE (from jsx-a11y invalid): `<a />` with no content.
    //   jsx-a11y: INVALID ("Anchors must have content ...").
    //   Ours + href: VALID (no flag).
    '<template><a href="#"></a></template>',

    // MISSING-COVERAGE (from jsx-a11y invalid):
    //   `<a><Bar aria-hidden /></a>` — child is aria-hidden so the anchor has
    //   no accessible name.
    //   jsx-a11y: INVALID.
    //   Ours + href: VALID (no flag; we don't inspect children).
    '<template><a href="#"><Bar aria-hidden={{true}} /></a></template>',

    // MISSING-COVERAGE (from vue-a11y invalid):
    //   `<a><img aria-hidden alt='foo' /></a>` — image is aria-hidden, so alt
    //   is not exposed. Anchor has no accessible name.
    //   vue-a11y: INVALID.
    //   Ours + href: VALID (no flag).
    '<template><a href="#"><img aria-hidden={{true}} alt="foo" /></a></template>',

    // MISSING-COVERAGE (from jsx-a11y invalid):
    //   `<a>{undefined}</a>` — the only child renders to nothing.
    //   HBS closest analogue: interpolate an argument that may be nullish. Our
    //   rule cannot know this at lint time, so there is no flag regardless.
    //   jsx-a11y: INVALID (detects literal `undefined`).
    //   Ours + href: VALID (no flag).
    '<template><a href="#">{{@maybeUndefined}}</a></template>',

    // AUDIT-SKIP — jsx-a11y `<a dangerouslySetInnerHTML={...} />`.
    // React-only prop, no HBS analogue. Not encoded.

    // AUDIT-SKIP — jsx-a11y `<a children={children} />` and `<Link>foo</Link>`
    // with `settings['jsx-a11y'].components`. The `children` prop is a
    // JSX/React concept and `settings.components` is a jsx-a11y feature with no
    // direct equivalent in our plugin; not encoded.

    // AUDIT-SKIP — vue-a11y `v-text`, `v-html`, `<slot />`, `is=`,
    // `accessibleDirectives`/`accessibleChildren`/`components` options.
    // Vue-template-specific; not encoded.
  ],

  invalid: [
    // === PARITY (incidental — different reason) ===
    // jsx-a11y: INVALID ("<a /> has no content").
    // vue-a11y: INVALID (same).
    // Ours: INVALID — but because it is missing `href`, NOT because of content.
    // The net effect matches, yet the diagnosis differs; a real port would need
    // to flag this even when `href` is present (see MISSING-COVERAGE valid row).
    {
      code: '<template><a /></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    {
      code: '<template><a></a></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },

    // === DIVERGENCE — peer VALID, ours flags (no href) ===
    // These encode OUR current (stricter on href, blind to content) behavior.
    // jsx-a11y and vue-a11y consider these VALID because the anchor has an
    // accessible name. Our rule flags them solely because `href` is absent.
    //
    // jsx-a11y valid: `<a>Foo</a>`
    // vue-a11y valid: `<a>Anchor Content!</a>`
    {
      code: '<template><a>Foo</a></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // jsx-a11y valid: `<a><Bar /></a>`
    {
      code: '<template><a><Bar /></a></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // jsx-a11y valid: `<a>{foo}</a>` → HBS `<a>{{@foo}}</a>`
    {
      code: '<template><a>{{@foo}}</a></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // jsx-a11y valid: `<a>{foo.bar}</a>` → HBS `<a>{{@foo.bar}}</a>`
    {
      code: '<template><a>{{@foo.bar}}</a></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // jsx-a11y valid: `<a title={title} />` → HBS `<a title={{@title}} />`
    {
      code: '<template><a title={{@title}} /></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // jsx-a11y valid: `<a aria-label={ariaLabel} />`
    {
      code: '<template><a aria-label={{@ariaLabel}} /></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // jsx-a11y valid: `<a title={title} aria-label={ariaLabel} />`
    {
      code: '<template><a title={{@title}} aria-label={{@ariaLabel}} /></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // vue-a11y valid: `<a aria-label='This is my label' />`
    {
      code: '<template><a aria-label="This is my label" /></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    // vue-a11y valid: `<a><img alt='foo' /></a>`
    {
      code: '<template><a><img alt="foo" /></a></template>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:anchor-has-content (hbs)', rule, {
  valid: [
    // PARITY — non-anchor / custom-component (ours does not fire, peers VALID).
    '<div />',
    '<Link />',
    '<VAnchor />',

    // MISSING-COVERAGE — href present, accessible name missing. Peers flag;
    // ours does not (same cases as the gts section, in classic HBS form).
    '<a href="#"></a>',
    '<a href="#"><Bar aria-hidden={{true}} /></a>',
    '<a href="#"><img aria-hidden={{true}} alt="foo" /></a>',
    '<a href="#">{{@maybeUndefined}}</a>',
  ],
  invalid: [
    // PARITY incidental — flagged for missing href, not for content.
    {
      code: '<a />',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    {
      code: '<a></a>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },

    // DIVERGENCE — peers VALID (has content), we flag (no href).
    {
      code: '<a>Foo</a>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    {
      code: '<a aria-label="This is my label" />',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
    {
      code: '<a><img alt="foo" /></a>',
      output: null,
      errors: [{ messageId: 'missingHref' }],
    },
  ],
});
