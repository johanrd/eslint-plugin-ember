// Audit fixture — peer-plugin parity for `ember/template-no-invalid-interactive`.
//
// Our rule covers the combined concerns of TWO jsx-a11y rules:
//   - `no-static-element-interactions`        (div/span/etc. + onClick, no role)
//   - `no-noninteractive-element-interactions` (article/p/main/etc. + onClick)
// plus the single vue rule `no-static-element-interactions`.
//
// This file does NOT run in CI; it encodes CURRENT behavior of our rule so
// that executing it reports pass. Each case is annotated with the peer rule
// it was translated from and any divergence.
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-static-element-interactions-test.js
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-noninteractive-element-interactions-test.js
//   - eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/no-static-element-interactions.test.ts
//
// Translation note:
//   JSX  `<div onClick={h} />`     → HBS `<div onclick={{this.h}}></div>`
//   JSX  `<div onKeyDown={h} />`   → HBS `<div onkeydown={{this.h}}></div>`
//   Vue  `<div @click='void 0' />` → HBS `<div onclick={{this.h}}></div>`
//
// Our rule also flags the ember-idiomatic `{{on "click" h}}` modifier and
// `{{action}}` helper. Those shapes are not present in peer tests and are
// exercised in the main rule test file; this audit focuses on shared shapes.

'use strict';

