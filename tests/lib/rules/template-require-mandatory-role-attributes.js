const rule = require('../../../lib/rules/template-require-mandatory-role-attributes');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-require-mandatory-role-attributes', rule, {
  valid: [
    '<template><div /></template>',
    '<template><div aria-disabled="true" /></template>',
    '<template><div role="complementary" /></template>',
    '<template><div role="combobox" aria-expanded="false" aria-controls="ctrlId" /></template>',
    '<template><div role="option" aria-selected={{false}} /></template>',
    '<template><FakeComponent /></template>',
    '<template><FakeComponent role="fakerole" /></template>',
    '<template><CustomComponent role="checkbox" aria-checked="false" /></template>',
    '<template><SomeComponent role={{this.role}} aria-notreal="bar" /></template>',
    '<template><OtherComponent @role={{@role}} aria-required={{this.required}} /></template>',
    '<template><FakeElement aria-disabled="true" /></template>',
    '<template>{{some-component}}</template>',
    '<template>{{some-component foo="true"}}</template>',
    '<template>{{some-component role="heading" aria-level="2"}}</template>',
    '<template>{{foo-component role="button"}}</template>',
    '<template>{{foo-component role="unknown"}}</template>',
    '<template>{{foo-component role=role}}</template>',

    // Semantic inputs supply aria-checked natively; the role is satisfied
    // without an explicit aria-checked attribute. Documented accessible
    // patterns: https://www.w3.org/WAI/ARIA/apg/patterns/switch/#keyboardinteraction
    '<template><input type="checkbox" role="switch" /></template>',
    '<template><input type="checkbox" role="menuitemcheckbox" /></template>',
    '<template><input type="radio" role="menuitemradio" /></template>',
    '<template><input type="radio" role="radio" /></template>',
    '<template><input type="checkbox" role="checkbox" /></template>',

    // HTML `type` is ASCII case-insensitive; `Checkbox` must match `checkbox`.
    '<template><input type="Checkbox" role="switch" /></template>',
  ],

  invalid: [
    {
      code: '<template><div role="combobox" aria-controls="someId" /></template>',
      output: null,
      errors: [
        {
          message: 'The attribute aria-expanded is required by the role combobox',
        },
      ],
    },
    {
      code: '<template><div role="option"  /></template>',
      output: null,
      errors: [{ message: 'The attribute aria-selected is required by the role option' }],
    },
    {
      code: '<template><CustomComponent role="checkbox" aria-required="true" /></template>',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role checkbox' }],
    },
    {
      code: '<template><SomeComponent role="scrollbar" @aria-now={{this.valuenow}} aria-controls={{some-id}} /></template>',
      output: null,
      errors: [
        {
          message: 'The attribute aria-valuenow is required by the role scrollbar',
        },
      ],
    },
    {
      code: '<template>{{some-component role="heading"}}</template>',
      output: null,
      errors: [{ message: 'The attribute aria-level is required by the role heading' }],
    },
    {
      code: '<template>{{foo role="slider"}}</template>',
      output: null,
      errors: [
        {
          message: 'The attribute aria-valuenow is required by the role slider',
        },
      ],
    },
    {
      code: '<template>{{foo role="checkbox"}}</template>',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role checkbox' }],
    },

    // Undocumented {input type, role} pairings are NOT exempted.
    {
      code: '<template><input type="checkbox" role="radio" /></template>',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role radio' }],
    },
    {
      code: '<template><input type="radio" role="switch" /></template>',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role switch' }],
    },
    {
      code: '<template><input type="radio" role="checkbox" /></template>',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role checkbox' }],
    },
    {
      code: '<template><input type="text" role="switch" /></template>',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role switch' }],
    },
    {
      // No `type` attribute; defaults to text.
      code: '<template><input role="switch" /></template>',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role switch' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

hbsRuleTester.run('template-require-mandatory-role-attributes', rule, {
  valid: [
    '<div />',
    '<div aria-disabled="true" />',
    '<div role="complementary" />',
    '<div role="combobox" aria-expanded="false" aria-controls="ctrlId" />',
    '<div role="option" aria-selected={{false}} />',
    '<FakeComponent />',
    '<FakeComponent role="fakerole" />',
    '<CustomComponent role="checkbox" aria-checked="false" />',
    '<SomeComponent role={{this.role}} aria-notreal="bar" />',
    '<OtherComponent @role={{@role}} aria-required={{this.required}} />',
    '<FakeElement aria-disabled="true" />',
    '{{some-component}}',
    '{{some-component foo="true"}}',
    '{{some-component role="heading" aria-level="2"}}',
    '{{foo-component role="button"}}',
    '{{foo-component role="unknown"}}',
    '{{foo-component role=role}}',

    // Semantic inputs supply aria-checked natively.
    '<input type="checkbox" role="switch" />',
    '<input type="checkbox" role="menuitemcheckbox" />',
    '<input type="radio" role="menuitemradio" />',
    '<input type="radio" role="radio" />',
    '<input type="checkbox" role="checkbox" />',

    // HTML `type` is ASCII case-insensitive; `Checkbox` must match `checkbox`.
    '<input type="Checkbox" role="switch" />',
  ],
  invalid: [
    {
      code: '<div role="combobox" aria-controls="someId" />',
      output: null,
      errors: [{ message: 'The attribute aria-expanded is required by the role combobox' }],
    },
    {
      code: '<div role="option"  />',
      output: null,
      errors: [{ message: 'The attribute aria-selected is required by the role option' }],
    },
    {
      code: '<CustomComponent role="checkbox" aria-required="true" />',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role checkbox' }],
    },
    {
      code: '<SomeComponent role="scrollbar" @aria-now={{this.valuenow}} aria-controls={{some-id}} />',
      output: null,
      errors: [{ message: 'The attribute aria-valuenow is required by the role scrollbar' }],
    },
    {
      code: '{{some-component role="heading"}}',
      output: null,
      errors: [{ message: 'The attribute aria-level is required by the role heading' }],
    },
    {
      code: '{{foo role="slider"}}',
      output: null,
      errors: [
        {
          message: 'The attribute aria-valuenow is required by the role slider',
        },
      ],
    },
    {
      code: '{{foo role="checkbox"}}',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role checkbox' }],
    },

    // Undocumented {input type, role} pairings are NOT exempted.
    {
      code: '<input type="checkbox" role="radio" />',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role radio' }],
    },
    {
      code: '<input type="radio" role="switch" />',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role switch' }],
    },
    {
      code: '<input type="radio" role="checkbox" />',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role checkbox' }],
    },
    {
      code: '<input type="text" role="switch" />',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role switch' }],
    },
    {
      // No `type` attribute; defaults to text.
      code: '<input role="switch" />',
      output: null,
      errors: [{ message: 'The attribute aria-checked is required by the role switch' }],
    },
  ],
});
