const rule = require('../../../lib/rules/template-no-autoplay');
const RuleTester = require('eslint').RuleTester;

const ERROR_AUDIO =
  'The `autoplay` attribute is disruptive for users and has accessibility concerns on `<audio>`';
const ERROR_VIDEO =
  'The `autoplay` attribute is disruptive for users and has accessibility concerns on `<video>`';

const validHbs = [
  '<audio src="a.mp3"></audio>',
  '<video src="a.mp4" controls></video>',
  '<div autoplay></div>',
  '<audio autoplay={{this.shouldAutoplay}}></audio>',
  '<video autoplay={{false}}></video>',
  '<audio autoplay={{"false"}}></audio>',
  // PascalCase component — not an HTML element
  '<AutoPlayer autoplay />',
];

const invalidHbs = [
  { code: '<audio autoplay></audio>', errors: [{ message: ERROR_AUDIO }] },
  { code: '<video autoplay></video>', errors: [{ message: ERROR_VIDEO }] },
  { code: '<audio autoplay=""></audio>', errors: [{ message: ERROR_AUDIO }] },
  { code: '<audio autoplay="autoplay"></audio>', errors: [{ message: ERROR_AUDIO }] },
  { code: '<video autoplay={{true}}></video>', errors: [{ message: ERROR_VIDEO }] },
];

const additionalElementsValid = [
  '<audio autoplay={{false}}></audio>',
  '<div></div>',
];

const additionalElementsInvalid = [
  {
    code: '<my-media autoplay></my-media>',
    options: [{ additionalElements: ['my-media'] }],
    errors: [
      {
        message:
          'The `autoplay` attribute is disruptive for users and has accessibility concerns on `<my-media>`',
      },
    ],
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

gjsRuleTester.run('template-no-autoplay', rule, {
  valid: [...gjsValid, ...additionalElementsValid.map((code) => `<template>${code}</template>`)],
  invalid: [
    ...gjsInvalid,
    ...additionalElementsInvalid.map(({ code, options, errors }) => ({
      code: `<template>${code}</template>`,
      options,
      errors,
    })),
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-autoplay', rule, {
  valid: [...validHbs, ...additionalElementsValid],
  invalid: [...invalidHbs, ...additionalElementsInvalid],
});
