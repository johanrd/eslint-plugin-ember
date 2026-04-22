const rule = require('../../../lib/rules/template-valid-input-attributes');
const RuleTester = require('eslint').RuleTester;

const err = (attr, type) => `Attribute \`${attr}\` is not allowed on \`<input type="${type}">\``;

const validHbs = [
  // Attribute matches type.
  '<input type="text" pattern="\\d+" />',
  '<input type="file" accept="image/*" />',
  '<input type="number" min="0" max="100" step="1" />',
  '<input type="image" alt="submit" src="/x.png" />',
  '<input type="email" placeholder="you@ex.com" />',
  '<input type="checkbox" checked required />',
  '<input type="radio" checked required name="r" />',
  '<input type="text" size="20" maxlength="100" readonly />',
  '<input type="email" multiple />',
  '<input type="file" multiple capture="user" />',
  // Dynamic type — skip.
  '<input type={{this.t}} pattern="\\d+" />',
  // No explicit type — skip.
  '<input pattern="\\d+" />',
  // Not an input — rule doesn't apply.
  '<textarea maxlength="10"></textarea>',
];

const invalidHbs = [
  {
    code: '<input type="number" pattern="\\d+" />',
    errors: [{ message: err('pattern', 'number') }],
  },
  {
    code: '<input type="text" accept="image/*" />',
    errors: [{ message: err('accept', 'text') }],
  },
  {
    code: '<input type="radio" maxlength="10" />',
    errors: [{ message: err('maxlength', 'radio') }],
  },
  {
    code: '<input type="checkbox" placeholder="x" />',
    errors: [{ message: err('placeholder', 'checkbox') }],
  },
  {
    code: '<input type="submit" pattern="x" size="5" />',
    errors: [{ message: err('pattern', 'submit') }, { message: err('size', 'submit') }],
  },
  {
    code: '<input type="TEXT" accept="image/*" />',
    errors: [{ message: err('accept', 'text') }],
  },
];

const gjsValid = validHbs.map((code) => `<template>${code}</template>`);
const gjsInvalid = invalidHbs.map(({ code, errors }) => ({
  code: `<template>${code}</template>`,
  errors,
}));

const gjsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

gjsRuleTester.run('template-valid-input-attributes', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-valid-input-attributes', rule, {
  valid: validHbs,
  invalid: invalidHbs,
});
