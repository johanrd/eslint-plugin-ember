// Audit fixture — translates peer-plugin test cases into assertions against
// our rule. Runs as part of the default Vitest suite (via the `tests/**/*.js`
// include glob) and serves double-duty: (1) auditable record of peer-parity
// divergences, (2) regression coverage pinning CURRENT behavior. Each case
// encodes what OUR rule does today; divergences from upstream plugins are
// annotated as `DIVERGENCE —`. Peer-only constructs that can't be translated
// to Ember templates (JSX spread props, Vue v-bind, Angular `$event`,
// undefined-handler expression analysis) are marked `AUDIT-SKIP`.
//
// Peers covered: the `invalidHref` aspect of jsx-a11y/anchor-is-valid and
// lit-a11y/anchor-is-valid.
//
// SCOPE — `invalidHref` aspect ONLY. The upstream jsx-a11y rule has three
// aspects: `noHref` (missing href), `invalidHref` (placeholder/js-protocol),
// and `preferButton` (anchor used with onClick instead of navigation). We only
// port the `invalidHref` aspect; `noHref` and `preferButton` are out of scope
// for this rule (and for this fixture).
//
// Source files (context/ checkouts):
//   - eslint-plugin-jsx-a11y-main/__tests__/src/rules/anchor-is-valid-test.js
//   - eslint-plugin-lit-a11y/tests/lib/rules/anchor-is-valid.js
//
// Translation rules (JSX/lit-html → Glimmer):
//   - `<a href="foo" />`            → `<a href="foo"></a>`
//   - `<a href={foo} />`             → `<a href={{this.foo}}></a>` (dynamic)
//   - `<a href={"foo"} />`           → `<a href="foo"></a>` (static literal)
//   - `<a href={undefined|null} />`  → SKIPPED. Glimmer has no equivalent; the
//     closest analogue is a missing href attribute, which is out of scope.
//   - Cases with `onClick` / `@click=${foo}` are `preferButton` concerns —
//     dropped entirely.
//   - Cases with aspect options other than a bare `invalidHref` are dropped or
//     normalized: our rule takes no options and always runs in `invalidHref`
//     mode.

'use strict';

