const rule = require('../../../lib/rules/template-require-input-type');
const RuleTester = require('eslint').RuleTester;

const ERROR_MISSING = 'All `<input>` elements should have a `type` attribute';
const errInvalid = (value) => `\`<input type="${value}">\` is not a valid input type`;

const validHbs = [
  '<input type="text" />',
  '<input type="email" />',
  '<input type="checkbox" />',
  '<input type="submit" />',
  '<input type="datetime-local" />',
  '<input type="{{this.inputType}}" />',
  '<input type={{this.inputType}} />',
  '<div />',
  '<div type="foo" />',
  '<MyInput type="unknown" />',
];

const invalidHbs = [
  {
    code: '<input />',
    output: '<input type="text" />',
    errors: [{ message: ERROR_MISSING }],
  },
  {
    code: '<input name="email" />',
    output: '<input type="text" name="email" />',
    errors: [{ message: ERROR_MISSING }],
  },
  {
    code: '<input   name="email"   />',
    output: '<input type="text"   name="email"   />',
    errors: [{ message: ERROR_MISSING }],
  },
  {
    code: '<input type="" />',
    output: '<input type="text" />',
    errors: [{ message: errInvalid('') }],
  },
  {
    code: '<input type="foo" />',
    output: '<input type="text" />',
    errors: [{ message: errInvalid('foo') }],
  },
  {
    code: '<input type="TEXTY" />',
    output: '<input type="text" />',
    errors: [{ message: errInvalid('TEXTY') }],
  },
];

const gjsValid = validHbs.map((code) => `<template>${code}</template>`);
const gjsInvalid = invalidHbs.map(({ code, output, errors }) => ({
  code: `<template>${code}</template>`,
  output: `<template>${output}</template>`,
  errors,
}));

const gjsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

gjsRuleTester.run('template-require-input-type', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-require-input-type', rule, {
  valid: validHbs,
  invalid: invalidHbs,
});
