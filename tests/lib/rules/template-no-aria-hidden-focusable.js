const rule = require('../../../lib/rules/template-no-aria-hidden-focusable');
const RuleTester = require('eslint').RuleTester;

const ERROR_SELF = '`aria-hidden` cannot be used on focusable elements';
const ERROR_DESC =
  '`aria-hidden` on an ancestor hides this focusable element from assistive tech';

const validHbs = [
  // No aria-hidden.
  '<button>Click</button>',
  '<a href="/foo">Link</a>',
  // aria-hidden on non-focusable, no focusable descendants.
  '<div aria-hidden="true"><span>text</span></div>',
  '<div aria-hidden="true">text</div>',
  // aria-hidden="false" — opted out.
  '<button aria-hidden="false">Click</button>',
  '<div aria-hidden={{false}}><button>ok</button></div>',
  // Dynamic aria-hidden — skip.
  '<button aria-hidden={{this.hidden}}>Click</button>',
  '<div aria-hidden={{this.hidden}}><button>ok</button></div>',
  // tabindex=-1 removes focusability.
  '<button aria-hidden="true" tabindex="-1">Hidden</button>',
  '<div aria-hidden="true"><button tabindex="-1">ok</button></div>',
  // input type=hidden not focusable.
  '<div aria-hidden="true"><input type="hidden" value="x" /></div>',
  // a without href not focusable.
  '<div aria-hidden="true"><a>no href</a></div>',
  // audio/video without controls not focusable.
  '<div aria-hidden="true"><video src="x.mp4"></video></div>',
  // contenteditable=false not focusable.
  '<div aria-hidden="true"><p contenteditable="false">static</p></div>',
  // PascalCase component — not inspected (scope caveat).
  '<div aria-hidden="true"><MyComponent /></div>',
];

const invalidHbs = [
  { code: '<button aria-hidden="true">Click</button>', errors: [{ message: ERROR_SELF }] },
  { code: '<button aria-hidden>Click</button>', errors: [{ message: ERROR_SELF }] },
  { code: '<button aria-hidden={{true}}>Click</button>', errors: [{ message: ERROR_SELF }] },
  { code: '<a href="/foo" aria-hidden="true">link</a>', errors: [{ message: ERROR_SELF }] },
  { code: '<input aria-hidden="true" />', errors: [{ message: ERROR_SELF }] },
  { code: '<input type="text" aria-hidden="true" />', errors: [{ message: ERROR_SELF }] },
  {
    code: '<div contenteditable="true" aria-hidden="true">x</div>',
    errors: [{ message: ERROR_SELF }],
  },
  {
    code: '<span tabindex="0" aria-hidden="true">x</span>',
    errors: [{ message: ERROR_SELF }],
  },
  {
    code: '<video controls aria-hidden="true" src="x.mp4"></video>',
    errors: [{ message: ERROR_SELF }],
  },
  {
    code: '<div aria-hidden="true"><button>ok</button></div>',
    errors: [{ message: ERROR_DESC }],
  },
  {
    code: '<div aria-hidden><a href="/profile">Profile</a></div>',
    errors: [{ message: ERROR_DESC }],
  },
  {
    code: '<section aria-hidden="true"><p>text</p><a href="/x">link</a></section>',
    errors: [{ message: ERROR_DESC }],
  },
  {
    code: '<div aria-hidden="true"><select><option>x</option></select></div>',
    errors: [{ message: ERROR_DESC }],
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

gjsRuleTester.run('template-no-aria-hidden-focusable', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-aria-hidden-focusable', rule, {
  valid: validHbs,
  invalid: invalidHbs,
});
