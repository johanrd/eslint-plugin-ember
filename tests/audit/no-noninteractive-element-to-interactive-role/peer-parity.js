// Audit fixture — translated test cases from jsx-a11y to measure behavioral
// parity of `ember/template-no-noninteractive-element-to-interactive-role`
// against jsx-a11y/no-noninteractive-element-to-interactive-role.
//
// vuejs-accessibility and lit-a11y do not ship this rule; jsx-a11y is the only
// peer source.
//
// These tests are NOT part of the main CI suite — they live under tests/audit/
// and encode the CURRENT behavior of our rule so that running this file
// reports pass. Each divergence from jsx-a11y is annotated with a
// "DIVERGENCE —" block. Peer-only constructs that cannot be translated to
// Ember templates (JSX spread props, settings.components aliasing, JSX-only
// attribute syntax) are marked "AUDIT-SKIP".
//
// Source file (context/ checkout):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-noninteractive-element-to-interactive-role-test.js
//
// Rule under test:
//   - lib/rules/template-no-noninteractive-element-to-interactive-role.js
//     (feat/template-no-noninteractive-to-interactive-role, PR #21).
//     Non-interactive tag set is derived from axobject-query: any element
//     whose AXObject mapping is exclusively {window, structure} with no
//     attribute constraints. Interactive role set is shared with the sibling
//     rule via lib/utils/interactive-roles.js (refactored in PR #27 to
//     descend from the `widget` superclass in aria-query, plus `toolbar`).
//
// jsx-a11y, by contrast, uses a manually curated element→role map
// (src/util/implicitRoles + nonInteractiveMap). The two derivations diverge
// on a number of tags; those divergences are captured below. jsx-a11y also
// ships :recommended and :strict variants — our rule has no options and
// behaves close to jsx-a11y :strict (always flags everything), with the
// exceptions documented below.

'use strict';

