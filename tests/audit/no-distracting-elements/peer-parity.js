// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-obsolete-elements` against
// jsx-a11y/no-distracting-elements, vuejs-accessibility/no-distracting-elements,
// angular-eslint template/no-distracting-elements, lit-a11y/no-distracting-elements.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Scope note:
//   Our rule is named `template-no-obsolete-elements` and is a port of
//   ember-template-lint's `no-obsolete-elements`. It covers the WHATWG
//   "Obsolete features" list (obsolete HTML tags). The peer plugins'
//   `no-distracting-elements` rules are narrower: they flag only elements
//   considered distracting (effectively <marquee> and <blink>).
//
//   The obsolete set is a strict SUPERSET of the distracting set: both
//   <marquee> and <blink> are obsolete AND distracting, so our rule flags
//   everything peers flag — plus many more. Cases below marked
//   "EXTENSION-BEYOND-PEERS" capture obsolete tags (e.g. <applet>, <bgsound>,
//   <dir>, <font>, ...) that peers do NOT flag with their narrower rule.
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-distracting-elements-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/no-distracting-elements.test.ts
//   - angular-eslint-main/packages/eslint-plugin-template/tests/rules/no-distracting-elements/cases.ts
//   - eslint-plugin-lit-a11y/tests/lib/rules/no-distracting-elements.js

'use strict';

