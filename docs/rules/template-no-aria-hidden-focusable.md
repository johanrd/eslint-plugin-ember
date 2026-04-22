# ember/template-no-aria-hidden-focusable

<!-- end auto-generated rule header -->

This rule disallows `aria-hidden="true"` on focusable elements, and on
elements that contain a focusable descendant.

When a focusable element (or an ancestor of one) is hidden from assistive
technology with `aria-hidden`, the element is still reachable by keyboard
and mouse but disappears from screen readers. That creates a silent tab
stop — confusing for assistive-tech users and a common cause of real
accessibility bugs.

## Scope

This rule walks descendants **within the current template file**. It does
**not** follow `<MyComponent>` invocations or `{{yield}}` boundaries, so a
focusable element rendered inside a child component won't be caught here.
Flagging every component under `aria-hidden` would produce too many false
positives; the explicit check lives in the template the author controls.

## Examples

This rule **forbids** the following:

```hbs
<button aria-hidden='true'>Submit</button>
<a href='/foo' aria-hidden='true'>Link</a>

<div aria-hidden='true'>
  <button>Hidden but still tabbable</button>
</div>

<div aria-hidden>
  <a href='/profile'>Profile</a>
</div>
```

This rule **allows** the following:

```hbs
<div aria-hidden='true'>
  <span>Decorative text only</span>
</div>

<button aria-hidden='true' tabindex='-1'>Not tabbable</button>

<div aria-hidden='true'>
  <input type='hidden' name='csrf' value={{this.csrf}} />
</div>
```

## How to fix

Options, in rough preference order:

- Drop `aria-hidden` — the element is interactive and screen-reader users
  should hear it.
- Add `tabindex="-1"` to remove the element from tab order.
- Use `hidden`, `inert`, or conditional rendering instead of `aria-hidden`.
- Remove the element from the DOM altogether.

## References

- [W3C "Using ARIA" — 4th Rule](https://www.w3.org/TR/using-aria/#4thrule):
  *"Do not use role='presentation' or aria-hidden='true' on a focusable
  element."* This is the authoritative normative statement against hiding
  focusable content.
- [W3C ACT rule `6cfa84`: Element with aria-hidden has no content in sequential focus navigation](https://www.w3.org/WAI/standards-guidelines/act/rules/6cfa84/)
- [axe-core rule `aria-hidden-focus`](https://dequeuniversity.com/rules/axe/4.10/aria-hidden-focus)
- [WCAG 2.1 F70](https://www.w3.org/WAI/WCAG21/Techniques/failures/F70) /
  [F86](https://www.w3.org/WAI/WCAG21/Techniques/failures/F86) — failure
  techniques for hiding content that should be exposed.
- [WAI-ARIA 1.2: aria-hidden](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden)
  — defines the attribute; uses MAY-level language and does *not* itself
  contain the MUST-NOT phrasing often attributed to it.
- Adapted from [`html-validate`'s `hidden-focusable`](https://html-validate.org/rules/hidden-focusable.html) (MIT).