const rule = require('../../../lib/rules/template-no-invalid-link-href');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:anchor-is-valid invalidHref (gts)', rule, {
  valid: [
    // === Upstream parity (valid in jsx-a11y + lit-a11y and us) ===
    // Relative path.
    '<template><a href="foo"></a></template>',
    '<template><a href="/foo"></a></template>',
    // Absolute URL.
    '<template><a href="https://foo.bar.com"></a></template>',
    // Fragment with a target (not bare "#").
    '<template><a href="#foo"></a></template>',
    '<template><a href="#section"></a></template>',
    // "javascript" as a relative path token (no colon) — allowed by both peers
    // and us (we only flag the `javascript:` *protocol*).
    '<template><a href="javascript"></a></template>',
    '<template><a href="javascriptFoo"></a></template>',
    '<template><a href="#javascript"></a></template>',
    '<template><a href="#javascriptFoo"></a></template>',

    // jsx-a11y: `<div href="foo" />` — irrelevant because the rule only
    // operates on <a>. We also only operate on <a>.
    '<template><div href="foo"></div></template>',

    // Scheme-y, common valid hrefs — not in upstream test files directly but
    // included because our rule explicitly permits them and they are the
    // obvious counterparts to the blocked `javascript:` protocol.
    '<template><a href="mailto:a@example.com"></a></template>',
    '<template><a href="tel:+47123"></a></template>',

    // === Dynamic href — skipped by all three plugins ===
    // jsx-a11y: `<a href={foo} />` — dynamic JSX expression, jsx-a11y cannot
    // statically determine the value, so it does not flag.
    // lit-a11y: `<a href=${foo} />` — same behavior.
    // Ours: Mustache/Concat with mustache → getStaticHrefValue returns
    // undefined → we skip.
    '<template><a href={{this.url}}></a></template>',
    '<template><a href="{{this.prefix}}/path"></a></template>',

    // === jsx-a11y: `<a href={this} />` is considered dynamic-and-skipped. ===
    // Closest Glimmer analogue is `{{this}}` but that's not valid in a path
    // context. We cover the dynamic case generically above.
  ],

  invalid: [
    // === Upstream parity: empty href ===
    // jsx-a11y: INVALID — `<a href="" />` reported as invalidHref.
    // lit-a11y: INVALID — same.
    // Ours: flagged.
    {
      code: '<template><a href=""></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },

    // === Upstream parity: bare "#" ===
    // jsx-a11y: INVALID (hard-coded `value === '#'`).
    // lit-a11y: VALID by default; only INVALID when `allowHash: false` is set.
    //   This is a DIVERGENCE between lit-a11y and jsx-a11y; we align with
    //   jsx-a11y (always flag `#`).
    // Ours: flagged.
    {
      code: '<template><a href="#"></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },

    // === Upstream parity: javascript: protocol ===
    // jsx-a11y: INVALID (regex `/^\W*?javascript:/`, case-sensitive).
    // lit-a11y: INVALID.
    // Ours: flagged.
    {
      code: '<template><a href="javascript:void(0)"></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },

    // === Upstream parity: string-literal expression wrapping "#" or js: ===
    // jsx-a11y: INVALID — `<a href={"#"} />` and `<a href={"javascript:void(0)"} />`
    //   are flagged because `getPropValue` unwraps the literal.
    // Ours: we only statically resolve GlimmerTextNode / static ConcatStatement;
    //   a bare `{{ "#" }}` mustache would be dynamic and skipped. The closest
    //   Glimmer analogue that preserves the intent (a literal `#`) is the
    //   direct form `href="#"`, already covered above.
    // No separate case — this collapses into the direct-string case in HBS.

    // === DIVERGENCE — "#!" (common hash-bang placeholder) ===
    // jsx-a11y: VALID — only exact `#` is flagged; `#!` passes through.
    // lit-a11y: VALID (same — and lit-a11y does not even flag `#` by default).
    // Ours: INVALID — we explicitly flag `#!` as a placeholder, because
    //   `<a href="#!">` is a well-known "no-op link" pattern. INTENTIONAL
    //   STRICTER BEHAVIOR.
    {
      code: '<template><a href="#!"></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },

    // === DIVERGENCE — whitespace-only href ===
    // jsx-a11y: VALID — `value.length > 0` so `"   "` passes the empty check,
    //   and it does not match the javascript regex, so no flag.
    // lit-a11y: VALID — same reasoning.
    // Ours: INVALID — we trim before the empty check, so `"   "` is treated
    //   as empty. STRICTER BEHAVIOR (arguably a bug fix; whitespace-only href
    //   is functionally equivalent to empty).
    {
      code: '<template><a href="   "></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },

    // === DIVERGENCE — case-insensitive javascript: protocol ===
    // jsx-a11y: VALID — regex has no `i` flag, so `JAVASCRIPT:alert(1)` is NOT
    //   flagged. This is arguably a bug in jsx-a11y: browsers treat URL
    //   schemes case-insensitively, so `JAVASCRIPT:` executes the same.
    // lit-a11y: VALID — same regex behavior as jsx-a11y.
    // Ours: INVALID — our regex has the `i` flag. STRICTER / MORE CORRECT.
    {
      code: '<template><a href="JavaScript:alert(1)"></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<template><a href="JAVASCRIPT:void(0)"></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },

    // === Upstream parity: obfuscated javascript: with leading whitespace ===
    // jsx-a11y: INVALID — `/^\W*?javascript:/` matches leading whitespace
    //   (e.g. `" javascript:void(0)"`).
    // lit-a11y: INVALID — same.
    // Ours: INVALID — same regex shape, plus the `i` flag noted above.
    {
      code: '<template><a href=" javascript:void(0)"></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },

    // === DIVERGENCE — valueless href attribute ===
    // jsx-a11y: a valueless `<a href />` is `getPropValue() === true` (a boolean),
    //   which fails the `typeof value === 'string'` check → NOT flagged by the
    //   invalidHref aspect. (It would be caught by `noHref`, which is out of
    //   scope here.)
    // lit-a11y: similar — valueless attribute is treated as present-but-not-a-string.
    // Ours: INVALID — `getStaticHrefValue` returns `''` for a missing
    //   value node, which then fails the empty-string check. STRICTER.
    {
      code: '<template><a href></a></template>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:anchor-is-valid invalidHref (hbs)', rule, {
  valid: [
    // Upstream parity — relative / absolute / fragment / scheme links.
    '<a href="foo"></a>',
    '<a href="/foo"></a>',
    '<a href="https://foo.bar.com"></a>',
    '<a href="#foo"></a>',
    '<a href="mailto:a@example.com"></a>',
    '<a href="tel:+47123"></a>',
    // Dynamic — all plugins skip.
    '<a href={{this.url}}></a>',
    // Non-anchor out of scope.
    '<div href="#"></div>',
  ],
  invalid: [
    // Upstream parity.
    {
      code: '<a href=""></a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<a href="#"></a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    {
      code: '<a href="javascript:void(0)"></a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    // DIVERGENCE (stricter): `#!`.
    {
      code: '<a href="#!"></a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    // DIVERGENCE (stricter): case-insensitive javascript:.
    {
      code: '<a href="JavaScript:alert(1)"></a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
    // DIVERGENCE (stricter): whitespace-only.
    {
      code: '<a href="   "></a>',
      output: null,
      errors: [{ messageId: 'invalidHref' }],
    },
  ],
});
