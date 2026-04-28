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

    // <header> is deliberately excluded — its role depends on ancestry
    // (`banner` when a direct child of <body>, `generic` otherwise), so the
    // rule can't statically tell whether it's non-interactive. Matches
    // jsx-a11y's `if (tagName === 'header') return false` carve-out.
    '<template><header role="button">Click</header></template>',

    // Components — rule skips.
    '<template><CustomHeading role="button" /></template>',

    // Unknown role — rule skips.
    '<template><h1 role="fakerole">Title</h1></template>',

    // role="presentation"/"none" on non-interactive element — not flagged by
    // this rule (separate concerns; see template-no-redundant-role etc.).
    '<template><ul role="presentation"></ul></template>',

    // ul/ol repurposed as ARIA composite widgets — WAI-ARIA APG patterns.
    '<template><ul role="menu"></ul></template>',
    '<template><ul role="menubar"></ul></template>',
    '<template><ul role="tablist"></ul></template>',
    '<template><ul role="tree"></ul></template>',
    '<template><ol role="menu"></ol></template>',

    // li serving as a widget child role.
    '<template><li role="menuitem"></li></template>',
    '<template><li role="tab"></li></template>',
    '<template><li role="treeitem"></li></template>',

    // table/td promoted to ARIA grid / gridcell.
    '<template><table role="grid"></table></template>',
    '<template><td role="gridcell"></td></template>',

    // fieldset wrapping a radiogroup.
    '<template><fieldset role="radiogroup"></fieldset></template>',

    // PascalCase component whose lowercased name matches a non-interactive
    // HTML tag — correctly skipped by isNativeElement / isComponentInvocation.
    '<template><Article role="button" /></template>',
    '<template><Form role="checkbox" /></template>',
    '<template><Table role="grid" /></template>',
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
      // li role="button" is NOT in the allowed-override set (only widget-child
      // roles like tab/menuitem/treeitem/row are). Button on a list item is wrong.
      code: '<template><li role="button">Click</li></template>',
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

    // HTML-AAM-defined non-interactive tags captured via aria-query's
    // elementRoles (augmenting the axobject-query derivation). See rule
    // source for the two-layer derivation rationale.
    {
      code: '<template><section role="button" aria-label="Aardvark"></section></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><fieldset role="checkbox"></fieldset></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><aside role="tab">Aside</aside></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><hr role="button" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><strong role="menuitem">Bold</strong></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><tbody role="button"></tbody></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    // DIVERGENCE from jsx-a11y: <tr> is treated as conditionally interactive
    // by jsx-a11y (valid when parent context is ambiguous), so <tr role="button">
    // passes jsx-a11y. Our rule lists <tr> as non-interactive and flags.
    {
      code: '<template><tr role="button"></tr></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    // DIVERGENCE from jsx-a11y: we lowercase role tokens before lookup, so
    // uppercase role values are caught. jsx-a11y compares case-sensitively
    // and treats "BUTTON" as an unknown role (no flag).
    {
      code: '<template><h1 role="BUTTON"></h1></template>',
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
