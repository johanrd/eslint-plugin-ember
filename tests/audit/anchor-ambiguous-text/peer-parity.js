// Audit fixture — translated test cases from jsx-a11y/anchor-ambiguous-text
// to measure behavioral parity of `ember/template-no-invalid-link-text`.
//
// These tests are NOT part of the main suite and do not run in CI. They
// encode the CURRENT behavior of our rule so that running this file reports
// pass. Each divergence from jsx-a11y is annotated as "DIVERGENCE —".
//
// Source file (context/ checkout):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/anchor-ambiguous-text-test.js
//
// Headline differences between the two rules:
//   1. Default word list differs. jsx-a11y defaults:
//        ['click here', 'here', 'link', 'a link', 'learn more']
//      Our defaults (hard-coded, not user-configurable):
//        ['click here', 'more info', 'read more', 'more']
//      Overlap is only "click here". Consequence: many jsx-a11y invalid
//      cases (bare "here", "link", "a link", "learn more" variations) are
//      valid under our defaults, and cases we flag ("read more", "more
//      info", bare "more") are not flagged by jsx-a11y's defaults.
//   2. Our rule has NO `words` option. Schema exposes only `allowEmptyLinks`
//      and `linkComponents`. jsx-a11y's `options: [{ words: [...] }]` has
//      no equivalent, so those peer cases are translated as NOTE-only.
//   3. Our rule flags empty link content by default (reports with text
//      "(empty)"); jsx-a11y does not. `allowEmptyLinks: true` opts out.
//   4. Our rule does not strip trailing punctuation before matching, so
//      "learn more." etc. would never match a list entry even if the list
//      contained "learn more". jsx-a11y strips trailing punctuation.
//   5. Our rule treats any non-TextNode child (component invocation, nested
//      HTML element, mustache) as opaque and skips the element. jsx-a11y
//      concatenates text across nested elements and also inspects nested
//      <img alt="..."> values. Consequence: cases like
//      `<a><span>click</span> here</a>` are valid under our rule but
//      invalid under jsx-a11y.
//   6. aria-label whose value itself matches a disallowed term is flagged
//      by both (`<a aria-label="click here">something</a>`).

'use strict';

