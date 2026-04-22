# ember/template-click-events-have-key-events

<!-- end auto-generated rule header -->

Enforce a clickable non-interactive element has at least one keyboard event listener.

When a `{{on "click" …}}` modifier is attached to a non-interactive DOM element (e.g. `<div>`, `<span>`, `<a>` without `href`), keyboard-only users can't reach the handler through the keyboard path alone. Adding `{{on "keydown" …}}`, `{{on "keyup" …}}`, or `{{on "keypress" …}}` — along with appropriate `role`/`tabindex` to make the element focusable — restores keyboard parity.

## On "normative basis"

[WCAG 2.1 SC 2.1.1 Keyboard (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/keyboard) requires all functionality to be operable via the keyboard. The click-without-keydown shape is the canonical violation in practice. However, [Understanding 2.1.1](https://www.w3.org/WAI/WCAG21/Understanding/keyboard) explicitly notes that "a custom button only reacting to Enter" still satisfies the SC — so the click+keydown pairing isn't literally spec-mandated. It's a peer-plugin convention (jsx-a11y, vuejs-accessibility, lit-a11y, @angular-eslint/template all use it) as the strongest static-analysis proxy for SC 2.1.1 violations. This rule follows the convention.

This rule is complementary to [`ember/template-no-invalid-interactive`](./template-no-invalid-interactive.md):

- `template-no-invalid-interactive` takes a stricter stance: don't use DOM event modifiers on non-interactive elements at all. Steers authors toward native interactive elements.
- `template-click-events-have-key-events` is permissive: if you _do_ use `{{on "click" …}}` on a non-interactive element, at least pair it with a keyboard listener.

Enable one, the other, or both depending on your project's stance.

## Examples

This rule **forbids** the following:

```gjs
<template>
  <div {{on "click" this.onClick}}></div>
  <span {{on "click" this.onClick}}>text</span>
  <a {{on "click" this.onClick}}>Not a link (missing href)</a>
</template>
```

This rule **allows** the following:

```gjs
<template>
  {{! Interactive elements — keyboard is built in }}
  <button {{on "click" this.onClick}}>Toggle</button>
  <a href="/x" {{on "click" this.track}}>Link</a>

  {{! Non-interactive element with both click and keyboard handlers }}
  <div {{on "click" this.onClick}} {{on "keydown" this.onKey}}></div>

  {{! Hidden from assistive tech }}
  <div aria-hidden="true" {{on "click" this.noop}}></div>

  {{! Role="presentation" opts out of the widget contract }}
  <div role="presentation" {{on "click" this.noop}}></div>
</template>
```

## References

- [WAI-ARIA Authoring Practices — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [MDN — Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
- [`click-events-have-key-events` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/click-events-have-key-events.md)
