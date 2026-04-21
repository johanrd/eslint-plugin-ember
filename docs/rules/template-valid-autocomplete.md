# ember/template-valid-autocomplete

<!-- end auto-generated rule header -->

This rule validates the `autocomplete` attribute against the HTML living
standard. Browsers ignore unknown tokens and mismatched combinations
silently, so authoring mistakes become invisible at runtime — the user
just doesn't get the suggestions they expect.

The rule handles:

- `<form autocomplete>` must be `"on"` or `"off"`.
- `<input type="hidden">` cannot use the bare values `"on"` / `"off"`.
- `<input type="checkbox | radio | file | submit | image | reset | button">`
  cannot use `autocomplete` at all.
- Token grammar (see below): tokens must be a valid combination from the
  section / hint / contact / field-name / webauthn set, in the right order.
- Field names must match the input type's supported group (e.g.
  `"current-password"` is not meaningful on `<input type="text">`).

Dynamic values (`autocomplete={{this.acValue}}`) are skipped.

## Token order

An autocomplete attribute value can contain these tokens, in this order:

1. Optional section name (`section-*` prefix).
2. Optional `shipping` or `billing`.
3. Optional contact modifier: `home`, `work`, `mobile`, `fax`, `pager`
   (only for `tel-*` / `email` / `impp` field names).
4. Exactly one field name.
5. Optional `webauthn`.

## Examples

This rule **forbids** the following:

```hbs
<form autocomplete='yes'>
  <input autocomplete='first-name' type='text' />
  <input autocomplete='current-password' type='text' />
  <input autocomplete='off street-address' type='text' />
  <input autocomplete='home email family-name' type='text' />
  <input autocomplete='section-a' type='text' />
</form>
```

This rule **allows** the following:

```hbs
<form autocomplete='off'>
  <input autocomplete='email' type='email' />
  <input autocomplete='section-ship shipping street-address' type='text' />
  <input autocomplete='work email' type='email' />
  <input autocomplete='new-password webauthn' type='password' />
</form>
```

## References

- [HTML spec: autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)
- Adapted from [`html-validate`'s `valid-autocomplete`](https://html-validate.org/rules/valid-autocomplete.html) (MIT).
