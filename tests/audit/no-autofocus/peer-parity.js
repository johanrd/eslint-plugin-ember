// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-autofocus-attribute` against
// jsx-a11y/no-autofocus, vuejs-accessibility/no-autofocus,
// angular-eslint-template/no-autofocus, lit-a11y/no-autofocus.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-autofocus-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/no-autofocus.test.ts
//   - angular-eslint-main/packages/eslint-plugin-template/tests/rules/no-autofocus/cases.ts
//   - eslint-plugin-lit-a11y/tests/lib/rules/no-autofocus.js
//
// Translation notes:
//   - JSX `autoFocus` (camelCase) maps to HBS `autofocus` (lowercase). HTML
//     attribute names are case-insensitive; the Glimmer parser normalizes to
//     lowercase. All peer invalid cases using `autoFocus` become `autofocus`.
//   - Boolean forms: `<input autofocus>` (valueless), `autofocus="true"`,
//     `autofocus={true}` all map to either bare `autofocus` or `autofocus="..."`
//     in HBS. `autofocus={{true}}` encodes the mustache-valued form.
//   - vue-a11y's `:autofocus='sth'` (v-bind) maps to HBS `autofocus={{sth}}`.
//   - angular's `[attr.autofocus]="true"` / `[autofocus]="true"` bindings are
//     idiomatically HBS `autofocus={{true}}` or `autofocus="true"`.
//   - lit-a11y's `.autofocus=${foo}` (property binding) has no direct HBS
//     equivalent; omitted with a note.
//
// Rule capability audit:
//   - Our rule has NO schema (no options). jsx-a11y and vue-a11y both expose
//     `ignoreNonDOM: true` to skip custom/component tags. Our rule flags
//     autofocus on ANY GlimmerElementNode (including components like <Foo/>).
//   - Angular exempts `<dialog>` and descendants per MDN (dialog autofocus is
//     recommended). Our rule has no dialog exception; we flag unconditionally.
//   - Angular additionally filters to known DOM element names via `toPattern`
//     so custom elements (`<app-foo>`) are not flagged. Our rule flags any
//     element tag carrying the attribute.

'use strict';

