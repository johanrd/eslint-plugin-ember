const rule = require('../../../lib/rules/template-no-aria-label-misuse');
const RuleTester = require('eslint').RuleTester;

const err = (attr, tag) =>
  `\`${attr}\` cannot be used on \`<${tag}>\` without an interactive role, tabindex, or role attribute`;

const validHbs = [
  // Interactive elements.
  '<button aria-label="Close">x</button>',
  '<select aria-label="c"><option>a</option></select>',
  '<textarea aria-label="t"></textarea>',
  '<input aria-label="i" type="text" />',
  '<a href="/x" aria-label="Go">link</a>',
  '<audio controls aria-label="track"></audio>',
  '<video controls aria-label="clip"></video>',
  // Landmark / allowlist.
  '<main aria-label="Primary"></main>',
  '<nav aria-label="Breadcrumb"></nav>',
  '<section aria-label="About"></section>',
  '<dialog aria-label="Confirm"></dialog>',
  '<form aria-label="Search"></form>',
  '<iframe aria-label="Embed" src="/x"></iframe>',
  '<img aria-label="Image" src="/x.png" alt="" />',
  '<figure aria-label="Illustration"></figure>',
  '<table aria-label="Data"></table>',
  '<td aria-label="Cell"></td>',
  // Role or tabindex.
  '<div role="button" aria-label="Custom">x</div>',
  '<span tabindex="0" aria-label="Focusable">x</span>',
  '<div role="dialog" aria-labelledby="title">x</div>',
  // No aria-label/labelledby at all.
  '<div>plain</div>',
  '<span>text</span>',
  // Empty aria-label — treat as no label.
  '<div aria-label=""></div>',
  // Ember component — skip.
  '<MyButton aria-label="x" />',
  // Labelable <output>, <meter>, <progress>.
  '<output aria-label="r"></output>',
  '<meter aria-label="m"></meter>',
  '<progress aria-label="p"></progress>',
];

const invalidHbs = [
  {
    code: '<div aria-label="dialog">x</div>',
    errors: [{ message: err('aria-label', 'div') }],
  },
  {
    code: '<span aria-labelledby="title">x</span>',
    errors: [{ message: err('aria-labelledby', 'span') }],
  },
  {
    code: '<p aria-label="note">text</p>',
    errors: [{ message: err('aria-label', 'p') }],
  },
  // Link without href is not interactive.
  {
    code: '<a aria-label="missing">x</a>',
    errors: [{ message: err('aria-label', 'a') }],
  },
  // audio/video without controls is not interactive.
  {
    code: '<audio aria-label="silent"></audio>',
    errors: [{ message: err('aria-label', 'audio') }],
  },
  // hidden input is not labelable.
  {
    code: '<input type="hidden" aria-label="x" />',
    errors: [{ message: err('aria-label', 'input') }],
  },
  // Dynamic aria-label on plain div — still flagged.
  {
    code: '<div aria-label={{this.label}}>x</div>',
    errors: [{ message: err('aria-label', 'div') }],
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

gjsRuleTester.run('template-no-aria-label-misuse', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-aria-label-misuse', rule, {
  valid: validHbs,
  invalid: invalidHbs,
});
