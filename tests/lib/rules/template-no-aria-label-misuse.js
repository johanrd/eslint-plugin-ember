const rule = require('../../../lib/rules/template-no-aria-label-misuse');
const RuleTester = require('eslint').RuleTester;

const err = (attr, tag, role) =>
  `\`${attr}\` is prohibited on \`<${tag}>\` (role \`${role}\`). Elements with this role are not named from author; the attribute is ignored by assistive tech.`;

const validHbs = [
  '<button aria-label="Close">x</button>',
  '<select aria-label="c"><option>a</option></select>',
  '<textarea aria-label="t"></textarea>',
  '<input aria-label="i" type="text" />',
  '<a href="/x" aria-label="Go">link</a>',
  '<main aria-label="Primary"></main>',
  '<nav aria-label="Breadcrumb"></nav>',
  '<dialog aria-label="Confirm"></dialog>',
  '<iframe aria-label="Embed" src="/x"></iframe>',
  '<div role="button" aria-label="Custom">x</div>',
  '<div role="dialog" aria-labelledby="title">x</div>',
  '<div role="navigation" aria-label="Main nav"></div>',
  // role="presentation" / "none" — author opted out; nothing to lint.
  '<div role="presentation" aria-label="decoration">x</div>',
  '<span role="none" aria-label="decoration">x</span>',
  // First *recognised* token is "none"/"presentation" — still decorative.
  '<div role="foo none" aria-label="decoration">x</div>',
  '<div role="bogus presentation" aria-label="decoration">x</div>',
  // Tabindex escape hatch: real screen readers read aria-label on a
  // tabindexed element even when the implicit role is generic.
  '<span tabindex="0" aria-label="Focusable">x</span>',
  '<div tabindex="-1" aria-label="x">x</div>',
  // No aria-label/labelledby, or only empty values.
  '<div>plain</div>',
  '<span>text</span>',
  '<div aria-label=""></div>',
  // Mustache with a static empty string — treated as empty, not as a label.
  '<div aria-label={{""}}></div>',
  '<span aria-label={{""}}></span>',
  // Ember component — skipped (role unknowable).
  '<MyButton aria-label="x" />',
  // Custom elements — not in HTML/SVG/MathML tag lists, skipped.
  '<my-widget aria-label="x"></my-widget>',
  '<emoji-picker aria-label="x"></emoji-picker>',
  // Colon-namespaced tags (SVG DOM prefix form) — not enumerable, skipped.
  '<svg:rect aria-label="x" />',
  // Named blocks (Ember component API) — skipped.
  '<:slot aria-label="x" />',
  // Elements with no aria-query entry — skipped ("when in doubt, don't flag").
  '<audio aria-label="silent"></audio>',
  '<input type="hidden" aria-label="x" />',
  // <section> transitions to role=region when aria-label is present.
  '<section aria-label="About"></section>',
  // <form> transitions to role=form when aria-label is present.
  '<form aria-label="Search"></form>',
  // Dynamic role — runtime role may differ from implicit; skip rather than
  // false-flag against the element's implicit role.
  '<div role={{this.role}} aria-label="x">x</div>',
  '<span role={{this.role}} aria-labelledby="t">x</span>',
  // Role-fallback: UAs walk unknown leading tokens to the first recognised
  // role per WAI-ARIA §4.1. `role="xxyxyz button"` resolves to `button`,
  // which accepts aria-label — should not flag.
  '<div role="xxyxyz button" aria-label="Custom">x</div>',
];

const invalidHbs = [
  {
    code: '<div aria-label="dialog">x</div>',
    errors: [{ message: err('aria-label', 'div', 'generic') }],
  },
  {
    code: '<span aria-labelledby="title">x</span>',
    errors: [{ message: err('aria-labelledby', 'span', 'generic') }],
  },
  {
    code: '<p aria-label="note">text</p>',
    errors: [{ message: err('aria-label', 'p', 'paragraph') }],
  },
  {
    code: '<a aria-label="missing">x</a>',
    errors: [{ message: err('aria-label', 'a', 'generic') }],
  },
  {
    code: '<div aria-label={{this.label}}>x</div>',
    errors: [{ message: err('aria-label', 'div', 'generic') }],
  },
  // <img alt=""> is role=presentation per ARIA; aria-label contradicts the
  // "decorative" hint and is prohibited.
  {
    code: '<img aria-label="x" alt="" src="/y.png" />',
    errors: [{ message: err('aria-label', 'img', 'presentation') }],
  },
  // With strictTabindex: true, tabindex no longer exempts a generic element.
  {
    code: '<span tabindex="0" aria-label="Focusable">x</span>',
    options: [{ strictTabindex: true }],
    errors: [{ message: err('aria-label', 'span', 'generic') }],
  },
  {
    code: '<div tabindex="-1" aria-label="x">x</div>',
    options: [{ strictTabindex: true }],
    errors: [{ message: err('aria-label', 'div', 'generic') }],
  },
];

const gjsValid = validHbs.map((code) => `<template>${code}</template>`);
const gjsInvalid = invalidHbs.map(({ code, errors, options }) => ({
  code: `<template>${code}</template>`,
  errors,
  ...(options ? { options } : {}),
}));

const gjsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

gjsRuleTester.run('template-no-aria-label-misuse', rule, {
  valid: gjsValid,
  invalid: gjsInvalid,
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-no-aria-label-misuse', rule, {
  valid: validHbs,
  invalid: invalidHbs,
});
