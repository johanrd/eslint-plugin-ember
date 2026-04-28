# ember/template-interactive-supports-focus

<!-- end auto-generated rule header -->

Require elements with an interactive ARIA role to be focusable.

When an author adds `role="button"` (or any other interactive widget role) to a `<div>`, they promise keyboard and screen-reader users that the element behaves like that widget. That promise only holds if the element is reachable by keyboard — either because it is inherently focusable (a real `<button>`, an anchor with `href`, a form control, etc.) or because it has a `tabindex`.

This rule flags elements that carry an interactive ARIA role but have no focus affordance.

## ⚠️ Divergence from peer plugins — role-gated, not handler-gated

All three peer plugins implement the equivalent rule as **handler-gated** — they only flag `<div role="button">` when an interactive event handler (`onClick` / `@click` / `(click)`) is also present:

- [`jsx-a11y/interactive-supports-focus`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/interactive-supports-focus.md)
- [`vuejs-accessibility/interactive-supports-focus`](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility/blob/main/docs/rules/interactive-supports-focus.md)
- [`@angular-eslint/template/interactive-supports-focus`](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin-template/docs/rules/interactive-supports-focus.md)

**This rule is role-gated — it flags on role alone**, regardless of handler presence. Shapes like `<div role="button">x</div>` with no handler will flag here but not in jsx-a11y / vue-a11y / angular-eslint. That's a deliberate choice: an authored interactive role promises operability irrespective of whether the handler is wired up at the current site (the role is the public contract; the handler is an implementation detail that may move).

If you want peer-parity handler-gated behavior, use [`template-no-invalid-interactive`](./template-no-invalid-interactive.md) instead (see also [#33](https://github.com/ember-cli/eslint-plugin-ember/pull/33)), which flags interactive event handlers on non-interactive hosts and honors the `role="presentation"` / `aria-hidden` escape hatches.

## Examples

This rule **forbids** the following:

```gjs
<template>
  {{! role without tabindex on a non-focusable host }}
  <div role="button">Click</div>
  <span role="link">Visit</span>
  <div role="checkbox" {{on "click" this.toggle}}></div>

  {{! anchor / area without href is not inherently focusable }}
  <a role="button">x</a>

  {{! hidden input loses its focus affordance }}
  <input type="hidden" role="button" />

  {{! contenteditable="false" explicitly opts out of focus }}
  <div role="textbox" contenteditable="false">x</div>
</template>
```

This rule **allows** the following:

```gjs
<template>
  {{! Inherently focusable hosts }}
  <button role="button">x</button>
  <a href="/next" role="link">Next</a>
  <input role="combobox" />

  {{! Any tabindex satisfies the focus requirement }}
  <div role="button" tabindex="0"></div>
  <div role="menuitem" tabindex="-1"></div>
  <div role="button" tabindex={{this.ti}}></div>

  {{! contenteditable makes an element focusable }}
  <div role="textbox" contenteditable="true">Edit</div>

  {{! Dynamic role — conservatively skipped }}
  <div role={{this.role}}></div>

  {{! Non-widget roles are outside scope }}
  <div role="region"></div>

  {{! Component invocations — out of scope }}
  <MyButton role="button" />
</template>
```

## Scope notes

- **Interactive ARIA roles** are derived from [`aria-query`](https://www.npmjs.com/package/aria-query): non-abstract roles that descend from `widget`, plus `toolbar` (matching jsx-a11y's convention).
- **Component invocations** (PascalCase, `@arg`, `this.x`, `foo.bar`, `foo::bar`) are skipped — their rendered output is opaque to the linter.
- **Custom elements** not present in aria-query's DOM map are skipped.
- **Dynamic role values** (`role={{this.role}}`) are conservatively skipped.
- **Related rule:** [`template-no-invalid-interactive`](./template-no-invalid-interactive.md) covers a different concern — it flags interactive event handlers on non-interactive elements. This rule enforces the inverse: when an interactive ARIA role has been declared, the element must also be focusable. The two rules are complementary and can both fire on the same element when appropriate.

## References

- [WAI-ARIA Authoring Practices — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [MDN — ARIA: button role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role)
- [`interactive-supports-focus` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/interactive-supports-focus.md)
- [`interactive-supports-focus` — eslint-plugin-vuejs-accessibility](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility/blob/main/docs/rules/interactive-supports-focus.md)
- [`interactive-supports-focus` — angular-eslint](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin-template/docs/rules/interactive-supports-focus.md)
