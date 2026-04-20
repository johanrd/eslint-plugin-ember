// Audit fixture — peer-plugin parity for
// `ember/template-no-scope-outside-table-headings`.
// These tests encode the CURRENT behavior of our rule. Each divergence from an
// upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/scope-test.js
//   - eslint-plugin-lit-a11y/tests/lib/rules/scope.js
//   - angular-eslint-main/.../tests/rules/table-scope/cases.ts

'use strict';

const rule = require('../../../lib/rules/template-no-scope-outside-table-headings');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:scope (gts)', rule, {
  valid: [
    // === Upstream parity — baseline ===
    // All plugins: scope on <th> with any valid value → valid.
    '<template><th scope="row">Header</th></template>',
    '<template><th scope="col">Header</th></template>',
    // jsx-a11y: `<th scope />` (boolean) valid. Ours: same.
    '<template><th scope>Header</th></template>',
    // jsx-a11y: `<th scope={foo} />` valid (dynamic). Ours: same.
    '<template><th scope={{foo}}>Header</th></template>',

    // Non-table elements without scope → valid (baseline).
    '<template><div /></template>',
    '<template><div foo /></template>',

    // === Components — not validated ===
    // jsx-a11y: `<Foo scope="bar" />` valid (unknown element, skipped).
    // angular: `<app-row [scope]="row"></app-row>` valid (kebab-case elements
    // that aren't standard DOM are skipped).
    // Ours: we check against `html-tags`; only known HTML elements are
    // validated. PascalCase components, namespaced components, and
    // Handlebars helpers all skip the check.
    '<template><CustomComponent scope /></template>',
    '<template><CustomComponent scope="row" /></template>',
    '<template><CustomComponent scope={{foo}} /></template>',

    // === DIVERGENCE — scope VALUE validation ===
    // lit-a11y: INVALID — `<th scope="column">` (not one of col/row/rowgroup/
    //   colgroup). Ours: VALID — we only check ELEMENT, not value.
    // jsx-a11y: does not validate values either. angular: does not validate
    //   values either. lit-a11y is the outlier here.
    // Our position: intentional — value validation is out of scope for this
    //   rule's name/purpose. A separate rule could handle it.
    '<template><th scope="column">Header</th></template>',
    '<template><th scope="foo">Header</th></template>',

    // === DIVERGENCE — custom elements (kebab-case) ===
    // lit-a11y: VALID for `<foo-bar scope="col">` — kebab-case elements are
    //   treated as custom elements and skipped.
    // angular: VALID for `<app-table scope></app-table>`.
    // Ours: VALID too, because `html-tags` excludes kebab-case customs. So
    // we align with lit-a11y/angular by coincidence of our tag allowlist.
    '<template><foo-bar scope="col"></foo-bar></template>',
  ],

  invalid: [
    // === Upstream parity — scope on non-th HTML element ===
    // jsx-a11y: `<div scope />` invalid.
    // angular: `<div scope></div>` invalid.
    // lit-a11y: `<div scope='col'></div>` invalid.
    // Ours: same, but attaches to GlimmerElementNode (the whole element),
    // whereas jsx-a11y reports on the JSXAttribute node.
    {
      code: '<template><div scope /></template>',
      output: null,
      errors: [{ messageId: 'noScopeOutsideTableHeadings' }],
    },
    {
      code: '<template><td scope="row"></td></template>',
      output: null,
      errors: [{ messageId: 'noScopeOutsideTableHeadings' }],
    },
    {
      code: '<template><td scope></td></template>',
      output: null,
      errors: [{ messageId: 'noScopeOutsideTableHeadings' }],
    },
    {
      code: '<template><a scope="row" /></template>',
      output: null,
      errors: [{ messageId: 'noScopeOutsideTableHeadings' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:scope (hbs)', rule, {
  valid: [
    '<th scope="row">Header</th>',
    '<th scope="col">Header</th>',
    '<th scope>Header</th>',
    '<th scope={{foo}}>Header</th>',
    '<CustomComponent scope="row" />',
    '{{foo-component scope="row"}}',
    // DIVERGENCE — value not validated (see gts section)
    '<th scope="column">Header</th>',
    // Kebab-case customs align with lit-a11y/angular
    '<foo-bar scope="col"></foo-bar>',
  ],
  invalid: [
    {
      code: '<td scope="row"></td>',
      output: null,
      errors: [{ message: 'Unexpected scope attribute on <td>. Use only on <th>.' }],
    },
    {
      code: '<div scope />',
      output: null,
      errors: [{ message: 'Unexpected scope attribute on <div>. Use only on <th>.' }],
    },
    {
      code: '<a scope="row" />',
      output: null,
      errors: [{ message: 'Unexpected scope attribute on <a>. Use only on <th>.' }],
    },
  ],
});
