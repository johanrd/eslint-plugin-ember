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

    // <audio>/<video> with `controls` render an interactive UI.
    '<template><audio controls tabindex="0"></audio></template>',
    '<template><video controls tabindex="0"></video></template>',

    // Non-interactive element made interactive via role.
    '<template><div role="button" tabindex="0"></div></template>',
    '<template><div role="checkbox" tabindex="0" aria-checked="false"></div></template>',
    '<template><div role="tab" tabindex="0"></div></template>',
    '<template><div role="menuitem" tabindex="-1"></div></template>',

    // `role="tabpanel"` is in the default allowlist — WAI-ARIA APG Tabs
    // pattern gives panels tabindex="0" when their content isn't itself
    // focusable, so keyboard users can page through panels. jsx-a11y
    // exempts `tabpanel` for the same reason.
    '<template><div role="tabpanel" tabindex="0"></div></template>',
    '<template><section role="tabpanel" tabindex="0" aria-labelledby="tab-1">Content</section></template>',

    // Config: allow additional non-interactive roles.
    {
      code: '<template><div role="region" tabindex="0" aria-label="Scroll area"></div></template>',
      options: [{ roles: ['tabpanel', 'region'] }],
    },
    // Config: narrow the allowlist (drop `tabpanel` default).
    // Default-behavior case above is not affected by this narrower config
    // because user-provided `roles` replaces the default.

    // Components and custom elements — rule skips.
    '<template><CustomWidget tabindex="0" /></template>',
    '<template><my-widget tabindex="0"></my-widget></template>',

    // PascalCase component whose name lowercases to a native tag — rule skips.
    // `isComponentInvocation` classifies the invocation before the dom-map
    // check, so `<Article>` is not validated like the native `<article>` tag.
    '<template><Article tabindex={{0}} /></template>',
    '<template><Article tabindex="0" /></template>',
    '<template><Form tabindex={{0}} /></template>',
    '<template><Section tabindex="0" /></template>',

    // Named-arg, this-path, dot-path, and named-block invocations — rule skips.
    '<template><@heading tabindex="0" /></template>',
    '<template><this.myWidget tabindex="0" /></template>',
    '<template><foo.bar tabindex="0" /></template>',
    '<template><Foo::Bar tabindex="0" /></template>',

    // Dynamic role — rule conservatively skips.
    '<template><div role={{this.role}} tabindex="0"></div></template>',

    // tabindex="-1" is the canonical "focusable but not in tab order" pattern
    // (scroll-to-focus targets, focus restoration, composite-widget children).
    // Matches jsx-a11y's exemption and is consistent with
    // template-require-aria-activedescendant-tabindex.
    '<template><div tabindex="-1"></div></template>',
    '<template><span tabindex="-1">text</span></template>',
    '<template><section tabindex="-1">scroll target</section></template>',
    '<template><div tabindex={{-1}}></div></template>',
    // GlimmerConcatStatement form (quoted-mustache with single number-literal part).
    '<template><div tabindex="{{-1}}"></div></template>',

    // WAI-ARIA 1.2 §4.1 role fallback: unrecognized first token is skipped,
    // the next recognized token applies. `button` is interactive → allowed.
    '<template><div role="foobar button" tabindex="0"></div></template>',
  ],
  invalid: [
    {
      code: '<template><div tabindex="0"></div></template>',
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
    // Config: narrow `roles` allowlist — user-provided empty array overrides
    // the default so `role="tabpanel"` is no longer exempted.
    {
      code: '<template><div role="tabpanel" tabindex="0"></div></template>',
      output: null,
      options: [{ roles: [] }],
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // <a> without href isn't interactive.
    {
      code: '<template><a tabindex="0">Not a link</a></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // <audio>/<video> without `controls` have no interactive UI — still flag.
    {
      code: '<template><audio tabindex="0"></audio></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<template><video tabindex="0"></video></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // WAI-ARIA 1.2 §4.1 role fallback: first recognized token wins.
    // `region` is non-interactive → flagged; `button` (second token) is ignored.
    {
      code: '<template><div role="region button" tabindex="0"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // Mustache-number literal is resolved the same as the string form.
    {
      code: '<template><article tabindex={{0}}></article></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    // Non-integer tabindex strings are invalid per HTML spec, but the attribute
    // is still present with the intent of adding tabindex — flag the misuse.
    {
      code: '<template><div tabindex="0.5"></div></template>',
      output: null,
      errors: [{ messageId: 'noNonInteractiveTabindex' }],
    },
    {
      code: '<template><div tabindex="2abc"></div></template>',
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
