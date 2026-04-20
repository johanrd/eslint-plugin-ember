// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-require-input-label` against several
// peer rules that together cover the same concept:
//   - jsx-a11y/label-has-associated-control (label → control perspective)
//   - jsx-a11y/control-has-associated-label (control → label perspective)
//   - jsx-a11y/label-has-for (deprecated, similar to label-has-associated-control)
//   - vuejs-accessibility/form-control-has-label
//   - vuejs-accessibility/label-has-for
//   - angular-eslint/label-has-associated-control
//
// SCOPE NOTE: our single rule fires on the CONTROL (input/textarea/select and
// the ember <Input>/<Textarea> built-ins). It does NOT fire on <label> tags
// missing text or missing controls — jsx-a11y's `label-has-associated-control`
// covers that, and we have no equivalent. This file translates the CORE
// shared semantic ("a form control must have an associated label") from the
// control-perspective subset of these peer rules.
//
// These tests are NOT part of the main suite. Each divergence from an upstream
// plugin is annotated as "DIVERGENCE —". The file encodes OUR CURRENT behavior.
//
// Source files:
//   - context/eslint-plugin-jsx-a11y-main/__tests__/src/rules/label-has-associated-control-test.js
//   - context/eslint-plugin-jsx-a11y-main/__tests__/src/rules/control-has-associated-label-test.js
//   - context/eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/form-control-has-label.test.ts
//   - context/eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/label-has-for.test.ts
//   - context/angular-eslint-main/packages/eslint-plugin-template/tests/rules/label-has-associated-control/cases.ts

'use strict';

