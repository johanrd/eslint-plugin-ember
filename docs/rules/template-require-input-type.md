# ember/template-require-input-type

<!-- end auto-generated rule header -->

This rule requires every `<input>` element to declare a `type` attribute, and
rejects values that are not one of the 22 input types defined by the HTML spec.

Without an explicit `type`, `<input>` silently defaults to `type="text"`. When
that default doesn't match the author's intent the form ships broken — for
example, an `<input>` meant for email validation won't validate, and an input
meant for a number will accept any string.

## Examples

This rule **forbids** the following:

```hbs
<input />
<input name='email' />
<input type='' />
<input type='foo' />
```

This rule **allows** the following:

```hbs
<input type='text' />
<input type='email' />
<input type='checkbox' />
<input type={{this.inputType}} />
```

Dynamic values such as `type={{this.inputType}}` are not flagged at lint time.

## References

- [HTML spec — the input element](https://html.spec.whatwg.org/multipage/input.html#the-input-element)
- Adapted from [`html-validate`'s `no-implicit-input-type`](https://html-validate.org/rules/no-implicit-input-type.html) (MIT).
