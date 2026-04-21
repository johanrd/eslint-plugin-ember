# ember/template-no-interactive-element-to-noninteractive-role

<!-- end auto-generated rule header -->

Disallow native interactive elements from being assigned non-interactive ARIA roles.

Assigning a non-interactive role to a native interactive element (e.g. `<button role="heading">`) strips the element's built-in keyboard, focus, and activation semantics — leaving users with a broken widget. The [first rule of ARIA use](https://www.w3.org/TR/using-aria/#rule1) says don't use ARIA if native semantics already cover the job; this rule enforces the related corollary.

The interactive-element set is derived in layers, mirroring [jsx-a11y's `isInteractiveElement`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/src/util/isInteractiveElement.js): aria-query's `elementRoles` (with its attribute constraints, e.g. `<a href>`, `<input type="…">`, `<select multiple>`) is the primary signal; axobject-query's AX-tree mapping is consulted only as a fallback for tags that have no interactive `elementRoles` entry.

Two deviations for real-world false-positive patterns:

- `<canvas>` is **not** treated as inherently interactive. Its AXObject is widget-typed but aria-query assigns it no inherent role; authors legitimately set `role="img"` or `role="presentation"` on canvases.
- `<audio>` and `<video>` are only interactive when the `controls` attribute is present. Without it they render no user-operable UI (e.g. background / decorative media).

## Examples

This rule **forbids** the following:

```gjs
<template>
  <button role="heading">Click</button>
  <a href="/x" role="banner">Link</a>
  <button role="presentation">Click</button>
</template>
```

This rule **allows** the following:

```gjs
<template>
  <button role="menuitem">Item</button>
  <button role="button">Click</button>
  <a href="/x" role="link">Link</a>
  <div role="heading" aria-level="1">Story</div>
</template>
```

## References

- [WAI-ARIA 1.2 — Role taxonomy](https://www.w3.org/TR/wai-aria-1.2/#roles_categorization)
- [Using ARIA — Rule 1](https://www.w3.org/TR/using-aria/#rule1)
- [`no-interactive-element-to-noninteractive-role` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-interactive-element-to-noninteractive-role.md)
