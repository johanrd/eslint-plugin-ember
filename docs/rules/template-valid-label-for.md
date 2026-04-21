# ember/template-valid-label-for

<!-- end auto-generated rule header -->

This rule validates that `<label for="x">` references a labelable form
control (`<input>` — except `type="hidden"` — `<select>`, `<textarea>`,
`<button>`, `<meter>`, `<output>`, `<progress>`) defined in the same
template. It also flags `for` as redundant when the referenced element
is already nested inside the `<label>`.

Only the label side is checked. Use `template-require-input-label` for the
other direction (every input should have a label).

## Examples

This rule **forbids** the following:

```hbs
<label for='first-name'>First name</label>
<div id='first-name'>text</div>

<label for='email'>
  Email
  <input id='email' />
</label>
```

This rule **allows** the following:

```hbs
<label for='first-name'>First name</label>
<input id='first-name' />

<label for='country'>Country</label>
<select id='country'><option>NO</option></select>

{{! Nested association — for attribute omitted. }}
<label>
  Email
  <input />
</label>

{{! Dynamic for / id — skipped. }}
<label for={{this.fieldId}}>Dynamic</label>
```

## Limitations

- Dynamic `for` or `id` values (mustache) are skipped.
- Targets that live outside the template file (rendered by a yielded
  component or a partial) can't be validated and are silently ignored.
- Multiple occurrences of the same `id` are tracked as the first one seen;
  `template-no-duplicate-id` handles the duplicate case separately.

## References

- [HTML spec: Labelable elements](https://html.spec.whatwg.org/multipage/forms.html#category-label)
- Adapted from [`html-validate`'s `valid-for`](https://html-validate.org/rules/valid-for.html) (MIT).
