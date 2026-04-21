'use strict';

const rule = require('../../../lib/rules/template-click-events-have-key-events');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-click-events-have-key-events', rule, {
  valid: [
    // Non-interactive elements without click handlers — rule doesn't fire.
    '<template><div></div></template>',
    '<template><div class="foo">text</div></template>',

    // Inherently-interactive elements — keyboard is already built in.
    '<template><button {{on "click" this.toggle}}>Toggle</button></template>',
    '<template><a href="/x" {{on "click" this.track}}>Link</a></template>',
    '<template><input type="checkbox" {{on "click" this.toggle}} /></template>',
    '<template><summary {{on "click" this.noop}}>More</summary></template>',

    // Hidden from AT.
    '<template><div aria-hidden="true" {{on "click" this.noop}}></div></template>',
    '<template><div aria-hidden {{on "click" this.noop}}></div></template>',
    '<template><div hidden {{on "click" this.noop}}></div></template>',

    // Presentation role — content has no semantics for AT.
    '<template><div role="presentation" {{on "click" this.noop}}></div></template>',
    '<template><div role="none" {{on "click" this.noop}}></div></template>',

    // Click + a keyboard listener → valid.
    '<template><div {{on "click" this.onClick}} {{on "keydown" this.onKey}}></div></template>',
    '<template><div {{on "click" this.onClick}} {{on "keyup" this.onKey}}></div></template>',
    '<template><div {{on "click" this.onClick}} {{on "keypress" this.onKey}}></div></template>',

    // Components (non-DOM tags) — rule skips.
    '<template><CustomButton {{on "click" this.onClick}} /></template>',
    '<template><Foo::Bar {{on "click" this.onClick}} /></template>',

    // Custom elements with a hyphen are not in aria-query's dom — rule skips.
    '<template><my-widget {{on "click" this.onClick}}></my-widget></template>',
  ],
  invalid: [
    {
      code: '<template><div {{on "click" this.onClick}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><span {{on "click" this.onClick}}>text</span></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // <a> without href is not interactive (and dom.has("a") is true).
    {
      code: '<template><a {{on "click" this.onClick}}>Not a link</a></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // aria-hidden="false" is not truthy — rule still fires.
    {
      code: '<template><div aria-hidden="false" {{on "click" this.onClick}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // Presentation on a focusable widget isn't a valid exemption — but the rule
    // intentionally only checks role=presentation/none, not the focusable state.
    // The separate `no-role-presentation-on-focusable` rule handles that case.
    //
    // A mouseover-only handler doesn't satisfy the keyboard requirement.
    {
      code: '<template><div {{on "click" this.onClick}} {{on "mouseover" this.onHover}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-click-events-have-key-events', rule, {
  valid: [
    '<div></div>',
    '<button {{on "click" this.toggle}}>Toggle</button>',
    '<a href="/x" {{on "click" this.track}}>Link</a>',
    '<div role="presentation" {{on "click" this.noop}}></div>',
    '<div aria-hidden="true" {{on "click" this.noop}}></div>',
    '<div {{on "click" this.onClick}} {{on "keydown" this.onKey}}></div>',
    '<CustomButton {{on "click" this.onClick}} />',
  ],
  invalid: [
    {
      code: '<div {{on "click" this.onClick}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<a {{on "click" this.onClick}}>Not a link</a>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
  ],
});
