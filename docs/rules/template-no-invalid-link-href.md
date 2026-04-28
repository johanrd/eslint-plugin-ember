# ember/template-no-invalid-link-href

<!-- end auto-generated rule header -->

Disallow link elements — `<a>` and `<area>` — whose `href` value is a commonly-misused placeholder (e.g. `href="#"`, `href=""`, `href="javascript:..."`). Both carry URL semantics per the HTML spec ([the `<a>` element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element), [the `<area>` element](https://html.spec.whatwg.org/multipage/image-maps.html#the-area-element)), so the same validity rules apply on each.

This rule is **pragmatic accessibility/UX guidance, not spec enforcement.** Values like `href="#"` and `href="javascript:void(0)"` are technically valid URLs per the [HTML spec](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element); the rule flags them because they are widely-recognized anti-patterns for faking a clickable anchor:

- Breaks expected keyboard behavior (anchors should navigate; buttons should act)
- The `javascript:` pseudo-protocol is [called out as an anti-pattern by MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#javascript_pseudo-protocol)
- Leaves assistive tech announcing a link that doesn't navigate

If a click handler is what you want, use a `<button>`. If you want a genuine fragment link, use `href="#section-id"`.

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
  <a href="JavaScript:alert(1)">Execute</a>
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

Mustache hrefs whose value is a **static literal** (string, number, or boolean) are validated — the rule unwraps them to their static value via `getStaticAttrValue`. Only **truly dynamic** mustaches (PathExpressions, helpers with arguments, or concat statements that include a dynamic part) are skipped, because we can't statically determine what they will resolve to at runtime.

## References

- [HTML Living Standard — the `<a>` element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)
- [MDN — `<a>` — javascript: pseudo-protocol](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#javascript_pseudo-protocol)
- [`anchor-is-valid` — eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md)
- [`anchor-is-valid` — eslint-plugin-lit-a11y](https://github.com/open-wc/open-wc/blob/main/packages/eslint-plugin-lit-a11y/docs/rules/anchor-is-valid.md)
