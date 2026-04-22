# ember/template-mouse-events-have-key-events

<!-- end auto-generated rule header -->

Enforce that `{{on "mouseover" …}}` / `{{on "mouseenter" …}}` are accompanied by `{{on "focus" …}}` / `{{on "focusin" …}}`, and `{{on "mouseout" …}}` / `{{on "mouseleave" …}}` by `{{on "blur" …}}` / `{{on "focusout" …}}`.

Keyboard-only users can't trigger mouse events. Pairing hover-in events with focus events (and hover-out events with blur events) ensures the same UI state transitions happen for keyboard navigation.

### On "normative basis"

[WCAG 2.1 SC 2.1.1 Keyboard (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/keyboard) requires all functionality to be operable via the keyboard. Pointer-only UI transitions (hover effects that show/hide content, highlight rows, etc.) don't satisfy this when no keyboard equivalent exists. However, this rule's specific "hover event + focus event pairing" heuristic isn't literally mandated by the SC — [Understanding 2.1.1](https://www.w3.org/WAI/WCAG21/Understanding/keyboard) allows any keyboard path. The event-pairing convention comes from [WAI-ARIA APG keyboard-interaction guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) (authoring guidance, not normative), and from all four peer a11y plugins adopting it as the strongest static-analysis proxy. This rule follows the convention.

For many simple hover effects the cleaner fix is a CSS `:hover` + `:focus` combined selector rather than paired JS handlers — [Inclusive Components: Tooltips](https://inclusive-components.design/tooltips-toggletips/) is the canonical reference.

## Examples

This rule **forbids** the following:

```gjs
<template>
  <div {{on "mouseover" this.showTooltip}}></div>
  <div {{on "mouseleave" this.hideTooltip}}></div>
</template>
```

This rule **allows** the following:

```gjs
<template>
  <div {{on "mouseover" this.showTooltip}} {{on "focus" this.showTooltip}}></div>
  <div {{on "mouseleave" this.hideTooltip}} {{on "focusout" this.hideTooltip}}></div>
</template>
```

## Options

- `hoverInHandlers` (default `["mouseover", "mouseenter"]`) — which events require a focus pair.
- `hoverOutHandlers` (default `["mouseout", "mouseleave"]`) — which events require a blur pair.

## References

- [WAI-ARIA APG — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [MDN — Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
- [`mouse-events-have-key-events` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md)
