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

    // <area> is in scope — same href semantics as <a>. Valid values pass.
    '<template><map name="m"><area href="/region-a" shape="rect" coords="0,0,10,10" /></map></template>',
    '<template><area href="#section" shape="default" /></template>',
    // Dynamic area href — skip.
    '<template><area href={{this.url}} shape="rect" coords="0,0,1,1" /></template>',

    // Non-scheme URLs that happen to contain `javascript:` are not javascript:
    // URLs — they are relative paths or fragments. The URL parser resolves
    // them against the base URL; no script runs.
    '<template><a href="./javascript:foo">Relative path</a></template>',
    '<template><a href="#javascript:foo">Fragment id</a></template>',
    '<template><a href="/javascript:foo">Absolute path</a></template>',
    '<template><a href="?q=javascript:foo">Query string</a></template>',
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
    // <area> shares <a>'s href semantics — same invalid values flag.
    {
      code: '<template><area href="#" shape="rect" coords="0,0,10,10" /></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<template><area href="" shape="rect" coords="0,0,10,10" /></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<template><area href="javascript:alert(1)" shape="rect" coords="0,0,10,10" /></template>',
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
  valid: ['<a href="/x">Link</a>', '<a href={{this.url}}>Link</a>', '<a>Not a link</a>'],
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
