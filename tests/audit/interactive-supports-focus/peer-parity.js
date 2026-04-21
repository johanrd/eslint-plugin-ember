// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-invalid-interactive` (our closest
// rule) against jsx-a11y/interactive-supports-focus,
// vuejs-accessibility/interactive-supports-focus, and
// angular-eslint/interactive-supports-focus.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —"; each
// case the peers flag that our rule silently allows is annotated as
// "MISSING-COVERAGE —".
//
// Source files:
//   - context/eslint-plugin-jsx-a11y-main/__tests__/src/rules/interactive-supports-focus-test.js
//   - context/eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/interactive-supports-focus.test.ts
//   - context/angular-eslint-main/packages/eslint-plugin-template/tests/rules/interactive-supports-focus/cases.ts
//
// Scope note: the peers' `interactive-supports-focus` rule flags elements that
// *carry an interactive ARIA role* (e.g. `role="button"`, `role="checkbox"`)
// but are not focusable — typically a non-focusable host element such as
// `<div>`/`<span>` without `tabindex`. Our `template-no-invalid-interactive`
// covers a *related* concern (non-interactive elements wired up with
// interactive event handlers) and specifically treats an interactive ARIA
// role as making the element interactive, so it does NOT fire on the core
// "`<div role="button">` without tabindex" case that the peers target. This
// fixture documents that coverage gap with MISSING-COVERAGE annotations.

'use strict';

