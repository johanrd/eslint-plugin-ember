# ember/template-heading-level

<!-- end auto-generated rule header -->

This rule enforces a heading outline:

- The first heading in a template defaults to `<h1>`. This can be relaxed
  (see `minInitialRank` below) when the page layout supplies the outer
  `<h1>` for you.
- Heading level can only **increase by one** at a time: `<h1>` → `<h2>`,
  `<h2>` → `<h3>`. Skipping levels (`<h1>` → `<h3>`) is flagged.
- Returning to a lower level is always fine: after `<h4>` you can go back
  to `<h2>`.
- Only one `<h1>` per sectioning root by default.
- `<dialog>` and elements with `role="dialog"` / `role="alertdialog"`
  create a nested sectioning root: their headings are validated
  independently of the surrounding outline.

## Scope caveat

This rule validates heading order **within a single template file**.
Ember apps compose pages from many templates (layouts, routes, components)
so the true outline spans files this rule can't see. Two common
consequences:

- A route template that sits under a layout supplying `<h1>` will start at
  `<h2>`. Configure `minInitialRank: 'h2'` for those templates.
- A cross-file duplicate `<h1>` (one in the layout, one in the route)
  won't be caught. If your app supplies `<h1>` at the layout level, put
  that rule config at the route-template scope.

## Examples

Default config (`minInitialRank: 'h1'`, `allowMultipleH1: false`).

This rule **forbids** the following:

```hbs
<h3>First heading</h3>
<h1>Too late</h1>

<h1>Title</h1>
<h3>Skipped h2</h3>

<h1>Title</h1>
<h1>Another title</h1>
```

This rule **allows** the following:

```hbs
<h1>Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h2>Another section</h2>

<h1>Title</h1>
<dialog>
  <h1>Dialog title</h1>
  <h2>Dialog section</h2>
</dialog>
```

## Configuration

- `minInitialRank` (`'h1' | 'h2' | ... | 'h6' | 'any'`, default `'h1'`):
  the coarsest (lowest-numbered) heading allowed as the first heading. Set
  to `'h2'` if an ancestor template supplies the `<h1>`.
- `allowMultipleH1` (`boolean`, default `false`): permit more than one
  `<h1>` per sectioning root.

```js
{
  rules: {
    'ember/template-heading-level': [
      'error',
      { minInitialRank: 'h2' },
    ],
  },
}
```

## References

- [HTML spec: Headings and sections](https://html.spec.whatwg.org/multipage/sections.html#headings-and-sections)
- [WCAG: Section Headings](https://www.w3.org/WAI/WCAG21/Techniques/general/G141)
- Adapted from [`html-validate`'s `heading-level`](https://html-validate.org/rules/heading-level.html) (MIT).
