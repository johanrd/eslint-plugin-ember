# ember/template-no-invalid-link-href

<!-- end auto-generated rule header -->

Disallow anchor (`<a>`) elements with href values that aren't valid navigable URLs.

The [HTML spec](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element) says `href` must be a valid URL. Using placeholders like `href="#"`, `href=""`, or `href="javascript:..."` to fake a clickable link:

- Breaks expected keyboard behavior (anchors should navigate; buttons should act)
- Is [explicitly called out as an anti-pattern by MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#javascript_pseudo-protocol) for the `javascript:` protocol
- Leaves assistive tech announcing a link that doesn't navigate

Complements [`template-link-href-attributes`](./template-link-href-attributes.md), which handles the **missing** href case. This rule validates the href **value**.

## Examples

This rule **forbids** the following:

```gjs
<template>
  <a href="#">Click</a>
  <a href="#!">Click</a>
  <a href="">Click</a>
  <a href>Click</a>
  <a href="javascript:void(0)">Click</a>
  <a href="JavaScript:alert(1)">XSS</a>
</template>
```

This rule **allows** the following:

```gjs
<template>
  <a href="/x">Link</a>
  <a href="https://example.com">Link</a>
  <a href="#section">Fragment link</a>
  <a href="mailto:a@example.com">Email</a>
  <a href={{this.url}}>Dynamic</a>
</template>
```

Dynamic hrefs (mustache-valued) are not validated — we can't statically know the resolved URL.

## References

- [HTML Living Standard — the `<a>` element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)
- [MDN — `<a>` — javascript: pseudo-protocol](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#javascript_pseudo-protocol)
- [`anchor-is-valid` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md)
- [`anchor-is-valid` — eslint-plugin-lit-a11y](https://github.com/open-wc/open-wc/blob/main/packages/eslint-plugin-lit-a11y/docs/rules/anchor-is-valid.md)