const rule = require('../../../lib/rules/template-no-autofocus-attribute');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-autofocus (gts)', rule, {
  valid: [
    // === Upstream parity (valid in all plugins + ours) ===
    // No autofocus attribute present.
    '<template><div /></template>',
    '<template><input type="text" /></template>',
    '<template><input required /></template>',
    '<template><textarea></textarea></template>',
    '<template><button>Click</button></template>',

    // jsx-a11y: VALID — `<Foo bar />` (no autoFocus at all).
    '<template><Foo @bar={{true}} /></template>',

    // jsx-a11y: VALID — `<div autoFocus={false} />` and `<div autoFocus="false" />`.
    // These literally set autofocus=false, which jsx-a11y reads via getPropValue.
    // Our rule flags on PRESENCE, not value. Captured in invalid section below.

    // === DIVERGENCE — jsx-a11y lowercase-only attribute ===
    // jsx-a11y: VALID — `<div autofocus />` and `<input autofocus="true" />`.
    //   jsx-a11y keys on the camelCase JSX prop `autoFocus`; the lowercase
    //   HTML form is a different attribute name in JSX and is not flagged.
    // Ours: INVALID — HBS parses `autofocus` as the real HTML attribute; we
    //   flag it. Captured in invalid section. This is not really a behavioral
    //   divergence in intent — it reflects that HBS has a single lowercase
    //   form while JSX has two forms (camelCase = React prop, lowercase =
    //   DOM attribute passthrough).

    // === DIVERGENCE — angular dialog exception ===
    // angular-eslint: VALID — `<dialog autofocus></dialog>`, also children
    //   like `<dialog><button autofocus>Close</button></dialog>`, per MDN
    //   guidance that autofocus inside dialogs is recommended.
    // Our rule: INVALID (no dialog exception). Captured in invalid section.

    // === DIVERGENCE — angular DOM-only filter ===
    // angular-eslint: VALID — custom elements are not flagged:
    //   `<app-drag-drop autofocus></app-drag-drop>`
    //   `<app-textarea [autofocus]="false"></app-textarea>`
    //   `<button [appautofocus]="false">Click me!</button>` (custom directive
    //     `appautofocus`, not the HTML attribute).
    //   `<textarea autoFocus></textarea>` (camelCase treated as Angular input).
    // Our rule: INVALID for component invocations that carry `autofocus`
    //   (e.g. `<MyInput autofocus />`). Captured in invalid section.

    // === DIVERGENCE — ignoreNonDOM option (jsx-a11y, vue-a11y) ===
    // jsx-a11y: with `{ ignoreNonDOM: true }`, `<Foo autoFocus />` is VALID.
    // vue-a11y: with `{ ignoreNonDOM: true }`, `<Anchor autofocus='autofocus' />`
    //   is VALID.
    // Our rule: has NO schema — cannot configure this behavior. The component
    //   forms are captured as INVALID below.
  ],

  invalid: [
    // === Upstream parity (invalid in all plugins + ours) ===
    //
    // Fixer note: our fix removes preceding whitespace + the attribute node.
    // For valueless attributes (`<div autofocus />`), the Glimmer AST's
    // attribute range appears to extend through the trailing space as well,
    // so the fix output is `<div/>` (no space before `/>`). For valued
    // attributes (`autofocus="true"`, `autofocus={{x}}`), the range ends at
    // the value terminator and the trailing space is preserved (`<div />`).
    // When autofocus sits between two other attributes, the leading space is
    // consumed, leaving the following attribute butted against the preceding
    // token (see the `<input autofocus type="text" />` case further below).
    // All outputs are encoded exactly as the rule produces them today.

    // jsx-a11y: invalid `<div autoFocus />`.
    {
      code: '<template><div autofocus /></template>',
      output: '<template><div/></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // jsx-a11y: invalid `<div autoFocus={true} />`. HBS spelling below.
    {
      code: '<template><div autofocus={{true}} /></template>',
      output: '<template><div /></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // jsx-a11y: invalid `<div autoFocus="true" />`. vue-a11y: same.
    // lit-a11y: invalid `<div autofocus='true'></div>`.
    {
      code: '<template><div autofocus="true"></div></template>',
      output: '<template><div></div></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // jsx-a11y: invalid `<input autoFocus />`.
    {
      code: '<template><input autofocus /></template>',
      output: '<template><input/></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // lit-a11y: invalid `<div autofocus=${foo}></div>` — dynamic value.
    // HBS spelling: autofocus={{this.foo}}.
    {
      code: '<template><div autofocus={{this.foo}}></div></template>',
      output: '<template><div></div></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // angular-eslint: invalid `<button autofocus>Click me!</button>`.
    {
      code: '<template><button autofocus>Click me!</button></template>',
      output: '<template><button>Click me!</button></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // angular-eslint: invalid `<select autofocus></select>` (alongside a
    // valid custom element in the same source). We only reproduce the
    // DOM-element half; the custom-element sibling is captured under the
    // angular DOM-only divergence below.
    {
      code: '<template><select autofocus></select></template>',
      output: '<template><select></select></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // vue-a11y: invalid `<div :autofocus='sth' />` (v-bind). Our dynamic
    // mustache form is the closest equivalent.
    {
      code: '<template><div autofocus={{this.sth}} /></template>',
      output: '<template><div /></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },

    // === DIVERGENCE — jsx-a11y value-aware allow of `false` ===
    // jsx-a11y: VALID — `<div autoFocus={false} />` and `<div autoFocus="false" />`
    //   are allowed because their rule reads the value and exits on falsy.
    // Our rule: INVALID — we flag on attribute presence regardless of value.
    // Captured here as FALSE POSITIVE relative to jsx-a11y.
    {
      code: '<template><div autofocus={{false}} /></template>',
      output: '<template><div /></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // lit-a11y: INVALID — `<div autofocus='false'></div>` is flagged (lit-a11y
    //   is presence-based, same as ours). Parity with lit-a11y, divergence
    //   from jsx-a11y.
    {
      code: '<template><div autofocus="false"></div></template>',
      output: '<template><div></div></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },

    // === DIVERGENCE — angular dialog exception ===
    // angular-eslint: VALID — `<dialog autofocus></dialog>`.
    // Our rule: INVALID. Angular defers to MDN, which explicitly recommends
    // autofocus on (or within) dialog elements. We do not model this.
    {
      code: '<template><dialog autofocus></dialog></template>',
      output: '<template><dialog></dialog></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // angular-eslint: VALID — autofocus on a descendant of dialog.
    // Our rule: INVALID.
    {
      code: '<template><dialog><button autofocus>Close</button></dialog></template>',
      output: '<template><dialog><button>Close</button></dialog></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // angular-eslint: VALID — `<dialog><form><input autofocus type="text"></form></dialog>`.
    // Our rule: INVALID. Note: the fixer eats the leading whitespace before
    // `autofocus`, leaving `<input` butted against `type` — see fixer note
    // at the top of this block.
    {
      code: '<template><dialog><form><input autofocus type="text" /></form></dialog></template>',
      output: '<template><dialog><form><inputtype="text" /></form></dialog></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },

    // === DIVERGENCE — angular DOM-only / custom-element filter ===
    // angular-eslint: VALID — `<app-drag-drop autofocus></app-drag-drop>`
    //   (unknown element name; their rule's selector excludes non-DOM names).
    // Our rule: INVALID — we flag attribute presence on any element tag.
    // Ember components use capitalized tags. Both forms flagged below.
    {
      code: '<template><MyInput autofocus /></template>',
      output: '<template><MyInput/></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },

    // === DIVERGENCE — ignoreNonDOM (jsx-a11y, vue-a11y) ===
    // jsx-a11y (default, no option): INVALID — `<Foo autoFocus />` flagged.
    //   With `{ ignoreNonDOM: true }`: VALID.
    // vue-a11y (default): INVALID — same for `<Anchor autofocus='autofocus' />`.
    //   With `{ ignoreNonDOM: true }`: VALID.
    // Our rule: INVALID always (no option). Parity with default behavior,
    //   divergence when the option is enabled upstream.
    {
      code: '<template><Foo autofocus /></template>',
      output: '<template><Foo/></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    {
      code: "<template><Anchor autofocus='autofocus' /></template>",
      output: '<template><Anchor /></template>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // jsx-a11y: INVALID — `<div autoFocus={undefined} />`. HBS has no literal
    // undefined in templates, but a non-literal mustache is the closest form.
    // Our rule flags any mustache value. Captured in dynamic case above.
  ],
});

// === LIT-A11Y PROPERTY BINDING — not translatable ===
// lit-a11y flags `.autofocus=${foo}` (lit-html property binding) with
// `data: { type: 'property' }`. HBS/Glimmer has no direct property-vs-attribute
// syntactic distinction on elements, so these cases are omitted rather than
// faked. Our rule reports attribute-style only.

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-autofocus (hbs)', rule, {
  valid: [
    '<div></div>',
    '<input type="text" />',
    '<button>Click</button>',
    '<textarea></textarea>',
  ],
  invalid: [
    // Parity — presence on a DOM element.
    {
      code: '<div autofocus></div>',
      output: '<div></div>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    {
      code: '<input autofocus />',
      output: '<input/>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    {
      code: '<button autofocus>Click</button>',
      output: '<button>Click</button>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // String value forms — lit-a11y + vue-a11y parity.
    {
      code: '<div autofocus="true"></div>',
      output: '<div></div>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    {
      code: '<div autofocus="false"></div>',
      output: '<div></div>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    // Dynamic mustache value — parity with lit-a11y's `${foo}` form.
    {
      code: '<div autofocus={{this.foo}}></div>',
      output: '<div></div>',
      errors: [{ messageId: 'noAutofocus' }],
    },

    // DIVERGENCE — dialog exception (angular VALID, ours INVALID).
    {
      code: '<dialog autofocus></dialog>',
      output: '<dialog></dialog>',
      errors: [{ messageId: 'noAutofocus' }],
    },
    {
      code: '<dialog><button autofocus>Close</button></dialog>',
      output: '<dialog><button>Close</button></dialog>',
      errors: [{ messageId: 'noAutofocus' }],
    },

    // DIVERGENCE — component/custom tag (angular + ignoreNonDOM VALID, ours INVALID).
    {
      code: '<MyInput autofocus />',
      output: '<MyInput/>',
      errors: [{ messageId: 'noAutofocus' }],
    },

    // Curly-invocation hash-pair forms — NO PEER EQUIVALENT (HBS-specific).
    // These exercise the GlimmerMustacheStatement branch of our rule, which
    // reports on the HashPair and does NOT autofix (output: null).
    {
      code: '{{input type="text" autofocus=true}}',
      output: null,
      errors: [{ messageId: 'noAutofocus' }],
    },
    {
      code: '{{component "input" type="text" autofocus=true}}',
      output: null,
      errors: [{ messageId: 'noAutofocus' }],
    },
  ],
});