const rule = require('../../../lib/rules/template-no-obsolete-elements');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-distracting-elements (gts)', rule, {
  valid: [
    // === Upstream parity — plain non-distracting, non-obsolete elements ===
    // jsx-a11y valid: `<div />`. vue-a11y valid: `<div />`.
    // angular-eslint valid: `<div>Valid</div>`. lit-a11y valid: html`<div></div>`.
    // Ours: valid (tag is not in the obsolete set).
    '<template><div /></template>',
    '<template><div>Valid</div></template>',

    // === Upstream parity — capitalized / PascalCase is a component, not an HTML tag ===
    // jsx-a11y: VALID — `<Marquee />` / `<Blink />` are components (valid because
    //   they are JSX components, not the lowercase HTML tag). Requires
    //   `settings['jsx-a11y'].components` mapping to cross the line.
    // Ours: VALID — in GJS/GTS, `<Marquee />` is an identifier reference, so it
    //   requires an in-scope binding. When bound, it is a component invocation
    //   and not subject to obsolete-tag matching (we match on lowercase tag name).
    //   (We do not report `<Marquee />` even when unbound since the tag isn't
    //   in our obsolete set — our set is lowercase.)
    // Rendered here using a local binding so the parser has a name in scope:
    `<template>
      {{#let (component 'marquee-wrapper') as |Marquee|}}
        <Marquee />
      {{/let}}
    </template>`,

    // === Upstream parity — attribute, not element ===
    // jsx-a11y VALID: `<div marquee />`, `<div blink />` — `marquee`/`blink` as
    //   attribute names don't match (the rule matches on JSXOpeningElement name).
    // Ours: VALID — we match on the element's tag name, never attributes.
    '<template><div marquee /></template>',
    '<template><div blink /></template>',

    // === Upstream parity — block-param shadowing ===
    // Our rule intentionally skips a tag whose name is bound as an in-scope
    // block param from an enclosing element or helper (i.e. a local component,
    // not the HTML tag). This case mirrors the "component-not-HTML" intent
    // from jsx-a11y's component settings.
    `<template>
      {{#let (component 'whatever-here') as |plaintext|}}
        <plaintext />
      {{/let}}
    </template>`,
    // Element-level block params are also tracked.
    '<template><Outer as |marquee|><marquee /></Outer></template>',
  ],
  invalid: [
    // ==================================================================
    // DIRECTLY TRANSLATED PEER CASES — distracting tags (marquee/blink)
    // ==================================================================
    // These are the tags all four peers flag. Our rule flags them too,
    // because both are in the WHATWG obsolete set.

    // --- jsx-a11y: `<marquee />` variants ---
    {
      code: '<template><marquee /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'marquee' } }],
    },
    // jsx-a11y: `<marquee {...props} />` — GJS equivalent is `...attributes`.
    {
      code: '<template><marquee ...attributes /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'marquee' } }],
    },
    // jsx-a11y: `<marquee lang={undefined} />` — GJS analogue with dynamic attr.
    {
      code: '<template><marquee lang={{@lang}} /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'marquee' } }],
    },

    // --- jsx-a11y: `<blink />` variants ---
    {
      code: '<template><blink /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'blink' } }],
    },
    {
      code: '<template><blink ...attributes /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'blink' } }],
    },
    {
      code: '<template><blink foo={{@x}} /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'blink' } }],
    },

    // --- vue-a11y: self-closing forms ---
    // `<blink />` and `<marquee />` covered above. vue-a11y's third case
    // maps a custom component name via `elements` option to the distracting
    // set; our rule has no such option — EXTENSION-BEYOND-PEERS note only.

    // --- angular-eslint: open/close form + uppercase ---
    {
      code: '<template><marquee></marquee></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'marquee' } }],
    },
    {
      code: '<template><div></div><blink></blink></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'blink' } }],
    },
    // DIVERGENCE — uppercase `<MARQUEE>`.
    //   angular-eslint: INVALID — the Angular template parser normalizes tag
    //     case and still flags `<MARQUEE>` as distracting.
    //   Ours: VALID (not reported) — Glimmer treats a capitalized tag as a
    //     component-invocation identifier (requires an in-scope binding). The
    //     tag text `MARQUEE` does not match our lowercase obsolete set.
    // Captured as valid above implicitly; no invalid row here. This is a
    // divergence FROM angular-eslint where our rule is LESS strict for this
    // specific uppercase edge case. (In GTS/GJS this pattern is also a parse-
    // time component reference, not an HTML tag.)

    // --- lit-a11y: html-tagged templates — we translate to <template> ---
    {
      code: '<template><marquee></marquee></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'marquee' } }],
    },
    {
      code: '<template><blink></blink></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'blink' } }],
    },

    // ==================================================================
    // EXTENSION-BEYOND-PEERS — obsolete tags peers do NOT flag
    // ==================================================================
    // Peers' `no-distracting-elements` only flags <marquee> and <blink>.
    // Our `template-no-obsolete-elements` flags the full WHATWG obsolete
    // set. Each case below is flagged by US but NOT by any of the 4 peers
    // under their `no-distracting-elements` rule.
    //
    // Full list of tags we flag beyond peers:
    //   acronym, applet, basefont, bgsound, big, center, dir, font,
    //   frame, frameset, isindex, keygen, listing, menuitem, multicol,
    //   nextid, nobr, noembed, noframes, param, plaintext, rb, rtc,
    //   spacer, strike, tt, xmp
    {
      code: '<template><acronym></acronym></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'acronym' } }],
    },
    {
      code: '<template><applet></applet></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'applet' } }],
    },
    {
      code: '<template><basefont></basefont></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'basefont' } }],
    },
    {
      code: '<template><bgsound></bgsound></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'bgsound' } }],
    },
    {
      code: '<template><big></big></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'big' } }],
    },
    {
      code: '<template><center></center></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'center' } }],
    },
    {
      code: '<template><dir></dir></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'dir' } }],
    },
    {
      code: '<template><font></font></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'font' } }],
    },
    {
      code: '<template><frame></frame></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'frame' } }],
    },
    {
      code: '<template><frameset></frameset></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'frameset' } }],
    },
    {
      code: '<template><isindex></isindex></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'isindex' } }],
    },
    {
      code: '<template><keygen /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'keygen' } }],
    },
    {
      code: '<template><listing></listing></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'listing' } }],
    },
    {
      code: '<template><menuitem></menuitem></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'menuitem' } }],
    },
    {
      code: '<template><multicol></multicol></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'multicol' } }],
    },
    {
      code: '<template><nextid></nextid></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'nextid' } }],
    },
    {
      code: '<template><nobr></nobr></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'nobr' } }],
    },
    {
      code: '<template><noembed></noembed></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'noembed' } }],
    },
    {
      code: '<template><noframes></noframes></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'noframes' } }],
    },
    {
      code: '<template><param /></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'param' } }],
    },
    {
      code: '<template><plaintext></plaintext></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'plaintext' } }],
    },
    {
      code: '<template><rb></rb></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'rb' } }],
    },
    {
      code: '<template><rtc></rtc></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'rtc' } }],
    },
    {
      code: '<template><spacer></spacer></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'spacer' } }],
    },
    {
      code: '<template><strike></strike></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'strike' } }],
    },
    {
      code: '<template><tt></tt></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'tt' } }],
    },
    {
      code: '<template><xmp></xmp></template>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'xmp' } }],
    },
  ],
});

// ============================================================================
// HBS-flavored tests (no <template>…</template> wrapper, uses the hbs parser).
// Peers are JSX/Vue/Angular/Lit and have no direct hbs analogue; these mirror
// the same cases for our loose-mode handlebars file type.
// ============================================================================

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-distracting-elements (hbs)', rule, {
  valid: [
    '<div></div>',
    // Block-param binding shadows the tag — not the HTML element.
    `{{#let (component 'whatever-here') as |plaintext|}}
      <plaintext />
    {{/let}}`,
  ],
  invalid: [
    // Distracting pair — flagged by all peers AND us.
    {
      code: '<marquee></marquee>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'marquee' } }],
    },
    {
      code: '<blink></blink>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'blink' } }],
    },
    // One EXTENSION-BEYOND-PEERS example in hbs flavor to confirm parity
    // with the gts suite.
    {
      code: '<applet></applet>',
      output: null,
      errors: [{ messageId: 'obsolete', data: { element: 'applet' } }],
    },
  ],
});
