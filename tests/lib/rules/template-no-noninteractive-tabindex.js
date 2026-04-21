'use strict';

const rule = require('../../../lib/rules/template-no-noninteractive-tabindex');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-no-noninteractive-tabindex', rule, {
  valid: [
    // No tabindex → rule doesn't fire.
    '<template><div></div></template>',
    '<template><article></article></template>',

    // Interactive native elements.
    '<template><button tabindex="0">Click</button></template>',
    '<template><a href="/x" tabindex="0">Link</a></template>',
    '<template><input tabindex="-1" /></template>',
    '<template><select tabindex="0"></select></template>',

    // Non-interactive element made interactive via role.
    '<template><div role="button" tabindex="0"></div></template>',
    '<template><div role="checkbox" tabindex="0" aria-checked="false"></div></template>',
    '<template><div role="tab" tabindex="0"></div></template>',
    '<template><div role="menuitem" tabindex="-1"></div></template>',

    // Components and custom elements — rule skips.
    '<template><CustomWidget tabindex="0" /></template>',
    '<template><my-widget tabindex="0"></my-widget></template>',

    // Dynamic role — rule conservatively skips.
    '<template><div role={{this.role}} tabindex="0"></div></template>',
  ],
  invalid: [
    {
      code: '<template><div tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<template><span tabindex="-1">text</span></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<template><article tabindex="0">Story</article></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // Non-interactive role doesn't save it.
    {
      code: '<template><div role="article" tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<template><div role="heading" tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // <a> without href isn't interactive.
    {
      code: '<template><a tabindex="0">Not a link</a></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-noninteractive-tabindex', rule, {
  valid: [
    '<div></div>',
    '<button tabindex="0">Click</button>',
    '<div role="button" tabindex="0"></div>',
    '<CustomWidget tabindex="0" />',
  ],
  invalid: [
    {
      code: '<div tabindex="0"></div>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<article tabindex="0"></article>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
  ],
});
