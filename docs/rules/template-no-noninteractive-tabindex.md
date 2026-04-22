# ember/template-no-noninteractive-tabindex

<!-- end auto-generated rule header -->

Disallow `tabindex` on non-interactive elements.

Adding `tabindex="0"` to a `<div>`, `<section>`, etc. puts it in the keyboard tab order without supplying any keyboard semantics — users reach the element but have no way to operate it, and screen readers announce the tag with no hint of interactivity.

If the element is meant to be interactive, give it an explicit ARIA role (`button`, `checkbox`, …) **and** wire up the appropriate keyboard event handlers. If it isn't meant to be interactive, remove the tabindex.

`tabindex="-1"` is exempt — it marks an element as programmatically focusable but skipped by the Tab key, the canonical pattern for scroll-to-focus targets, focus restoration, and composite-widget children. See [`template-require-aria-activedescendant-tabindex`](./template-require-aria-activedescendant-tabindex.md).

## Examples

This rule **forbids** the following:

```gjs
<template>
  <div tabindex="0"></div>
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

  {{! tabindex="-1" — focusable but not in tab order }}
  <div tabindex="-1"></div>
  <section tabindex="-1">scroll target</section>

  {{! Dynamic role — conservatively skipped }}
  <div role={{this.role}} tabindex="0"></div>

  {{! role="tabpanel" — default allowlist (see Options) }}
  <div role="tabpanel" tabindex="0" aria-labelledby="tab-1">Panel</div>
</template>
```

## Options

- `roles` (default `["tabpanel"]`) — non-interactive ARIA roles exempted from this rule. Elements carrying one of these roles may have `tabindex` without triggering a flag.

  The default value (`["tabpanel"]`) matches jsx-a11y's recommended config. The [WAI-ARIA APG Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) gives panels `tabindex="0"` when the panel's content isn't itself focusable, so keyboard users can page through panels. Flagging tabpanel-with-tabindex as a violation would break the canonical Tabs pattern.

  Use an empty array (`roles: []`) to disable the default exemption — matching jsx-a11y's strict config. Use a wider list (e.g. `roles: ["tabpanel", "region"]`) to exempt additional roles where your project uses `tabindex` legitimately (scrollable regions, etc.).

## References

- [WAI-ARIA Authoring Practices — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [MDN — tabindex](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex)
- [`no-noninteractive-tabindex` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-tabindex.md)
