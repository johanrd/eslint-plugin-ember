# ember/template-no-duplicate-form-names

<!-- end auto-generated rule header -->

This rule disallows two form controls sharing the same `name` attribute
within the same `<form>` (or within the template root, if no `<form>`
wraps the controls).

Duplicate names break form serialization: only one value survives into
the submitted payload, and which one survives depends on the browser.
The common legitimate exception is a radio group — which is why radio,
submit, reset, and `<button>` types are allowed to share names.

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

Disabled or `hidden` controls are ignored, as they don't submit.

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
