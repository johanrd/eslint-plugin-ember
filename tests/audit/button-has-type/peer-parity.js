// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-require-button-type` against
// angular-eslint/button-has-type.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Peer scope: single-peer (Angular only). jsx-a11y does not ship a
// `button-has-type` rule — the similar rule lives in `eslint-plugin-react`
// (a separate plugin outside the a11y family) and is not mirrored here.
// vuejs-accessibility and lit-a11y have no equivalent rule.
//
// Source files (context/ checkouts):
//   - angular-eslint-main/packages/eslint-plugin-template/tests/rules/button-has-type/cases.ts
//
// Translation notes:
//   - Angular `(click)="onClick()"` event bindings are dropped — the rule does
//     not inspect clicks, only the `type` attribute. Removing the binding keeps
//     the test focused on the actual behavior under audit.
//   - Angular `[attr.type]="'button'"` (property-binding with a string literal)
//     has no direct Ember analogue. In Glimmer, the equivalent patterns are
//     `type={{"button"}}` (mustache literal) or `type="{{this.kind}}"` (concat),
//     and these are *dynamic* from our rule's point of view, so they are
//     skipped — not validated — regardless of the bound value. Captured below.
//   - `ignoreWithDirectives` is an Angular-specific rule option tied to
//     Angular structural/attribute directives. No analogue; not translated.
//   - PascalCase `<Button />` in Glimmer is a component invocation, not the
//     native `<button>` element, so our rule ignores it (`node.tag !== 'button'`).
//     Angular does not have an equivalent concept at the template level.

'use strict';

