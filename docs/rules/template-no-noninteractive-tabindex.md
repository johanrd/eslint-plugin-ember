# ember/template-no-noninteractive-tabindex

<!-- end auto-generated rule header -->

Disallow `tabindex` on non-interactive elements.

Adding `tabindex="0"` to a `<div>`, `<section>`, etc. puts it in the keyboard tab order without supplying any keyboard semantics — users reach the element but have no way to operate it, and screen readers announce the tag with no hint of interactivity.

If the element is meant to be interactive, give it an explicit ARIA role (`button`, `checkbox`, …) **and** wire up the appropriate keyboard event handlers. If it isn't meant to be interactive, remove the tabindex.

## Examples

This rule **forbids** the following:

```gjs
<template>
  <div tabindex="0"></div>
  <span tabindex="-1">text</span>
  <article tabindex="0">Story</article>
  <div role="article" tabindex="0"></div>
  <a tabindex="0">Not a link (missing href)</a>
</template>
```

This rule **allows** the following:

```gjs
<template>
  {{! Interactive native elements }}
  <button tabindex="0">Click</button>
  <a href="/x" tabindex="0">Link</a>
  <input tabindex="-1" />

  {{! Non-interactive element with an interactive ARIA role }}
  <div role="button" tabindex="0"></div>
  <div role="checkbox" tabindex="0" aria-checked="false"></div>

  {{! Dynamic role — conservatively skipped }}
  <div role={{this.role}} tabindex="0"></div>
</template>
```

## References

- [WAI-ARIA Authoring Practices — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [MDN — tabindex](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex)
- [`no-noninteractive-tabindex` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-tabindex.md)
