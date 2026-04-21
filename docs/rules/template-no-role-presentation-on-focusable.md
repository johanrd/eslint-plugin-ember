# ember/template-no-role-presentation-on-focusable

<!-- end auto-generated rule header -->

Disallow `role="presentation"` / `role="none"` on focusable elements.

`role="presentation"` and `role="none"` strip an element's semantics from the accessibility tree. When applied to a focusable element, the result is a widget that keyboard users can still tab to, but one that screen readers announce as plain text with no indication of its role or function.

Per [WAI-ARIA 1.2 — presentation role](https://www.w3.org/TR/wai-aria-1.2/#presentation): authors should not apply `role="presentation"` to a focusable element, since doing so has the same effect as the [element being inaccessible to assistive technology](https://www.w3.org/WAI/ARIA/apg/).

## Examples

This rule **forbids** the following:

```gjs
<template>
  <button role="presentation">Click</button>
  <a href="/x" role="none">Link</a>
  <input type="text" role="presentation" />
  <div tabindex="0" role="presentation">Focusable</div>
</template>
```

This rule **allows** the following:

```gjs
<template>
  {{! Presentation on non-focusable elements }}
  <div role="presentation"></div>
  <span role="none" class="spacer"></span>

  {{! Presentation + aria-hidden — fully removed from AT }}
  <div role="presentation" aria-hidden="true"></div>

  {{! input type="hidden" isn't focusable }}
  <input type="hidden" role="presentation" />
</template>
```

## References

- [WAI-ARIA 1.2 — presentation role](https://www.w3.org/TR/wai-aria-1.2/#presentation)
- [`no-role-presentation-on-focusable` — eslint-plugin-vuejs-accessibility](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility/blob/main/docs/rules/no-role-presentation-on-focusable.md)
