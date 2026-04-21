# ember/template-no-aria-label-misuse

<!-- end auto-generated rule header -->

This rule disallows `aria-label` and `aria-labelledby` on elements that
cannot be named in the accessibility tree. On a plain `<div>` or `<span>`
without a `role`, these attributes are ignored by assistive technology —
the label is silent.

## Valid carriers

`aria-label` / `aria-labelledby` are valid on:

- **Interactive elements**: `<button>`, `<a href>`, `<input>` (not hidden),
  `<select>`, `<textarea>`, `<details>`, `<summary>`, `<audio controls>`,
  `<video controls>`, `<iframe>`, `<embed>`, `<img usemap>`, `<label>`.
- **Labelable elements**: `<button>`, `<input>` (not hidden), `<meter>`,
  `<output>`, `<progress>`, `<select>`, `<textarea>`.
- **Landmarks / content grouping**: `<main>`, `<nav>`, `<aside>`,
  `<header>`, `<footer>`, `<section>`, `<article>`, `<form>`, `<dialog>`,
  `<figure>`, `<fieldset>`, `<table>`, `<td>`, `<th>`, `<img>`, `<area>`,
  `<iframe>`, `<summary>`.
- **Any element that declares an explicit `role` or `tabindex`** (the
  author has opted into the accessibility tree).

## Examples

This rule **forbids** the following:

```hbs
<div aria-label='dialog'>...</div>
<span aria-labelledby='title'>...</span>
<p aria-label='note'>Note text</p>
```

This rule **allows** the following:

```hbs
<button aria-label='Close'>×</button>
<main aria-label='Primary'>...</main>
<div role='button' aria-label='Custom'>...</div>
<span tabindex='0' aria-label='Focusable'>...</span>
```

Component invocations (`<MyDialog>`, `<AcmeButton>`) are skipped — the
rendered element/role isn't knowable at lint time.

## Limitations

- This rule doesn't check element metadata with full MDN-level accuracy.
  It uses a hand-coded subset of the HTML spec's interactive and
  labelable categories, plus an explicit allowlist for common landmarks.
- Dynamic attribute values (`aria-label={{this.label}}`) are treated as
  intent-to-label; the attribute presence alone is enough to check against
  the element's nameable-ness.

## References

- [WAI-ARIA 1.2: Accessible Name Calculation](https://www.w3.org/TR/wai-aria-1.2/#namecalculation)
- [HTML Accessibility API Mappings: aria-label](https://www.w3.org/TR/html-aam-1.0/#html-attribute-state-and-property-mappings)
- Adapted from [`html-validate`'s `aria-label-misuse`](https://html-validate.org/rules/aria-label-misuse.html) (MIT).
