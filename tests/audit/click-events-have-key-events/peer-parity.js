// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-click-events-have-key-events` against
// jsx-a11y/click-events-have-key-events, vuejs-accessibility/click-events-have-key-events,
// angular-eslint template/click-events-have-key-events, and lit-a11y/click-events-have-key-events.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/click-events-have-key-events-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/click-events-have-key-events.test.ts
//   - angular-eslint-main/packages/eslint-plugin-template/tests/rules/click-events-have-key-events/cases.ts
//   - eslint-plugin-lit-a11y/tests/lib/rules/click-events-have-key-events.js
//
// Translation notes:
//   JSX `onClick={fn}` / Vue `@click='fn'` / Angular `(click)="fn()"` / Lit `@click=${fn}`
//     → HBS `{{on "click" this.fn}}` (element modifier, which is what our rule inspects).
//   JSX `onKeyDown`/`onKeyUp`/`onKeyPress` → `{{on "keydown"}}` etc.
//   JSX attribute values like `aria-hidden={true}`, `role={undefined}`, and spread
//     (`{...props}`) have no direct HBS equivalent; those cases are dropped with
//     AUDIT-SKIP notes where they don't translate.

'use strict';

const rule = require('../../../lib/rules/template-click-events-have-key-events');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:click-events-have-key-events (gts)', rule, {
  valid: [
    // === Upstream parity — click paired with a keyboard listener ===
    // jsx-a11y / vue / lit all: valid.
    '<template><div {{on "click" this.onClick}} {{on "keydown" this.onKey}}></div></template>',
    '<template><div {{on "click" this.onClick}} {{on "keyup" this.onKey}}></div></template>',
    '<template><div {{on "click" this.onClick}} {{on "keypress" this.onKey}}></div></template>',
    '<template><div {{on "click" this.onClick}} {{on "keydown" this.a}} {{on "keyup" this.b}}></div></template>',

    // === Upstream parity — no click handler at all ===
    // jsx-a11y: valid (`<div className="foo" />`).
    // vue: valid (`<div class='void 0' />`).
    '<template><div class="foo"></div></template>',

    // === Upstream parity — aria-hidden on clickable element ===
    // jsx-a11y: valid (`aria-hidden`, `aria-hidden={true}`).
    // vue: valid (`aria-hidden`, `aria-hidden='true'`).
    // lit: valid.
    // angular: valid (static `aria-hidden`, `aria-hidden="true"`).
    '<template><div aria-hidden {{on "click" this.onClick}}></div></template>',
    '<template><div aria-hidden="true" {{on "click" this.onClick}}></div></template>',
    // `aria-hidden={{true}}` — HBS analog of jsx-a11y's `aria-hidden={true}`.
    // Our rule treats the mustache-literal boolean as a static opt-out.
    '<template><div aria-hidden={{true}} {{on "click" this.onClick}}></div></template>',

    // aria-hidden=false paired with a keyboard listener → still valid because
    // the keyboard listener is present.
    '<template><div aria-hidden="false" {{on "click" this.a}} {{on "keydown" this.b}}></div></template>',

    // aria-hidden="undefined" with a keyboard listener → valid.
    // jsx-a11y: valid (`aria-hidden={undefined}` + onKeyDown).
    '<template><div {{on "click" this.a}} {{on "keydown" this.b}} aria-hidden="undefined"></div></template>',

    // === Upstream parity — inherently-interactive elements ===
    // jsx-a11y / vue / angular: valid.
    '<template><input type="text" {{on "click" this.onClick}} /></template>',
    '<template><input {{on "click" this.onClick}} /></template>',
    '<template><button {{on "click" this.onClick}} class="foo"></button></template>',
    '<template><select {{on "click" this.onClick}} class="foo"></select></template>',
    '<template><textarea {{on "click" this.onClick}} class="foo"></textarea></template>',
    // <option> / <datalist> are interactive per aria-query elementRoles
    // (map to `option` and `listbox` widget roles respectively).
    // jsx-a11y / vue: valid.
    '<template><option {{on "click" this.onClick}} class="foo"></option></template>',
    '<template><datalist {{on "click" this.onClick}}></datalist></template>',

    // <a> becomes interactive when it has href.
    // jsx-a11y / vue / angular / lit: valid.
    '<template><a {{on "click" this.onClick}} href="http://x.y.z"></a></template>',
    '<template><a {{on "click" this.onClick}} href="http://x.y.z" tabindex="0"></a></template>',

    // <input type="hidden"> is not considered interactive by our rule, but
    // hidden inputs are also not visible — jsx-a11y / vue exempt them.
    // Our rule returns early from `isInteractiveElement` for `type="hidden"`
    // but then still flags the click handler. See DIVERGENCE block below.

    // Presentation role disables the check.
    '<template><div {{on "click" this.onClick}} role="presentation"></div></template>',
    '<template><div {{on "click" this.onClick}} role="none"></div></template>',

    // === Upstream parity — components / non-DOM tags ===
    // jsx-a11y: valid (`<TestComponent />`, `<Button />`, `<Footer />`).
    // vue: valid (`<TestComponent>`, `<Button>`).
    // angular: valid (custom elements like `<cui-button>`).
    // lit: valid when `allowCustomElements` / `allowList` set (see DIVERGENCE).
    // Our rule: custom-element tags aren't in aria-query's `dom`, so we skip.
    '<template><TestComponent {{on "click" this.onClick}} /></template>',
    '<template><Button {{on "click" this.onClick}} /></template>',
    '<template><Footer {{on "click" this.onClick}} /></template>',
    '<template><cui-button {{on "click" this.onClick}}></cui-button></template>',

    // === Upstream parity — `<div role="button">` etc. ===
    // angular: valid (click handler on a widget-role element is considered
    // opt-in-interactive and not flagged by their rule).
    // jsx-a11y does not include equivalent tests here, but by aria-query
    // `isInteractiveRole` the same behavior applies.
    // Our rule: does NOT check ARIA roles for the interactive check — it only
    // looks at native HTML interactivity. So `<div role="button" {{on "click"}}>`
    // would be flagged by us. Captured below in DIVERGENCE.

    // === DIVERGENCE — `<input type="hidden">` treated as valid by peers ===
    // jsx-a11y / vue: valid.
    // Our rule: `isInteractiveElement` returns false for `type="hidden"`, and
    // the element is not aria-hidden either, so we FLAG. FALSE POSITIVE.
    // See invalid block below.

    // === DIVERGENCE — `role="button"` (widget role) treated as interactive by angular ===
    // angular: valid (div/span/p with role="button" is treated as interactive).
    // Our rule: ignores role for the interactive check, so we FLAG. FALSE POSITIVE.
    // See invalid block below.

    // === DIVERGENCE — `aria-hidden="undefined"` alone (no keyboard listener) ===
    // jsx-a11y treats the literal `aria-hidden={undefined}` as aria-hidden
    // being effectively unset (test pairs it with onKeyDown so it's not a
    // standalone case there). Our rule reads the literal string "undefined",
    // which is neither empty, `"true"`, nor the boolean-attribute sentinel —
    // so we consider aria-hidden to be FALSY and still flag the click.
    // This diverges from jsx-a11y's runtime-semantics interpretation.
    // (No dedicated peer-valid case flips purely on this; captured as a note.)
  ],

  invalid: [
    // === Upstream parity — lone click on non-interactive element ===
    // jsx-a11y / vue / angular / lit: all flag.
    {
      code: '<template><div {{on "click" this.onClick}}></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
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

    // aria-hidden="false" without a keyboard listener → flagged.
    // jsx-a11y / vue / angular: all flag.
    {
      code: '<template><div {{on "click" this.onClick}} aria-hidden="false"></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },

    // <a> without href is not interactive → flagged.
    // jsx-a11y / vue / angular / lit: all flag.
    {
      code: '<template><a {{on "click" this.onClick}}></a></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // <a tabindex="0"> without href is still not interactive → flagged.
    // jsx-a11y / vue: both flag.
    {
      code: '<template><a tabindex="0" {{on "click" this.onClick}}></a></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },

    // Non-presentation role (e.g. role="header", role="aside") — angular flags.
    // Our rule: flags (only role=presentation|none exempts).
    {
      code: '<template><div {{on "click" this.onClick}} role="header"></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<template><div {{on "click" this.onClick}} role="aside"></div></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },

    // === DIVERGENCE — <input type="hidden"> flagged (peers treat as valid) ===
    // jsx-a11y / vue: VALID (hidden inputs don't need keyboard support).
    // Our rule: `isInteractiveElement` short-circuits to false for type=hidden,
    // then the element is not aria-hidden, so we FLAG.
    {
      code: '<template><input {{on "click" this.onClick}} type="hidden" /></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },

    // === DIVERGENCE — widget role treated as interactive by angular ===
    // angular: VALID (`<div role="button" (click)>`, `<span role="button">`,
    // `<p role="button">`). Our rule: INVALID — role is not consulted for
    // interactivity. FALSE POSITIVE.
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
    {
      code: '<template><p {{on "click" this.onClick}} role="button"></p></template>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },

    // === DIVERGENCE — key pseudo-events (Angular `(keyup.enter)`) ===
    // angular: VALID — `<div (click)="..." (keyup.enter)="...">`.
    // In HBS there's no pseudo-event syntax on `{{on}}`; the equivalent would
    // be a bare `{{on "keyup" this.fn}}` (checked manually for Enter inside fn).
    // That case is already in the `valid` block. No separate invalid case.
  ],
});

// AUDIT-SKIP (no HBS analog):
//   - jsx-a11y `<div onClick role={undefined} />` — JSX allows `{undefined}` as
//     an attribute value; HBS treats `role={{undefined}}` as a dynamic mustache
//     expression with different semantics. Cannot be translated directly.
//   - jsx-a11y `<div onClick {...props} />` — JSX spread attributes have no
//     direct analog; `...attributes` in a component body is not an element-level
//     attribute and doesn't exercise the same code path.
//   - angular `<A (click) />` (uppercase `A`) — Angular's parser preserves the
//     uppercase tag name and the rule flags it. In our parser, `<A>` would be
//     treated as an Ember component (GlimmerElementNode with uppercase tag),
//     and `dom.has('A')` is false, so we correctly skip it as non-DOM. jsx-a11y
//     has no uppercase-tag test. This is coincidental parity.
//   - angular `ignoreWithDirectives` option tests — our rule has no options.
//   - lit `allowCustomElements` / `allowList` option tests — our rule has no
//     options; custom-element tags (with hyphen) are not in aria-query's `dom`,
//     so they are skipped by default. Lit FLAGS by default unless opted-out,
//     which is itself a divergence (see below).
//   - vue `<div @click='toggle'>` — unclosed tag; parser-dependent, not
//     meaningful in HBS.

// === DIVERGENCE — custom-element defaults ===
// lit-a11y: custom-element tags (e.g. `<custom-button>`) are FLAGGED by default
// unless `allowCustomElements: true` or `allowList: [...]` is configured.
// Our rule: SKIPS all tags not in aria-query's `dom` set (which excludes
// hyphenated custom elements). So `<my-widget {{on "click"}}>` is VALID for
// us, matching the opt-in behavior of lit under `allowCustomElements: true`.
// Difference: lit defaults to strict; we default to lenient.
ruleTester.run('audit:click-events-have-key-events custom-element default (gts)', rule, {
  valid: [
    '<template><custom-button {{on "click" this.onClick}}></custom-button></template>',
    '<template><another-button {{on "click" this.onClick}}></another-button></template>',
  ],
  invalid: [],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:click-events-have-key-events (hbs)', rule, {
  valid: [
    // Paired keyboard listener — valid.
    '<div {{on "click" this.a}} {{on "keydown" this.b}}></div>',
    '<div {{on "click" this.a}} {{on "keyup" this.b}}></div>',
    '<div {{on "click" this.a}} {{on "keypress" this.b}}></div>',

    // No click handler.
    '<div class="foo"></div>',

    // aria-hidden.
    '<div aria-hidden {{on "click" this.a}}></div>',
    '<div aria-hidden="true" {{on "click" this.a}}></div>',
    '<div aria-hidden={{true}} {{on "click" this.a}}></div>',

    // Inherently-interactive.
    '<button {{on "click" this.a}}></button>',
    '<a href="/x" {{on "click" this.a}}></a>',
    '<input type="text" {{on "click" this.a}} />',
    '<option {{on "click" this.a}}></option>',
    '<datalist {{on "click" this.a}}></datalist>',

    // Presentation / none.
    '<div role="presentation" {{on "click" this.a}}></div>',
    '<div role="none" {{on "click" this.a}}></div>',

    // Components (non-DOM) skipped.
    '<TestComponent {{on "click" this.a}} />',

    // DIVERGENCE: custom-element default (lit flags; we skip).
    '<custom-button {{on "click" this.a}}></custom-button>',
  ],
  invalid: [
    // Lone click on non-interactive.
    {
      code: '<div {{on "click" this.a}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    {
      code: '<section {{on "click" this.a}}></section>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // <a> without href.
    {
      code: '<a {{on "click" this.a}}></a>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // aria-hidden="false".
    {
      code: '<div aria-hidden="false" {{on "click" this.a}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
    // DIVERGENCE — widget role (angular treats as interactive).
    {
      code: '<div role="button" {{on "click" this.a}}></div>',
      output: null,
      errors: [{ messageId: 'needsKeyEvent' }],
    },
  ],
});
