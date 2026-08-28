// Audit fixture — translates peer-plugin test cases into assertions against
// our rule. Runs as part of the default Vitest suite (via the `tests/**/*.js`
// include glob) and serves double-duty: (1) auditable record of peer-parity
// divergences, (2) regression coverage pinning CURRENT behavior. Each case
// encodes what OUR rule does today; divergences from upstream plugins are
// annotated as `DIVERGENCE —`. Peer-only constructs that can't be translated
// to Ember templates (JSX spread props, Vue v-bind, Angular `$event`,
// undefined-handler expression analysis) are marked `AUDIT-SKIP`.
//
// Peers covered: jsx-a11y/mouse-events-have-key-events,
// vuejs-accessibility/mouse-events-have-key-events,
// angular-eslint-template/mouse-events-have-key-events,
// lit-a11y/mouse-events-have-key-events.
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/mouse-events-have-key-events-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/mouse-events-have-key-events.test.ts
//   - angular-eslint-main/packages/eslint-plugin-template/tests/rules/mouse-events-have-key-events/cases.ts
//   - eslint-plugin-lit-a11y/tests/lib/rules/mouse-events-have-key-events.js

'use strict';

const rule = require('../../../lib/rules/template-mouse-events-have-key-events');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:mouse-events-have-key-events (gts)', rule, {
  valid: [
    // === Upstream parity (valid in jsx-a11y / vue / angular / lit and us) ===
    // Base case — no listeners at all.
    // jsx-a11y: `<div />` valid. vue: `<div />` valid. angular: valid. lit: valid.
    '<template><div /></template>',
    '<template><div></div></template>',

    // mouseover paired with focus.
    // jsx-a11y: `<div onMouseOver={...} onFocus={...} />` valid.
    // vue:      `<div @mouseover='...' @focus='...' />` valid.
    // angular:  `<div (mouseover)="..." (focus)="..."></div>` valid.
    // lit:      html`<div @mouseover=${...} @focus=${...}></div>` valid.
    '<template><div {{on "mouseover" this.h}} {{on "focus" this.f}}></div></template>',

    // mouseout paired with blur. Same parity as above across peers.
    '<template><div {{on "mouseout" this.h}} {{on "blur" this.f}}></div></template>',

    // Only a focus/blur handler (no hover at all) — nothing to pair against.
    // jsx-a11y: valid. lit: valid.
    '<template><div {{on "focus" this.f}}></div></template>',
    '<template><div {{on "blur" this.f}}></div></template>',

    // Component / PascalCase — not a DOM element, skipped.
    // jsx-a11y: `<MyElement onMouseOver={...} />` valid (skips non-DOM).
    // Our rule guards with `isNativeElement` (PascalCase tags are component
    // invocations in Glimmer); the aria-query `dom.has` check then narrows
    // remaining native tags to HTML.
    '<template><MyElement /></template>',
    '<template><MyElement {{on "mouseover" this.h}} /></template>',
    '<template><MyElement {{on "mouseout" this.h}} /></template>',
    '<template><MyElement {{on "focus" this.h}} /></template>',
    '<template><MyElement {{on "blur" this.h}} /></template>',

    // Custom (dasherized) element — `isNativeElement` excludes hyphenated
    // tags, so our rule skips. lit-a11y has `allowCustomElements`/`allowList`
    // options; we don't support that, but the default behavior aligns
    // (no flag on unknown tags).
    '<template><custom-button {{on "mouseover" this.h}} {{on "focus" this.f}}></custom-button></template>',

    // === Options parity ===
    // jsx-a11y: empty option arrays mean "don't check any handler".
    // Our rule: same — empty arrays short-circuit the .find() miss.
    {
      code: '<template><div {{on "mouseover" this.h}} {{on "mouseout" this.h}}></div></template>',
      options: [{ hoverInHandlers: [], hoverOutHandlers: [] }],
    },

    // jsx-a11y: custom single-handler option — `hoverInHandlers: ['onMouseOver']`.
    // Translated to `hoverInHandlers: ['mouseover']`.
    {
      code: '<template><div {{on "mouseover" this.h}} {{on "focus" this.f}}></div></template>',
      options: [{ hoverInHandlers: ['mouseover'] }],
    },

    // jsx-a11y: `hoverInHandlers: ['onMouseEnter']` — only mouseenter is checked.
    {
      code: '<template><div {{on "mouseenter" this.h}} {{on "focus" this.f}}></div></template>',
      options: [{ hoverInHandlers: ['mouseenter'] }],
    },

    // jsx-a11y: `hoverOutHandlers: ['onMouseOut']`.
    {
      code: '<template><div {{on "mouseout" this.h}} {{on "blur" this.f}}></div></template>',
      options: [{ hoverOutHandlers: ['mouseout'] }],
    },

    // jsx-a11y: `hoverOutHandlers: ['onMouseLeave']`.
    {
      code: '<template><div {{on "mouseleave" this.h}} {{on "blur" this.f}}></div></template>',
      options: [{ hoverOutHandlers: ['mouseleave'] }],
    },

    // jsx-a11y: with a narrow custom list, other hover events aren't checked.
    //   `<div onMouseOver={...} onMouseOut={...} />` is valid when handlers are
    //   configured to onPointerEnter/onPointerLeave only.
    // Our rule has no pointer* events built in, but users can customize the lists.
    // The case translates to "if I only watch pointer events, native mouse is free".
    {
      code: '<template><div {{on "mouseover" this.h}} {{on "mouseout" this.h}}></div></template>',
      options: [{ hoverInHandlers: ['pointerenter'], hoverOutHandlers: ['pointerleave'] }],
    },

    // jsx-a11y: custom option only checks the configured handlers.
    //   `<div onMouseLeave={...} />` with `hoverOutHandlers: ['onPointerLeave']` → valid.
    {
      code: '<template><div {{on "mouseleave" this.h}} /></template>',
      options: [{ hoverOutHandlers: ['pointerleave'] }],
    },

    // angular: `<app-test (mouseover)="..."></app-test>` valid — custom element
    // naming (dasherized) falls outside aria-query's dom map. Parity.
    '<template><app-test {{on "mouseover" this.h}}></app-test></template>',
    '<template><app-test {{on "mouseout" this.h}}></app-test></template>',

    // === PEER PARITY — default excludes mouseenter/mouseleave ===
    // jsx-a11y / angular / lit / us: default hoverIn = ['mouseover'] only.
    //   `<div {{on "mouseenter" ...}} />` (no focus) → VALID by default.
    // Users who also want mouseenter/mouseleave checked add them via
    // `hoverInHandlers: ['mouseover', 'mouseenter']` / similar. The opt-in
    // case is captured under invalid[] below with config.
    '<template><div {{on "mouseenter" this.h}}></div></template>',
    '<template><div {{on "mouseleave" this.h}}></div></template>',
  ],

  invalid: [
    // === Upstream parity (invalid in peers and us) ===
    // jsx-a11y: `<div onMouseOver={() => void 0} />` → error.
    // vue:      `<div @mouseover='void 0' />` → mouseOver error.
    // angular:  `<div (mouseover)="..."></div>` → error.
    // lit:      html`<div @mouseover=${foo}></div>` → error.
    {
      code: '<template><div {{on "mouseover" this.h}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverInMissing' }],
    },

    // mouseout alone — same cross-peer parity.
    {
      code: '<template><div {{on "mouseout" this.h}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },

    // lit: `html`<div @mouseout=${foo} @mouseover=${bar}></div>`` → two errors.
    // Our rule reports each pairing on the offending modifier's source location,
    // so here the errors come out in source order: mouseout (hover-out) first,
    // then mouseover (hover-in). jsx-a11y also reports both, in its own JSX-
    // attribute order. Peer parity modulo error ordering.
    {
      code: '<template><div {{on "mouseout" this.h}} {{on "mouseover" this.g}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }, { messageId: 'hoverInMissing' }],
    },

    // angular: `<div (mouseout)="..." (focus)="..."></div>` → mouseout unpaired
    // (focus does not pair with mouseout). We mirror this: hover-out requires
    // blur/focusout, not focus/focusin.
    {
      code: '<template><div {{on "mouseout" this.h}} {{on "focus" this.f}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },

    // === jsx-a11y custom-options parity ===
    // `{ hoverInHandlers: ['onMouseOver'], hoverOutHandlers: ['onMouseOut'] }`
    // with `<div onMouseOver={...} onMouseOut={...} />` → two errors.
    {
      code: '<template><div {{on "mouseover" this.h}} {{on "mouseout" this.g}}></div></template>',
      output: null,
      options: [{ hoverInHandlers: ['mouseover'], hoverOutHandlers: ['mouseout'] }],
      errors: [{ messageId: 'hoverInMissing' }, { messageId: 'hoverOutMissing' }],
    },

    // jsx-a11y: `{ hoverInHandlers: ['onPointerEnter'], hoverOutHandlers: ['onPointerLeave'] }`
    // with `<div onPointerEnter={...} onPointerLeave={...} />` → two errors.
    // Translation uses lower-case native event names.
    {
      code: '<template><div {{on "pointerenter" this.h}} {{on "pointerleave" this.g}}></div></template>',
      output: null,
      options: [{ hoverInHandlers: ['pointerenter'], hoverOutHandlers: ['pointerleave'] }],
      errors: [{ messageId: 'hoverInMissing' }, { messageId: 'hoverOutMissing' }],
    },

    // jsx-a11y: `{ hoverInHandlers: ['onMouseOver'] }` with `<div onMouseOver={...} />` → error.
    {
      code: '<template><div {{on "mouseover" this.h}}></div></template>',
      output: null,
      options: [{ hoverInHandlers: ['mouseover'] }],
      errors: [{ messageId: 'hoverInMissing' }],
    },
    // jsx-a11y: same shape with onPointerEnter.
    {
      code: '<template><div {{on "pointerenter" this.h}}></div></template>',
      output: null,
      options: [{ hoverInHandlers: ['pointerenter'] }],
      errors: [{ messageId: 'hoverInMissing' }],
    },
    // jsx-a11y: `{ hoverOutHandlers: ['onMouseOut'] }` with `<div onMouseOut={...} />`.
    {
      code: '<template><div {{on "mouseout" this.h}}></div></template>',
      output: null,
      options: [{ hoverOutHandlers: ['mouseout'] }],
      errors: [{ messageId: 'hoverOutMissing' }],
    },
    // jsx-a11y: `{ hoverOutHandlers: ['onPointerLeave'] }` — pointerleave alone flagged.
    {
      code: '<template><div {{on "pointerleave" this.h}}></div></template>',
      output: null,
      options: [{ hoverOutHandlers: ['pointerleave'] }],
      errors: [{ messageId: 'hoverOutMissing' }],
    },

    // === PEER-PARITY OPT-IN — mouseenter/mouseleave flag only with config ===
    // Defaults match jsx-a11y / angular / lit: mouseover/mouseout only.
    // Users who want the non-bubbling per-element variants checked opt in.
    {
      code: '<template><div {{on "mouseenter" this.h}}></div></template>',
      output: null,
      options: [{ hoverInHandlers: ['mouseover', 'mouseenter'] }],
      errors: [{ messageId: 'hoverInMissing' }],
    },
    {
      code: '<template><div {{on "mouseleave" this.h}}></div></template>',
      output: null,
      options: [{ hoverOutHandlers: ['mouseout', 'mouseleave'] }],
      errors: [{ messageId: 'hoverOutMissing' }],
    },

    // === AUDIT-SKIP — peer constructs that don't translate to Ember ===
    //
    // jsx-a11y: spread props `<div onMouseOver={...} {...props} />`.
    //   Rule still flags because spread doesn't count as a known onFocus.
    //   There is no HBS equivalent of "spread an opaque props bag onto an
    //   element". `...attributes` exists but is always splatted on the
    //   top-level element and is not a runtime object we could detect a
    //   "focus handler" within. SKIP.
    //
    // jsx-a11y: `<div onMouseOver={...} onFocus={undefined} />`.
    //   The rule inspects the JSX value expression and treats `undefined` as
    //   "no real handler". Our rule does not analyze modifier argument
    //   expressions — the presence of `{{on "focus" …}}` is taken at face
    //   value. This peer case would therefore be reported as VALID by us
    //   despite jsx-a11y flagging it. SKIP (not a faithful translation).
    //
    // vue: `@focus='null'` is treated as "no handler"; same reasoning applies.
    //   SKIP.
    //
    // lit-a11y: `allowCustomElements: false` + `allowList: ['custom-button']`.
    //   Our rule does not expose a custom-element policy knob; its behavior
    //   is always "skip non-dom-map tags". SKIP the options matrix; the
    //   default (no custom-element flagging) is covered in valid[] above.
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:mouse-events-have-key-events (hbs)', rule, {
  valid: [
    // Peer-parity base cases in raw hbs.
    '<div></div>',
    '<div {{on "mouseover" this.h}} {{on "focus" this.f}}></div>',
    '<div {{on "mouseout" this.h}} {{on "blur" this.f}}></div>',
    '<div {{on "focus" this.f}}></div>',
    '<div {{on "blur" this.f}}></div>',
    // PascalCase component — not a DOM element.
    '<MyElement {{on "mouseover" this.h}} />',
    // Dasherized custom element — not in aria-query's dom map.
    '<custom-button {{on "mouseover" this.h}}></custom-button>',
    // PEER PARITY — mouseenter/mouseleave excluded from default, matching
    // jsx-a11y / angular / lit.
    '<div {{on "mouseenter" this.h}}></div>',
    '<div {{on "mouseleave" this.h}}></div>',
  ],
  invalid: [
    {
      code: '<div {{on "mouseover" this.h}}></div>',
      output: null,
      errors: [{ messageId: 'hoverInMissing' }],
    },
    {
      code: '<div {{on "mouseout" this.h}}></div>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },
    // PEER-PARITY OPT-IN — mouseenter/mouseleave flag only with config.
    {
      code: '<div {{on "mouseenter" this.h}}></div>',
      output: null,
      options: [{ hoverInHandlers: ['mouseover', 'mouseenter'] }],
      errors: [{ messageId: 'hoverInMissing' }],
    },
    {
      code: '<div {{on "mouseleave" this.h}}></div>',
      output: null,
      options: [{ hoverOutHandlers: ['mouseout', 'mouseleave'] }],
      errors: [{ messageId: 'hoverOutMissing' }],
    },
    // angular parity — mouseout + focus is still invalid.
    {
      code: '<div {{on "mouseout" this.h}} {{on "focus" this.f}}></div>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },
  ],
});
