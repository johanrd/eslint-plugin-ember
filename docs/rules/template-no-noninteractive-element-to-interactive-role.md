# ember/template-no-noninteractive-element-to-interactive-role

<!-- end auto-generated rule header -->

Disallow non-interactive HTML elements from being assigned interactive ARIA roles.

Assigning an interactive role (`button`, `checkbox`, `menuitem`, ...) to an element with inherent non-interactive semantics (headings, landmarks, text structure, lists, tables, forms) creates a widget with no supporting behavior — focus, keyboard activation, and state handling must all be added manually, and the mismatch is easy to get wrong.

## Scope

This rule covers elements with **non-interactive ARIA semantics** per HTML-AAM: headings (`<h1>`–`<h6>`), landmarks (`<article>`, `<aside>`, `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`, `<address>`), text structure (`<figure>`, `<figcaption>`, `<blockquote>`), lists (`<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>`), tables (`<table>`, `<tbody>`, `<tfoot>`, `<thead>`, `<tr>`, `<th>`, `<caption>`), forms (`<form>`, `<fieldset>`, `<legend>`), and `<img>`.

`<div>`, `<span>`, and `<p>` are intentionally **not** covered — ARIA 1.2 assigns these the `generic` role, which has no inherent semantics to mismatch. If you use `<div role="button">`, other rules (`template-require-aria-activedescendant-tabindex`, the forthcoming `template-no-noninteractive-tabindex`) cover the related concerns.

## Examples

This rule **forbids** the following:

```gjs
<template>
  <h1 role="button">Click</h1>
  <article role="button">Story</article>
  <li role="tab">Tab</li>
  <img role="link" src="/x.png" alt="link" />
  <form role="checkbox"></form>
</template>
```

This rule **allows** the following:

```gjs
<template>
  <h1 role="heading" aria-level="1">Title</h1>
  <article role="article">Story</article>
  <ul role="list"></ul>

  {{! <div>/<span>/<p> are "generic" — not covered by this rule }}
  <div role="button" tabindex="0"></div>
  <span role="checkbox" aria-checked="false" tabindex="0"></span>
</template>
```

## References

- [WAI-ARIA 1.2 — Role taxonomy](https://www.w3.org/TR/wai-aria-1.2/#roles_categorization)
- [HTML-AAM — Element role mappings](https://www.w3.org/TR/html-aam-1.0/)
- [`no-noninteractive-element-to-interactive-role` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-to-interactive-role.md)
