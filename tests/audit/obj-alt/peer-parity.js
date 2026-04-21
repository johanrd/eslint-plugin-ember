// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-require-valid-alt-text` (the `<object>`
// subset) against lit-a11y/obj-alt.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Peer sources (context/ checkouts):
//   - eslint-plugin-lit-a11y/tests/lib/rules/obj-alt.js
//
// Note: jsx-a11y and vuejs-accessibility do not ship a dedicated `<object>`
// rule; their alt-text rules cover it via element lists. lit-a11y is the only
// peer with a standalone `obj-alt` rule, so this fixture is lit-a11y-only.
//
// Accessible-name precedence relevant to `<object>`:
//   - HTML/ARIA: title, aria-label, aria-labelledby, inner text — any
//     non-empty one satisfies the accessible-name requirement.
//   - lit-a11y's `obj-alt`: accepts title, aria-label, aria-labelledby, OR
//     non-whitespace inner text. Also treats `role="presentation"` and
//     `role="none"` as escape hatches.
//   - Our rule: accepts the same set, but `hasChildren` counts any nested
//     ELEMENT (even one with only whitespace text) as "has children". lit-a11y
//     only counts non-whitespace TEXT. See DIVERGENCE below.
//
// aria-label vs aria-labelledby vs title vs inner-text precedence:
// Neither rule encodes a precedence ordering — both rules only check that AT
// LEAST ONE accessible-name source is present. Both accept any single source
// as sufficient, matching ARIA's "any one is enough" semantics for flagging
// purposes (not for resolution).

'use strict';

const rule = require('../../../lib/rules/template-require-valid-alt-text');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:obj-alt (gts)', rule, {
  valid: [
    // === Upstream parity (valid in lit-a11y + ours) ===
    // lit-a11y: `html`<object data="..." title="..."></object>`` — valid.
    '<template><object data="path/to/content" title="This object has text"></object></template>',
    // lit-a11y: aria-label satisfies the accessible-name requirement.
    '<template><object data="path/to/content" aria-label="this object has text"></object></template>',
    // lit-a11y: aria-labelledby satisfies the accessible-name requirement.
    '<template><object data="path/to/content" aria-labelledby="foo"></object></template>',
    // lit-a11y: role="presentation" escape hatch.
    '<template><object data="path/to/content" role="presentation"></object></template>',
    // lit-a11y: role="none" escape hatch.
    '<template><object data="path/to/content" role="none"></object></template>',

    // === DIVERGENCE — nested element with whitespace-only text ===
    // lit-a11y: INVALID — `<object><div> </div></object>` has no accessible
    // name (the inner <div> contains only whitespace). lit-a11y's rule inspects
    // text content recursively and requires non-whitespace text.
    // Our rule: VALID — `hasChildren` returns true for ANY non-text child node,
    // regardless of whether that child itself contains meaningful text. We do
    // not recurse into descendants. This is a false negative vs lit-a11y.
    // Captured here on the "valid" side to reflect OUR current behavior.
    '<template><object data="path/to/content"><div> </div></object></template>',
  ],

  invalid: [
    // === Upstream parity (invalid in lit-a11y + ours) ===
    // lit-a11y: `html`<object data="..."></object>`` — no accessible name.
    {
      code: '<template><object data="path/to/content"></object></template>',
      output: null,
      errors: [{ messageId: 'objectMissing' }],
    },

    // === DIVERGENCE — inner text satisfies accessible-name requirement ===
    // lit-a11y: INVALID — the test fixture
    //   `html`<object data="...">This object has no alternative text.</object>``
    // is listed as invalid in upstream. The rule name and message ("obj-alt")
    // suggest the upstream intent is to require `title`/`aria-label`/
    // `aria-labelledby` specifically, NOT inner text. This is surprising: the
    // valid cases only cover attributes, and the invalid case with inner text
    // confirms upstream does not treat inner text as sufficient.
    // Our rule: VALID — `hasChildren` returns true for meaningful text
    // content, so we do NOT flag. Captured here on the "valid" side below
    // since we don't flag — see next case in `valid` list conceptually.
    // (Included here with output:null to assert OUR position: no error.)
    //
    // Actually, to encode this as an asserted divergence we flip the side:
    // place the code under `valid` above if we want the runner to pass.
    // But to keep a one-to-one mapping with lit-a11y's invalid list, we note
    // it here as a commented-out assertion and move the asserted case to
    // the valid list in the second ruleTester.run below.
  ],
});

// === DIVERGENCE — inner text treated as accessible name (captured as valid) ===
// lit-a11y flags `<object data="...">...text...</object>` as INVALID. We treat
// non-empty inner text as sufficient accessible-name content and do NOT flag.
// Isolated so the intent is clear.
ruleTester.run('audit:obj-alt inner-text (gts)', rule, {
  valid: [
    // lit-a11y: INVALID (they want an attribute-based accessible name). We
    // accept inner text. This captures OUR behavior.
    '<template><object data="path/to/content">This object has no alternative text.</object></template>',
  ],
  invalid: [],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:obj-alt (hbs)', rule, {
  valid: [
    '<object data="path/to/content" title="This object has text"></object>',
    '<object data="path/to/content" aria-label="this object has text"></object>',
    '<object data="path/to/content" aria-labelledby="foo"></object>',
    '<object data="path/to/content" role="presentation"></object>',
    '<object data="path/to/content" role="none"></object>',
    // DIVERGENCE — nested whitespace-only element; lit-a11y flags, we don't.
    '<object data="path/to/content"><div> </div></object>',
    // DIVERGENCE — inner text accepted by us, flagged by lit-a11y.
    '<object data="path/to/content">This object has no alternative text.</object>',
  ],
  invalid: [
    {
      code: '<object data="path/to/content"></object>',
      output: null,
      errors: [{ messageId: 'objectMissing' }],
    },
  ],
});
