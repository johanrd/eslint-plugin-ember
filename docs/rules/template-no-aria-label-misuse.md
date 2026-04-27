# ember/template-no-aria-label-misuse

<!-- begin auto-generated rule header -->
<!-- end auto-generated rule header -->

Flag `aria-label` and `aria-labelledby` on elements whose computed role
prohibits an accessible name from author. On a plain `<div>` the role is
`generic`, whose [`prohibitedProps` per WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#generic)
list both `aria-label` and `aria-labelledby` — assistive technology is
expected to ignore them.

## How the role is resolved

Roles are looked up via [`aria-query`](https://www.npmjs.com/package/aria-query),
the authoritative WAI-ARIA data package:

- **Explicit**: if the element has a static `role="..."`, that role is used.
  `role="presentation"` and `role="none"` cause the element to be skipped
  (author has removed it from the a11y tree).
- **Implicit**: `aria-query.elementRoles` gives the spec-mapped role for
  each HTML tag. Conditional entries (e.g. `<section aria-label="...">`
  maps to `region`, `<a href>` maps to `link`) are matched against the
  element's static attributes; the most specific match wins.

If no role can be resolved (unknown tag, component invocation, or
element without an aria-query entry), the rule skips — consistent with
the plugin's "when in doubt, don't flag" stance.

## Escape hatches (not flagged by default)

- Elements with `tabindex` (any value). An explicit `tabindex` signals
  author-intent-to-interact, even when the computed ARIA role is still
  generic. Flagging here has a high false-positive cost (the author
  _wants_ the label read on focus) relative to the true-positive it
  would catch. Disable this hatch with `strictTabindex: true` below.
- Elements with `role="presentation"` / `role="none"`.
- Elements whose role is inherently nameable (e.g. `button`, `link`,
  `main`, `navigation`, `region`).

## Configuration

- `strictTabindex` (`boolean`, default `false`): when `true`, the
  tabindex escape hatch is disabled — a `<div tabindex="0" aria-label="x">`
  is flagged as strictly as any other generic element. Enable this for
  strict spec-role enforcement.

```js
module.exports = {
  rules: {
    'ember/template-no-aria-label-misuse': ['error', { strictTabindex: true }],
  },
};
```

## Examples

Forbids:

```hbs
<div aria-label='dialog'>...</div>
<span aria-labelledby='title'>...</span>
<p aria-label='note'>Note text</p>
<a aria-label='missing-href'>...</a>
<img aria-label='x' alt='' src='/y.png' />
```

Allows:

```hbs
<button aria-label='Close'>x</button>
<main aria-label='Primary'>...</main>
<section aria-label='About'>...</section>
{{! becomes role=region }}
<form aria-label='Search'>...</form>
{{! becomes role=form }}
<div role='button' aria-label='Custom'>...</div>
<span tabindex='0' aria-label='Focusable'>...</span>
```

## References

- [WAI-ARIA 1.2: Accessible Name Calculation](https://www.w3.org/TR/wai-aria-1.2/#namecalculation)
- [WAI-ARIA 1.2: `aria-label` property definition](https://www.w3.org/TR/wai-aria-1.2/#aria-label)
- [HTML-AAM: ARIA role mappings](https://www.w3.org/TR/html-aam-1.1/#html-element-role-mappings)
- [`aria-query`](https://www.npmjs.com/package/aria-query) (authoritative ARIA data, already a dep of this plugin)
- Rule inspired by [`html-validate`'s `aria-label-misuse`](https://gitlab.com/html-validate/html-validate/-/blob/v10.13.1/src/rules/aria-label-misuse.ts) (MIT).
