// Audit fixture — peer-plugin parity for `ember/template-require-media-caption`.
// These tests encode the CURRENT behavior of our rule. Each divergence from an
// upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/media-has-caption-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/media-has-caption.test.ts

'use strict';

const rule = require('../../../lib/rules/template-require-media-caption');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:media-has-caption (gts)', rule, {
  valid: [
    // === Upstream parity (valid in jsx-a11y, vue-a11y, and ours) ===
    '<template><div /></template>',
    '<template><audio><track kind="captions" /></audio></template>',
    '<template><video><track kind="captions" /></video></template>',
    // Multiple tracks: at least one captions → valid
    '<template><video><track kind="captions" /><track kind="descriptions" /></video></template>',

    // === Muted — all upstream plugins exempt muted media ===
    // jsx-a11y: `<video muted></video>` valid (boolean shorthand === true).
    // vue-a11y: `<video muted />`, `<video muted='true' />` both valid.
    // Ours: boolean attribute valid; `muted="true"` valid; `muted={{...}}`
    // mustache valid (dynamic); concat `muted="{{x}}"` valid (dynamic).
    '<template><video muted></video></template>',
    '<template><audio muted="true"></audio></template>',
    '<template><audio muted={{this.muted}}></audio></template>',
    '<template><video muted="{{isMuted}}"><source src="movie.mp4" /></video></template>',
    '<template><audio muted={{true}}></audio></template>',
  ],

  invalid: [
    // === Upstream parity — missing track entirely ===
    {
      code: '<template><audio /></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
    {
      code: '<template><video /></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
    // jsx-a11y/vue-a11y: `<audio>Foo</audio>` invalid — text content is NOT a
    // substitute for a <track> child. We agree.
    {
      code: '<template><audio>Foo</audio></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
    {
      code: '<template><video>Foo</video></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },

    // === Upstream parity — track with wrong kind ===
    // jsx-a11y: `<audio><track /></audio>` invalid (no kind attr).
    // vue-a11y: same.
    {
      code: '<template><audio><track /></audio></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
    {
      code: '<template><audio><track kind="subtitles" /></audio></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },

    // === Upstream parity — muted=false overrides exemption ===
    // jsx-a11y: `<Audio muted={false} />` invalid.
    // vue-a11y: `<VAudio muted='false' />` invalid.
    // Ours: `muted="false"` (string) and `muted=false` (unquoted → text "false")
    // are both flagged.
    {
      code: '<template><audio muted="false"></audio></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },

    // === DIVERGENCE — case-sensitive kind="captions" match ===
    // jsx-a11y: accepts `<audio><track kind="Captions" /></audio>` (case-
    // insensitive match on "captions"). vue-a11y: same (.toLowerCase()).
    // Ours: strict equality with "captions" (lowercase). We flag "Captions".
    // Minor false positive; matches ember-template-lint upstream behavior.
    {
      code: '<template><audio><track kind="Captions" /></audio></template>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:media-has-caption (hbs)', rule, {
  valid: [
    '<audio><track kind="captions" /></audio>',
    '<video><track kind="captions" /></video>',
    '<video muted></video>',
    '<audio muted="true"></audio>',
    '<audio muted={{this.muted}}></audio>',
  ],
  invalid: [
    {
      code: '<audio />',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
    {
      code: '<audio><track kind="subtitles" /></audio>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
    {
      code: '<audio muted="false"></audio>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
    // DIVERGENCE — case-sensitive (see gts section)
    {
      code: '<audio><track kind="Captions" /></audio>',
      output: null,
      errors: [{ messageId: 'missingTrack' }],
    },
  ],
});