const rule = require('../../../lib/rules/template-no-noninteractive-element-to-interactive-role');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-noninteractive-element-to-interactive-role (gts)', rule, {
  valid: [
    // === Upstream parity — components / custom tags ===
    // jsx-a11y alwaysValid: `<TestComponent onClick={doFoo} />`, `<Button ... />`.
    //   PascalCase is not a DOM element; not in jsx-a11y's interactiveMap.
    // Ours: tag lowercased to "testcomponent"/"button"; not in NON_INTERACTIVE_TAGS.
    //   SKIPPED. Parity.
    '<template><TestComponent @onClick={{this.doFoo}} /></template>',
    '<template><Button @onClick={{this.doFoo}} /></template>',
    '<template><Foo role="button" /></template>',
    '<template><Component role="treeitem" /></template>',

    // === Upstream parity — interactive elements with interactive role ===
    // jsx-a11y alwaysValid: interactive elements are out of scope (sibling rule).
    // Ours: these tags are not in NON_INTERACTIVE_TAGS (they're interactive per
    //   aria-query). Skipped.
    '<template><a tabindex="0" role="button"></a></template>',
    '<template><a href="http://x.y.z" role="button"></a></template>',
    '<template><a href="http://x.y.z" tabindex="0" role="button"></a></template>',
    '<template><area role="button" /></template>',
    '<template><area role="menuitem" /></template>',
    '<template><button class="foo" role="button">Click</button></template>',
    '<template><body role="button"></body></template>',
    '<template><frame role="button" /></template>',
    '<template><td role="button"></td></template>',
    '<template><frame role="menuitem" /></template>',
    '<template><td role="menuitem"></td></template>',

    // All flavors of <input> with role="button" — jsx-a11y and ours both skip
    // (input is interactive per axobject-query, out of scope).
    '<template><input role="button" /></template>',
    '<template><input type="button" role="button" /></template>',
    '<template><input type="checkbox" role="button" /></template>',
    '<template><input type="color" role="button" /></template>',
    '<template><input type="date" role="button" /></template>',
    '<template><input type="datetime" role="button" /></template>',
    '<template><input type="datetime-local" role="button" /></template>',
    '<template><input type="email" role="button" /></template>',
    '<template><input type="file" role="button" /></template>',
    '<template><input type="hidden" role="button" /></template>',
    '<template><input type="image" role="button" /></template>',
    '<template><input type="month" role="button" /></template>',
    '<template><input type="number" role="button" /></template>',
    '<template><input type="password" role="button" /></template>',
    '<template><input type="radio" role="button" /></template>',
    '<template><input type="range" role="button" /></template>',
    '<template><input type="reset" role="button" /></template>',
    '<template><input type="search" role="button" /></template>',
    '<template><input type="submit" role="button" /></template>',
    '<template><input type="tel" role="button" /></template>',
    '<template><input type="text" role="button" /></template>',
    '<template><input type="time" role="button" /></template>',
    '<template><input type="url" role="button" /></template>',
    '<template><input type="week" role="button" /></template>',

    '<template><menuitem role="button" /></template>',
    '<template><option class="foo" role="button" /></template>',
    '<template><select class="foo" role="button"></select></template>',
    '<template><textarea class="foo" role="button"></textarea></template>',
    '<template><tr role="presentation"></tr></template>',

    // === Upstream parity — static HTML elements (neither interactive nor
    // non-interactive per jsx-a11y's map) given an interactive role. ===
    // jsx-a11y alwaysValid.
    // Ours: tags not in NON_INTERACTIVE_TAGS (aria-query has no unconstrained
    //   schema entry, or the schema entry excludes them). Skipped.
    '<template><acronym role="button"></acronym></template>',
    '<template><applet role="button"></applet></template>',
    '<template><audio role="button"></audio></template>',
    '<template><b role="button"></b></template>',
    '<template><base role="button" /></template>',
    '<template><bdi role="button"></bdi></template>',
    '<template><bdo role="button"></bdo></template>',
    '<template><big role="button"></big></template>',
    '<template><blink role="button"></blink></template>',
    '<template><canvas role="button"></canvas></template>',
    '<template><center role="button"></center></template>',
    '<template><cite role="button"></cite></template>',
    '<template><col role="button" /></template>',
    '<template><colgroup role="button"></colgroup></template>',
    '<template><content role="button"></content></template>',
    '<template><data role="button"></data></template>',
    '<template><datalist role="button"></datalist></template>',
    '<template><div role="button"></div></template>',
    '<template><div class="foo" role="button"></div></template>',
    '<template><div aria-hidden={{true}} role="button"></div></template>',
    '<template><embed role="button" /></template>',
    '<template><font role="button"></font></template>',
    '<template><frameset role="button"></frameset></template>',
    '<template><head role="button"></head></template>',
    '<template><header role="button"></header></template>',
    '<template><hgroup role="button"></hgroup></template>',
    '<template><i role="button"></i></template>',
    '<template><kbd role="button"></kbd></template>',
    '<template><keygen role="button" /></template>',
    '<template><link role="button" /></template>',
    '<template><map role="button"></map></template>',
    '<template><meta role="button" /></template>',
    '<template><noembed role="button"></noembed></template>',
    '<template><noscript role="button"></noscript></template>',
    '<template><object role="button"></object></template>',
    '<template><param role="button" /></template>',
    '<template><picture role="button"></picture></template>',
    '<template><q role="button"></q></template>',
    '<template><rp role="button"></rp></template>',
    '<template><rt role="button"></rt></template>',
    '<template><rtc role="button"></rtc></template>',
    '<template><s role="button"></s></template>',
    '<template><samp role="button"></samp></template>',
    '<template><script role="button"></script></template>',
    '<template><small role="button"></small></template>',
    '<template><source role="button" /></template>',
    '<template><spacer role="button"></spacer></template>',
    '<template><span role="button"></span></template>',
    '<template><strike role="button"></strike></template>',
    '<template><style role="button"></style></template>',
    '<template><summary role="button"></summary></template>',
    '<template><th role="button"></th></template>',
    '<template><title role="button"></title></template>',
    '<template><track role="button" /></template>',
    '<template><tt role="button"></tt></template>',
    '<template><u role="button"></u></template>',
    '<template><var role="button"></var></template>',
    '<template><video role="button"></video></template>',
    '<template><wbr role="button" /></template>',
    '<template><xmp role="button"></xmp></template>',

    // === Upstream parity — <div> is "generic" (no implicit role) ===
    // jsx-a11y alwaysValid: ANY role on <div>/<span> is fine; no collision.
    // Ours: div/span not in NON_INTERACTIVE_TAGS (generic). Skipped.
    '<template><div role="checkbox"></div></template>',
    '<template><div role="combobox"></div></template>',
    '<template><div role="grid"></div></template>',
    '<template><div role="tab"></div></template>',
    '<template><div role="presentation"></div></template>',
    // Abstract roles — jsx-a11y alwaysValid (abstract); ours skip (def.abstract).
    '<template><div role="command"></div></template>',
    '<template><div role="range"></div></template>',
    // Non-interactive roles on div — both skip.
    '<template><div role="alert"></div></template>',
    '<template><div role="article"></div></template>',
    '<template><div role="dialog"></div></template>',
    '<template><div role="heading"></div></template>',
    '<template><div role="list"></div></template>',
    '<template><div role="listitem"></div></template>',
    '<template><ul role="list"></ul></template>',

    // === Upstream parity — non-interactive element + non-interactive role ===
    // jsx-a11y alwaysValid (target role is non-interactive, so OK).
    // Ours: role is not in INTERACTIVE_ROLES, so rule doesn't flag.
    '<template><main role="listitem"></main></template>',
    '<template><article role="listitem"></article></template>',
    '<template><dd role="listitem"></dd></template>',
    '<template><dfn role="listitem"></dfn></template>',
    '<template><dt role="listitem"></dt></template>',
    '<template><fieldset role="listitem"></fieldset></template>',
    '<template><figure role="listitem"></figure></template>',
    '<template><form role="listitem"></form></template>',
    '<template><h1 role="listitem"></h1></template>',
    '<template><h2 role="listitem"></h2></template>',
    '<template><h3 role="listitem"></h3></template>',
    '<template><h4 role="listitem"></h4></template>',
    '<template><h5 role="listitem"></h5></template>',
    '<template><h6 role="listitem"></h6></template>',
    '<template><img role="listitem" alt="x" /></template>',
    '<template><li role="listitem"></li></template>',
    '<template><li role="presentation"></li></template>',
    '<template><nav role="listitem"></nav></template>',
    '<template><ol role="listitem"></ol></template>',
    '<template><table role="listitem"></table></template>',
    '<template><ul role="listitem"></ul></template>',

    // === Upstream parity — non-interactive elements with <a>/anchor-like
    // interactive roles when the element is <a> without href ===
    // jsx-a11y alwaysValid: <a role="button" /> — anchor without href has no
    //   implicit role, so ANY role is fine.
    // Ours: <a> is NOT in NON_INTERACTIVE_TAGS (the aria-query schema for <a>
    //   without href is interactive — it contributes `link` only with href, and
    //   has no unconstrained entry). Skipped.
    '<template><a role="listitem"></a></template>',
    '<template><a role="button"></a></template>',
    '<template><a role="menuitem"></a></template>',

    // === Upstream parity — dynamic role (skipped by both) ===
    '<template><h1 role={{this.role}}>Title</h1></template>',

    // === Upstream parity — empty role string ===
    // jsx-a11y: the JSX test suite does not cover empty strings here; the sibling
    //   no-interactive-to-noninteractive-role rule flags empty. Ours: skip
    //   (role trims to empty → no tokens → return).
    '<template><h1 role=""></h1></template>',

    // === DIVERGENCE — case sensitivity ===
    // jsx-a11y: role attribute is compared case-sensitively (`Button` ≠ `button`).
    //   A test like `<h1 role="Button" />` would pass silently in jsx-a11y as
    //   "not a known role". jsx-a11y's neverValid list does not exercise this.
    // Ours: we lowercase the role before lookup (matches the project's design
    //   decision captured in aria-role; see feedback_design_alignment memo).
    //   `<h1 role="BUTTON" />` is FLAGGED by our rule. Captured in invalid
    //   list — this is a divergence (stricter than jsx-a11y).

    // === DIVERGENCE — section has no implicit role per jsx-a11y's map ===
    // jsx-a11y: `<section role="button" aria-label="...">` is INVALID in jsx-a11y
    //   (section is in nonInteractiveMap). Test exists in neverValid.
    // Ours: `section` is NOT in our NON_INTERACTIVE_TAGS. axobject-query's
    //   `<section>` mapping is attribute-conditional (becomes `region` only with
    //   an accessible name), so our unconstrained-attributes filter excludes it.
    //   FALSE NEGATIVE. Captured below.
    '<template><section role="button" aria-label="Aardvark"></section></template>',

    // === DIVERGENCE — misc tags jsx-a11y flags that we don't ===
    // axobject-query assigns these tags attribute-constrained AXObjects, so
    // our "unconstrained non-interactive" filter drops them. jsx-a11y's
    // nonInteractiveMap is hand-curated and includes them. Our rule does NOT
    // flag the following; jsx-a11y DOES:
    //
    //   address, aside, code, del, em, fieldset, hr, html, ins, optgroup,
    //   output, strong, sub, sup, tbody, tfoot, thead
    //
    // These are FALSE NEGATIVES (we are looser than jsx-a11y).
    '<template><address role="button"></address></template>',
    '<template><aside role="button"></aside></template>',
    '<template><code role="button"></code></template>',
    '<template><del role="button"></del></template>',
    '<template><em role="button"></em></template>',
    '<template><fieldset role="button"></fieldset></template>',
    '<template><hr role="button" /></template>',
    '<template><html role="button"></html></template>',
    '<template><ins role="button"></ins></template>',
    '<template><optgroup role="button"></optgroup></template>',
    '<template><output role="button"></output></template>',
    '<template><strong role="button"></strong></template>',
    '<template><sub role="button"></sub></template>',
    '<template><sup role="button"></sup></template>',
    '<template><tbody role="button"></tbody></template>',
    '<template><tfoot role="button"></tfoot></template>',
    '<template><thead role="button"></thead></template>',

    // jsx-a11y flags <dd role="menuitem"> but we flag also (parity, in invalid).
    // jsx-a11y flags the following but we DO NOT (same false-negative family):
    '<template><fieldset role="menuitem"></fieldset></template>',
    '<template><hr role="menuitem" /></template>',
    '<template><tbody role="menuitem"></tbody></template>',
    '<template><tfoot role="menuitem"></tfoot></template>',
    '<template><thead role="menuitem"></thead></template>',
  ],

  invalid: [
    // === Upstream parity — non-interactive element + interactive role ===
    // jsx-a11y neverValid + ours both flag these. We use messageId "mismatch"
    // (jsx-a11y uses a message string — we don't reproduce their text).
    {
      code: '<template><article role="button"></article></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><blockquote role="button"></blockquote></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><br role="button" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><caption role="button"></caption></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dd role="button"></dd></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><details role="button"></details></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dfn role="button"></dfn></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dir role="button"></dir></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dl role="button"></dl></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dt role="button"></dt></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><figcaption role="button"></figcaption></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><figure role="button"></figure></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><footer role="button"></footer></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><form role="button"></form></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h1 role="button"></h1></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h2 role="button"></h2></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h3 role="button"></h3></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h4 role="button"></h4></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h5 role="button"></h5></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h6 role="button"></h6></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><iframe role="button"></iframe></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><img role="button" alt="x" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><label role="button"></label></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><legend role="button"></legend></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="button"></li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><main role="button"></main></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><mark role="button"></mark></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><marquee role="button"></marquee></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><menu role="button"></menu></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><meter role="button"></meter></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><nav role="button"></nav></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="button"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><p role="button"></p></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><pre role="button"></pre></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><progress role="button"></progress></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ruby role="button"></ruby></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><table role="button"></table></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><time role="button"></time></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ul role="button"></ul></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // role=menuitem on non-interactive — parity cases.
    {
      code: '<template><main role="menuitem"></main></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><article role="menuitem"></article></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dd role="menuitem"></dd></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dfn role="menuitem"></dfn></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><dt role="menuitem"></dt></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><figure role="menuitem"></figure></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><form role="menuitem"></form></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h1 role="menuitem"></h1></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h2 role="menuitem"></h2></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h3 role="menuitem"></h3></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h4 role="menuitem"></h4></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h5 role="menuitem"></h5></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><h6 role="menuitem"></h6></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><img role="menuitem" alt="x" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><nav role="menuitem"></nav></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="menuitem"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><table role="menuitem"></table></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — jsx-a11y :recommended config exceptions ===
    // jsx-a11y :recommended has an allowedInvalidRoles config so the following
    //   all pass :recommended but FAIL :strict:
    //     <ul role="menu|menubar|radiogroup|tablist|tree|treegrid" />
    //     <ol role="menu|menubar|radiogroup|tablist|tree|treegrid" />
    //     <li role="tab|menuitem|menuitemcheckbox|menuitemradio|row|treeitem" />
    //     <fieldset role="radiogroup|presentation" />
    // Our rule has no options schema; it always behaves like :strict.
    // All of these are FLAGGED by our rule — matches :strict, diverges from
    // :recommended.
    {
      code: '<template><ul role="menu"></ul></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ul role="menubar"></ul></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ul role="radiogroup"></ul></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ul role="tablist"></ul></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ul role="tree"></ul></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ul role="treegrid"></ul></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="menu"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="menubar"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="radiogroup"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="tablist"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="tree"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><ol role="treegrid"></ol></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="tab"></li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="menuitem"></li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="menuitemcheckbox"></li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="menuitemradio"></li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="row"></li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><li role="treeitem"></li></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — PascalCase components whose lowercased name matches
    // an HTML non-interactive tag ===
    // jsx-a11y: `<Article role="button" />` is treated as a custom component
    //   identifier (uppercase) — NOT mapped to <article>. Only flagged when
    //   settings.components maps it. By default it's VALID.
    //   The jsx-a11y test file DOES flag `<Article role="button" />` but only
    //   when the componentsSettings={Article:'article'} setting is enabled.
    // Ours: `node.tag.toLowerCase()` normalizes "Article" → "article", which
    //   IS in our NON_INTERACTIVE_TAGS set. So we FLAG these without needing
    //   any component-mapping configuration. This is a divergence — we over-
    //   flag PascalCase components whose name coincidentally matches a
    //   non-interactive HTML tag (Article, Form, Table, etc.). FALSE POSITIVE.
    {
      code: '<template><Article role="button" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — <tr> on ours, not on jsx-a11y ===
    // jsx-a11y alwaysValid: `<tr role="button" />` and `<tr role="presentation" />`.
    //   jsx-a11y treats <tr> as either "interactive" or "static" depending on
    //   nesting — their interactiveMap conditional on parent <table role="grid">
    //   is punted to VALID when the parent isn't introspectable. Net effect:
    //   `<tr role="button" />` is VALID.
    // Ours: `tr` is in NON_INTERACTIVE_TAGS (axobject-query: row type=structure
    //   with no unconstrained widget variant). We FLAG. Divergence.
    // (`<tr role="presentation">` passes ours because "presentation" is not
    //  in INTERACTIVE_ROLES; see valid list above.)
    {
      code: '<template><tr role="button"></tr></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — case-insensitive role matching ===
    // jsx-a11y: compares roles case-sensitively; unknown role → no flag.
    //   (The test `<h1 role="BUTTON" />` would pass jsx-a11y silently.)
    // Ours: lowercases the role before lookup → FLAGS. Intentional project
    //   convention (see feedback_design_alignment memo on case handling).
    {
      code: '<template><h1 role="BUTTON"></h1></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === Role-fallback list (ARIA 1.2 §5.4) — both flag ===
    // jsx-a11y: splits role on whitespace and checks each token; first
    //   recognised interactive role → flag.
    // Ours: same (tokens.loop → first non-abstract role → check).
    {
      code: '<template><h1 role="button heading">Click</h1></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === AUDIT-SKIP — JSX-only constructs in jsx-a11y source ===
    // - `<div {...props} role="button" />` and variants: JSX spread operator.
    //   HBS/GTS has no direct equivalent on native DOM elements. jsx-a11y
    //   alwaysValid for these; untranslatable.
    // - `<div role={undefined} role="button" />`: JSX duplicate-attribute
    //   syntax. Glimmer rejects duplicate attributes at parse time.
    // - `<Input role="button" />` with settings={'jsx-a11y':{components:{Input:'input'}}}:
    //   jsx-a11y's component-to-HTML aliasing. We have no such feature —
    //   PascalCase tags are simply lowercased and looked up as DOM tags
    //   (which is why `<Article>` surfaces as a divergence above).
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-noninteractive-element-to-interactive-role (hbs)', rule, {
  valid: [
    // Components / PascalCase that DO NOT coincide with non-interactive tags.
    '<Button @onClick={{this.doFoo}} />',
    '<Component role="treeitem" />',

    // Interactive elements with interactive role — out of scope.
    '<a href="http://x.y.z" role="button"></a>',
    '<button class="foo" role="button">Click</button>',
    '<input role="button" />',
    '<input type="checkbox" role="button" />',
    '<select class="foo" role="button"></select>',
    '<textarea role="button"></textarea>',
    '<td role="button"></td>',
    '<tr role="presentation"></tr>',

    // Static / generic HTML elements with interactive role — both skip.
    '<div role="button"></div>',
    '<span role="button"></span>',
    '<canvas role="button"></canvas>',

    // Non-interactive element + non-interactive role — both skip.
    '<h1 role="listitem"></h1>',
    '<article role="listitem"></article>',
    '<ul role="listitem"></ul>',

    // Dynamic role — both skip.
    '<h1 role={{this.role}}></h1>',
    // Empty role — ours skip; jsx-a11y doesn't cover.
    '<h1 role=""></h1>',

    // DIVERGENCE: jsx-a11y flags these (per nonInteractiveMap); ours do not.
    '<section role="button" aria-label="A"></section>',
    '<address role="button"></address>',
    '<aside role="button"></aside>',
    '<fieldset role="button"></fieldset>',
    '<code role="button"></code>',
    '<em role="button"></em>',
    '<strong role="button"></strong>',
    '<tbody role="button"></tbody>',
    '<tfoot role="button"></tfoot>',
    '<thead role="button"></thead>',
    '<hr role="button" />',
    '<html role="button"></html>',
    '<del role="button"></del>',
    '<ins role="button"></ins>',
    '<optgroup role="button"></optgroup>',
    '<output role="button"></output>',
    '<sub role="button"></sub>',
    '<sup role="button"></sup>',
  ],
  invalid: [
    // Upstream parity — non-interactive + interactive role.
    {
      code: '<h1 role="button">Click</h1>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<article role="button"></article>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<img role="button" alt="x" />',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<ul role="button"></ul>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<nav role="button"></nav>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<p role="button"></p>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // DIVERGENCE: :recommended allows these; :strict and ours flag.
    {
      code: '<ul role="menu"></ul>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<li role="tab"></li>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<li role="treeitem"></li>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // DIVERGENCE: PascalCase normalized to lowercase tag.
    {
      code: '<Article role="button" />',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // DIVERGENCE: <tr role="button"> — ours flag, jsx-a11y doesn't.
    {
      code: '<tr role="button"></tr>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});
