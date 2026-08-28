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
    // <video controls> / <audio controls> — interactive per HTML §3.2.5.2.7.
    '<template><video controls {{on "click" this.h}}></video></template>',
    '<template><audio controls {{on "click" this.h}}></audio></template>',
    // <video controls="{{X}}"> — concat is never falsy at runtime, so the
    // controls UI renders → element is interactive (lib/utils/html-interactive-content
    // resolves controls via classifyAttribute).
    '<template><video controls="{{this.show}}" {{on "click" this.h}}></video></template>',
    '<template><input type="checkbox" {{on "click" this.toggle}} /></template>',
    '<template><input type="text" {{on "click" this.onClick}} /></template>',
    '<template><input {{on "click" this.onClick}} /></template>',
    '<template><select {{on "click" this.onClick}}></select></template>',
    '<template><textarea {{on "click" this.onClick}}></textarea></template>',
    '<template><summary {{on "click" this.noop}}>More</summary></template>',

    // <option>/<datalist> are widget descendants — keyboard activation lives on
    // their host (<select>/<input list>), not on the descendant itself, so the
    // rule explicitly skips them rather than treating them as "keyboard built in".
    '<template><option {{on "click" this.h}}>Foo</option></template>',
    '<template><datalist {{on "click" this.h}}></datalist></template>',

    // Hidden from AT.
    '<template><div aria-hidden="true" {{on "click" this.noop}}></div></template>',
    // Mustache-literal boolean `true` — explicit static opt-out.
    '<template><div aria-hidden={{true}} {{on "click" this.noop}}></div></template>',
    // Mustache string-literal "TRUE" (case-insensitive) — also static opt-out.
    '<template><div aria-hidden={{"TRUE"}} {{on "click" this.noop}}></div></template>',
    // GlimmerConcatStatement form (quoted-mustache with single boolean-literal part).
    '<template><div aria-hidden="{{true}}" {{on "click" this.noop}}></div></template>',
    '<template><div hidden {{on "click" this.noop}}></div></template>',

    // Presentation role — content has no semantics for AT.
    '<template><div role="presentation" {{on "click" this.noop}}></div></template>',
    '<template><div role="none" {{on "click" this.noop}}></div></template>',

    // Click + a keyboard listener → valid.
    '<template><div {{on "click" this.onClick}} {{on "keydown" this.onKey}}></div></template>',
    '<template><div {{on "click" this.onClick}} {{on "keyup" this.onKey}}></div></template>',
    '<template><div {{on "click" this.onClick}} {{on "keypress" this.onKey}}></div></template>',
    // Multiple keyboard listeners alongside click — all fine.
    '<template><div {{on "click" this.onClick}} {{on "keydown" this.a}} {{on "keyup" this.b}}></div></template>',
    // aria-hidden="false" does NOT exempt, but keyboard listener does.
    '<template><div aria-hidden="false" {{on "click" this.a}} {{on "keydown" this.b}}></div></template>',

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
    // <video controls={{false}}> — Glimmer omits the controls attribute at
    // runtime (boolean-attr falsy-coercion via cross-attribute observation),
    // so the element has no controls UI and is NOT interactive content.
    // Adding a click handler without a key handler is the same a11y bug as
    // on a plain <div>. Was a false negative before the helper-level fix in
    // lib/utils/html-interactive-content.js.
    {
      code: '<template><video controls={{false}} {{on "click" this.h}}></video></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><audio controls={{null}} {{on "click" this.h}}></audio></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><span {{on "click" this.onClick}}>text</span></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // Landmark / sectioning elements — not interactive by themselves.
    {
      code: '<template><section {{on "click" this.onClick}}></section></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><main {{on "click" this.onClick}}></main></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><article {{on "click" this.onClick}}></article></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><header {{on "click" this.onClick}}></header></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><footer {{on "click" this.onClick}}></footer></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // <a> without href is not interactive (and dom.has("a") is true).
    {
      code: '<template><a {{on "click" this.onClick}}>Not a link</a></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // <a tabindex="0"> without href is still not interactive.
    {
      code: '<template><a tabindex="0" {{on "click" this.onClick}}></a></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // aria-hidden="false" is not truthy — rule still fires.
    {
      code: '<template><div aria-hidden="false" {{on "click" this.onClick}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // Valueless aria-hidden (bare attribute) is invalid per WAI-ARIA 1.2 — not
    // treated as hiding the element, so the rule still fires.
    {
      code: '<template><div aria-hidden {{on "click" this.onClick}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // Mustache-literal `{{false}}` is explicitly not-hidden.
    {
      code: '<template><div aria-hidden={{false}} {{on "click" this.onClick}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // Dynamic mustache (non-literal) — rule can't prove the element is
    // hidden, so it still fires. Authors who intend aria-hidden as a static
    // escape hatch should use a literal.
    {
      code: '<template><div aria-hidden={{this.maybeHidden}} {{on "click" this.onClick}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // <input type="hidden"> — not interactive per our rule. Peers (jsx-a11y,
    // vue) exempt hidden inputs; we flag because isInteractiveElement returns
    // false for type="hidden" and the element is not aria-hidden.
    {
      code: '<template><input {{on "click" this.onClick}} type="hidden" /></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // role="button" and other widget roles — angular exempts these; our rule
    // does not consult ARIA roles for the interactivity check.
    {
      code: '<template><div {{on "click" this.onClick}} role="button"></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><span {{on "click" this.onClick}} role="button"></span></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
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
    '<input type="text" {{on "click" this.onClick}} />',
    '<select {{on "click" this.onClick}}></select>',
    '<textarea {{on "click" this.onClick}}></textarea>',
    '<option {{on "click" this.h}}>Foo</option>',
    '<datalist {{on "click" this.h}}></datalist>',
    '<div role="presentation" {{on "click" this.noop}}></div>',
    '<div role="none" {{on "click" this.noop}}></div>',
    '<div aria-hidden="true" {{on "click" this.noop}}></div>',
    '<div aria-hidden={{true}} {{on "click" this.noop}}></div>',
    '<div {{on "click" this.onClick}} {{on "keydown" this.onKey}}></div>',
    '<div {{on "click" this.onClick}} {{on "keyup" this.onKey}}></div>',
    '<div {{on "click" this.onClick}} {{on "keypress" this.onKey}}></div>',
    '<CustomButton {{on "click" this.onClick}} />',
    '<custom-button {{on "click" this.onClick}}></custom-button>',
  ],
  invalid: [
    {
      code: '<div {{on "click" this.onClick}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<section {{on "click" this.onClick}}></section>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<a {{on "click" this.onClick}}>Not a link</a>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<div aria-hidden {{on "click" this.onClick}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<div aria-hidden="false" {{on "click" this.onClick}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<div role="button" {{on "click" this.onClick}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
  ],
});
