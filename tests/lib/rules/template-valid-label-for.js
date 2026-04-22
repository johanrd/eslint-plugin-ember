const rule = require('../../../lib/rules/template-valid-label-for');
const RuleTester = require('eslint').RuleTester;

const errNotLabelable = (id) =>
  `\`<label for="${id}">\` must reference a labelable form control (\`<input>\`, \`<select>\`, \`<textarea>\`, \`<button>\`, \`<meter>\`, \`<output>\`, \`<progress>\`)`;
const errRedundant = (id) =>
  `\`for="${id}"\` is redundant: \`<label>\` already contains the referenced element`;

const validHbs = [
  // Target labelable, not nested.
  '<label for="x">Name</label><input id="x" />',
  '<label for="c">Country</label><select id="c"><option>NO</option></select>',
  '<label for="t">Text</label><textarea id="t"></textarea>',
  '<label for="b">Button</label><button id="b">Click</button>',
  '<label for="o">Output</label><output id="o"></output>',
  '<label for="m">Meter</label><meter id="m"></meter>',
  '<label for="p">Progress</label><progress id="p"></progress>',
  // No for attribute — outside this rule's scope.
  '<label>Name<input /></label>',
  // Dynamic for — skip.
  '<label for={{this.id}}>Dynamic</label><div id="x"></div>',
  // Dynamic id on target — skip (can't verify).
  '<label for="a">a</label><input id={{this.id}} />',
  // Target not present — skip (partial template).
  '<label for="x">Missing</label>',
  // Target is hidden input — should flag per HTML spec (hidden isn't labelable),
  // but this case is already covered in invalid tests below.
  // Multi-labelable-children: `for` targets a non-first descendant. This is
  // an explicit override of the implicit-containment rule (HTML §4.10.4),
  // not redundant.
  '<label for="second"><input id="first" /><input id="second" /></label>',
  '<label for="pick"><input id="a" /><select id="pick"><option>x</option></select></label>',
];

const invalidHbs = [
  // Target is not a labelable element.
  {
    code: '<label for="x">x</label><div id="x">text</div>',
    errors: [{ message: errNotLabelable('x') }],
  },
  {
    code: '<label for="s">s</label><span id="s">text</span>',
    errors: [{ message: errNotLabelable('s') }],
  },
  // input type="hidden" is not labelable.
  {
    code: '<label for="h">h</label><input type="hidden" id="h" />',
    errors: [{ message: errNotLabelable('h') }],
  },
  // Redundant for — target nested inside label.
  {
    code: '<label for="e">Email <input id="e" /></label>',
    errors: [{ message: errRedundant('e') }],
  },
  {
    code: '<label for="n">Name<br /><input id="n" /></label>',
    errors: [{ message: errRedundant('n') }],
  },
  // Redundant-for with a single labelable descendant — the `for` target IS
  // the implicit first labelable descendant.
  {
    code: '<label for="pw"><span>Password</span><input id="pw" type="password" /></label>',
    errors: [{ message: errRedundant('pw') }],
  },
  // Scope limitation: Ember `<Input>` / `<Textarea>` components are tagged
  // as components, not native HTML, so this rule treats them as not
  // labelable. Authors relying on these must suppress on a case-by-case
  // basis. Documented in the rule doc; captured here so the behavior is
  // locked down and any future change is intentional.
  {
    code: '<label for="email">Email</label><Input id="email" />',
    errors: [{ message: errNotLabelable('email') }],
  },
  {
    code: '<label for="bio">Bio</label><Textarea id="bio" />',
    errors: [{ message: errNotLabelable('bio') }],
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

gjsRuleTester.run('template-valid-label-for', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-valid-label-for', rule, {
  valid: validHbs,
  invalid: invalidHbs,
});
