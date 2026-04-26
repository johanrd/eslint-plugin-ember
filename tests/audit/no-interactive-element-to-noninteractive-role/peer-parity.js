// Audit fixture — translated test cases from jsx-a11y to measure behavioral
// parity of `ember/template-no-interactive-element-to-noninteractive-role`
// against jsx-a11y/no-interactive-element-to-noninteractive-role.
//
// vuejs-accessibility and lit-a11y do not ship this rule; jsx-a11y is the
// only peer source.
//
// These tests are NOT part of the main CI suite — they live under tests/audit/
// and encode the CURRENT behavior of our rule so that running this file
// reports pass. Each divergence from jsx-a11y is annotated with a
// "DIVERGENCE —" block.
//
// Source file (context/ checkout):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/no-interactive-element-to-noninteractive-role-test.js
//
// Rule under test:
//   - lib/rules/template-no-interactive-element-to-noninteractive-role.js
//     (feat/template-no-interactive-to-noninteractive-role, PR #20).
//     As of d250fa0c the rule excludes <canvas> from interactive tags, and
//     gates <audio>/<video> interactivity on the `controls` attribute. Both
//     are deliberate deviations from jsx-a11y's alwaysInteractive set to fix
//     known false positives (<canvas role="img">, <video role="presentation">
//     on background media).

'use strict';

