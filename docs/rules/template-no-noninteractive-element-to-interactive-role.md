# ember/template-no-noninteractive-element-to-interactive-role

<!-- end auto-generated rule header -->

Disallow non-interactive HTML elements from being assigned interactive ARIA roles.

Assigning an interactive role (`button`, `checkbox`, `menuitem`, ...) to an element with inherent non-interactive semantics (headings, landmarks, text structure, lists, tables, forms) creates a widget with no supporting behavior — focus, keyboard activation, and state handling must all be added manually, and the mismatch is easy to get wrong.

## Scope

The set of non-interactive elements is sourced from [`axobject-query`](https://github.com/A11yance/axobject-query) — the same AX-tree-derived data used by [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), [`@angular-eslint/eslint-plugin-template`](https://github.com/angular-eslint/angular-eslint), and others. It includes headings (`<h1>`–`<h6>`), landmarks (`<article>`, `<aside>`, `<nav>`, `<main>`, etc.), text structure (`<p>`, `<figure>`, `<blockquote>`, etc.), lists (`<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>`), tables (`<table>`, `<tbody>`, `<tr>`, etc.), forms (`<form>`, `<fieldset>`, `<legend>`), `<img>`, and similar.

`<div>` and `<span>` are not covered — ARIA 1.2 assigns them the `generic` role with no inherent semantics to mismatch. `<div role="button">` is covered by the related [`template-require-aria-activedescendant-tabindex`](./template-require-aria-activedescendant-tabindex.md) and [`template-no-noninteractive-tabindex`](./template-no-noninteractive-tabindex.md) rules.

## Examples

This rule **forbids** the following:

```gjs
<template>
  <h1 role="button">Click</h1>
  <article role="button">Story</article>
  <li role="tab">Tab</li>
  <img role="link" src="/x.png" alt="link" />
  <form role="checkbox"></form>
  <p role="button">Click me</p>
</template>
```

This rule **allows** the following:

```gjs
<template>
  <h1 role="heading" aria-level="1">Title</h1>
  <article role="article">Story</article>
  <ul role="list"></ul>

  {{! <div>/<span> are "generic" — not covered by this rule }}
  <div role="button" tabindex="0"></div>
  <span role="checkbox" aria-checked="false" tabindex="0"></span>
</template>
```

## References

- [WAI-ARIA 1.2 — Role taxonomy](https://www.w3.org/TR/wai-aria-1.2/#roles_categorization)
- [HTML-AAM — Element role mappings](https://www.w3.org/TR/html-aam-1.0/)
- [`axobject-query`](https://github.com/A11yance/axobject-query) — the shared data package used by every major a11y ESLint plugin
- [`no-noninteractive-element-to-interactive-role` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-to-interactive-role.md)
