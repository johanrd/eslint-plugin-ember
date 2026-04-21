// Audit fixture — translated test cases from peer plugins to measure
// behavioral parity of `ember/template-no-role-presentation-on-focusable`
// against vuejs-accessibility/no-role-presentation-on-focusable.
//
// These tests are NOT part of the main suite and do not run in CI. They encode
// the CURRENT behavior of our rule so that running this file reports pass.
// Each divergence from an upstream plugin is annotated as "DIVERGENCE —".
//
// Only vuejs-accessibility carries this rule among surveyed peer a11y plugins.
//
// Source file:
//   - context/eslint-plugin-vuejs-accessibility-main/src/rules/__tests__/no-role-presentation-on-focusable.test.ts

'use strict';

const rule = require('../../../lib/rules/template-no-role-presentation-on-focusable');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('audit:no-role-presentation-on-focusable (gts)', rule, {
  valid: [
    // === Upstream parity (valid in both vue-a11y and us) ===
    // No role at all on focusable element — both skip.
    '<template><button>Submit</button></template>',
    // Nested focusable without role — both skip.
    '<template><div><button>Submit</button></div></template>',
    // `a` with tabindex='-1' but no role — both skip.
    '<template><a href="#" tabindex="-1">link</a></template>',

    // Non-focusable container with role="presentation" wrapping a focusable
    // child that is itself defocused via tabindex='-1'. Vue: valid (its
    // hasFocusableElements recurses, but finds no focusable descendant because
    // the child's tabindex='-1' short-circuits). Ours: valid for the outer div
    // (div isn't focusable itself) AND for the inner button (no role on it).
    // Happens to match vue — but note the mechanisms differ:
    //  - Vue's rule checks element + descendants.
    //  - Our rule checks only the element bearing the role.
    '<template><div role="presentation"><button tabindex="-1">Some text</button></div></template>',

    // Same pattern with an `a` child that is defocused via tabindex='-1'.
    '<template><div role="presentation"><a href="#" tabindex="-1">Link</a></div></template>',
  ],

  invalid: [
    // === Upstream parity (invalid in both vue-a11y and us) ===
    // <button> is inherently focusable — both flag.
    {
      code: '<template><button type="button" role="presentation">Submit</button></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    // <a href> is inherently focusable — both flag.
    {
      code: '<template><a href="#" role="presentation">Link</a></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    // <span tabindex="0"> is focusable via tabindex — both flag.
    {
      code: '<template><span tabindex="0" role="presentation"><em>Icon</em></span></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },

    // === INTENTIONAL DIVERGENCE — tabindex="-1" on inherently-focusable ===
    // Vue: VALID — `<button tabindex='-1' role='presentation'>Press</button>`.
    //   Vue's hasFocusableElements treats an interactive element with
    //   tabindex='-1' as non-focusable.
    // Our rule: INVALID — a `<button>` with `tabindex='-1'` is still
    //   programmatically focusable (focus() / sequential-focus-exclusion only
    //   removes it from tab order). The element can still receive focus, at
    //   which point it's announced by AT. Flagging is intentional.
    //   Same tabindex stance as `template-no-aria-hidden-on-focusable`.
    {
      code: '<template><button tabindex="-1" role="presentation">Press</button></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
  ],
});

// === INTENTIONAL DIVERGENCE — scope: element-only vs. element + descendants ===
// Vue's rule flags a non-focusable container with role="presentation" when any
// DESCENDANT is focusable:
//   <div role='presentation'><button>Submit</button></div>      → vue: INVALID
// Our rule only inspects the element bearing the role. A non-focusable wrapper
// is left alone.
//
// Spec grounding (WAI-ARIA 1.2):
//  - §4.6 "Presentational Roles Conflict Resolution"
//    (https://www.w3.org/TR/wai-aria-1.2/#conflict_resolution_presentation_none)
//    describes how role="presentation" / role="none" behaves on the element
//    that carries it — NOT a cascade. It explicitly states that descendants
//    retain their own semantics, and only the host element's implicit role is
//    suppressed (and even that is overridden when the host is focusable or has
//    global ARIA state/property attributes).
//  - §5.3.3 "Document Structure Roles"
//    (https://www.w3.org/TR/wai-aria-1.2/#document_structure_roles)
//    reaffirms: role="presentation" / "none" does not propagate into the
//    subtree; each descendant keeps its role and interactivity.
//
// So `<div role="presentation"><button>X</button></div>` is not a semantic
// problem: the div's role is a no-op (div had no meaningful role to suppress),
// and the button remains fully interactive with its role intact. Vue's flagging
// of the wrapper is not spec-mandated; their descendant recursion is uncommented
// in source and appears to be a copy-paste from their aria-hidden rule.
//
// Contrast with `template-no-aria-hidden-on-focusable`, where
// recursion into descendants IS spec-correct because aria-hidden DOES cascade
// to the entire subtree per WAI-ARIA 1.2 §6.6 and creates a real keyboard trap
// (focus lands on AT-hidden content).
//
// Captured here as a "valid" bucket for OUR rule to make the divergence
// explicit in the audit output.
ruleTester.run('audit:no-role-presentation-on-focusable — wrapper scope (gts)', rule, {
  valid: [
    // Vue: INVALID (outer div flagged because descendant <button> is focusable).
    // Ours: VALID (div isn't itself focusable; we don't descend).
    '<template><div role="presentation"><button>Submit</button></div></template>',
    // Same shape with <a href>.
    '<template><div role="presentation"><a href="#">Link</a></div></template>',
    // Same shape with tabindex on a descendant.
    '<template><div role="presentation"><span tabindex="0">Focusable</span></div></template>',
  ],
  invalid: [],
});

// === INTENTIONAL EXTENSION — role="none" treated identically to "presentation" ===
// Vue's test suite exercises only role="presentation". Per WAI-ARIA 1.2,
// role="none" is a synonym introduced to avoid the misleading "presentation"
// name. Our rule flags both. No conflict with vue — vue simply doesn't test
// "none" — but captured here so the extension is visible in the audit.
ruleTester.run('audit:no-role-presentation-on-focusable — role="none" extension (gts)', rule, {
  valid: [
    // Non-focusable element with role="none" — fine.
    '<template><div role="none"></div></template>',
  ],
  invalid: [
    // Inherently focusable element with role="none" — we flag.
    {
      code: '<template><button role="none">Click</button></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    // <a href> with role="none" — we flag.
    {
      code: '<template><a href="/x" role="none">Link</a></template>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('audit:no-role-presentation-on-focusable (hbs)', rule, {
  valid: [
    // Upstream parity — no role.
    '<button>Submit</button>',
    '<div><button>Submit</button></div>',
    '<a href="#" tabindex="-1">link</a>',
    // Upstream parity — wrapper whose descendants are all defocused.
    '<div role="presentation"><button tabindex="-1">Some text</button></div>',
    '<div role="presentation"><a href="#" tabindex="-1">Link</a></div>',

    // DIVERGENCE (wrapper scope) — captured as valid for us; vue flags.
    '<div role="presentation"><button>Submit</button></div>',
    '<div role="presentation"><a href="#">Link</a></div>',

    // EXTENSION — role="none" on non-focusable element is fine for us.
    '<div role="none"></div>',
  ],
  invalid: [
    // Upstream parity — both flag.
    {
      code: '<button type="button" role="presentation">Submit</button>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<a href="#" role="presentation">Link</a>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
    {
      code: '<span tabindex="0" role="presentation"><em>Icon</em></span>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },

    // INTENTIONAL DIVERGENCE — tabindex="-1" on button. Vue: valid. Ours: flag.
    {
      code: '<button tabindex="-1" role="presentation">Press</button>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },

    // INTENTIONAL EXTENSION — role="none" treated as presentation.
    {
      code: '<button role="none">Click</button>',
      output: null,
      errors: [{ messageId: 'invalidPresentation' }],
    },
  ],
});

// AUDIT-SKIP — none.
// All vue-a11y test cases from no-role-presentation-on-focusable.test.ts are
// represented above (6 valid + 4 invalid in the source file).
