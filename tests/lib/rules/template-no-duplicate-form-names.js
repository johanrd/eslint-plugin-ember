const rule = require('../../../lib/rules/template-no-duplicate-form-names');
const RuleTester = require('eslint').RuleTester;

const err = (name) => `Duplicate form control \`name="${name}"\` within the same form`;

const validHbs = [
  // Single occurrence.
  '<form><input name="email" /></form>',
  '<form><input name="email" /><input name="password" /></form>',
  // Radio group with shared name.
  '<form><input type="radio" name="c" value="r" /><input type="radio" name="c" value="b" /></form>',
  // Submit buttons can share a name.
  '<form><button type="submit" name="a" value="save">S</button><button type="submit" name="a" value="p">P</button></form>',
  '<form><input type="submit" name="act" /><input type="submit" name="act" /></form>',
  // Non-submitting types (button, reset) don't contribute to form data; their
  // `name` is skipped entirely, so any combination is fine.
  '<form><button type="reset" name="r">1</button><button type="reset" name="r">2</button></form>',
  '<form><input type="button" name="x" /><input type="button" name="x" /></form>',
  '<form><input type="button" name="x" /><input type="text" name="x" /></form>',
  '<form><button type="button" name="x">1</button><input type="text" name="x" /></form>',
  '<form><input type="reset" name="x" /><input type="text" name="x" /></form>',
  // Dynamic name — skip.
  '<form><input name={{this.fieldName}} /><input name="email" /></form>',
  // Same name but in different forms — fine.
  '<form><input name="a" /></form><form><input name="a" /></form>',
  // Disabled / hidden ignored.
  '<form><input name="a" /><input name="a" disabled /></form>',
  '<form><input name="a" /><input name="a" hidden /></form>',
  // No name attribute — skip.
  '<form><input /><input /></form>',
  // Empty name — skip.
  '<form><input name="" /><input name="" /></form>',
];

const invalidHbs = [
  {
    code: '<form><input name="email" /><input name="email" /></form>',
    errors: [{ message: err('email') }],
  },
  {
    code: '<form><input name="x" /><textarea name="x"></textarea></form>',
    errors: [{ message: err('x') }],
  },
  {
    code: '<form><input name="x" /><select name="x"><option>a</option></select></form>',
    errors: [{ message: err('x') }],
  },
  // Mixed radio + text type — not compatible.
  {
    code: '<form><input type="radio" name="c" /><input type="text" name="c" /></form>',
    errors: [{ message: err('c') }],
  },
  // Radio + submit (both in shared set but different types) — not compatible.
  {
    code: '<form><input type="radio" name="a" /><input type="submit" name="a" /></form>',
    errors: [{ message: err('a') }],
  },
  // No enclosing form — template root acts as scope.
  {
    code: '<input name="x" /><input name="x" />',
    errors: [{ message: err('x') }],
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

gjsRuleTester.run('template-no-duplicate-form-names', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-duplicate-form-names', rule, {
  valid: validHbs,
  invalid: invalidHbs,
});
