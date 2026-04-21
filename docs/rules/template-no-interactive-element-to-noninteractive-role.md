# ember/template-no-interactive-element-to-noninteractive-role

<!-- end auto-generated rule header -->

Disallow native interactive elements from being assigned non-interactive ARIA roles.

Assigning a non-interactive role to a native interactive element (e.g. `<button role="heading">`) strips the element's built-in keyboard, focus, and activation semantics — leaving users with a broken widget. The [first rule of ARIA use](https://www.w3.org/TR/html-aria/#rule1) says don't use ARIA if native semantics already cover the job; this rule enforces the related corollary.

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
- [HTML-AAM — Rule 1 of ARIA](https://www.w3.org/TR/html-aria/#rule1)
- [`no-interactive-element-to-noninteractive-role` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-interactive-element-to-noninteractive-role.md)
