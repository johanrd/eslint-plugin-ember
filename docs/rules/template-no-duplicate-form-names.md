# ember/template-no-duplicate-form-names

<!-- end auto-generated rule header -->

This rule disallows two form controls sharing the same `name` attribute
within the same `<form>` (or within the template root, if no `<form>`
wraps the controls).

Duplicate names break form serialization: both values are emitted into
the entry list, and server-side code that expects a single value typically
reads only one — often not the one the author intended.

Two categories are exempt from the duplicate check:

- **Non-submitting controls** (`<input type="button">`, `<input type="reset">`,
  `<button type="button">`, `<button type="reset">`) are skipped entirely.
  Per [HTML §4.10.21.4](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-the-form-data-set)
  they do not contribute to the form data, so their `name` can't collide
  with anything.
- **Activation-only groups** (`<input type="radio">`, `<input type="submit">`,
  `<button type="submit">`) may share a `name` with same-type siblings.
  A radio group uses the shared name to denote mutual exclusion; multiple
  submit buttons with the same name distinguish which one the user activated
  by `value`.

## Examples

This rule **forbids** the following:

```hbs
<form>
  <input name='email' />
  <input name='email' />
</form>

<form>
  <input type='text' name='field' />
  <textarea name='field'></textarea>
</form>
```

This rule **allows** the following:

```hbs
<form>
  <input type='radio' name='color' value='red' />
  <input type='radio' name='color' value='blue' />
  <input type='submit' name='action' value='save' />
  <input type='submit' name='action' value='publish' />
</form>
```

Controls with the HTML `disabled` attribute are ignored — per
[HTML §4.10.21.3](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-the-form-data-set)
they do not contribute to the form-data entry list and cannot collide.

Controls with the HTML `hidden` attribute are **not** exempt: `hidden`
affects rendering, not form submission. A `hidden` control still submits
its `name`/`value`, so a duplicate name involving a hidden control is a
real collision.

## Limitations

- `name` values via mustache (`name={{this.fieldName}}`) are skipped — we
  cannot know the value at lint time.
- The `name[]` PHP-style array pattern is treated as an ordinary name; if
  you declare two `name="x[]"` controls in the same form this rule will
  still flag them. Support for array brackets may be added later.
- The `<input type="hidden">` + `<input type="checkbox">` default-value
  pattern (which is permitted in HTML) is not recognized — the pair will
  be flagged if you use it. Rename the hidden input if you hit this.

## References

- [HTML spec: Form submission](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm)
- Adapted from [`html-validate`'s `form-dup-name`](https://html-validate.org/rules/form-dup-name.html) (MIT).
