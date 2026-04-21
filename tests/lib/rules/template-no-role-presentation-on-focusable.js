'use strict';

const rule = require('../../../lib/rules/template-no-role-presentation-on-focusable');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-no-role-presentation-on-focusable', rule, {
  valid: [
    // Presentation role on non-focusable elements — fine.
    '<template><div role="presentation"></div></template>',
    '<template><span role="none" class="spacer"></span></template>',
    '<template><div role="presentation" aria-hidden="true"></div></template>',

    // Focusable elements without presentation role — fine.
    '<template><button>Click me</button></template>',
    '<template><a href="/x">Link</a></template>',
    '<template><input type="text" /></template>',

    // <input type="hidden"> isn't focusable.
    '<template><input type="hidden" role="presentation" /></template>',

    // <a> without href isn't focusable.
    '<template><a role="presentation">Not a link</a></template>',

    // <audio>/<video> without `controls` aren't focusable — no keyboard UI.
    '<template><video role="presentation"></video></template>',
    '<template><audio role="presentation"></audio></template>',

    // Components — rule skips (isComponentInvocation).
    '<template><CustomBtn role="presentation" /></template>',
    '<template><@slot role="presentation" /></template>',
    '<template><this.widget role="presentation" /></template>',
    '<template><foo.bar role="presentation" /></template>',

    // No role at all.
    '<template><button></button></template>',
  ],
  invalid: [
    {
      code: '<template><button role="presentation">Click</button></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<template><button role="none">Click</button></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<template><a href="/x" role="presentation">Link</a></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<template><input type="text" role="presentation" /></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    // Non-interactive element made focusable via tabindex.
    {
      code: '<template><div tabindex="0" role="presentation"></div></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<template><div tabindex="-1" role="none"></div></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    // <video controls> / <audio controls> — focusable per HTML-AAM / browser
    // reality (keyboard-operable transport controls), so role="presentation"
    // on them is a semantic conflict.
    {
      code: '<template><video controls role="presentation"></video></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<template><audio controls role="none"></audio></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    // <area href> — same conditional-interactive rule as <a href>.
    {
      code: '<template><area href="/x" role="presentation" /></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-role-presentation-on-focusable', rule, {
  valid: [
    '<div role="presentation"></div>',
    '<input type="hidden" role="presentation" />',
    '<CustomBtn role="presentation" />',
    // <video> / <audio> without controls aren't focusable.
    '<video role="presentation"></video>',
  ],
  invalid: [
    {
      code: '<button role="presentation">Click</button>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<div tabindex="0" role="none"></div>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<video controls role="presentation"></video>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
  ],
});