const rule = require('../../../lib/rules/template-no-interactive-element-to-noninteractive-role');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-interactive-element-to-noninteractive-role (gts)', rule, {
  valid: [
    // === Upstream parity — components / custom tags ===
    // jsx-a11y: VALID (PascalCase identifier, not a DOM element).
    // Ours: VALID (no aria-query schema match, no AX fallback).
    '<template><TestComponent @onClick={{this.doFoo}} /></template>',
    '<template><Button @onClick={{this.doFoo}} /></template>',

    // === Upstream parity — interactive element + interactive role ===
    // jsx-a11y alwaysValid: interactive role on an interactive element is fine.
    '<template><a href="http://x.y.z" role="button"></a></template>',
    '<template><a href="http://x.y.z" tabindex="0" role="button"></a></template>',
    '<template><button class="foo" role="button">Click</button></template>',

    // All flavors of <input> with an interactive role. jsx-a11y lists every
    // input type explicitly; we replicate to pin that our aria-query-driven
    // schema match is stable across the type matrix.
    '<template><input role="button" /></template>',
    '<template><input type="button" role="button" /></template>',
    '<template><input type="checkbox" role="button" /></template>',
    '<template><input type="color" role="button" /></template>',
    '<template><input type="date" role="button" /></template>',
    '<template><input type="datetime" role="button" /></template>',
    '<template><input type="datetime-local" role="button" /></template>',
    '<template><input type="email" role="button" /></template>',
    '<template><input type="file" role="button" /></template>',
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
    // <input type="hidden"> — jsx-a11y alwaysValid (interactive role on
    // interactive element). Ours: we short-circuit hidden as non-interactive,
    // so this is also not flagged. Parity (by different paths).
    '<template><input type="hidden" role="button" /></template>',

    // Other interactive elements (AX-fallback) with interactive role.
    '<template><menuitem role="button" /></template>',
    '<template><option class="foo" role="button" /></template>',
    '<template><select class="foo" role="button"></select></template>',
    '<template><textarea class="foo" role="button"></textarea></template>',
    '<template><tr role="button" /></template>',

    // === Upstream parity — static HTML elements (neither interactive nor
    // non-interactive per jsx-a11y's map). These are valid with ANY role. ===
    '<template><a role="button"></a></template>',
    '<template><a role="img"></a></template>',
    '<template><a tabindex="0" role="button"></a></template>',
    '<template><a tabindex="0" role="img"></a></template>',
    '<template><address role="button"></address></template>',
    '<template><aside role="button"></aside></template>',
    '<template><b role="button"></b></template>',
    '<template><bdi role="button"></bdi></template>',
    '<template><bdo role="button"></bdo></template>',
    '<template><blockquote role="button"></blockquote></template>',
    '<template><body role="button"></body></template>',
    '<template><br role="button" /></template>',
    '<template><caption role="button"></caption></template>',
    '<template><cite role="button"></cite></template>',
    '<template><code role="button"></code></template>',
    '<template><col role="button" /></template>',
    '<template><colgroup role="button"></colgroup></template>',
    '<template><data role="button"></data></template>',
    '<template><datalist role="button"></datalist></template>',
    '<template><del role="button"></del></template>',
    '<template><details role="button"></details></template>',
    '<template><div role="button"></div></template>',
    '<template><div class="foo" role="button"></div></template>',
    '<template><div aria-hidden={{true}} role="button"></div></template>',
    '<template><dl role="button"></dl></template>',
    '<template><em role="button"></em></template>',
    '<template><figcaption role="button"></figcaption></template>',
    '<template><footer role="button"></footer></template>',
    '<template><head role="button"></head></template>',
    '<template><header role="button"></header></template>',
    '<template><hgroup role="button"></hgroup></template>',
    '<template><html role="button"></html></template>',
    '<template><i role="button"></i></template>',
    '<template><iframe role="button"></iframe></template>',
    '<template><ins role="button"></ins></template>',
    '<template><kbd role="button"></kbd></template>',
    '<template><label role="button"></label></template>',
    '<template><legend role="button"></legend></template>',
    '<template><link role="button" /></template>',
    '<template><map role="button"></map></template>',
    '<template><mark role="button"></mark></template>',
    '<template><menu role="button"></menu></template>',
    '<template><meta role="button" /></template>',
    '<template><meter role="button"></meter></template>',
    '<template><noscript role="button"></noscript></template>',
    '<template><object role="button"></object></template>',
    '<template><optgroup role="button"></optgroup></template>',
    '<template><output role="button"></output></template>',
    '<template><p role="button"></p></template>',
    '<template><param role="button" /></template>',
    '<template><picture role="button"></picture></template>',
    '<template><pre role="button"></pre></template>',
    '<template><progress role="button"></progress></template>',
    '<template><q role="button"></q></template>',
    '<template><rp role="button"></rp></template>',
    '<template><rt role="button"></rt></template>',
    '<template><ruby role="button"></ruby></template>',
    '<template><s role="button"></s></template>',
    '<template><samp role="button"></samp></template>',
    '<template><script role="button"></script></template>',
    '<template><section role="button"></section></template>',
    '<template><small role="button"></small></template>',
    '<template><source role="button" /></template>',
    '<template><span role="button"></span></template>',
    '<template><strong role="button"></strong></template>',
    '<template><style role="button"></style></template>',
    '<template><sub role="button"></sub></template>',
    '<template><summary role="button"></summary></template>',
    '<template><sup role="button"></sup></template>',
    '<template><time role="button"></time></template>',
    '<template><title role="button"></title></template>',
    '<template><track role="button" /></template>',
    '<template><u role="button"></u></template>',
    '<template><var role="button"></var></template>',
    '<template><wbr role="button" /></template>',

    // === DIVERGENCE — <canvas> (intentional, PR #20 tightening) ===
    // jsx-a11y alwaysValid: <canvas role="button" /> is VALID (canvas is
    //   static in jsx-a11y's element map).
    // Ours: VALID — canvas is in EXCLUDED_AX_FALLBACK_TAGS. Match.
    '<template><canvas role="button"></canvas></template>',

    // === DIVERGENCE — <audio>/<video> without controls (intentional, PR #20) ===
    // jsx-a11y alwaysValid: <audio role="button" /> and <video role="button" />
    //   are VALID as "static" in its map. (jsx-a11y's own interactive tag list
    //   does NOT include audio/video by default, so any role is fine.)
    // Ours: VALID — audio/video without `controls` are treated as
    //   non-interactive (CONTROLS_GATED_TAGS). Match on these literal cases;
    //   diverges from jsx-a11y on <video controls role="presentation">
    //   (we flag; jsx-a11y does not). See invalid section.
    '<template><audio role="button"></audio></template>',
    '<template><video role="button"></video></template>',

    // === DIVERGENCE — <embed> ===
    // jsx-a11y alwaysValid: <embed role="button" /> — static in its map.
    // Ours: INVALID — aria-query/axobject-query put <embed> in AX_FALLBACK_TAGS
    //   (widget AXObject). Role="button" is interactive → no flag. VALID for
    //   THIS case; but <embed role="img" /> would flag (see invalid section).
    '<template><embed role="button" /></template>',

    // === Skip in jsx-a11y too — div with unknown role ===
    // jsx-a11y alwaysValid: role-on-div-unknown is ignored because div has no
    // implicit role to collide with.
    // Ours: div is not interactive, so never flagged.
    '<template><div role="checkbox"></div></template>',
    '<template><div role="listbox"></div></template>',
    '<template><div role="presentation"></div></template>',
    '<template><div role="article"></div></template>',
    '<template><div role="banner"></div></template>',
    '<template><div role="document"></div></template>',
    '<template><div role="img"></div></template>',

    // === Upstream parity — non-interactive elements with non-interactive role ===
    // jsx-a11y alwaysValid — `<main role="button">` etc. (non-interactive
    // elements given interactive roles — handled by the SIBLING rule
    // `no-noninteractive-element-to-interactive-role`, not this one).
    // For OUR rule: these are non-interactive elements, not in scope. VALID.
    '<template><main role="button"></main></template>',
    '<template><article role="button"></article></template>',
    '<template><h1 role="button">h</h1></template>',
    '<template><img role="button" alt="x" /></template>',
    '<template><li role="button"></li></template>',
    '<template><li role="presentation"></li></template>',
    '<template><nav role="button"></nav></template>',
    '<template><ol role="button"></ol></template>',
    '<template><table role="button"></table></template>',
    '<template><tbody role="button"></tbody></template>',
    '<template><tfoot role="button"></tfoot></template>',
    '<template><thead role="button"></thead></template>',
    '<template><ul role="button"></ul></template>',

    // === Upstream parity — dynamic role (skipped by both) ===
    '<template><button role={{this.role}}>Click</button></template>',

    // === DIVERGENCE — jsx-a11y "recommended" config exceptions ===
    // jsx-a11y :recommended has an allowedInvalidRoles config so that:
    //   <tr role="presentation" /> → VALID (recommended), INVALID (strict)
    //   <canvas role="img" />      → VALID (recommended), INVALID (strict)
    // Ours: no options schema; ALWAYS evaluates like jsx-a11y :strict except
    //   for the canvas/audio/video carve-outs documented above.
    //   <canvas role="img" />: we VALID (canvas excluded from interactive).
    //     → Matches jsx-a11y :recommended; diverges from jsx-a11y :strict.
    //   <tr role="presentation" />: we INVALID (see invalid list).
    //     → Matches jsx-a11y :strict; diverges from jsx-a11y :recommended.
    '<template><canvas role="img"></canvas></template>',
  ],

  invalid: [
    // === Upstream parity — interactive element + non-interactive role ===
    // Every case below mirrors jsx-a11y's `neverValid` list.

    // Anchor with href (interactive) + non-interactive role.
    {
      code: '<template><a href="http://x.y.z" role="img"></a></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><a href="http://x.y.z" tabindex="0" role="img"></a></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><a href="http://x.y.z" role="listitem"></a></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // <input> flavors. jsx-a11y tests every type; we sample representative
    // ones — the aria-query schema lookup is the same codepath, duplicating
    // every type here would just bloat the fixture.
    {
      code: '<template><input role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><input type="checkbox" role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><input type="radio" role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><input type="text" role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><input type="submit" role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><input type="image" role="listitem" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // Other interactive elements with non-interactive role.
    {
      code: '<template><menuitem role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><option class="foo" role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><select class="foo" role="img"></select></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><textarea class="foo" role="img"></textarea></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><tr role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><tr role="listitem" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — <tr role="presentation"> ===
    // jsx-a11y :recommended: VALID (allowedInvalidRoles exception).
    // jsx-a11y :strict: INVALID.
    // Ours: INVALID (no options schema; rule flags all non-interactive roles
    //   on interactive elements). Matches :strict, diverges from :recommended.
    {
      code: '<template><tr role="presentation" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — <video controls role="presentation"> ===
    // jsx-a11y alwaysValid: treats video as static regardless of controls.
    // Ours: INVALID — with `controls`, <video> has user-operable playback UI;
    //   stripping semantics with role="presentation" is wrong.
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

    // === DIVERGENCE — <embed>, <summary> — AX-tree-derived interactivity ===
    // jsx-a11y alwaysValid: <embed role="button">, <summary role="button"> —
    //   treated as "static" in jsx-a11y's interactiveMap, so ANY role is ok,
    //   including non-interactive. With role="img" jsx-a11y stays VALID.
    // Ours: axobject-query lists <embed> and <summary> as widget AXObjects;
    //   our AX_FALLBACK_TAGS captures them. We therefore FLAG
    //   <embed role="img"> / <summary role="img">. These are divergences
    //   (potential false positives) — the author of jsx-a11y chose to model
    //   <embed> and <summary> as static based on real-world usage.
    {
      code: '<template><embed role="img" /></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><summary role="img"></summary></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — <td>, <th> — aria-query interactive schemas ===
    // jsx-a11y alwaysValid: <td role="button" /> is VALID (jsx-a11y's map
    //   does not list td/th as alwaysInteractive; their implicit role depends
    //   on parent <table>, so jsx-a11y punts on them).
    // Ours: aria-query's elementRoles entry {name:'td'}→gridcell (widget) is
    //   unconstrained; our schema match treats ANY <td> as interactive. Same
    //   for <th>→columnheader (widget, also widget-descended in aria-query).
    //   We therefore FLAG <td role="img"> and <th role="img">. jsx-a11y does
    //   not. This is a divergence (potential false positive on plain table
    //   cells outside of grids).
    {
      code: '<template><td role="img"></td></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<template><th role="img"></th></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — <datalist> ===
    // jsx-a11y: does not include <datalist> in either interactiveMap or
    //   nonInteractiveMap — treated as static, so VALID with any role.
    //   (jsx-a11y has no test for <datalist role="img">.)
    // Ours: aria-query maps <datalist> → listbox (widget). We FLAG.
    //   Minor divergence, tracked here for completeness.
    {
      code: '<template><datalist role="img"></datalist></template>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // === DIVERGENCE — <input type="hidden" role="img"> ===
    // jsx-a11y neverValid: INVALID.
    // Ours: VALID — explicit guard treats type=hidden as non-interactive
    //   (no user-facing surface). The upstream author's rationale is that
    //   hidden input is still "interactive in principle"; ours says "never
    //   rendered, so never a real interactive surface". Deliberate divergence.
    //
    // Captured below in the `empty string / hidden` section as VALID for our
    // rule (cannot appear in the invalid array for this RuleTester run).

    // === AUDIT-SKIP — JSX-only constructs in jsx-a11y source ===
    // - `<div {...props} role="button" />` and variants: JSX spread operator.
    //   HBS/GTS has no direct equivalent on native DOM elements.
    // - `<div role={undefined} role="button" />`: JSX duplicate-attribute
    //   syntax. Glimmer rejects duplicate attributes at parse time.
    // - `<div mynamespace:role="term" />`: namespaced attribute (XML form).
    //   HBS doesn't use the xmlns-style colon on attributes.
    // - `<Link href="..." role="img" />` with settings.components mapping:
    //   jsx-a11y's component-to-HTML aliasing feature. We don't support it.
    //   PascalCase tags are always treated as non-HTML and skipped by ours.
  ],
});

// === DIVERGENCE — <input type="hidden" role="img"> ===
// Captured separately so the intent is unambiguous — jsx-a11y flags this,
// we don't.
ruleTester.run('audit:no-interactive-element-to-noninteractive-role input-hidden (gts)', rule, {
  valid: ['<template><input type="hidden" role="img" /></template>'],
  invalid: [],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-interactive-element-to-noninteractive-role (hbs)', rule, {
  valid: [
    // Components / PascalCase — skipped (same as gts).
    '<Button @onClick={{this.doFoo}} />',

    // Interactive element + interactive role — parity.
    '<a href="http://x.y.z" role="button"></a>',
    '<button role="button">Click</button>',
    '<input type="checkbox" role="switch" />',
    '<select role="listbox"><option>1</option></select>',
    '<textarea role="textbox"></textarea>',
    '<tr role="row"></tr>',

    // Static HTML elements — any role is fine (they have no implicit role).
    '<div role="button"></div>',
    '<span role="button"></span>',
    '<section role="button"></section>',

    // DIVERGENCE: canvas excluded from interactive (PR #20).
    '<canvas role="img"></canvas>',
    '<canvas role="presentation"></canvas>',

    // DIVERGENCE: audio/video without controls treated as non-interactive.
    '<video role="presentation" src="/x.mp4"></video>',
    '<audio role="presentation" src="/x.mp3"></audio>',

    // DIVERGENCE: input[type=hidden] treated as non-interactive by ours;
    // jsx-a11y flags this.
    '<input type="hidden" role="img" />',

    // Dynamic role — skipped by both peer and us.
    '<button role={{this.role}}>Click</button>',

    // Non-interactive element + any role — out of scope for this rule.
    '<h1 role="button">h</h1>',
    '<ul role="button"></ul>',
  ],
  invalid: [
    // Interactive + non-interactive role.
    {
      code: '<a href="/x" role="img"></a>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<button role="article">Click</button>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<input type="text" role="listitem" />',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<select role="img"></select>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: '<tr role="listitem"></tr>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // DIVERGENCE: recommended in jsx-a11y allows these; strict and ours flag.
    {
      code: '<tr role="presentation"></tr>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },

    // DIVERGENCE: <video controls> / <audio controls> flagged by ours, valid
    // in jsx-a11y.
    {
      code: '<video controls role="presentation" src="/x.mp4"></video>',
      output: null,
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});
