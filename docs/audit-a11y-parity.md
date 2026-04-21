# A11y parity audit — eslint-plugin-ember vs. jsx-a11y / vue-a11y / angular-template / lit-a11y

Status: draft. Phase 1 matrix + Phase 2 missing-rule backlog. Phase 3 (behavioral comparison via exhaustive test translation) and Phase 4 (ranked findings) are tracked separately.

## Scope

This document audits the a11y / HTML-spec coverage of `eslint-plugin-ember`'s template rules against four upstream plugins:

- [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) — 38 rules
- [`eslint-plugin-vuejs-accessibility`](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility) — 23 rules
- [`@angular-eslint/eslint-plugin-template`](https://github.com/angular-eslint/angular-eslint/tree/main/packages/eslint-plugin-template) — 12 a11y/HTML rules (of 39 total; code-quality rules excluded)
- [`eslint-plugin-lit-a11y`](https://github.com/open-wc/open-wc/tree/master/packages/eslint-plugin-lit-a11y) — 29 rules

Framework-specific rules (Vue `v-bind`, Angular `banana-in-box`, Lit `no-aria-slot` for shadow DOM, React event-semantics that don't map to HBS) are noted but not made action items. Our ember-specific rules (`template-no-args-paths`, `template-no-attrs-in-components`, etc.) are excluded from the matrix because they have no peer.

## Matrix

Rows are keyed by concept, not rule name. Cell value is the rule name in that plugin, or `—` if absent.

**Legend** — Category: `html`=HTML-spec, `aria`=ARIA-spec, `focus`=keyboard/focus, `label`=labeling, `fw`=framework-specific (skipped). Relevance: `H`=high (pure HTML/ARIA), `M`=medium, `L`=low, `S`=skip.

| #   | Concept                                                                                               | jsx-a11y                                                                  | vue-a11y                              | angular                      | lit-a11y                           | ember                                                                 | Cat   | Rel   |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------- | ---------------------------- | ---------------------------------- | --------------------------------------------------------------------- | ----- | ----- |
| 1   | Images have alt text (img, area, object, input[type=image])                                           | alt-text                                                                  | alt-text                              | alt-text                     | alt-text, obj-alt                  | template-require-valid-alt-text                                       | label | H     |
| 2   | Anchor has accessible content                                                                         | anchor-has-content                                                        | anchor-has-content                    | —                            | —                                  | template-link-href-attributes (partial)                               | label | H     |
| 3   | Anchor is valid (href present, not `#`/`javascript:`)                                                 | anchor-is-valid                                                           | —                                     | —                            | anchor-is-valid                    | —                                                                     | html  | H     |
| 4   | Anchor text is not ambiguous ("click here", "read more")                                              | anchor-ambiguous-text                                                     | —                                     | —                            | —                                  | template-no-invalid-link-text                                         | label | H     |
| 5   | Link title attribute is meaningful                                                                    | —                                                                         | —                                     | —                            | —                                  | template-no-invalid-link-title                                        | label | H     |
| 6   | Elements with `aria-activedescendant` must be focusable (tabindex)                                    | aria-activedescendant-has-tabindex                                        | —                                     | —                            | aria-activedescendant-has-tabindex | template-require-aria-activedescendant-tabindex                       | focus | H     |
| 7   | ARIA attribute names are valid                                                                        | aria-props                                                                | aria-props                            | valid-aria                   | aria-attrs                         | template-no-invalid-aria-attributes                                   | aria  | H     |
| 8   | ARIA attribute values match spec types                                                                | aria-proptypes                                                            | —                                     | valid-aria                   | aria-attr-valid-value              | —                                                                     | aria  | **H** |
| 9   | ARIA role is valid and non-abstract                                                                   | aria-role                                                                 | aria-role                             | valid-aria                   | aria-role                          | template-no-invalid-role + template-no-abstract-roles                 | aria  | H     |
| 10  | ARIA disallowed on unsupported elements (meta/html/script/…)                                          | aria-unsupported-elements                                                 | aria-unsupported-elements             | —                            | aria-unsupported-elements          | template-no-aria-unsupported-elements                                 | aria  | H     |
| 11  | `autocomplete` attribute has a valid value                                                            | autocomplete-valid                                                        | —                                     | —                            | autocomplete-valid                 | —                                                                     | html  | M     |
| 12  | Click handler → must have a paired keyboard handler                                                   | click-events-have-key-events                                              | click-events-have-key-events          | click-events-have-key-events | click-events-have-key-events       | —                                                                     | focus | **H** |
| 13  | Form control has an associated label (for/aria-label/nested)                                          | control-has-associated-label, label-has-associated-control, label-has-for | form-control-has-label, label-has-for | label-has-associated-control | —                                  | template-require-input-label                                          | label | H     |
| 14  | Heading elements have accessible content                                                              | heading-has-content                                                       | heading-has-content                   | —                            | —                                  | template-no-empty-headings                                            | html  | H     |
| 15  | Heading not hidden from AT (`aria-hidden="true"` on heading)                                          | —                                                                         | —                                     | —                            | heading-hidden                     | —                                                                     | aria  | **M** |
| 16  | `<html>` has a `lang` attribute                                                                       | html-has-lang                                                             | —                                     | —                            | —                                  | template-require-lang-attribute                                       | html  | H     |
| 17  | `lang` value is a valid BCP-47 language tag                                                           | lang                                                                      | —                                     | —                            | valid-lang                         | template-require-lang-attribute (validates BCP-47)                    | html  | H     |
| 18  | `<iframe>` has a `title`                                                                              | iframe-has-title                                                          | iframe-has-title                      | —                            | iframe-title                       | template-require-iframe-title                                         | label | H     |
| 19  | `<img>` alt text isn't redundant ("image of …")                                                       | img-redundant-alt                                                         | —                                     | —                            | img-redundant-alt                  | —                                                                     | label | M     |
| 20  | Interactive widget elements are focusable                                                             | interactive-supports-focus                                                | interactive-supports-focus            | interactive-supports-focus   | —                                  | partial via template-no-invalid-interactive                           | focus | H     |
| 21  | Media elements (`<audio>`/`<video>`) have captions track                                              | media-has-caption                                                         | media-has-caption                     | —                            | —                                  | template-require-media-caption                                        | label | H     |
| 22  | Mouse events (hover/enter/leave) paired with focus/blur                                               | mouse-events-have-key-events                                              | mouse-events-have-key-events          | mouse-events-have-key-events | mouse-events-have-key-events       | —                                                                     | focus | **H** |
| 23  | `accesskey` attribute disallowed                                                                      | no-access-key                                                             | no-access-key                         | —                            | no-access-key                      | template-no-accesskey-attribute                                       | html  | H     |
| 24  | `aria-hidden="true"` on focusable element                                                             | no-aria-hidden-on-focusable                                               | no-aria-hidden-on-focusable           | —                            | —                                  | —                                                                     | aria  | **H** |
| 25  | `autofocus` disallowed                                                                                | no-autofocus                                                              | no-autofocus                          | no-autofocus                 | no-autofocus                       | template-no-autofocus-attribute                                       | html  | M     |
| 26  | Disallow distracting/obsolete elements (`<marquee>`, `<blink>`)                                       | no-distracting-elements                                                   | no-distracting-elements               | no-distracting-elements      | no-distracting-elements            | template-no-obsolete-elements + template-no-forbidden-elements        | html  | M     |
| 27  | Native interactive element cannot take a non-interactive role (`<button role="heading">`)             | no-interactive-element-to-noninteractive-role                             | —                                     | —                            | —                                  | —                                                                     | aria  | **H** |
| 28  | Non-interactive element with click handler must have role + keyboard                                  | no-noninteractive-element-interactions, no-static-element-interactions    | no-static-element-interactions        | —                            | —                                  | template-no-invalid-interactive (partial)                             | focus | **H** |
| 29  | Non-interactive element cannot take an interactive role without focus support (`<div role="button">`) | no-noninteractive-element-to-interactive-role                             | —                                     | —                            | —                                  | —                                                                     | aria  | **H** |
| 30  | `tabindex` on non-interactive element requires a role                                                 | no-noninteractive-tabindex                                                | —                                     | —                            | —                                  | —                                                                     | focus | **M** |
| 31  | `onChange` disallowed on `<select>` (use `onBlur`)                                                    | no-onchange                                                               | no-onchange                           | —                            | —                                  | —                                                                     | fw    | S     |
| 32  | Redundant role (role matches element's implicit role)                                                 | no-redundant-roles                                                        | no-redundant-roles                    | —                            | no-redundant-role                  | template-no-redundant-role                                            | aria  | H     |
| 33  | `role="presentation"` not on focusable element                                                        | —                                                                         | no-role-presentation-on-focusable     | —                            | —                                  | —                                                                     | aria  | **M** |
| 34  | Prefer native semantic tag over ARIA role                                                             | prefer-tag-over-role                                                      | —                                     | —                            | —                                  | —                                                                     | aria  | **M** |
| 35  | Role has all required ARIA properties (e.g. `role="slider"` needs `aria-valuemin/max/now`)            | role-has-required-aria-props                                              | role-has-required-aria-props          | role-has-required-aria       | role-has-required-aria-attrs       | template-require-mandatory-role-attributes                            | aria  | H     |
| 36  | ARIA attribute is supported by the element's role (`aria-sort` only on sortable)                      | role-supports-aria-props                                                  | —                                     | —                            | role-supports-aria-attr            | template-no-unsupported-role-attributes                               | aria  | H     |
| 37  | `scope` attribute only on `<th>`                                                                      | scope                                                                     | —                                     | table-scope                  | scope                              | template-no-scope-outside-table-headings                              | html  | H     |
| 38  | Positive tabindex disallowed                                                                          | tabindex-no-positive                                                      | tabindex-no-positive                  | no-positive-tabindex         | tabindex-no-positive               | template-no-positive-tabindex                                         | focus | H     |
| 39  | Accessible emoji — emoji has `role="img"` + label (deprecated)                                        | accessible-emoji                                                          | —                                     | —                            | accessible-emoji                   | —                                                                     | label | L     |
| 40  | Accessible name (composite check for button/link/control)                                             | —                                                                         | —                                     | —                            | accessible-name                    | —                                                                     | label | **M** |
| 41  | Definition list (`<dl>/<dt>/<dd>`) structure                                                          | —                                                                         | —                                     | —                            | definition-list                    | —                                                                     | html  | L     |
| 42  | List (`<ul>/<ol>/<li>`) structure                                                                     | —                                                                         | —                                     | —                            | list                               | —                                                                     | html  | L     |
| 43  | `<object>` has alt/title                                                                              | —                                                                         | —                                     | —                            | obj-alt                            | (merged into template-require-valid-alt-text?)                        | label | M     |
| 44  | `<slot>` should not have aria-\* (Lit shadow DOM)                                                     | —                                                                         | —                                     | —                            | no-aria-slot                       | —                                                                     | fw    | S     |
| 45  | Lit `@change` only on form controls                                                                   | —                                                                         | —                                     | —                            | no-invalid-change-handler          | —                                                                     | fw    | S     |
| 46  | `<button>` has `type` attribute                                                                       | —                                                                         | —                                     | button-has-type              | —                                  | template-require-button-type                                          | html  | H     |
| 47  | Abstract roles disallowed (structural/widget/window/etc.)                                             | (folded into aria-role)                                                   | (folded into aria-role)               | (folded into valid-aria)     | (folded into aria-role)            | template-no-abstract-roles                                            | aria  | H     |
| 48  | `aria-hidden` on `<body>`                                                                             | —                                                                         | —                                     | —                            | —                                  | template-no-aria-hidden-body                                          | aria  | H     |
| 49  | Nested interactive elements (`<button><a>`)                                                           | —                                                                         | —                                     | —                            | —                                  | template-no-nested-interactive                                        | html  | H     |
| 50  | Nested landmark elements                                                                              | —                                                                         | —                                     | —                            | —                                  | template-no-duplicate-landmark-elements + template-no-nested-landmark | aria  | H     |
| 51  | Heading inside button                                                                                 | —                                                                         | —                                     | —                            | —                                  | template-no-heading-inside-button                                     | html  | H     |
| 52  | Meta tag validity                                                                                     | —                                                                         | —                                     | —                            | —                                  | template-no-invalid-meta                                              | html  | M     |
| 53  | Duplicate `id` disallowed                                                                             | —                                                                         | —                                     | —                            | —                                  | template-no-duplicate-id                                              | html  | H     |
| 54  | Duplicate attributes disallowed                                                                       | —                                                                         | —                                     | —                            | no-duplicate-attributes (angular)  | template-no-duplicate-attributes                                      | html  | H     |
| 55  | `<iframe>` requires `src`                                                                             | —                                                                         | —                                     | —                            | —                                  | template-require-iframe-src-attribute                                 | html  | M     |
| 56  | Form method attribute required                                                                        | —                                                                         | —                                     | —                            | —                                  | template-require-form-method                                          | html  | M     |
| 57  | Valid form groups (fieldset/legend)                                                                   | —                                                                         | —                                     | —                            | —                                  | template-require-valid-form-groups                                    | html  | M     |
| 58  | Table has thead/tbody/tfoot grouping                                                                  | —                                                                         | —                                     | —                            | —                                  | template-table-groups                                                 | html  | M     |
| 59  | Context role appropriate for element (e.g. `role="row"` inside table)                                 | —                                                                         | —                                     | —                            | —                                  | template-require-context-role                                         | aria  | H     |
| 60  | Presentational role → children must also be presentational                                            | —                                                                         | —                                     | —                            | —                                  | template-require-presentational-children                              | aria  | H     |
| 61  | Inline styles disallowed                                                                              | —                                                                         | —                                     | no-inline-styles             | —                                  | template-no-inline-styles                                             | html  | L     |
| 62  | Pointer-down event binding anti-pattern                                                               | —                                                                         | —                                     | —                            | —                                  | template-no-pointer-down-event-binding                                | focus | M     |
| 63  | Action on submit button must be `type="submit"`                                                       | —                                                                         | —                                     | —                            | —                                  | template-no-action-on-submit-button                                   | html  | M     |

### Rows I'm not sure about (needs deeper check)

- Row 2 (anchor-has-content) — our `template-link-href-attributes` is probably a different concern (checks href validity, not content); worth investigating.
- Row 43 (obj-alt) — verify our `template-require-valid-alt-text` covers `<object>` elements.
- Row 17 (lang BCP-47) — confirm `template-require-lang-attribute` does full BCP-47 validation (commit message `0a7da06a Fix template-require-lang-attribute: validate every BCP47 subtag` suggests yes).

## Phase 2 — Missing-rule backlog

Concepts where we have no rule and ≥2 peer plugins do. Each entry: suggested name, spec authority, reference implementations, priority rationale, scope notes.

### High priority (must-fix-level concepts, ≥3 peers + spec authority)

#### M1. Click handler on non-interactive element needs keyboard equivalent

- **Row 12** (covered by all 4 plugins)
- **Suggested name:** `template-click-events-have-key-events`
- **Spec:** [WAI-ARIA Authoring Practices — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), [MDN — Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
- **Reference impls:** `context/eslint-plugin-jsx-a11y-main/src/rules/click-events-have-key-events.js` (simplest), `context/eslint-plugin-vuejs-accessibility-main/src/rules/click-events-have-key-events.ts`, `context/angular-eslint-main/packages/eslint-plugin-template/src/rules/click-events-have-key-events.ts`
- **Priority:** highest — 4-way consensus, WAI-ARIA authority, and the exact pattern (div + click handler missing keyboard support) is common in Ember apps
- **Scope:** HBS uses `{{on "click" …}}` and `{{on "keydown" …}}`; matcher needs to walk ElementNode modifiers looking for `{{on}}` invocations. Map of click→{keydown,keyup,keypress} as in upstream

#### M2. Mouse events (hover/enter/leave) paired with focus/blur

- **Row 22** (covered by all 4 plugins)
- **Suggested name:** `template-mouse-events-have-key-events`
- **Spec:** [WAI-ARIA APG — Keyboard Interaction](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- **Reference impls:** same four plugins as M1 (look for `mouse-events-have-key-events.*`)
- **Priority:** highest — 4-way consensus, same rationale as M1
- **Scope:** Mapping: `mouseover/mouseenter → focus/focusin`, `mouseout/mouseleave → blur/focusout`. HBS syntax as in M1

#### M3. Non-interactive element with click handler

- **Row 28** (jsx-a11y has it twice: `no-noninteractive-element-interactions` + `no-static-element-interactions`; vue has `no-static-element-interactions`)
- **Suggested name:** `template-no-static-element-interactions` (prefer this name; matches 2 plugins)
- **Spec:** [WAI-ARIA APG — Button role](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [HTML spec — Interactive content](https://html.spec.whatwg.org/multipage/dom.html#interactive-content)
- **Reference impls:** `eslint-plugin-jsx-a11y/src/rules/no-static-element-interactions.js`, `eslint-plugin-vuejs-accessibility/src/rules/no-static-element-interactions.ts`
- **Priority:** high — catches `<div {{on "click" …}}>` without any interactive semantics
- **Scope:** overlaps with our existing `template-no-invalid-interactive` — need behavioral comparison before porting. Might be a rename/broadening of the existing rule

#### M4. Non-interactive element cannot take interactive role without focus support (`<div role="button">` needs tabindex + keyboard)

- **Row 29** (jsx-a11y only)
- **Suggested name:** `template-no-noninteractive-element-to-interactive-role`
- **Spec:** [WAI-ARIA APG — Roles and interaction](https://www.w3.org/WAI/ARIA/apg/practices/), [ARIA 1.2 — roles](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)
- **Reference impl:** `eslint-plugin-jsx-a11y/src/rules/no-noninteractive-element-to-interactive-role.js`
- **Priority:** high — common pattern and a real a11y bug when omitted
- **Scope:** related to M1 and M3. May land as one unified rule or stay separate

#### M5. Native interactive element cannot take a non-interactive role (`<button role="heading">`)

- **Row 27** (jsx-a11y only)
- **Suggested name:** `template-no-interactive-element-to-noninteractive-role`
- **Spec:** [ARIA 1.2 — Allowed roles](https://www.w3.org/TR/html-aria/)
- **Reference impl:** `eslint-plugin-jsx-a11y/src/rules/no-interactive-element-to-noninteractive-role.js`
- **Priority:** high — clear semantic bug catcher
- **Scope:** single jsx-a11y reference, but the concept has clear spec backing in HTML-AAM

#### M6. `aria-hidden="true"` on focusable element

- **Row 24** (jsx-a11y + vue)
- **Suggested name:** `template-no-aria-hidden-on-focusable`
- **Spec:** [WAI-ARIA 1.2 — aria-hidden](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden) — "Authors SHOULD NOT use aria-hidden on elements that can receive focus"
- **Reference impls:** `eslint-plugin-jsx-a11y/src/rules/no-aria-hidden-on-focusable.js`, `eslint-plugin-vuejs-accessibility/src/rules/no-aria-hidden-on-focusable.ts`
- **Priority:** high — creates a keyboard trap; strong spec authority
- **Scope:** needs focus-detection (tabindex/interactive tag) logic, overlaps with our existing `template-no-aria-hidden-body`

#### M7. ARIA attribute values match spec types (`aria-checked="maybe"` → invalid)

- **Row 8** (jsx-a11y + lit + angular)
- **Suggested name:** `template-valid-aria-proptypes` or fold into existing `template-no-invalid-aria-attributes`
- **Spec:** [WAI-ARIA 1.2 — States and Properties value types](https://www.w3.org/TR/wai-aria-1.2/#state_prop_def)
- **Reference impls:** `eslint-plugin-jsx-a11y/src/rules/aria-proptypes.js`, `eslint-plugin-lit-a11y/lib/rules/aria-attr-valid-value.js`
- **Priority:** high — without this, an aria-checked="1" or aria-expanded="yes" passes silently
- **Scope:** needs `aria-query` integration. Check whether to extend existing rule or add a new one

### Medium priority

#### M8. `role="presentation"` / `role="none"` on focusable element

- **Row 33** (vue only)
- **Suggested name:** `template-no-role-presentation-on-focusable`
- **Spec:** [WAI-ARIA 1.2 — role presentation](https://www.w3.org/TR/wai-aria-1.2/#presentation)
- **Reference impl:** `eslint-plugin-vuejs-accessibility/src/rules/no-role-presentation-on-focusable.ts`
- **Priority:** medium — only one peer, but it's a spec-backed bug
- **Scope:** companion to M6; may share focus-detection utility

#### M9. Prefer native semantic tag over ARIA role

- **Row 34** (jsx-a11y only)
- **Suggested name:** `template-prefer-tag-over-role`
- **Spec:** [ARIA in HTML — First rule of ARIA use](https://www.w3.org/TR/html-aria/#rule1)
- **Reference impl:** `eslint-plugin-jsx-a11y/src/rules/prefer-tag-over-role.js`
- **Priority:** medium — best-practice style, not a bug catcher
- **Scope:** table-driven, roles→preferred-tag mapping

#### M10. `tabindex` on non-interactive element needs a role

- **Row 30** (jsx-a11y only)
- **Suggested name:** `template-no-noninteractive-tabindex`
- **Spec:** [ARIA Authoring Practices — Keyboard navigation](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- **Reference impl:** `eslint-plugin-jsx-a11y/src/rules/no-noninteractive-tabindex.js`
- **Priority:** medium — related to M4, worth bundling
- **Scope:** related to tabindex detection logic shared with M1/M3/M4

#### M11. Anchor is valid (`href` present, not `#`/`javascript:`)

- **Row 3** (jsx-a11y + lit)
- **Suggested name:** `template-anchor-is-valid`
- **Spec:** [HTML spec — The a element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)
- **Reference impls:** `eslint-plugin-jsx-a11y/src/rules/anchor-is-valid.js`, `eslint-plugin-lit-a11y/lib/rules/anchor-is-valid.js`
- **Priority:** medium — our `template-link-href-attributes` may partially cover this; needs verification
- **Scope:** has multiple "aspects" (noHref, invalidHref, preferButton). Port as a single rule with options

#### M12. `autocomplete` attribute value validity

- **Row 11** (jsx-a11y + lit)
- **Suggested name:** `template-autocomplete-valid`
- **Spec:** [HTML — autocomplete](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)
- **Reference impls:** `eslint-plugin-jsx-a11y/src/rules/autocomplete-valid.js`, `eslint-plugin-lit-a11y/lib/rules/autocomplete-valid.js`
- **Priority:** medium — narrow HTML-spec bug catcher
- **Scope:** uses `axe-core`'s valid-autocomplete tokens table

### Low priority

#### M13. `<img>` alt-text isn't redundant with context ("image of …")

- **Row 19** (jsx-a11y + lit)
- **Suggested name:** `template-img-redundant-alt`
- **Priority:** low — quality-of-alt heuristic, overlap with `template-no-invalid-link-text` style of fuzzy matching
- **Scope:** config-driven phrase list

#### M14. Heading must not be `aria-hidden="true"`

- **Row 15** (lit only)
- **Suggested name:** `template-no-aria-hidden-on-heading`
- **Priority:** low — covered implicitly by M6 when we land it
- **Scope:** possibly merge into M6

#### M15. Definition-list structure (`<dl>/<dt>/<dd>`)

- **Row 41** (lit only)
- **Priority:** low — narrow HTML-spec niche
- **Scope:** skip for now, revisit after higher-priority rules land

#### M16. List structure (`<ul>/<ol>/<li>`)

- **Row 42** (lit only)
- **Priority:** low — narrow HTML-spec niche
- **Scope:** defer

#### M17. Accessible-name composite check (button/link/control)

- **Row 40** (lit only)
- **Suggested name:** `template-accessible-name` — but this likely overlaps with ours `template-require-input-label`, `template-link-href-attributes`, `template-require-iframe-title`
- **Priority:** low — probably redundant with our split rules; verify before porting

## Phase 2 summary

| Priority | Count       | Concepts                                                                                                                                 |
| -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| High     | 7 (M1-M7)   | keyboard pairing × 2, static-element interactions, interactive/non-interactive role mismatches, aria-hidden-on-focusable, aria-proptypes |
| Medium   | 5 (M8-M12)  | role-presentation-on-focusable, prefer-tag-over-role, no-noninteractive-tabindex, anchor-is-valid, autocomplete-valid                    |
| Low      | 5 (M13-M17) | img-redundant-alt, heading-hidden, dl/ul structure, accessible-name composite                                                            |

**Recommended first port:** M1 (`click-events-have-key-events`) — maximum 4-plugin consensus, strong spec authority, and addresses a pattern that's definitely present in real Ember apps.

## Phase 3 — Status

Phase 3 translates peer plugins' full valid+invalid test suites into `tests/audit/<concept>/peer-parity.js` and runs them against our rule. Each failure is (a) a bug, (b) a spec-grounded divergence, or (c) a JSX/Vue-specific case that doesn't translate.

**Operating mode**: audit fixtures are NOT part of CI. Run on demand:

```
npx vitest run tests/audit/
```

Cases promote to `tests/lib/rules/` only when a fix PR addresses the underlying behavior.

### Completed (14 concepts, 448 translated cases)

| Concept                            | Our rule                                              | Fixture                                                         | Findings                                     |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| aria-role                          | template-no-invalid-role + template-no-abstract-roles | `tests/audit/aria-role/peer-parity.js`                          | 3 FPs → PR #14                               |
| alt-text                           | template-require-valid-alt-text                       | `tests/audit/alt-text/peer-parity.js`                           | 3 FNs on empty aria-label → PR #15           |
| iframe-title                       | template-require-iframe-title                         | `tests/audit/iframe-title/peer-parity.js`                       | 4 FNs on null/undef/number literals → PR #16 |
| media-has-caption                  | template-require-media-caption                        | `tests/audit/media-has-caption/peer-parity.js`                  | 1 FN on `kind="Captions"` → PR #10           |
| scope                              | template-no-scope-outside-table-headings              | `tests/audit/scope/peer-parity.js`                              | —                                            |
| heading-content                    | template-no-empty-headings                            | `tests/audit/heading-content/peer-parity.js`                    | B4 boolean aria-hidden FP → PR #8            |
| aria-activedescendant-has-tabindex | template-require-aria-activedescendant-tabindex       | `tests/audit/aria-activedescendant-has-tabindex/peer-parity.js` | B1 tabindex="-1" FP + auto-fix → PR #6       |
| aria-unsupported-elements          | template-no-aria-unsupported-elements                 | `tests/audit/aria-unsupported-elements/peer-parity.js`          | 8 uncovered reserved elements → PR #11       |
| no-redundant-roles                 | template-no-redundant-role                            | `tests/audit/no-redundant-roles/peer-parity.js`                 | 2 FNs (case + `<select>`) → PR #12           |
| role-has-required-aria             | template-require-mandatory-role-attributes            | `tests/audit/role-has-required-aria/peer-parity.js`             | B2 checkbox+switch FP → PRs #7, #13          |
| role-supports-aria-props           | template-no-unsupported-role-attributes               | `tests/audit/role-supports-aria-props/peer-parity.js`           | B3 implicit-role constraints → PR #9         |
| label-form-association             | template-require-input-label                          | `tests/audit/label-form-association/peer-parity.js`             | — (fixed earlier)                            |
| tabindex-no-positive               | template-no-positive-tabindex                         | `tests/audit/tabindex-no-positive/peer-parity.js`               | —                                            |
| no-access-key                      | template-no-accesskey-attribute                       | `tests/audit/no-access-key/peer-parity.js`                      | —                                            |

Full divergence catalogue: `docs/audit-a11y-behavior.md`.

## Phase 3 — Backlog

Remaining concepts, grouped by priority. Each task delivers one `tests/audit/<concept>/peer-parity.js` fixture + triage notes in `docs/audit-a11y-behavior.md`.

### P0 — new rules shipping without audit fixtures

The PR wave (#17–#24) introduced new rules with peer equivalents but no audit fixtures. Manual review caught several FPs that full fixtures would have surfaced earlier (see "Lessons from PR wave #17-#24" below). These fixtures are the **highest priority** — they backstop rules that just landed.

| #   | Concept                                       | Peer sources                   | Our rule                                               | Open PR |
| --- | --------------------------------------------- | ------------------------------ | ------------------------------------------------------ | ------- |
| B1  | click-events-have-key-events                  | jsx-a11y + vue + angular + lit | template-click-events-have-key-events                  | #17     |
| B2  | mouse-events-have-key-events                  | jsx-a11y + vue + angular + lit | template-mouse-events-have-key-events                  | #18     |
| B3  | no-aria-hidden-on-focusable                   | jsx-a11y + vue                 | template-no-aria-hidden-on-focusable                   | #19     |
| B4  | no-interactive-element-to-noninteractive-role | jsx-a11y                       | template-no-interactive-element-to-noninteractive-role | #20     |
| B5  | no-noninteractive-element-to-interactive-role | jsx-a11y                       | template-no-noninteractive-element-to-interactive-role | #21     |
| B6  | no-role-presentation-on-focusable             | vue                            | template-no-role-presentation-on-focusable             | #22     |
| B7  | anchor-is-valid (`invalidHref` aspect only)   | jsx-a11y + lit                 | template-no-invalid-link-href                          | #23     |
| B8  | no-noninteractive-tabindex                    | jsx-a11y                       | template-no-noninteractive-tabindex                    | #24     |

### P1 — existing merged rules without audit fixtures

Rules that have been in the plugin for a while with peer coverage. Ranked by peer-plugin count (4 > 3 > 2 > 1). Higher peer count = more divergent prior art = higher likelihood of surfacing drift.

| #   | Concept                                                                  | Peer count                 | Our rule                                                          |
| --- | ------------------------------------------------------------------------ | -------------------------- | ----------------------------------------------------------------- |
| B9  | aria-props                                                               | 4 (jsx, vue, angular, lit) | template-no-invalid-aria-attributes                               |
| B10 | no-autofocus                                                             | 4 (jsx, vue, angular, lit) | template-no-autofocus-attribute                                   |
| B11 | no-distracting-elements                                                  | 4                          | template-no-obsolete-elements                                     |
| B12 | no-static-element-interactions (+no-noninteractive-element-interactions) | 2 (jsx, vue)               | template-no-invalid-interactive                                   |
| B13 | anchor-has-content                                                       | 2 (jsx, vue)               | template-link-href-attributes (partial — may need companion rule) |
| B14 | interactive-supports-focus                                               | 3 (jsx, vue, angular)      | template-no-invalid-interactive (partial)                         |
| B15 | html-has-lang + lang                                                     | 2 (jsx, lit)               | template-require-lang-attribute                                   |
| B16 | button-has-type                                                          | 1 (angular)                | template-require-button-type                                      |
| B17 | img-redundant-alt                                                        | 2 (jsx, lit)               | — (no rule yet; see Phase 2 M13)                                  |
| B18 | anchor-ambiguous-text                                                    | 1 (jsx)                    | template-no-invalid-link-text                                     |
| B19 | obj-alt                                                                  | 1 (lit)                    | template-require-valid-alt-text (object subset)                   |

### P2 — re-translations as dependencies land

Behaviour widens/narrows in P0/P1 fixes; existing fixtures need their divergence annotations refreshed afterwards.

- [ ] After PR #14 merges (aria-query + DPUB + Graphics): refresh `tests/audit/aria-role/peer-parity.js`.
- [ ] After PR #11 merges (aria-query `.reserved`): refresh `tests/audit/aria-unsupported-elements/peer-parity.js`.
- [ ] After PR #27 merges (INTERACTIVE_ROLES from aria-query): refresh `tests/audit/role-has-required-aria/peer-parity.js` (switch-handling), and add audit coverage for `template-no-invalid-interactive` and `template-no-nested-interactive` if none exists.

## Translation protocol

Syntax substitutions when porting a peer test:

| From                                | To                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| JSX `onClick={handler}`             | HBS `{{on "click" this.handler}}` (or `onclick={{this.handler}}` if attribute form is under test) |
| JSX `className="foo"`               | HBS `class="foo"`                                                                                 |
| JSX `htmlFor="id"`                  | HBS `for="id"`                                                                                    |
| Vue `@click="handler"`              | HBS `{{on "click" this.handler}}`                                                                 |
| Vue `v-bind:role="x"` / `:role="x"` | HBS `role={{this.x}}`                                                                             |
| Angular `(click)="h()"`             | HBS `{{on "click" this.h}}`                                                                       |
| Angular `[attr.role]="x"`           | HBS `role={{this.x}}`                                                                             |
| Lit `@click=${h}`                   | HBS `{{on "click" this.h}}`                                                                       |
| Lit property binding `.prop=${x}`   | drop (no HBS equivalent)                                                                          |
| JSX fragments `<>…</>`              | expand to explicit outer element                                                                  |
| JSX spread `{...props}`             | HBS `...attributes` (if under test) or drop                                                       |

Each fixture file:

1. Runs BOTH `ember-eslint-parser` (gjs/gts) and `ember-eslint-parser/hbs` harnesses — same shape as `tests/lib/rules/*.js`.
2. Annotates each translated case with its source-plugin file + line number as a comment.
3. Tags failing cases with `// AUDIT-DIVERGE: <reason>` and updates `docs/audit-a11y-behavior.md`.

Cases that rely on React hooks, refs, synthetic events, or Vue/Angular/Lit framework internals are dropped with a `// AUDIT-SKIP: <reason>` comment.

## Triage protocol

After `npx vitest run tests/audit/<concept>/`:

1. **Real bug** → open fix PR. Promote the failing case(s) from `tests/audit/` to `tests/lib/rules/`. Remove from `docs/audit-a11y-behavior.md`.
2. **Defensible divergence** → keep in fixture, document in `docs/audit-a11y-behavior.md` with spec grounding.
3. **Framework-specific / untranslatable** → remove with `// AUDIT-SKIP` + short explanation.

## Lessons from PR wave #17-#24

The PR wave that introduced B1–B8 shipped without audit fixtures. Manual review during those PRs surfaced FPs that audit fixtures would have caught mechanically:

| Ship-blocker FP in PR                                            | What a ported peer test would have caught                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| #24 `<video controls tabindex="0">` flagged                      | jsx-a11y's `no-noninteractive-tabindex-test.js` valid list exercises full `isInteractiveElement` coverage including media-with-controls |
| #20 `<canvas role="img">`, `<video role="presentation">` flagged | jsx-a11y's `no-interactive-element-to-noninteractive-role-test.js` valid list                                                           |
| #7 `<input type=checkbox role=radio>` silently accepted          | jsx-a11y's `role-has-required-aria-props-test.js` invalid list (via axobject-query-backed `isSemanticRoleElement`)                      |
| #12 `<select role="combobox" multiple>` falsely flagged          | jsx-a11y's `no-redundant-roles-test.js` via `getImplicitRoleForSelect`                                                                  |

Single exception: PR #27's composite-widget nesting FP (`<div role="listbox"><div role="option">`). `template-no-nested-interactive` has no peer equivalent, so port coverage wouldn't help. That class of rule needs **W3C APG canonical-pattern fixtures** — one per APG pattern (listbox, tablist, tree, grid, radiogroup, menubar), each encoding the canonical widget markup. Track separately.

## Estimated effort

Parallelizable, one agent per concept.

| Tier         | Concepts | Per-concept effort | Total (serial) | Total (parallel) |
| ------------ | -------- | ------------------ | -------------- | ---------------- |
| P0           | 8        | ~30 min            | 4 h            | ~40 min          |
| P1           | 11       | ~45 min            | 8 h            | ~60 min          |
| P2           | 3        | ~15 min            | 45 min         | 15 min           |
| APG patterns | ~6       | ~30 min            | 3 h            | ~40 min          |

Total agent-hours: ~15. Wall-clock at 4-way parallelism: ~3 h.

## Open questions

- **Merging M4/M5/M6** with our existing `template-no-invalid-interactive` — possibly one rule with options, possibly separate. Phase 3 behavioral comparison of `template-no-invalid-interactive` against jsx-a11y's trio will inform this.
- **aria-query** as a dependency — worth bundling centrally (would also replace hand-maintained tables in e.g. `template-no-nested-interactive.js`). Track separately.
- **Standalone `eslint-plugin-ember-a11y`** — audit findings can inform whether a dedicated plugin is warranted; no decision needed yet.
- **ember-template-lint parity** — any bug we find in shared logic may also exist upstream; PR descriptions should call that out (as PR #5/#2713 did).
