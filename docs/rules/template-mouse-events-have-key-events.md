# ember/template-mouse-events-have-key-events

<!-- end auto-generated rule header -->

Enforce that `{{on "mouseover" …}}` is accompanied by `{{on "focus" …}}` / `{{on "focusin" …}}`, and `{{on "mouseout" …}}` by `{{on "blur" …}}` / `{{on "focusout" …}}`. `{{on "mouseenter" …}}` / `{{on "mouseleave" …}}` are NOT checked by default — opt in via `hoverInHandlers` / `hoverOutHandlers` options (see below).

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

- `hoverInHandlers` (default `["mouseover"]`) — which events require a focus pair. Matches jsx-a11y's default. Add `"mouseenter"` to also check the non-bubbling per-element variant.
- `hoverOutHandlers` (default `["mouseout"]`) — which events require a blur pair. Matches jsx-a11y's default. Add `"mouseleave"` to also check the non-bubbling per-element variant.

### Why are `mouseenter` / `mouseleave` opt-in?

`mouseenter`/`mouseleave` don't bubble — they fire once on entry/exit of the bound element, never on transitions between children. Authors frequently choose them specifically because they want a per-element effect (highlight one row, show one tooltip) that doesn't fire for every child element transition. Those effects are often cleaner to express with CSS `:hover` + `:focus` combined selectors than paired JS handlers. Flagging `mouseenter`/`mouseleave` by default therefore produces noisy false positives on a common authoring pattern. We default to jsx-a11y's narrower handler set; opt in when your project wants the wider check.

## References

- [WAI-ARIA APG — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [MDN — Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
- [`mouse-events-have-key-events` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md)
