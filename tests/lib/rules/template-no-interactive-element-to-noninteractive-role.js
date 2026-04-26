'use strict';

const rule = require('../../../lib/rules/template-no-interactive-element-to-noninteractive-role');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-no-interactive-element-to-noninteractive-role', rule, {
  valid: [
    // Interactive elements with interactive roles — fine.
    '<template><button role="button">Click</button></template>',
    '<template><button role="menuitem">Item</button></template>',
    '<template><a href="/x" role="link">Link</a></template>',
    '<template><input type="checkbox" role="switch" /></template>',

    // Non-interactive elements — not in scope of this rule.
    '<template><div role="article">Story</div></template>',
    '<template><span role="heading">Title</span></template>',

    // No role → nothing to check.
    '<template><button>Click</button></template>',
    '<template><a href="/x">Link</a></template>',

    // Dynamic role → skipped.
    '<template><button role={{this.role}}>Click</button></template>',

    // Components — rule skips (not a DOM element).
    '<template><CustomBtn role="article" /></template>',

    // Scope-bound lowercase tag — `<button>` here is a local binding, so it
    // resolves to a component invocation (not a native interactive element)
    // and the rule must skip it even with a non-interactive role attribute.
    'const button = ButtonComponent;\n<template><button role="article" /></template>',

    // Unknown role — rule skips.
    '<template><button role="fakerole">Click</button></template>',

    // <input type="hidden"> is not interactive — role assignment allowed.
    // HTML type values are ASCII case-insensitive and may carry incidental
    // whitespace; these variants should behave the same as lowercase.
    '<template><input type="hidden" role="presentation" /></template>',
    '<template><input type="HIDDEN" role="presentation" /></template>',
    '<template><input type=" hidden " role="presentation" /></template>',

    // <a> without href is not interactive.
    '<template><a role="heading">Not a link</a></template>',

    // <canvas> is not treated as inherently interactive — authors commonly
    // use it as an accessibility surface with role="img" or role="presentation".
    '<template><canvas role="img">Chart</canvas></template>',
    '<template><canvas role="presentation"></canvas></template>',
    '<template><canvas role="none"></canvas></template>',

    // <video>/<audio> without `controls` render no user-operable UI — treat
    // as non-interactive. Decorative background media is a common pattern.
    '<template><video role="presentation" src="/x.mp4" /></template>',
    '<template><audio role="presentation" src="/x.mp3" /></template>',
    '<template><video role="img" src="/x.mp4" /></template>',
    '<template><audio role="img" src="/x.mp3" /></template>',
  ],
  invalid: [
    {
      code: '<template><button role="heading">Click</button></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><button role="article">Click</button></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><a href="/x" role="banner">Link</a></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><input type="text" role="article" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    // role="presentation" / "none" on an interactive element — removes the
    // interactive semantics. Flagged.
    {
      code: '<template><button role="presentation">Click</button></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><a href="/x" role="none">Link</a></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    // Role-fallback list — picks the first recognised token.
    {
      code: '<template><button role="heading banner">Click</button></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    // HTML attribute values for known enumerated attributes are ASCII
    // case-insensitive per spec and may carry incidental whitespace. A
    // checkbox with `type="CHECKBOX"` / `type=" checkbox "` is still a
    // checkbox and should be flagged the same as lowercase.
    {
      code: '<template><input type="CHECKBOX" role="presentation" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><input type=" checkbox " role="presentation" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    // <video controls> / <audio controls> exposes user-operable playback UI —
    // stripping interactive semantics with a non-interactive role is wrong.
    {
      code: '<template><video controls role="presentation" src="/x.mp4" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><audio controls role="presentation" src="/x.mp3" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-interactive-element-to-noninteractive-role', rule, {
  valid: [
    '<button role="button">Click</button>',
    '<div role="article">Story</div>',
    '<button>Click</button>',
    '<CustomBtn role="article" />',
    '<canvas role="img">Chart</canvas>',
    '<video role="presentation" src="/x.mp4" />',
  ],
  invalid: [
    {
      code: '<button role="heading">Click</button>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<a href="/x" role="banner">Link</a>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<video controls role="presentation" src="/x.mp4" />',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});
