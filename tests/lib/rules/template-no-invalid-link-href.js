'use strict';

const rule = require('../../../lib/rules/template-no-invalid-link-href');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-no-invalid-link-href', rule, {
  valid: [
    // Valid navigable hrefs.
    '<template><a href="/x">Link</a></template>',
    '<template><a href="https://example.com">Link</a></template>',
    '<template><a href="#section">Link</a></template>',
    '<template><a href="mailto:a@example.com">Email</a></template>',
    '<template><a href="tel:+47123">Phone</a></template>',

    // Dynamic href — rule can't statically validate, skips.
    '<template><a href={{this.url}}>Link</a></template>',
    '<template><a href="{{this.prefix}}/{{this.slug}}">Link</a></template>',

    // No href at all — handled by template-link-href-attributes, not this rule.
    '<template><a>Not a link</a></template>',

    // Non-anchor elements are not in scope.
    '<template><button>Click me</button></template>',
    '<template><div href="#">Not an anchor</div></template>',
  ],
  invalid: [
    // Plain "#" placeholder.
    {
      code: '<template><a href="#">Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<template><a href="#!">Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    // Empty / whitespace href.
    {
      code: '<template><a href="">Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<template><a href="   ">Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<template><a href>Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    // javascript: protocol.
    {
      code: '<template><a href="javascript:void(0)">Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<template><a href="JavaScript:alert(1)">Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    // Leading whitespace — catches obfuscations.
    {
      code: '<template><a href=" javascript:void(0)">Click</a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-invalid-link-href', rule, {
  valid: [
    '<a href="/x">Link</a>',
    '<a href={{this.url}}>Link</a>',
    '<a>Not a link</a>',
  ],
  invalid: [
    {
      code: '<a href="#">Click</a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<a href="javascript:void(0)">Click</a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
  ],
});