const rule = require('../../../lib/rules/template-no-invalid-interactive');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-invalid-interactive (gts)', rule, {
  valid: [
    // =========================================================================
    // Bucket A — jsx-a11y/no-static-element-interactions (alwaysValid)
    // =========================================================================

    // Native-interactive elements with onClick (jsx-a11y: valid; ours: valid).
    '<template><button onclick={{this.h}} class="foo"></button></template>',
    '<template><input onclick={{this.h}} /></template>',
    '<template><input type="button" onclick={{this.h}} /></template>',
    '<template><input type="checkbox" onclick={{this.h}} /></template>',
    '<template><input type="text" onclick={{this.h}} /></template>',
    '<template><input type="submit" onclick={{this.h}} /></template>',
    '<template><select onclick={{this.h}} class="foo"></select></template>',
    '<template><textarea onclick={{this.h}} class="foo"></textarea></template>',

    // <a> with href is interactive (jsx-a11y: valid; ours: valid).
    '<template><a onclick={{this.h}} href="http://x.y.z">L</a></template>',
    '<template><a onclick={{this.h}} href="http://x.y.z" tabindex="0">L</a></template>',

    // <form onSubmit> (jsx-a11y: valid; ours: valid via ELEMENT_ALLOWED_EVENTS).
    '<template><form onsubmit={{this.h}}></form></template>',

    // Elements with interactive ARIA role (jsx-a11y: valid; ours: valid).
    '<template><div role="button" onclick={{this.h}}></div></template>',
    '<template><div role="checkbox" onclick={{this.h}}></div></template>',
    '<template><div role="combobox" onclick={{this.h}}></div></template>',
    '<template><div role="gridcell" onclick={{this.h}}></div></template>',
    '<template><div role="link" onclick={{this.h}}></div></template>',
    '<template><div role="menuitem" onclick={{this.h}}></div></template>',
    '<template><div role="menuitemcheckbox" onclick={{this.h}}></div></template>',
    '<template><div role="menuitemradio" onclick={{this.h}}></div></template>',
    '<template><div role="option" onclick={{this.h}}></div></template>',
    '<template><div role="radio" onclick={{this.h}}></div></template>',
    '<template><div role="searchbox" onclick={{this.h}}></div></template>',
    '<template><div role="slider" onclick={{this.h}}></div></template>',
    '<template><div role="spinbutton" onclick={{this.h}}></div></template>',
    '<template><div role="switch" onclick={{this.h}}></div></template>',
    '<template><div role="tab" onclick={{this.h}}></div></template>',
    '<template><div role="textbox" onclick={{this.h}}></div></template>',
    '<template><div role="treeitem" onclick={{this.h}}></div></template>',
    // extras we treat as interactive (scrollbar/tooltip) — jsx-a11y: also valid
    '<template><div role="scrollbar" onclick={{this.h}}></div></template>',
    '<template><div role="tooltip" onclick={{this.h}}></div></template>',

    // <summary> — ours: native-interactive (our NATIVE_INTERACTIVE_ELEMENTS set).
    // jsx-a11y no-static: also alwaysValid.
    '<template><summary onclick={{this.h}}></summary></template>',

    // Non-click, non-disallowed handlers on plain div (jsx-a11y recommended+strict: valid; ours: valid).
    '<template><div onfocus={{this.h}}></div></template>',
    '<template><div onblur={{this.h}}></div></template>',
    '<template><div onchange={{this.h}}></div></template>',
    '<template><div oninput={{this.h}}></div></template>',
    '<template><div onsubmit={{this.h}}></div></template>',
    '<template><div onselect={{this.h}}></div></template>',
    '<template><div onscroll={{this.h}}></div></template>',
    '<template><div oncopy={{this.h}}></div></template>',
    '<template><div oncut={{this.h}}></div></template>',
    '<template><div onpaste={{this.h}}></div></template>',

    // Component invocations: our rule skips PascalCase / @- / this. / dotted.
    // jsx-a11y peer: `<TestComponent onClick={h} />` is alwaysValid.
    '<template><TestComponent onclick={{this.h}} /></template>',
    '<template><@someComponent onclick={{this.h}} /></template>',
    '<template><this.myComponent onclick={{this.h}} /></template>',

    // =========================================================================
    // Bucket B — jsx-a11y/no-noninteractive-element-interactions (alwaysValid)
    // =========================================================================

    // Non-disallowed handlers on a noninteractive-role element — ours: valid
    // (only disallowed DOM events are checked; onSubmit etc. not flagged).
    '<template><div role="article" oncopy={{this.h}}></div></template>',
    '<template><div role="article" onchange={{this.h}}></div></template>',
    '<template><div role="article" onsubmit={{this.h}}></div></template>',
    '<template><div role="article" onscroll={{this.h}}></div></template>',

    // <img onLoad>, <img onError> — jsx-a11y no-noninteractive: alwaysValid
    // (via allowed load/error handlers on img). Ours: valid via ELEMENT_ALLOWED_EVENTS.
    '<template><img onload={{this.h}} alt="x" /></template>',
    '<template><img onerror={{this.h}} alt="x" /></template>',

    // <form onSubmit> — parity as above.
    // <iframe onLoad> — jsx-a11y no-noninteractive: alwaysValid.
    // DIVERGENCE (noted in invalid section): our rule does NOT allow onload on iframe;
    // ELEMENT_ALLOWED_EVENTS only covers form + img. See invalid-section cross-ref.

    // =========================================================================
    // Bucket C — vue/no-static-element-interactions (valid)
    // =========================================================================
    // Vue cases translated to HBS collapse to shapes already covered above:
    //   `<div @click='void 0' role='button'/>`   → `<div role="button" onclick=…>`
    //   `<button @click='void 0'>`                → `<button onclick=…>`
    //   `<input @click='void 0'>`                 → `<input onclick=…>`
    // Those parity assertions appear in Bucket A and are not duplicated here.

    // =========================================================================
    // PARITY — non-interactive escape hatches honored by peers AND by us.
    // =========================================================================

    // D1 (resolved). role="presentation" / role="none" on a plain element with
    // onClick opts out of the interactivity check.
    // jsx-a11y no-static: VALID. jsx-a11y no-noninteractive: VALID.
    // Vue: VALID (`<div @click='void 0' role='presentation'/>`).
    // Our rule (post-fix): VALID — honored via `hasNonInteractiveEscapeHatch`.
    '<template><div role="presentation" onclick={{this.h}}></div></template>',
    '<template><div role="presentation" onkeydown={{this.h}}></div></template>',
    '<template><div role="none" onclick={{this.h}}></div></template>',

    // D2 (resolved). aria-hidden suppresses flagging (jsx-a11y + vue).
    // jsx-a11y: `<div onClick={()=>{}} aria-hidden />` VALID.
    // Vue:      `<div @click='void 0' aria-hidden='true'/>`  VALID.
    // Our rule (post-fix): VALID — honored via `hasNonInteractiveEscapeHatch`.
    '<template><div onclick={{this.h}} aria-hidden="true"></div></template>',
    '<template><div onclick={{this.h}} aria-hidden></div></template>',
    '<template><div onclick={{this.h}} aria-hidden={{true}}></div></template>',

    // =========================================================================
    // DIVERGENCES — cases where peers are VALID but our rule FLAGS.
    // Kept in COMMENTS here so this file still passes.
    // =========================================================================

    // --- D3. <section onClick aria-label="Aa" /> ---
    // jsx-a11y no-static: VALID (aria-label/aria-labelledby on section is a hint).
    // jsx-a11y no-noninteractive: INVALID (section has non-interactive inherent role).
    // Our rule: INVALID — aria-label doesn't change interactivity. See invalid.

    // --- D4. <a tabIndex="0" onClick /> without href ---
    // jsx-a11y no-static: INVALID (still a "static" a without href).
    // Our rule: VALID — tabindex makes the element interactive by default
    // (unless `ignoreTabindex` option is set). So we skip.
    // (This is an "our rule is more permissive" case and belongs here.)
    '<template><a tabindex="0" onclick={{this.h}}>L</a></template>',

    // --- D5. <menuitem onClick> / <datalist onClick> / <option onClick> ---
    // jsx-a11y no-static: alwaysValid (inherent interactive).
    // Our rule: menuitem/datalist/option not in NATIVE_INTERACTIVE_ELEMENTS;
    // we flag. See invalid section.

    // --- D6. <audio onClick> without `controls`; <video onClick> without `controls` ---
    // jsx-a11y no-static: alwaysValid (audio/video inherent interactive per
    // aria-query's elementRoleMap).
    // Our rule: requires `controls` attribute. Without it → flag. See invalid.

    // --- D7. <input type="hidden" onClick> ---
    // jsx-a11y no-static: VALID. jsx-a11y no-noninteractive: VALID.
    // Our rule: hidden input is explicitly NOT interactive → flag. See invalid.

    // --- D8. `onMouseEnter` / `onMouseLeave` / `onContextMenu` / `onDrag*` ---
    // jsx-a11y recommended: VALID. jsx-a11y strict: INVALID.
    // Our rule: VALID — these events are NOT in DISALLOWED_DOM_EVENTS. Aligns
    // with jsx-a11y recommended; diverges from strict.
    '<template><div onmouseenter={{this.h}}></div></template>',
    '<template><div onmouseleave={{this.h}}></div></template>',
    '<template><div oncontextmenu={{this.h}}></div></template>',
    '<template><div ondrag={{this.h}}></div></template>',
    '<template><div ondragstart={{this.h}}></div></template>',
    '<template><div ondragend={{this.h}}></div></template>',
  ],

  invalid: [
    // =========================================================================
    // Bucket A — jsx-a11y/no-static-element-interactions (neverValid)
    // =========================================================================

    // Plain div / span with onClick / onKeyUp / onMouseDown / onMouseUp — parity.
    {
      code: '<template><div onclick={{this.h}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onclick' } }],
    },
    {
      code: '<template><div onkeyup={{this.h}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onkeyup' } }],
    },
    {
      code: '<template><div onkeydown={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onkeydown' } },
      ],
    },
    {
      code: '<template><div onkeypress={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onkeypress' } },
      ],
    },
    {
      code: '<template><div onmousedown={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onmousedown' } },
      ],
    },
    {
      code: '<template><div onmouseup={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onmouseup' } },
      ],
    },

    // Static (no inherent role) elements with onClick — jsx-a11y no-static: invalid; ours: invalid.
    {
      code: '<template><span onclick={{this.h}}></span></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'span', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><a onclick={{this.h}}>L</a></template>', // no href
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'a', handler: 'onclick' } }],
    },
    {
      code: '<template><area onclick={{this.h}} /></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'area', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><b onclick={{this.h}}></b></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'b', handler: 'onclick' } }],
    },
    {
      code: '<template><i onclick={{this.h}}></i></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'i', handler: 'onclick' } }],
    },
    {
      code: '<template><section onclick={{this.h}}></section></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'section', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><object onclick={{this.h}}></object></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'object', handler: 'onclick' } },
      ],
    },

    // =========================================================================
    // Bucket B — jsx-a11y/no-noninteractive-element-interactions (neverValid)
    // =========================================================================
    // These elements have inherent non-interactive roles. jsx-a11y no-static
    // would PASS them (they're "inherent non-interactive", not "static"), but
    // jsx-a11y no-noninteractive flags them — as we do.

    {
      code: '<template><main onclick={{this.h}}></main></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'main', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><article onclick={{this.h}}></article></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'article', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><aside onclick={{this.h}}></aside></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'aside', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><nav onclick={{this.h}}></nav></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'nav', handler: 'onclick' } }],
    },
    {
      code: '<template><h1 onclick={{this.h}}></h1></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'h1', handler: 'onclick' } }],
    },
    {
      code: '<template><p onclick={{this.h}}></p></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'p', handler: 'onclick' } }],
    },
    {
      code: '<template><li onclick={{this.h}}></li></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'li', handler: 'onclick' } }],
    },
    {
      code: '<template><ul onclick={{this.h}}></ul></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'ul', handler: 'onclick' } }],
    },
    {
      code: '<template><ol onclick={{this.h}}></ol></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'ol', handler: 'onclick' } }],
    },
    {
      code: '<template><table onclick={{this.h}}></table></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'table', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><img onclick={{this.h}} alt="x" /></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'img', handler: 'onclick' } }],
    },
    // jsx-a11y no-noninteractive flags these handlers on role=article; we flag the
    // disallowed ones. (onError/onLoad only flagged in jsx-a11y strict — our rule
    // never flags on* events not in DISALLOWED_DOM_EVENTS; see valid-D8.)
    {
      code: '<template><div role="article" onkeydown={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onkeydown' } },
      ],
    },
    {
      code: '<template><div role="article" onmousedown={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onmousedown' } },
      ],
    },

    // Non-interactive ARIA roles on div with onClick — jsx-a11y no-noninteractive: invalid.
    {
      code: '<template><div role="alert" onclick={{this.h}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onclick' } }],
    },
    {
      code: '<template><div role="dialog" onclick={{this.h}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onclick' } }],
    },
    {
      code: '<template><div role="img" onclick={{this.h}}></div></template>',
      output: null,
      errors: [{ messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onclick' } }],
    },

    // =========================================================================
    // Bucket C — vue/no-static-element-interactions (invalid)
    // =========================================================================
    // `<div @click='void 0' />` → `<div onclick={{this.h}}></div>`. Already
    // covered above. Below translates the tag variants only.

    {
      code: '<template><a onmousedown={{this.h}}>L</a></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'a', handler: 'onmousedown' } },
      ],
    },
    {
      code: '<template><span onmousedown={{this.h}}></span></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'span', handler: 'onmousedown' } },
      ],
    },
    {
      code: '<template><section onmousedown={{this.h}}></section></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'section', handler: 'onmousedown' } },
      ],
    },
    // Vue-specific handler set: dblclick / mouseover / mouseout / mousemove are
    // all in our DISALLOWED_DOM_EVENTS, so parity holds.
    {
      code: '<template><div ondblclick={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'ondblclick' } },
      ],
    },
    {
      code: '<template><div onmousemove={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onmousemove' } },
      ],
    },
    {
      code: '<template><div onmouseover={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onmouseover' } },
      ],
    },
    {
      code: '<template><div onmouseout={{this.h}}></div></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'div', handler: 'onmouseout' } },
      ],
    },

    // =========================================================================
    // DIVERGENCES — peers VALID, we FLAG (false positives relative to peers)
    // =========================================================================

    // D1 (role=presentation/none) and D2 (aria-hidden=true/bare) have been
    // resolved; those cases are now in the valid block above.

    // D3. <section onClick aria-label="Aa" />
    // jsx-a11y no-static: VALID; jsx-a11y no-noninteractive: INVALID.
    // Ours: INVALID — aria-label doesn't change interactivity. Matches no-noninteractive.
    {
      code: '<template><section onclick={{this.h}} aria-label="Aa"></section></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'section', handler: 'onclick' } },
      ],
    },

    // D5. <menuitem> / <datalist> / <option> — jsx-a11y no-static: VALID;
    // ours: not in NATIVE_INTERACTIVE_ELEMENTS → flag.
    {
      code: '<template><menuitem onclick={{this.h}}></menuitem></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'menuitem', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><datalist onclick={{this.h}}></datalist></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'datalist', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><option onclick={{this.h}} class="foo"></option></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'option', handler: 'onclick' } },
      ],
    },

    // D6. <audio> / <video> without `controls` — jsx-a11y no-static: VALID;
    // ours: INVALID unless `controls` present. (Our rule deliberately requires
    // `controls` — an element without user-facing affordances is not interactive.)
    {
      code: '<template><audio onclick={{this.h}}></audio></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'audio', handler: 'onclick' } },
      ],
    },
    {
      code: '<template><video onclick={{this.h}}></video></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'video', handler: 'onclick' } },
      ],
    },

    // D7. <input type="hidden" onClick> — jsx-a11y (both): VALID.
    // Ours: explicitly excludes hidden input from native-interactive → flag.
    {
      code: '<template><input type="hidden" onclick={{this.h}} /></template>',
      output: null,
      errors: [
        { messageId: 'noInvalidInteractive', data: { tagName: 'input', handler: 'onclick' } },
      ],
    },

    // <iframe onLoad> — jsx-a11y no-noninteractive: VALID (iframe is interactive
    // and load is an allowed handler on iframe in the peer's allowedHandlers map).
    // Ours: `iframe` IS in NATIVE_INTERACTIVE_ELEMENTS so element is interactive
    // → rule early-returns; valid. PARITY. (Included as a sanity check.)
    // (No invalid case here.)

    // =========================================================================
    // DIVERGENCES — peers INVALID, we VALID (false negatives relative to peers)
    // =========================================================================
    // Documented only; we can't assert invalid on something we don't flag.

    // E1. <a tabIndex="0" onClick> without href
    // jsx-a11y no-static: INVALID. Ours: VALID (tabindex → interactive).
    // See valid-D4 above.

    // E2. jsx-a11y strict: onContextMenu / onDblClick / onDrag* / onMouseEnter /
    // onMouseLeave / onMouseMove / onMouseOut / onMouseOver on static elements.
    // Ours: DISALLOWED_DOM_EVENTS covers dblclick / mousemove / mouseover /
    // mouseout (we flag those; see vue bucket above). We do NOT flag onMouseEnter
    // / onMouseLeave / onContextMenu / onDrag*. See valid-D8.
  ],
});