const rule = require('../../../lib/rules/template-require-button-type');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:button-has-type (gts)', rule, {
  valid: [
    // === Upstream parity (valid in both angular-eslint and us) ===
    // Literal type="button" | "submit" | "reset" → valid.
    '<template><button type="button"></button></template>',
    '<template><button type="submit"></button></template>',
    '<template><button type="reset"></button></template>',
    '<template><button type="button">label</button></template>',

    // With additional static attributes — still valid because type is present
    // and valid. Angular: `<button class="primary" type="submit"></button>`.
    '<template><button class="primary" type="submit"></button></template>',

    // Angular: `<button [disabled]="true" [attr.type]="'button'"></button>`.
    // Translation: the key assertion is "type is set to a valid literal". The
    // disabled prop is irrelevant; keep a representative Glimmer form.
    '<template><button disabled type="button"></button></template>',

    // === DIVERGENCE — dynamic type values ===
    // Angular: `<button [attr.type]="'button'"></button>` — angular-eslint
    //   statically evaluates the bound *string literal* and treats it as valid.
    //   It also flags invalid *static* bound values (see invalid section).
    // Our rule: explicitly skips dynamic type values (mustache in any form),
    //   see the trailing comment in the rule implementation. We neither flag
    //   nor validate. This is more permissive than angular-eslint when the
    //   bound expression is a literal the peer could prove is invalid, but it
    //   is also safer — we don't attempt to evaluate Glimmer expressions.
    '<template><button type={{this.buttonType}}></button></template>',
    '<template><button type="{{this.buttonType}}"></button></template>',
    // Mustache literal string — still dynamic from our rule's POV.
    '<template><button type={{"button"}}></button></template>',

    // === DIVERGENCE — component invocations (PascalCase) ===
    // Angular has no template-level concept of "component vs native element"
    //   that matters to this rule: `<BUTTON>` in their fixtures is literally
    //   the native button element with an uppercase tag (HTML parses this as
    //   `button`). Angular flags it the same as `<button>`.
    // Our rule: only matches `node.tag === 'button'` (lowercase) in Glimmer's
    //   AST, where `<Button />` is an Ember component invocation. We skip it.
    //   This is correct for Glimmer semantics but is a *scope* divergence.
    '<template><Button /></template>',
    '<template><MyButton type="foo" /></template>',

    // === DIVERGENCE — uppercase <BUTTON> ===
    // Angular: FLAGS `<BUTTON></BUTTON>` as missing type (HTML-normalized).
    // Our rule: In Glimmer, `<BUTTON>` would be parsed as a component-like
    //   tag (PascalCase-ish — anything starting with an uppercase letter is a
    //   component invocation). `node.tag` is literally 'BUTTON', not 'button',
    //   so our guard `node.tag !== 'button'` skips it.
    // (Captured here as valid-because-we-skip, not a behavioral parity case.)
    '<template><BUTTON></BUTTON></template>',
  ],
  invalid: [
    // === Upstream parity (invalid in both angular-eslint and us) ===
    // Angular: `<button></button>` → missingType.
    {
      code: '<template><button></button></template>',
      output: '<template><button type="button"></button></template>',
      errors: [{ messageId: 'missing' }],
    },

    // Angular: `<button (click)="onClick()"></button>` → missingType.
    // Translation: drop the click binding. The remaining assertion — "button
    // with other attributes but no type" — is what the peer is exercising.
    {
      code: '<template><button class="primary"></button></template>',
      output: '<template><button class="primary" type="button"></button></template>',
      errors: [{ messageId: 'missing' }],
    },

    // Self-closing variant (Glimmer-specific, not in Angular fixtures, but
    // exercises the same "missing type" branch).
    {
      code: '<template><button /></template>',
      output: '<template><button type="button" /></template>',
      errors: [{ messageId: 'missing' }],
    },

    // Angular: `<button type="whatever"></button>` → invalidType.
    // Ours: flags with messageId 'invalid'. The rule autofixes the bad literal
    //   to `type="button"`.
    {
      code: '<template><button type="whatever"></button></template>',
      output: '<template><button type="button"></button></template>',
      errors: [{ messageId: 'invalid' }],
    },

    // Empty type value — not in angular-eslint's fixtures but a natural
    // extension of the invalid-literal branch. Ours: flags. (Angular would
    // presumably also flag since "" is not in {button, submit, reset}.)
    {
      code: '<template><button type=""></button></template>',
      output: '<template><button type="button"></button></template>',
      errors: [{ messageId: 'invalid' }],
    },

    // === DIVERGENCE — inside <form>, default type changes ===
    // Angular: no form-context awareness. `<form><button></button></form>`
    //   autofix (if it had one) would use "button".
    // Our rule: when the parent chain includes a `<form>`, the autofix emits
    //   `type="submit"` instead, matching HTML spec (inside a form, the
    //   implicit button type is submit). Still a "missing" report — the
    //   divergence is only in the *fixer output*, not the flag itself.
    {
      code: '<template><form><button></button></form></template>',
      output: '<template><form><button type="submit"></button></form></template>',
      errors: [{ messageId: 'missing' }],
    },

    // === DIVERGENCE — bound attribute with invalid literal ===
    // Angular: `<button [attr.type]="'whatever'"></button>` → invalidType.
    //   They statically evaluate the bound string literal.
    // Our rule: dynamic expressions are skipped entirely (see rule comment).
    //   We would NOT flag the Glimmer equivalents below. There is no direct
    //   syntactic analogue — the closest forms are already captured in the
    //   valid section above (under "dynamic type values"). No invalid
    //   assertion possible here without changing the rule.
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:button-has-type (hbs)', rule, {
  valid: [
    '<button type="button"></button>',
    '<button type="submit"></button>',
    '<button type="reset"></button>',
    '<button type="button" />',
    '<button class="primary" type="submit"></button>',
    // Dynamic — we skip (DIVERGENCE, see gts section).
    '<button type={{this.buttonType}} />',
    '<button type="{{this.buttonType}}" />',
    // Component invocation — we skip (DIVERGENCE, see gts section).
    '<Button />',
    // Uppercase tag — we skip (DIVERGENCE, see gts section).
    '<BUTTON></BUTTON>',
  ],
  invalid: [
    {
      code: '<button></button>',
      output: '<button type="button"></button>',
      errors: [{ messageId: 'missing' }],
    },
    {
      code: '<button />',
      output: '<button type="button" />',
      errors: [{ messageId: 'missing' }],
    },
    {
      code: '<button class="primary"></button>',
      output: '<button class="primary" type="button"></button>',
      errors: [{ messageId: 'missing' }],
    },
    {
      code: '<button type="whatever"></button>',
      output: '<button type="button"></button>',
      errors: [{ messageId: 'invalid' }],
    },
    {
      code: '<button type=""></button>',
      output: '<button type="button"></button>',
      errors: [{ messageId: 'invalid' }],
    },
    // Form-context autofix divergence (see gts section).
    {
      code: '<form><button></button></form>',
      output: '<form><button type="submit"></button></form>',
      errors: [{ messageId: 'missing' }],
    },
  ],
});
