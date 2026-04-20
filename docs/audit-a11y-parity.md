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

| # | Concept | jsx-a11y | vue-a11y | angular | lit-a11y | ember | Cat | Rel |
|---|---|---|---|---|---|---|---|---|
| 1 | Images have alt text (img, area, object, input[type=image]) | alt-text | alt-text | alt-text | alt-text, obj-alt | template-require-valid-alt-text | label | H |
| 2 | Anchor has accessible content | anchor-has-content | anchor-has-content | — | — | template-link-href-attributes (partial) | label | H |
| 3 | Anchor is valid (href present, not `#`/`javascript:`) | anchor-is-valid | — | — | anchor-is-valid | — | html | H |
| 4 | Anchor text is not ambiguous ("click here", "read more") | anchor-ambiguous-text | — | — | — | template-no-invalid-link-text | label | H |
| 5 | Link title attribute is meaningful | — | — | — | — | template-no-invalid-link-title | label | H |
| 6 | Elements with `aria-activedescendant` must be focusable (tabindex) | aria-activedescendant-has-tabindex | — | — | aria-activedescendant-has-tabindex | template-require-aria-activedescendant-tabindex | focus | H |
| 7 | ARIA attribute names are valid | aria-props | aria-props | valid-aria | aria-attrs | template-no-invalid-aria-attributes | aria | H |
| 8 | ARIA attribute values match spec types | aria-proptypes | — | valid-aria | aria-attr-valid-value | — | aria | **H** |
| 9 | ARIA role is valid and non-abstract | aria-role | aria-role | valid-aria | aria-role | template-no-invalid-role + template-no-abstract-roles | aria | H |
| 10 | ARIA disallowed on unsupported elements (meta/html/script/…) | aria-unsupported-elements | aria-unsupported-elements | — | aria-unsupported-elements | template-no-aria-unsupported-elements | aria | H |
| 11 | `autocomplete` attribute has a valid value | autocomplete-valid | — | — | autocomplete-valid | — | html | M |
| 12 | Click handler → must have a paired keyboard handler | click-events-have-key-events | click-events-have-key-events | click-events-have-key-events | click-events-have-key-events | — | focus | **H** |
| 13 | Form control has an associated label (for/aria-label/nested) | control-has-associated-label, label-has-associated-control, label-has-for | form-control-has-label, label-has-for | label-has-associated-control | — | template-require-input-label | label | H |
| 14 | Heading elements have accessible content | heading-has-content | heading-has-content | — | — | template-no-empty-headings | html | H |
| 15 | Heading not hidden from AT (`aria-hidden="true"` on heading) | — | — | — | heading-hidden | — | aria | **M** |
| 16 | `<html>` has a `lang` attribute | html-has-lang | — | — | — | template-require-lang-attribute | html | H |
| 17 | `lang` value is a valid BCP-47 language tag | lang | — | — | valid-lang | template-require-lang-attribute (validates BCP-47) | html | H |
| 18 | `<iframe>` has a `title` | iframe-has-title | iframe-has-title | — | iframe-title | template-require-iframe-title | label | H |
| 19 | `<img>` alt text isn't redundant ("image of …") | img-redundant-alt | — | — | img-redundant-alt | — | label | M |
| 20 | Interactive widget elements are focusable | interactive-supports-focus | interactive-supports-focus | interactive-supports-focus | — | partial via template-no-invalid-interactive | focus | H |
| 21 | Media elements (`<audio>`/`<video>`) have captions track | media-has-caption | media-has-caption | — | — | template-require-media-caption | label | H |
| 22 | Mouse events (hover/enter/leave) paired with focus/blur | mouse-events-have-key-events | mouse-events-have-key-events | mouse-events-have-key-events | mouse-events-have-key-events | — | focus | **H** |
| 23 | `accesskey` attribute disallowed | no-access-key | no-access-key | — | no-access-key | template-no-accesskey-attribute | html | H |
| 24 | `aria-hidden="true"` on focusable element | no-aria-hidden-on-focusable | no-aria-hidden-on-focusable | — | — | — | aria | **H** |
| 25 | `autofocus` disallowed | no-autofocus | no-autofocus | no-autofocus | no-autofocus | template-no-autofocus-attribute | html | M |
| 26 | Disallow distracting/obsolete elements (`<marquee>`, `<blink>`) | no-distracting-elements | no-distracting-elements | no-distracting-elements | no-distracting-elements | template-no-obsolete-elements + template-no-forbidden-elements | html | M |
| 27 | Native interactive element cannot take a non-interactive role (`<button role="heading">`) | no-interactive-element-to-noninteractive-role | — | — | — | — | aria | **H** |
| 28 | Non-interactive element with click handler must have role + keyboard | no-noninteractive-element-interactions, no-static-element-interactions | no-static-element-interactions | — | — | template-no-invalid-interactive (partial) | focus | **H** |
| 29 | Non-interactive element cannot take an interactive role without focus support (`<div role="button">`) | no-noninteractive-element-to-interactive-role | — | — | — | — | aria | **H** |
| 30 | `tabindex` on non-interactive element requires a role | no-noninteractive-tabindex | — | — | — | — | focus | **M** |
| 31 | `onChange` disallowed on `<select>` (use `onBlur`) | no-onchange | no-onchange | — | — | — | fw | S |
| 32 | Redundant role (role matches element's implicit role) | no-redundant-roles | no-redundant-roles | — | no-redundant-role | template-no-redundant-role | aria | H |
| 33 | `role="presentation"` not on focusable element | — | no-role-presentation-on-focusable | — | — | — | aria | **M** |
| 34 | Prefer native semantic tag over ARIA role | prefer-tag-over-role | — | — | — | — | aria | **M** |
| 35 | Role has all required ARIA properties (e.g. `role="slider"` needs `aria-valuemin/max/now`) | role-has-required-aria-props | role-has-required-aria-props | role-has-required-aria | role-has-required-aria-attrs | template-require-mandatory-role-attributes | aria | H |
| 36 | ARIA attribute is supported by the element's role (`aria-sort` only on sortable) | role-supports-aria-props | — | — | role-supports-aria-attr | template-no-unsupported-role-attributes | aria | H |
| 37 | `scope` attribute only on `<th>` | scope | — | table-scope | scope | template-no-scope-outside-table-headings | html | H |
| 38 | Positive tabindex disallowed | tabindex-no-positive | tabindex-no-positive | no-positive-tabindex | tabindex-no-positive | template-no-positive-tabindex | focus | H |
| 39 | Accessible emoji — emoji has `role="img"` + label (deprecated) | accessible-emoji | — | — | accessible-emoji | — | label | L |
| 40 | Accessible name (composite check for button/link/control) | — | — | — | accessible-name | — | label | **M** |
| 41 | Definition list (`<dl>/<dt>/<dd>`) structure | — | — | — | definition-list | — | html | L |
| 42 | List (`<ul>/<ol>/<li>`) structure | — | — | — | list | — | html | L |
| 43 | `<object>` has alt/title | — | — | — | obj-alt | (merged into template-require-valid-alt-text?) | label | M |
| 44 | `<slot>` should not have aria-* (Lit shadow DOM) | — | — | — | no-aria-slot | — | fw | S |
| 45 | Lit `@change` only on form controls | — | — | — | no-invalid-change-handler | — | fw | S |
| 46 | `<button>` has `type` attribute | — | — | button-has-type | — | template-require-button-type | html | H |
| 47 | Abstract roles disallowed (structural/widget/window/etc.) | (folded into aria-role) | (folded into aria-role) | (folded into valid-aria) | (folded into aria-role) | template-no-abstract-roles | aria | H |
| 48 | `aria-hidden` on `<body>` | — | — | — | — | template-no-aria-hidden-body | aria | H |
| 49 | Nested interactive elements (`<button><a>`) | — | — | — | — | template-no-nested-interactive | html | H |
| 50 | Nested landmark elements | — | — | — | — | template-no-duplicate-landmark-elements + template-no-nested-landmark | aria | H |
| 51 | Heading inside button | — | — | — | — | template-no-heading-inside-button | html | H |
| 52 | Meta tag validity | — | — | — | — | template-no-invalid-meta | html | M |
| 53 | Duplicate `id` disallowed | — | — | — | — | template-no-duplicate-id | html | H |
| 54 | Duplicate attributes disallowed | — | — | — | no-duplicate-attributes (angular) | template-no-duplicate-attributes | html | H |
| 55 | `<iframe>` requires `src` | — | — | — | — | template-require-iframe-src-attribute | html | M |
| 56 | Form method attribute required | — | — | — | — | template-require-form-method | html | M |
| 57 | Valid form groups (fieldset/legend) | — | — | — | — | template-require-valid-form-groups | html | M |
| 58 | Table has thead/tbody/tfoot grouping | — | — | — | — | template-table-groups | html | M |
| 59 | Context role appropriate for element (e.g. `role="row"` inside table) | — | — | — | — | template-require-context-role | aria | H |
| 60 | Presentational role → children must also be presentational | — | — | — | — | template-require-presentational-children | aria | H |
| 61 | Inline styles disallowed | — | — | no-inline-styles | — | template-no-inline-styles | html | L |
| 62 | Pointer-down event binding anti-pattern | — | — | — | — | template-no-pointer-down-event-binding | focus | M |
| 63 | Action on submit button must be `type="submit"` | — | — | — | — | template-no-action-on-submit-button | html | M |

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

| Priority | Count | Concepts |
|---|---|---|
| High | 7 (M1-M7) | keyboard pairing × 2, static-element interactions, interactive/non-interactive role mismatches, aria-hidden-on-focusable, aria-proptypes |
| Medium | 5 (M8-M12) | role-presentation-on-focusable, prefer-tag-over-role, no-noninteractive-tabindex, anchor-is-valid, autocomplete-valid |
| Low | 5 (M13-M17) | img-redundant-alt, heading-hidden, dl/ul structure, accessible-name composite |

**Recommended first port:** M1 (`click-events-have-key-events`) — maximum 4-plugin consensus, strong spec authority, and addresses a pattern that's definitely present in real Ember apps.

## Phase 3 targets — rules that need behavioral comparison

Concepts where we have a rule AND ≥2 peers cover it. Phase 3 will translate those plugins' full test suites against our rule and surface divergences. Ordered by likely impact:

| Concept row | Our rule | Peer rules to compare against |
|---|---|---|
| 9 — valid/non-abstract role | template-no-invalid-role, template-no-abstract-roles | jsx-a11y/aria-role, vue/aria-role, lit/aria-role, angular/valid-aria |
| 7 — aria-props | template-no-invalid-aria-attributes | jsx-a11y/aria-props, vue/aria-props, lit/aria-attrs |
| 10 — aria-unsupported-elements | template-no-aria-unsupported-elements | jsx-a11y/aria-unsupported-elements, vue/aria-unsupported-elements, lit/aria-unsupported-elements |
| 32 — no-redundant-roles | template-no-redundant-role | jsx-a11y/no-redundant-roles, vue/no-redundant-roles, lit/no-redundant-role |
| 35 — role-has-required-aria | template-require-mandatory-role-attributes | jsx-a11y/role-has-required-aria-props, vue/role-has-required-aria-props, angular/role-has-required-aria, lit/role-has-required-aria-attrs |
| 36 — role-supports-aria-props | template-no-unsupported-role-attributes | jsx-a11y/role-supports-aria-props, lit/role-supports-aria-attr |
| 1 — alt-text | template-require-valid-alt-text | jsx-a11y/alt-text, vue/alt-text, angular/alt-text, lit/alt-text + lit/obj-alt |
| 13 — label-form association | template-require-input-label | jsx-a11y/control-has-associated-label, jsx-a11y/label-has-associated-control, vue/form-control-has-label, vue/label-has-for, angular/label-has-associated-control |
| 6 — aria-activedescendant tabindex | template-require-aria-activedescendant-tabindex | jsx-a11y/aria-activedescendant-has-tabindex, lit/aria-activedescendant-has-tabindex |
| 18 — iframe-title | template-require-iframe-title | jsx-a11y/iframe-has-title, vue/iframe-has-title, lit/iframe-title |
| 21 — media-caption | template-require-media-caption | jsx-a11y/media-has-caption, vue/media-has-caption |
| 37 — scope on th | template-no-scope-outside-table-headings | jsx-a11y/scope, angular/table-scope, lit/scope |
| 38 — tabindex-no-positive | template-no-positive-tabindex | jsx-a11y/tabindex-no-positive, vue/tabindex-no-positive, angular/no-positive-tabindex, lit/tabindex-no-positive |
| 14 — heading-has-content | template-no-empty-headings | jsx-a11y/heading-has-content, vue/heading-has-content |
| 23 — no-accesskey | template-no-accesskey-attribute | jsx-a11y/no-access-key, vue/no-access-key, lit/no-access-key |
| 49 — nested-interactive | template-no-nested-interactive | (ember-only; already has an open PR #5/#2713 for the `<details>` case) |

## Open questions

- **Merging M4/M5/M6** with our existing `template-no-invalid-interactive` — possibly one rule with options, possibly separate. Phase 3 behavioral comparison of `template-no-invalid-interactive` against jsx-a11y's trio will inform this.
- **aria-query** as a dependency — worth bundling centrally (would also replace hand-maintained tables in e.g. `template-no-nested-interactive.js`). Track separately.
- **Standalone `eslint-plugin-ember-a11y`** — audit findings can inform whether a dedicated plugin is warranted; no decision needed yet.
- **ember-template-lint parity** — any bug we find in shared logic may also exist upstream; PR descriptions should call that out (as PR #5/#2713 did).
