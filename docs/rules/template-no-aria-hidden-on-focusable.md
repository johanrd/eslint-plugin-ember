# ember/template-no-aria-hidden-on-focusable

<!-- end auto-generated rule header -->

Disallow `aria-hidden="true"` on focusable elements.

An element with `aria-hidden="true"` is removed from the accessibility tree but remains keyboard-focusable. This creates a keyboard trap — users reach the element via Tab but can't perceive it.

Per [WAI-ARIA 1.2 — aria-hidden](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden):

> Authors SHOULD NOT use `aria-hidden="true"` on any element that has focus or may receive focus, either directly via interaction with the user or indirectly via programmatic means such as JavaScript-based event handling.

## Examples

This rule **forbids** the following:

```gjs
<template>
  <button aria-hidden="true">Trapped</button>
  <a href="/x" aria-hidden="true">Link</a>
  <div tabindex="0" aria-hidden="true">Focusable but hidden</div>
</template>
```

This rule **allows** the following:

```gjs
<template>
  {{! Non-focusable decorative content }}
  <div aria-hidden="true"><svg class="decoration" /></div>

  {{! Explicit opt-out }}
  <button aria-hidden="false">Click me</button>

  {{! input type="hidden" is not focusable }}
  <input type="hidden" aria-hidden="true" />
</template>
```

## References

- [WAI-ARIA 1.2 — aria-hidden](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden)
- [WebAIM — Hiding content from assistive tech](https://webaim.org/techniques/css/invisiblecontent/)
- [`no-aria-hidden-on-focusable` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-aria-hidden-on-focusable.md)
