const rule = require('../../../lib/rules/template-heading-level');
const RuleTester = require('eslint').RuleTester;

const ERR_MULTI_H1 = 'Multiple `<h1>` are not allowed';
const skipped = (expected, actual) =>
  `Heading level can only increase by one: expected \`<h${expected}>\` but got \`<h${actual}>\``;
const initial = (expected, actual) =>
  `Initial heading level must be \`<h${expected}>\` or higher rank but got \`<h${actual}>\``;

const validHbs = [
  // Monotonic +1.
  '<h1>a</h1><h2>b</h2><h3>c</h3>',
  // Decrease then increase by 1.
  '<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2><h3>e</h3>',
  // Single h1, done.
  '<h1>a</h1>',
  // Same level repeats.
  '<h1>a</h1><h2>b</h2><h2>c</h2>',
  // Decrease is fine (to h2 — second h1 would violate allowMultipleH1).
  '<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2>',
  // Non-heading elements don't interfere.
  '<h1>a</h1><p>text</p><h2>b</h2>',
  // Sectioning root: dialog starts fresh.
  '<h1>Outer</h1><dialog><h1>Dialog</h1><h2>Section</h2></dialog>',
  // role=dialog also creates a root.
  '<h1>a</h1><div role="dialog"><h1>Dialog</h1></div>',
  '<h1>a</h1><div role="alertdialog"><h1>Alert</h1></div>',
  // Case variants: ARIA role tokens are case-insensitive per the HTML spec.
  '<h1>a</h1><div role="DIALOG"><h1>Case variant</h1></div>',
  '<h1>a</h1><div role="Dialog"><h1>Case variant</h1></div>',
  // Role-fallback list where an INVALID token precedes `dialog` — the first
  // recognised token is `dialog`, so this IS a sectioning root.
  '<h1>a</h1><div role="foo dialog"><h1>Fallback dialog</h1></div>',
  // No headings at all.
  '<p>no headings</p>',
  // Skipped levels: allowed by default (component-based intermediate
  // headings often live in children the lint can't see).
  '<h1>a</h1><h3>b</h3>',
  '<h1>a</h1><h2>b</h2><h4>c</h4>',
  // Initial rank: allowed by default (layout/parent often supplies <h1>).
  '<h3>Start</h3>',
  '<h4>Deep start</h4><h2>Back up</h2>',
];

const invalidHbs = [
  // Default: only multiple-h1 is flagged.
  {
    code: '<h1>a</h1><h1>b</h1>',
    output: null,
    errors: [{ message: ERR_MULTI_H1 }],
  },
  {
    code: '<h1>a</h1><h1>b</h1><dialog><h1>Dialog</h1></dialog>',
    output: null,
    errors: [{ message: ERR_MULTI_H1 }],
  },
  // `role="presentation dialog"` — `presentation` is a valid role, so the
  // effective role resolved by first-valid-token semantics is `presentation`,
  // NOT `dialog`. The div therefore does NOT create a fresh sectioning root,
  // and its inner <h1> is a sibling to the outer <h1> → multiple-h1 flagged.
  {
    code: '<h1>a</h1><div role="presentation dialog"><h1>Inside</h1></div>',
    output: null,
    errors: [{ message: ERR_MULTI_H1 }],
  },
];

const optionSkippedLevelsStrictInvalid = [
  // With allowSkippedLevels: false the skipped-level check re-activates.
  {
    code: '<h1>a</h1><h3>b</h3>',
    options: [{ allowSkippedLevels: false }],
    output: null,
    errors: [{ message: skipped(2, 3) }],
  },
  {
    code: '<h1>a</h1><h2>b</h2><h4>c</h4>',
    options: [{ allowSkippedLevels: false }],
    output: null,
    errors: [{ message: skipped(3, 4) }],
  },
];

const optionMinH2Valid = [
  { code: '<h2>Start</h2><h3>b</h3>', options: [{ minInitialRank: 'h2' }] },
  {
    code: '<h2>Start</h2><h3>b</h3><h4>c</h4><h2>d</h2>',
    options: [{ minInitialRank: 'h2' }],
  },
  {
    code: '<h1>Still ok (higher than h2)</h1><h2>b</h2>',
    options: [{ minInitialRank: 'h2' }],
  },
];

const optionMinH2Invalid = [
  {
    code: '<h4>too deep</h4>',
    options: [{ minInitialRank: 'h2' }],
    output: null,
    errors: [{ message: initial(2, 4) }],
  },
];

const optionAllowMultipleH1Valid = [
  { code: '<h1>a</h1><h1>b</h1>', options: [{ allowMultipleH1: true }] },
];

const optionAllowSkippedLevelsInvalid = [
  // Default mode (skipped-levels allowed) still flags multiple-h1.
  {
    code: '<h1>a</h1><h3>b</h3><h1>c</h1>',
    output: null,
    errors: [{ message: ERR_MULTI_H1 }],
  },
];

const gjsValid = [
  ...validHbs.map((code) => `<template>${code}</template>`),
  ...optionMinH2Valid.map(({ code, options }) => ({
    code: `<template>${code}</template>`,
    options,
  })),
  ...optionAllowMultipleH1Valid.map(({ code, options }) => ({
    code: `<template>${code}</template>`,
    options,
  })),
];
const gjsInvalid = [
  ...invalidHbs.map(({ code, errors }) => ({
    code: `<template>${code}</template>`,
    output: null,
    errors,
  })),
  ...optionMinH2Invalid.map(({ code, options, errors }) => ({
    code: `<template>${code}</template>`,
    options,
    output: null,
    errors,
  })),
  ...optionAllowSkippedLevelsInvalid.map(({ code, options, errors }) => ({
    code: `<template>${code}</template>`,
    ...(options ? { options } : {}),
    output: null,
    errors,
  })),
  ...optionSkippedLevelsStrictInvalid.map(({ code, options, errors }) => ({
    code: `<template>${code}</template>`,
    options,
    output: null,
    errors,
  })),
];

const gjsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

gjsRuleTester.run('template-heading-level', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-heading-level', rule, {
  valid: [...validHbs, ...optionMinH2Valid, ...optionAllowMultipleH1Valid],
  invalid: [
    ...invalidHbs,
    ...optionMinH2Invalid,
    ...optionAllowSkippedLevelsInvalid,
    ...optionSkippedLevelsStrictInvalid,
  ],
});
