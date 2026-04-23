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
  // Quoted-mustache (GlimmerConcatStatement) opt-out/unknown forms.
  '<audio autoplay="{{false}}"></audio>',
  '<audio autoplay="{{shouldPlay}}"></audio>',
  // PascalCase component — not an HTML element
  '<AutoPlayer autoplay />',
  // <video muted autoplay> is out of WCAG SC 1.4.2 scope (ACT rule aaa1bf).
  '<video autoplay muted></video>',
  '<video autoplay muted loop playsinline></video>',
  '<video autoplay muted=""></video>',
  '<video autoplay muted="muted"></video>',
  '<video autoplay muted={{true}}></video>',
  // Unknown mustache for `muted` → skip (false positives > false negatives).
  '<video autoplay muted={{this.isMuted}}></video>',
];

const invalidHbs = [
  { code: '<audio autoplay></audio>', errors: [{ message: ERROR_AUDIO }] },
  { code: '<video autoplay></video>', errors: [{ message: ERROR_VIDEO }] },
  { code: '<audio autoplay=""></audio>', errors: [{ message: ERROR_AUDIO }] },
  { code: '<audio autoplay="autoplay"></audio>', errors: [{ message: ERROR_AUDIO }] },
  { code: '<video autoplay={{true}}></video>', errors: [{ message: ERROR_VIDEO }] },
  // muted exception is <video>-only: <audio muted autoplay> is still flagged.
  { code: '<audio autoplay muted></audio>', errors: [{ message: ERROR_AUDIO }] },
  // muted present but statically falsy — autoplay still flagged on <video>.
  { code: '<video autoplay muted={{false}}></video>', errors: [{ message: ERROR_VIDEO }] },
  { code: '<video autoplay muted={{"false"}}></video>', errors: [{ message: ERROR_VIDEO }] },
  // Quoted-mustache concat with a static string-literal part → truthy.
  { code: '<audio autoplay="{{\'true\'}}"></audio>', errors: [{ message: ERROR_AUDIO }] },
];

const additionalElementsValid = ['<audio autoplay={{false}}></audio>', '<div></div>'];

// Opt-in `additionalElements` configured but the element doesn't carry
// autoplay — pins that the option wiring doesn't over-flag on its own.
const additionalElementsOptionValid = [
  { code: '<my-media></my-media>', options: [{ additionalElements: ['my-media'] }] },
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
  valid: [
    ...gjsValid,
    ...additionalElementsValid.map((code) => `<template>${code}</template>`),
    ...additionalElementsOptionValid.map(({ code, options }) => ({
      code: `<template>${code}</template>`,
      options,
    })),
  ],
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
  valid: [...validHbs, ...additionalElementsValid, ...additionalElementsOptionValid],
  invalid: [...invalidHbs, ...additionalElementsInvalid],
});