const rule = require('../../../lib/rules/template-require-input-label');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:label-form-association (gts)', rule, {
  valid: [
    // === Upstream parity (valid in jsx-a11y + vue-a11y + ours) ===
    // Label wraps control — `<label>text<input /></label>`.
    '<template><label>A label<input /></label></template>',
    '<template><label>A label<textarea /></label></template>',
    '<template><label>A label<select></select></label></template>',
    // Nested under a wrapper inside a label (our rule walks the elementStack
    // and finds the label ancestor).
    '<template><label>Label Text<div><input /></div></label></template>',

    // Control has id — jsx-a11y's label-has-associated-control with
    // assert="htmlFor" would want the label to have `for=id`. Our rule is
    // permissive: ANY `id` on the control is accepted (we assume a matching
    // label exists elsewhere). This mirrors vue-a11y's form-control-has-label
    // `hasIdForLabelElement` approach.
    '<template><input id="probablyHasLabel" /></template>',
    '<template><textarea id="probablyHasLabel" /></template>',
    '<template><select id="probablyHasLabel"></select></template>',

    // aria-label / aria-labelledby on control — valid in all.
    '<template><input aria-label={{labelText}} /></template>',
    '<template><input aria-labelledby="someIdValue" /></template>',
    '<template><textarea aria-label={{labelText}} /></template>',

    // input type="hidden" is exempt — all plugins agree.
    '<template><input type="hidden" /></template>',

    // input type="button" in jsx-a11y's `control-has-associated-label` is a
    // control that needs a label, same in ours (if rendered as <input>).
    // But jsx-a11y's form-control-has-label in vue-a11y exempts
    // types ["hidden", "button", "image", "submit", "reset"]. WE DO NOT
    // exempt these types — see DIVERGENCE below in invalid.

    // Non-form element — rule doesn't fire.
    '<template><div></div></template>',

    // === DIVERGENCE — `<input type="button">` / "submit" / "reset" ===
    // vue-a11y form-control-has-label: VALID (exempts button/submit/reset/image).
    // jsx-a11y control-has-associated-label: would require label unless the
    //   input has a label. input[type=submit|button|reset] generally have an
    //   accessible name from `value` attribute, which jsx-a11y recognizes.
    // Our rule: INVALID unless id/aria-label/aria-labelledby/wrapping <label>.
    //   The `type` attribute value does not exempt the control. Divergence;
    //   captured below in invalid section.

    // === Ember-specific additions (not in peer plugins) ===
    // <Input>/<Textarea> as Ember built-ins. In HBS these are the classic
    // built-ins; in strict mode (.gjs/.gts), only flagged if imported from
    // `@ember/component`. Ember-specific, no peer parity claim.
    '<template><Input id="foo" /></template>', // HBS-style: treated as user
    '<template>{{input id="foo"}}</template>', // HBS-only helper

    // ...attributes — we skip (can't determine labelling). No peer analogue
    // since JSX spread is handled per-plugin; jsx-a11y also typically skips.
    '<template><input ...attributes /></template>',
  ],

  invalid: [
    // === Upstream parity (invalid in jsx-a11y + vue-a11y + ours) ===
    {
      code: '<template><input /></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    {
      code: '<template><textarea /></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    {
      code: '<template><select></select></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    // Control inside a non-label wrapper — parity INVALID.
    {
      code: '<template><div><input /></div></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    // Control with only `title` — parity INVALID (title is not an accessible
    // label per jsx-a11y's `mayHaveAccessibleLabel` rules).
    {
      code: '<template><input title="some title value" /></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    // Empty label wrapping input with no text — jsx-a11y INVALID
    // (accessibleLabel error). Ours: INVALID (requireLabel — label has no
    //   text children, so we don't count it as a "valid" label).
    {
      code: '<template><label><input></label></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },

    // === DIVERGENCE — input[type=button|submit|reset|image] with no other label ===
    // vue-a11y form-control-has-label: VALID — these types are exempted.
    // Our rule: INVALID — type exemption is only for "hidden".
    // Potential false positive: submit/reset typically have a `value` attr
    // that provides their accessible name, but we don't check that.
    {
      code: '<template><input type="button" /></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    {
      code: '<template><input type="submit" value="Save" /></template>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },

    // === DIVERGENCE — multiple labels (we flag, peers usually do not) ===
    // jsx-a11y / vue-a11y: MULTIPLE labels is not generally flagged; their
    //   rules check "has SOME label". Our rule: MULTIPLE_LABELS is flagged
    //   when two or more of {wrapping-label, id, aria-label, aria-labelledby}
    //   are present. Stricter; intentional. Captured below.
    {
      code: '<template><input aria-label="first" aria-labelledby="second"></template>',
      output: null,
      errors: [{ messageId: 'multipleLabels' }],
    },
    {
      code: '<template><input id="label-input" aria-label="second"></template>',
      output: null,
      errors: [{ messageId: 'multipleLabels' }],
    },
    {
      code: '<template><label>Input label<input aria-label="Custom"></label></template>',
      output: null,
      errors: [{ messageId: 'multipleLabels' }],
    },

    // === DIVERGENCE — jsx-a11y's accessibleLabel wrapping with no text ===
    // jsx-a11y: `<label htmlFor="js_id" />` is INVALID (no text).
    // Our rule: N/A — we don't lint from the <label> perspective. Scope diff.
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:label-form-association (hbs)', rule, {
  valid: [
    // Label wraps control.
    '<label>LabelText<input /></label>',
    '<label>LabelText<textarea /></label>',
    '<label>LabelText<select></select></label>',
    '<label>Label Text<div><input /></div></label>',

    // id / aria-* provide labelling.
    '<input id="probablyHasLabel" />',
    '<input aria-label={{labelText}} />',
    '<input aria-labelledby="someIdValue" />',

    // hidden is exempt.
    '<input type="hidden" />',

    // Ember built-ins with label.
    '<Input id="foo" />',
    '{{input id="foo"}}',

    // Non-form.
    '<div></div>',
  ],
  invalid: [
    // Parity: unlabeled control.
    {
      code: '<input />',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    {
      code: '<textarea />',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },
    {
      code: '<select></select>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },

    // Parity: control under non-label wrapper.
    {
      code: '<div><input /></div>',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },

    // DIVERGENCE: `<input type="submit">` etc flagged by us, not by vue-a11y.
    {
      code: '<input type="submit" value="Go" />',
      output: null,
      errors: [{ messageId: 'requireLabel' }],
    },

    // DIVERGENCE: multiple labels (ours stricter).
    {
      code: '<input aria-label="first" aria-labelledby="second">',
      output: null,
      errors: [{ messageId: 'multipleLabels' }],
    },
  ],
});
