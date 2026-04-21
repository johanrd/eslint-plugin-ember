'use strict';

const rule = require('../../../lib/rules/template-no-aria-hidden-on-focusable');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-no-aria-hidden-on-focusable', rule, {
  valid: [
    // aria-hidden on non-focusable elements — fine.
    '<template><div aria-hidden="true"></div></template>',
    '<template><span aria-hidden="true">decorative</span></template>',
    '<template><img src="/x.png" alt="" aria-hidden="true" /></template>',

    // Focusable elements without aria-hidden — fine.
    '<template><button>Click me</button></template>',
    '<template><a href="/x">Link</a></template>',
    '<template><input type="text" /></template>',

    // aria-hidden="false" — explicit opt-out. Not flagged.
    '<template><button aria-hidden="false">Click me</button></template>',

    // <input type="hidden"> isn't focusable, so aria-hidden on it is fine.
    '<template><input type="hidden" aria-hidden="true" /></template>',

    // <a> without href isn't focusable by default.
    '<template><a aria-hidden="true">Not a link</a></template>',

    // Components — we don't know if they render a focusable element.
    '<template><CustomBtn aria-hidden="true" /></template>',
  ],
  invalid: [
    // Native interactive elements.
    {
      code: '<template><button aria-hidden="true">Trapped</button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<template><a href="/x" aria-hidden="true">Link</a></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<template><input type="text" aria-hidden="true" /></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<template><select aria-hidden="true"><option /></select></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<template><textarea aria-hidden="true"></textarea></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },

    // Non-interactive element made focusable via tabindex.
    {
      code: '<template><div tabindex="0" aria-hidden="true"></div></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      // tabindex="-1" still makes it programmatically focusable — still flag.
      code: '<template><div tabindex="-1" aria-hidden="true"></div></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },

    // Boolean / valueless / mustache-boolean aria-hidden — all truthy.
    {
      code: '<template><button aria-hidden></button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<template><button aria-hidden=""></button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<template><button aria-hidden={{true}}></button></template>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-aria-hidden-on-focusable', rule, {
  valid: [
    '<div aria-hidden="true"></div>',
    '<button>Click me</button>',
    '<input type="hidden" aria-hidden="true" />',
    '<CustomBtn aria-hidden="true" />',
  ],
  invalid: [
    {
      code: '<button aria-hidden="true">Trapped</button>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
    {
      code: '<div tabindex="0" aria-hidden="true"></div>',
      output: null,
      errors: [{ messageId: 'noAriaHiddenOnFocusable' }],
    },
  ],
});