const rule = require('../../../lib/rules/template-no-invalid-link-text');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:anchor-ambiguous-text (gts)', rule, {
  valid: [
    // === Upstream parity (valid in both jsx-a11y and us) ===

    // jsx-a11y: valid — non-ambiguous link text.
    '<template><a>documentation</a></template>',

    // jsx-a11y: valid — dynamic content (template literal in JSX source).
    // Translated: mustache → content is opaque → we skip.
    '<template><a>{{@here}}</a></template>',

    // jsx-a11y: valid — aria-label provides an accessible name distinct from
    // the ambiguous visible text. Both plugins skip when aria-label is a
    // valid non-ambiguous string.
    '<template><a aria-label="tutorial on using eslint-plugin-jsx-a11y">click here</a></template>',

    // jsx-a11y: valid — inner element has a valid aria-label, but jsx-a11y
    // still considers the outer anchor's text ambiguous; they pass this
    // because the span sub-tree contributes aria-label, not text.
    // Our rule: the outer <a> has a <span> child (non-TextNode) → content
    // is opaque → we skip. Same net result (valid) but different reason.
    '<template><a><span aria-label="tutorial on using eslint-plugin-jsx-a11y">click here</span></a></template>',

    // jsx-a11y: valid — nested <img alt="..."> provides the accessible name.
    // Our rule: <a> has an <img> child (non-TextNode) → opaque → skip.
    // Same net result.
    '<template><a><img alt="documentation" /></a></template>',

    // === DIVERGENCE — words option ===
    // jsx-a11y: valid via options `[{ words: ['disabling the defaults'] }]`
    // which REPLACES the default list and therefore allows "click here".
    //   { code: '<a>click here</a>', options: [{ words: ['disabling the defaults'] }] }
    // Our rule: no `words` option in the schema. "click here" is hard-coded
    // disallowed. Cannot translate; the same code under our rule is invalid.
    // NOT INCLUDED as a valid case — see invalid section for the default
    // behavior.

    // === DIVERGENCE — components setting ===
    // jsx-a11y: valid via `settings: { 'jsx-a11y': { components: { Link: 'a' } } }`
    // which maps <Link> to <a>. Our equivalent is the `linkComponents`
    // option on our rule. Translate the valid cases that use it:
    {
      code: '<template><CustomLink>documentation</CustomLink></template>',
      options: [{ linkComponents: ['CustomLink'] }],
    },
    {
      code: '<template><CustomLink>{{@here}}</CustomLink></template>',
      options: [{ linkComponents: ['CustomLink'] }],
    },
    {
      code: '<template><CustomLink aria-label="tutorial on using eslint-plugin-jsx-a11y">click here</CustomLink></template>',
      options: [{ linkComponents: ['CustomLink'] }],
    },

    // === DIVERGENCE — default word list differs ===
    // jsx-a11y's default list includes 'here', 'link', 'a link', 'learn more'
    // but our default list does NOT. Under OUR defaults these are all valid:
    '<template><a>here</a></template>',
    // jsx-a11y: invalid (lowercases to "here"). Ours: "here" is not in our
    // disallowed list → valid.
    '<template><a>HERE</a></template>',
    '<template><a>learn more</a></template>',
    '<template><a>learn      more</a></template>',
    // jsx-a11y strips trailing punctuation; ours does not. Either way,
    // "learn more" is not in our list, so these are valid for us.
    '<template><a>learn more.</a></template>',
    '<template><a>learn more?</a></template>',
    '<template><a>learn more,</a></template>',
    '<template><a>learn more!</a></template>',
    '<template><a>learn more;</a></template>',
    '<template><a>learn more:</a></template>',
    '<template><a>link</a></template>',
    '<template><a>a link</a></template>',
    '<template><a> a link </a></template>',

    // === DIVERGENCE — text split across nested elements ===
    // jsx-a11y: invalid — concatenates "a" + "" + " link" = "a link".
    // Ours: non-TextNode <i> child → opaque → skip. Valid for us.
    '<template><a>a<i></i> link</a></template>',
    '<template><a><i></i>a link</a></template>',
    '<template><a><span>click</span> here</a></template>',
    '<template><a><span> click </span> here</a></template>',
    // jsx-a11y: invalid — "learn more" text remains after aria-hidden span
    // is removed. Our rule skips when any non-TextNode child is present;
    // valid for us.
    '<template><a><span aria-hidden="true">more text</span>learn more</a></template>',
    // jsx-a11y: invalid — nested <img alt="click here"> is the accessible
    // name. Ours: <img> child is non-TextNode → opaque → valid.
    '<template><a><img alt="click here" /></a></template>',
    // jsx-a11y: invalid — the alt attribute on the anchor is irrelevant;
    // the visible "click here" text is what gets flagged. Ours: "click
    // here" IS in our list; see invalid section.
    // jsx-a11y: invalid — span child with alt attribute, outer text "click
    // here". Ours: <span> is non-TextNode → opaque → valid.
    '<template><a><span alt="tutorial on using eslint-plugin-jsx-a11y">click here</span></a></template>',
    // jsx-a11y: invalid — <CustomElement> plus " here" concatenates to
    // "click here" (jsx-a11y treats unknown components like React children
    // text fragments via component settings). Ours: non-TextNode child →
    // opaque → valid.
    '<template><a><CustomElement>click</CustomElement> here</a></template>',
  ],

  invalid: [
    // === Upstream parity (invalid in both jsx-a11y and us) ===

    // Both flag "click here" — the one overlapping default.
    {
      code: '<template><a>click here</a></template>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },

    // Both flag when aria-label is itself a disallowed term.
    {
      code: '<template><a aria-label="click here">something</a></template>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },

    // === DIVERGENCE — our defaults include words jsx-a11y's don't ===
    // "read more", "more info", and bare "more" are in OUR default list
    // but NOT in jsx-a11y's. jsx-a11y would treat these as valid under
    // its defaults. Flagged by us:
    {
      code: '<template><a>read more</a></template>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
    {
      code: '<template><a>more info</a></template>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
    {
      code: '<template><a>more</a></template>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },

    // === DIVERGENCE — empty content ===
    // jsx-a11y: valid (empty <a> is not in the rule's purview).
    // Ours: flagged by default with text "(empty)". `allowEmptyLinks:
    // true` opts out (covered in main test suite).
    {
      code: '<template><a href="/x"></a></template>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
  ],
});

// === DIVERGENCE — custom words option (not supported by our rule) ===
// jsx-a11y test:
//   { code: '<a>a disallowed word</a>',
//     options: [{ words: ['a disallowed word'] }],
//     errors: [...] }
// Our rule has no `words` option. Under our defaults "a disallowed word"
// is not in the list → valid. Captured here to make the absence explicit.
ruleTester.run('audit:anchor-ambiguous-text custom words (gts)', rule, {
  valid: ['<template><a>a disallowed word</a></template>'],
  invalid: [],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:anchor-ambiguous-text (hbs)', rule, {
  valid: [
    '<a>documentation</a>',
    '<a>{{@here}}</a>',
    '<a aria-label="tutorial on using eslint-plugin-jsx-a11y">click here</a>',
    // DIVERGENCE — default word list differs; bare "here"/"link"/"learn
    // more" are valid under our defaults.
    '<a>here</a>',
    '<a>HERE</a>',
    '<a>learn more</a>',
    '<a>link</a>',
    '<a>a link</a>',
    // DIVERGENCE — text split across nested elements; non-TextNode child
    // makes our rule treat content as opaque.
    '<a><span>click</span> here</a>',
    '<a><img alt="click here" /></a>',
  ],
  invalid: [
    {
      code: '<a>click here</a>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
    {
      code: '<a aria-label="click here">something</a>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
    // DIVERGENCE — our defaults include these; jsx-a11y does not.
    {
      code: '<a>read more</a>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
    {
      code: '<a>more info</a>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
    {
      code: '<a>more</a>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
    // DIVERGENCE — we flag empty links by default; jsx-a11y doesn't.
    {
      code: '<a href="/x"></a>',
      output: null,
      errors: [{ messageId: 'invalidText' }],
    },
  ],
});
