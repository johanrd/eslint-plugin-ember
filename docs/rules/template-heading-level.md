# ember/template-heading-level

<!-- end auto-generated rule header -->

This rule codifies a heading-outline **authoring convention**, not a WCAG
requirement — no WCAG 2.1 Success Criterion prohibits skipped heading
levels. The convention is widely endorsed by WebAIM, MDN, and the A11y
Project as a screen-reader-navigation aid. Enforce if your team has
adopted it; skip otherwise.

**Defaults are tuned for Ember's component-based architecture.** Only the
one check that is reliably verifiable within a single template file runs
by default; the two checks that depend on tracking heading state across
component/route/layout boundaries are opt-in.

## Default on: multiple `<h1>` within the same sectioning root

Finding two `<h1>` in one file is a within-file signal regardless of what
ancestors render. `<dialog>` and elements with `role="dialog"` /
`role="alertdialog"` create a nested sectioning root — their `<h1>` is
validated independently.

## Opt-in: skipped levels (`allowSkippedLevels: false`)

In component-based apps the intervening headings often live in child
components the lint can't see. `<h1>` → `<h3>` at lint level might be
`<h1>` → `<MyComponent/>(renders h2)` → `<h3>` at runtime. So
skipped-level checking is off by default. Enable only if your templates
are flat enough that every heading in the rendered page appears in the
file being linted.

## Opt-in: initial-rank floor (`minInitialRank`, default `'any'`)

Layouts and parent routes commonly supply the outer `<h1>`, so child
templates naturally start at `<h2>` or deeper. The initial-rank check is
disabled by default. Set `minInitialRank: 'h1'` (strict) or `'h2'` (route
templates under a layout) to enable it at the scope you want.

## Examples

Default config:

**Forbids:**

```hbs
<h1>Title</h1>
<h1>Another title</h1>
```

**Allows** (by default — opt-in to the relevant option to flag):

```hbs
<h3>Start</h3>
{{! initial-rank check off }}
<h1>Title</h1><h3>Skipped h2</h3>
{{! skipped-levels check off }}
```

With `allowSkippedLevels: false`:

```hbs
<h1>Title</h1><h3>Skipped h2</h3> {{! now flagged }}
```

With `minInitialRank: 'h2'` (route under a layout):

```hbs
<h2>Route title</h2>
{{! allowed — satisfies min h2 }}
<h4>Too deep</h4>
{{! flagged — first heading must be h2 or stricter }}
```

## Configuration

- `allowMultipleH1` (`boolean`, default `false`): permit more than one
  `<h1>` per sectioning root.
- `allowSkippedLevels` (`boolean`, default `true`): when `true`, don't
  flag level skips (`<h1>` → `<h3>`). Default is `true` because
  intervening headings in component-based apps often live in child
  components the lint can't see.
- `minInitialRank` (`'h1' | 'h2' | ... | 'h6' | 'any'`, default `'any'`):
  the coarsest heading rank allowed as the file's first heading. `'any'`
  disables the check (the default, because layouts/parents supply the
  outer `<h1>`). Set to `'h1'` or `'h2'` at the right scope to enable it.

```js
module.exports = {
  rules: {
    'ember/template-heading-level': ['error', { allowSkippedLevels: false, minInitialRank: 'h2' }],
  },
};
```

## References

- [HTML spec: Headings and sections](https://html.spec.whatwg.org/multipage/sections.html#headings-and-sections)
  — describes using h1–h6 for document structure. The legacy HTML outline
  algorithm (which would have made sectioning elements reset heading rank)
  was never implemented in browsers or AT and has been
  [removed from WHATWG HTML](https://github.com/whatwg/html/pull/7829).
- [WCAG 2.1 Technique G141: Organizing a page using headings](https://www.w3.org/WAI/WCAG21/Techniques/general/G141)
  — a _sufficient technique_ (one way to meet SC 1.3.1 / 2.4.6), not itself
  normative. It does not prescribe no-skipped-levels.
- [WebAIM: Semantic Structure — Headings](https://webaim.org/techniques/semanticstructure/)
- [MDN: `<h1>`–`<h6>` Accessibility concerns](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements#accessibility_concerns)
- [Adrian Roselli: There Is No Document Outline Algorithm](https://adrianroselli.com/2016/08/there-is-no-document-outline-algorithm.html)
  — useful context for why the sectioning-root reset behavior is a
  convention, not a spec-enforced outline.
- Adapted from [`html-validate`'s `heading-level`](https://html-validate.org/rules/heading-level.html) (MIT).
