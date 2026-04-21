'use strict';

const rule = require('../../../lib/rules/template-no-noninteractive-element-to-interactive-role');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-no-noninteractive-element-to-interactive-role', rule, {
  valid: [
    // Non-interactive element with non-interactive role — fine.
    '<template><h1 role="heading" aria-level="1">Title</h1></template>',
    '<template><article role="article">Story</article></template>',
    '<template><ul role="list"></ul></template>',

    // <div>/<span> are "generic" in ARIA 1.2 — axobject-query doesn't list
    // them as non-interactive, so the rule doesn't flag them.
    '<template><div role="button" tabindex="0"></div></template>',
    '<template><span role="checkbox" aria-checked="false" tabindex="0"></span></template>',

    // Interactive element with interactive role — not in scope.
    '<template><button role="menuitem">Item</button></template>',

    // No role → nothing to check.
    '<template><h1>Title</h1></template>',

    // Dynamic role → skipped.
    '<template><h1 role={{this.role}}>Title</h1></template>',

    // Components — rule skips.
    '<template><CustomHeading role="button" /></template>',

    // Unknown role — rule skips.
    '<template><h1 role="fakerole">Title</h1></template>',

    // role="presentation"/"none" on non-interactive element — not flagged by
    // this rule (separate concerns; see template-no-redundant-role etc.).
    '<template><ul role="presentation"></ul></template>',
  ],
  invalid: [
    {
      code: '<template><h1 role="button">Click</h1></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><article role="button">Story</article></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="tab">Tab</li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><img role="link" src="/x.png" alt="link" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><form role="checkbox"></form></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      // <p> has role="paragraph" per HTML-AAM — flagging role="button" is
      // correct. The <p> has no interactive behavior to back the role.
      code: '<template><p role="button">Click me</p></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    // Role-fallback list — picks the first recognised token.
    {
      code: '<template><h1 role="button heading">Click</h1></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-noninteractive-element-to-interactive-role', rule, {
  valid: [
    '<div role="button" tabindex="0"></div>',
    '<h1 role="heading">Title</h1>',
    '<CustomHeading role="button" />',
  ],
  invalid: [
    {
      code: '<h1 role="button">Click</h1>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<article role="tab">Story</article>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});