const rule = require('../../../lib/rules/template-no-invalid-interactive');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:interactive-supports-focus (gts)', rule, {
  valid: [
    // === Upstream parity (valid in peers and us) ===
    // Base case: no role, no handler.
    '<template><div /></template>',

    // Native interactive elements with interactive handlers — all peers VALID.
    '<template><button {{on "click" this.handle}} class="foo"></button></template>',
    '<template><select {{on "click" this.handle}} class="foo"></select></template>',
    '<template><textarea {{on "click" this.handle}} class="foo"></textarea></template>',
    '<template><summary {{on "click" this.handle}}></summary></template>',
    '<template><input type="text" {{on "keyup" this.handle}} /></template>',
    '<template><input {{on "keydown" this.handle}} /></template>',
    '<template><input {{on "click" this.handle}} role="combobox" /></template>',

    // <a> with href — peers + ours: native interactive (tag+href).
    '<template><a {{on "click" this.handle}} href="http://x.y.z">link</a></template>',
    '<template><a href="#" role="button" {{on "click" this.handle}}>hash</a></template>',

    // <a> without href but with a valid tabindex — ours: tabindex makes it
    // interactive; peers: tabindex makes it focusable.
    '<template><a tabindex="0" {{on "click" this.handle}}>x</a></template>',
    '<template><a tabindex="-1" {{on "click" this.handle}}>x</a></template>',

    // Interactive role + tabindex="0" on a non-focusable host — peers VALID
    // (role is focusable), ours VALID (role matches INTERACTIVE_ROLES *and*
    // tabindex is present, so the element is treated as interactive).
    '<template><div role="button" tabindex="0" {{on "click" this.handle}}></div></template>',
    '<template><div role="checkbox" tabindex="0" {{on "click" this.handle}}></div></template>',
    '<template><div role="link" tabindex="0" {{on "click" this.handle}}></div></template>',
    '<template><div role="menuitem" tabindex="0" {{on "click" this.handle}}></div></template>',
    '<template><div role="switch" tabindex="0" {{on "click" this.handle}}></div></template>',
    '<template><div role="tab" tabindex="0" {{on "click" this.handle}}></div></template>',
    '<template><div role="textbox" tabindex="0" {{on "click" this.handle}}></div></template>',

    // Interactive role on a non-focusable host WITHOUT tabindex — our rule
    // does not fire here because it classifies "role in INTERACTIVE_ROLES"
    // as making the element interactive; therefore it exits before checking
    // handlers/focusability.
    // --- MISSING-COVERAGE: peers FLAG these. See notes below. ---
    '<template><div role="button" {{on "click" this.handle}}></div></template>',
    '<template><div role="checkbox" {{on "click" this.handle}}></div></template>',
    '<template><div role="link" {{on "click" this.handle}}></div></template>',
    '<template><div role="menuitem" {{on "click" this.handle}}></div></template>',
    '<template><div role="switch" {{on "click" this.handle}}></div></template>',
    '<template><div role="tab" {{on "click" this.handle}}></div></template>',
    '<template><div role="textbox" {{on "click" this.handle}}></div></template>',
    // Same pattern, static (no handler) — jsx-a11y requires a handler to fire
    // (its docs say "Enforce that elements with onClick handlers must be
    // focusable"), so static `<div role="button" />` is VALID in jsx-a11y and
    // VALID in ours. This case is upstream parity.
    '<template><div role="button"></div></template>',
    '<template><span role="link"></span></template>',

    // contenteditable="true" — our rule treats contenteditable as interactive
    // when it has an explicit literal value that isn't "false"; peers
    // (angular-eslint) VALID. Upstream parity.
    '<template><div contenteditable="true" {{on "keyup" this.handle}}>Edit</div></template>',
    // Bare `contenteditable` (no value) — angular-eslint VALID; our rule
    // FIRES because `getTextAttr` requires a GlimmerTextNode value and a bare
    // attribute has no value. Captured in invalid section.

    // Dynamic tabindex on <a> — our rule's `hasAttr` checks for the attribute
    // name only (not its value), so a bare `tabindex={{...}}` is enough to
    // mark the element interactive. Peers (jsx-a11y/vue) also skip dynamic
    // expressions. Parity.
    '<template><a {{on "click" this.handle}} tabindex={{this.ti}}>x</a></template>',

    // DIVERGENCE — dynamic role on <div> with a click handler:
    // jsx-a11y: VALID (`<div onClick={...} role={undefined} />` is in
    //   alwaysValid; dynamic role is treated as unresolvable).
    // Our rule: INVALID — `getTextAttr` returns undefined for non-literal
    //   values, so the role check fails and we fall through to flag. FALSE
    //   POSITIVE. Captured in invalid section below.

    // PascalCase / path-based component — peers also skip custom components.
    '<template><TestComponent {{on "click" this.handle}} /></template>',
    '<template><Foo.Bar {{on "click" this.handle}} aria-hidden={{false}} /></template>',

    // Hidden input — peers (jsx-a11y/vue/angular) list `<input type="hidden"
    // onClick={...} />` as VALID (a hidden input isn't a real interaction
    // target, the concern doesn't apply). Our rule fires: we mark hidden
    // input as non-interactive *and* flag handlers on non-interactive
    // elements. DIVERGENCE captured in invalid section.

    // === DIVERGENCE — <a> without href and without tabindex ===
    // jsx-a11y: VALID (`<a onClick={...} />` is in alwaysValid — the
    //   focusability of bare <a> is handled by anchor-is-valid, not here).
    // vue-a11y: VALID (same — `<a @click='void 0' />` is listed as valid).
    // angular-eslint: INVALID — "anchor should have href".
    // Our rule: INVALID — we treat `<a>` without href as non-interactive and
    //   flag any interactive handler on it. Parity with angular, divergence
    //   from jsx-a11y / vue-a11y.
    // (Captured in invalid section below.)

    // === DIVERGENCE — <aria-hidden> on a non-interactive element ===
    // jsx-a11y + vue-a11y + angular: VALID — aria-hidden opts the subtree out
    //   of accessibility and the rule skips.
    // Our rule: INVALID — `aria-hidden` is not considered by our rule; we
    //   still flag `<div aria-hidden {{on "click" ...}}></div>` because div
    //   remains non-interactive. FALSE POSITIVE vs all three peers.
    // (Captured in invalid section below.)

    // === DIVERGENCE — landmark elements with click handlers ===
    // jsx-a11y: VALID — `<section onClick={...} />`, `<main .../>`,
    //   `<article .../>`, `<header .../>`, `<footer .../>` are listed in
    //   alwaysValid.
    // vue-a11y: VALID — same set.
    // Our rule: INVALID — these tags are not in NATIVE_INTERACTIVE_ELEMENTS
    //   and have no interactive role, so we flag the handler. FALSE POSITIVE
    //   for click-bubble wrappers. (See invalid section below.)
  ],

  invalid: [
    // === DIVERGENCE — <a> without href ===
    // Angular parity (they flag), jsx-a11y/vue divergence (they don't).
    {
      code: '<template><a {{on "click" this.handle}}>link</a></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // === DIVERGENCE — <span> with click and no role/tabindex ===
    // jsx-a11y: VALID — `<span onClick="submitForm();">Submit</span>` is in
    //   alwaysValid (no role → nothing to enforce focusability against).
    // vue-a11y: VALID — same shape listed as valid.
    // angular-eslint: INVALID — "non-interactive element does not support
    //   focus" flagged on `<span (click)="onClick()">Submit</span>`.
    // Our rule: INVALID (noInvalidInteractive). Angular parity, divergence
    //   from jsx-a11y / vue-a11y.
    {
      code: '<template><span {{on "click" this.handle}}>Submit</span></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // === DIVERGENCE — aria-hidden on non-interactive element ===
    // Peers VALID (aria-hidden suppresses). Ours INVALID (we ignore
    // aria-hidden entirely).
    {
      code: '<template><div aria-hidden {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    {
      code: '<template><div aria-hidden="true" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // === DIVERGENCE — landmark elements with click handlers ===
    // jsx-a11y + vue-a11y: VALID (alwaysValid list).
    // Our rule: INVALID.
    {
      code: '<template><section {{on "click" this.handle}}></section></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    {
      code: '<template><main {{on "click" this.handle}}></main></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    {
      code: '<template><article {{on "click" this.handle}}></article></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    {
      code: '<template><header {{on "click" this.handle}}></header></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    {
      code: '<template><footer {{on "click" this.handle}}></footer></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // === MISSING-COVERAGE — `<div role="button">` with handler, no tabindex ===
    // This is the canonical peer `interactive-supports-focus` case:
    //   jsx-a11y: INVALID — "Elements with the 'button' interactive role must
    //     be tabbable." (suggests adding tabIndex={0}).
    //   vue-a11y: INVALID — messageId "tabbable" with role data.
    //   angular-eslint: INVALID — "element has interactive role but element
    //     does not support focus".
    // Our rule: VALID (no flag). Our rule treats the interactive role as
    //   making the element interactive, so focus/tabindex is not enforced.
    // (See the corresponding entries in the `valid` array above — they are
    // placed there because our rule currently passes them.)
    //
    // No assertion possible here without adding the capability to our rule.
    // This section is intentionally informational to make the gap auditable.

    // === MISSING-COVERAGE — `<area>` without href with click ===
    // jsx-a11y: VALID — `<area onClick={...} class="foo" />` is in alwaysValid.
    // angular-eslint: INVALID — "area should have href".
    // Our rule: INVALID — we flag (<area> is not in NATIVE_INTERACTIVE_ELEMENTS
    //   and has no href; see rule). NOTE: the glimmer parser rejects
    //   `</area>` as an end tag (area is void), so a faithful translation
    //   requires a self-closing form. Angular parity is observable via the
    //   self-closing form below; this documents our behavior on it.
    {
      code: '<template><area {{on "click" this.handle}} class="foo" /></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // === MISSING-COVERAGE — role="invalid" or unknown on non-interactive element ===
    // angular-eslint: INVALID — "non-interactive element with invalid role
    //   does not support focus".
    // Our rule: also flags — our rule treats unknown roles as
    //   non-interactive, so a div with an unknown role + click handler falls
    //   through to the non-interactive path. Parity with angular here.
    {
      code: '<template><div {{on "click" this.handle}} role="invalid"></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    // DIVERGENCE — dynamic role on a non-interactive element with a handler.
    // jsx-a11y / vue: VALID (dynamic value → skip).
    // Our rule: INVALID — literal-only role extraction means the role is not
    //   resolved and the div is classified as non-interactive. FALSE
    //   POSITIVE.
    {
      code: '<template><div role={{this.role}} {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // DIVERGENCE — bare `contenteditable` (no value).
    // angular-eslint: VALID (bare attribute is treated as truthy → interactive).
    // Our rule: INVALID — our `getTextAttr` only reads GlimmerTextNode values,
    //   so a valueless attribute returns undefined and we fall through.
    {
      code: '<template><div contenteditable {{on "keypress" this.handle}}>Edit</div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // DIVERGENCE — hidden input with click handler.
    // Peers VALID (hidden input isn't an interaction target; rule skips).
    // Ours INVALID (hidden input is classified as non-interactive and
    // handlers on non-interactive elements are flagged).
    {
      code: '<template><input type="hidden" {{on "click" this.handle}} /></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    {
      code: '<template><input type="hidden" {{on "click" this.handle}} tabindex="-1" /></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },

    // Explicit non-interactive roles — angular flags these the same way
    // (see `<div role="region" (click)="..."/>`-adjacent coverage). jsx-a11y
    // treats `role="section"` as valid because non-interactive roles don't
    // require focus; it relies on a separate rule (no-noninteractive-element-
    // interactions) for that concern. Our rule flags because `region` is not
    // in INTERACTIVE_ROLES.
    {
      code: '<template><div role="region" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:interactive-supports-focus (hbs)', rule, {
  valid: [
    '<div></div>',
    '<button {{on "click" this.handle}}></button>',
    '<input type="text" {{on "keyup" this.handle}} />',
    '<a href="http://x.y.z" {{on "click" this.handle}}>link</a>',
    '<a tabindex="0" {{on "click" this.handle}}>x</a>',
    // MISSING-COVERAGE cases (peers flag, ours does not):
    '<div role="button" {{on "click" this.handle}}></div>',
    '<div role="checkbox" {{on "click" this.handle}}></div>',
    '<div role="link" {{on "click" this.handle}}></div>',
    // Parity — static role="button" with no handler, jsx-a11y valid.
    '<div role="button"></div>',
    // contenteditable — parity.
    '<div contenteditable="true" {{on "keyup" this.handle}}>Edit</div>',
  ],
  invalid: [
    // DIVERGENCE — <a> without href. angular flags; jsx-a11y/vue don't. Ours does.
    {
      code: '<a {{on "click" this.handle}}>link</a>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    // DIVERGENCE — <span> with click. jsx-a11y/vue valid; angular flags. Ours flags.
    {
      code: '<span {{on "click" this.handle}}>Submit</span>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    // DIVERGENCE — aria-hidden suppression. Peers valid; ours flags.
    {
      code: '<div aria-hidden {{on "click" this.handle}}></div>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    // DIVERGENCE — landmarks (jsx-a11y/vue valid; ours flags).
    {
      code: '<section {{on "click" this.handle}}></section>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
    // DIVERGENCE — hidden input with click handler (peers valid; ours flags).
    {
      code: '<input type="hidden" {{on "click" this.handle}} />',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive' }],
    },
  ],
});
