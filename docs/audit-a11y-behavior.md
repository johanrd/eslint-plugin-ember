# Behavioral divergences — eslint-plugin-ember vs. peer a11y plugins

Phase 3 of the audit (see `audit-a11y-parity.md`). For each concept where ≥2 peers have a comparable rule AND we have a rule, this document records translated test cases and any behavioral divergences surfaced.

**Translated fixtures live at `tests/audit/<concept>/peer-parity.js`.** They are not in CI — run on demand:

```sh
npx vitest run tests/audit/
```

Each fixture encodes our _current_ behavior and annotates divergences with `// DIVERGENCE —` comments, so running it passes while making the divergences visible for human review.

---

## Concept 1 — `aria-role` / valid & non-abstract roles

**Our rules:** `template-no-invalid-role`, `template-no-abstract-roles`
**Peer rules:** jsx-a11y/`aria-role`, vue-a11y/`aria-role`, lit-a11y/`aria-role`, angular/`valid-aria`
**Fixture:** `tests/audit/aria-role/peer-parity.js`

### Divergences

1. **Empty role string (`role=""`)**
   - jsx-a11y, vue-a11y: flag as invalid.
   - **Ours: no flag** — rule returns early when role is empty/whitespace (`lib/rules/template-no-invalid-role.js:229`).
   - Severity: minor. Genuinely ambiguous whether empty role should be an error, but two peers converge on flagging.

2. **Space-separated multiple roles (ARIA fallback pattern, e.g. `role="tabpanel row"`)**
   - jsx-a11y: valid — splits on whitespace, each token must be a valid role.
   - **Ours: flags as invalid** (treats whole string as one opaque role name).
   - Severity: **false positive**. The [ARIA 1.2 spec](https://www.w3.org/TR/wai-aria-1.2/#roles_categorization) allows multiple roles in a single `role` attribute for role-fallback. Downstream users writing `role="tabpanel row"` get a spurious error.
   - Fix: split on whitespace, validate each token.

3. **DPUB-ARIA (`doc-*`) roles**
   - jsx-a11y: valid — uses `aria-query` which includes DPUB-ARIA.
   - **Ours: flags as invalid** — hand-maintained `VALID_ROLES` set doesn't include `doc-abstract`, `doc-appendix`, `doc-bibliography`, …
   - Severity: **false positive**. Digital publishing is a niche but legitimate use case, and the roles are specified.
   - Fix: add DPUB-ARIA roles to `VALID_ROLES`, or switch to `aria-query` as the source of truth (preferred; see "aria-query adoption" below).

4. **Graphics-ARIA (`graphics-*`) roles on `<svg>`**
   - jsx-a11y: valid — included via `aria-query`.
   - **Ours: flags as invalid.**
   - Severity: **false positive**, same shape as DPUB.
   - Fix: same as #3.

5. **Case sensitivity (`role="Button"` vs `role="button"`)**
   - jsx-a11y: **flags `"Button"`** (capital) as invalid.
   - **Ours: accepts it** — rule lowercases before lookup.
   - Our test suite (line 66-68 of `tests/lib/rules/template-no-invalid-role.js`) encodes this as an intentional design choice.
   - Severity: **intentional divergence**. ARIA 1.2 says case handling "inherits from the host language"; HTML is case-insensitive for many contexts but attribute-value tokens are generally compared case-sensitively. Worth revisiting but not a clear-cut bug.

6. **Abstract role messaging**
   - jsx-a11y: single "must be a valid, non-abstract ARIA role" message for both cases.
   - Ours: two rules (`template-no-invalid-role` + `template-no-abstract-roles`). Divergent wording, but both fire. No test user-visible issue.
   - Severity: cosmetic.

### Recommended follow-ups

- **Port #2 and #3 as a single PR**: switch to `aria-query` for the valid-role source, and add space-splitting. This replaces the hand-maintained `VALID_ROLES` set (currently ~90 roles) with the canonical spec data and incidentally fixes #4.
- **Defer #1** (empty role) — add as a test case, decide after reviewing real-world template usage. Low immediate risk.
- **Defer #5** (case-sensitivity) — intentional; document the divergence publicly rather than change it silently.

### aria-query adoption note

`template-no-invalid-role.js` hand-maintains `VALID_ROLES` (90 items) and `SEMANTIC_ELEMENTS` (80 items). `aria-query` provides both via `roles.keys()` and `elementRoles`, and we already depend on it for `template-no-invalid-aria-attributes.js`. Migrating would:

- Fix the DPUB/Graphics-ARIA false positives (#3, #4).
- Keep us current as ARIA adds roles.
- Reduce maintenance drift.

Tracked as a follow-up; not part of this audit.

---

## Concept — `aria-props` / aria-_ attribute name validity _(no action needed)\*

**Our rule:** `template-no-invalid-aria-attributes`
**Peer rules:** jsx-a11y/`aria-props`, vue-a11y/`aria-props`, lit-a11y/`aria-attrs`

**Note:** the original matrix flagged this as potentially missing value-type validation (concept row 8, `aria-proptypes`). That was wrong — `template-no-invalid-aria-attributes.js` already uses `aria-query` to validate BOTH names AND values (boolean/tristate/string/idlist/integer/number/token/tokenlist). Matrix row 8 is effectively covered by our rule.

Sampled jsx-a11y tests (`__tests__/src/rules/aria-props-test.js`) don't suggest any false positives/negatives in our coverage for the aria-\* name family. No audit fixture written; a deeper pass may still be worthwhile but lower priority.

---

---

## Concept 2 — `alt-text`

**Our rule:** `template-require-valid-alt-text`
**Peer rules:** jsx-a11y/`alt-text`, vue-a11y/`alt-text`, angular/`alt-text`, lit-a11y/`alt-text` (+ `obj-alt`)
**Fixture:** `tests/audit/alt-text/peer-parity.js`

### Divergences

1. **`<img>` with `aria-label`/`aria-labelledby` but no `alt`**
   - jsx-a11y, vue-a11y: VALID — accept `aria-label`/`aria-labelledby` as alternative text sources.
   - **Ours: INVALID** — strictly require `alt` attribute on `<img>`.
   - Severity: **arguable**. HTML spec requires `alt` on `<img>`; WAI-ARIA accepts aria-label/labelledby as accessible-name sources. Two spec bodies disagree. Our stance aligns with HTML-strict.
   - Note: this is defensible either way. Document, don't silently change.

2. **Non-empty `alt` with `role="presentation"` / `role="none"` on `<img>`**
   - jsx-a11y: VALID — accepts `<img alt="this is lit..." role="presentation" />`.
   - **Ours: INVALID** — our `imgRolePresentation` check: if the image is decorative (role=none/presentation) the alt should be empty.
   - Severity: we're spec-stricter; jsx-a11y is lenient here. Our behavior is more correct per WAI-ARIA. Keep as-is.

3. **Empty-string `aria-label`/`aria-labelledby`** on `<object>`, `<area>`, `<input type="image">`
   - jsx-a11y: INVALID — empty attribute provides no accessible name.
   - **Ours: VALID** — we check attribute PRESENCE only, not value.
   - Severity: **false negative**. `aria-label=""` is indistinguishable from no accessible name.
   - Fix: for the aria-label/labelledby fallback path, check that the value has at least one non-whitespace character. Same fix shape for `alt=""` on `<input type="image">` / `<area>` — but note that `alt=""` on `<img>` is semantically "decorative" and must remain valid.

### Recommended follow-ups

- **Fix divergence #3** (empty aria-label treated as valid) — small targeted PR, no spec ambiguity.
- **Defer #1** (img aria-label fallback) — intentional strictness, document.
- **Defer #2** (non-empty alt with role=presentation) — our behavior is more correct per WAI-ARIA.

---

---

## Concept 3 — `iframe-title`

**Our rule:** `template-require-iframe-title`
**Peers:** jsx-a11y, vue-a11y, lit-a11y
**Fixture:** `tests/audit/iframe-title/peer-parity.js` (30 cases)

### Divergences

1. **`aria-hidden`/`hidden` exemption** — upstream still requires title; we exempt. Intentional (inherited from ember-template-lint).
2. **Dynamic non-string values** — upstream flags `title={undefined}`/`title={42}`/`title=""`; we only AST-check `GlimmerBooleanLiteral`, accepting everything else. Minor under-flag.
3. **Whitespace-only title** — upstream accepts (yields truthy string); we trim and reject. Minor over-flag.
4. **Duplicate-title detection** — ours flags duplicates; upstream doesn't. Intentional extension.

---

## Concept 4 — `media-has-caption`

**Our rule:** `template-require-media-caption`
**Peers:** jsx-a11y, vue-a11y
**Fixture:** `tests/audit/media-has-caption/peer-parity.js` (26 cases)

### Divergences

1. **Case-sensitive `kind="captions"`** — upstream lowercases; we don't. `kind="Captions"` → upstream VALID, ours INVALID. **Minor bug, 1-line fix.**

Otherwise full parity on muted handling, track-kind subtitles, missing track, text-content-doesn't-count.

---

## Concept 5 — `scope`

**Our rule:** `template-no-scope-outside-table-headings`
**Peers:** jsx-a11y, angular, lit-a11y
**Fixture:** `tests/audit/scope/peer-parity.js` (27 cases)

### Divergences

1. **Value validation** — lit-a11y also flags invalid `scope` values (`<th scope="column">` → should be `col`); ours only checks host element. Intentional — value validation is out of this rule's stated purpose. jsx-a11y and angular align with us.

---

## Concept 6 — `heading-has-content`

**Our rule:** `template-no-empty-headings`
**Peers:** jsx-a11y, vue-a11y
**Fixture:** `tests/audit/heading-content/peer-parity.js` (36 cases)

### Divergences

1. **Boolean `aria-hidden` on heading** — `<h1 aria-hidden />` with no value: upstream exempts (treats boolean attr as true), we flag. **False positive.**
2. **Boolean `aria-hidden` on child** — same root cause as #1. **False negative / under-flag.**
3. **`{{undefined}}` mustache** — upstream flags empty-value mustache; we treat any mustache as potential content. Minor under-flag.
4. **`role="heading"` coverage** — we flag empty `<div role="heading">`; upstream doesn't check role-based headings. Intentional extension.

Fixes #1 and #2 share a single change: make `isHidden` accept boolean `aria-hidden` as hidden. Spec check recommended — ARIA technically treats missing value as "undefined" rather than "true", but HTML attr-presence-is-true is the prevailing tooling convention.

---

---

## Concept 7 — `aria-unsupported-elements`

**Our rule:** `template-no-aria-unsupported-elements`
**Peers:** jsx-a11y, vue-a11y, lit-a11y
**Fixture:** `tests/audit/aria-unsupported-elements/peer-parity.js` (34 cases)

### Divergences

1. **Narrower element set** — upstream (via `aria-query`'s `dom.reserved`) covers `col`, `colgroup`, `noembed`, `noscript`, `param`, `picture`, `source`, `track` on top of our `meta`/`html`/`script`/`style`/`title`/`base`/`head`/`link`. **Minor bug** — we silently accept ARIA attrs on ~half the reserved elements.
2. **Unknown `aria-*` attrs** — upstream uses `aria.has(name)` so `aria-foobar` is skipped; we flag anything `aria-*`-prefixed. Minor overreach, probably defensible.

---

## Concept 8 — `no-redundant-roles`

**Our rule:** `template-no-redundant-role`
**Peers:** jsx-a11y, vue-a11y, lit-a11y
**Fixture:** `tests/audit/no-redundant-roles/peer-parity.js` (32 cases)

### Divergences

1. **`<ul role="list">` / `<ol role="list">`** — upstream (jsx-a11y) INVALID; we VALID via `ALLOWED_ELEMENT_ROLES`. **Intentional** — Safari/VoiceOver workaround (when CSS `list-style:none` strips list semantics).
2. **`<a role="link">`** — upstream only flags if `href` present (since implicit role requires href); ours always accepts. Intentional.
3. **`<select role="combobox">`** — upstream INVALID (select's implicit role is combobox); ours VALID. **Minor bug** — missing mapping.
4. **Case sensitivity** — upstream lowercases (`<body role="DOCUMENT">` flagged); ours case-sensitive. **Minor bug**, cheap fix.

---

## Concept 9 — `role-has-required-aria`

**Our rule:** `template-require-mandatory-role-attributes`
**Peers:** jsx-a11y, vue-a11y, angular, lit-a11y
**Fixture:** `tests/audit/role-has-required-aria/peer-parity.js` (30 cases)

### Divergences

1. **`<input type="checkbox" role="switch">`** — jsx-a11y/vue/angular: VALID (semantic checkbox supplies `aria-checked`); ours: INVALID. **Bug** — this pattern is explicitly documented as accessible in WAI-ARIA APG.
2. **Space-separated roles** (`role="combobox listbox"`) — upstream splits and validates each; we look up the whole string, find nothing, and skip silently. Minor bug (false negative on an unusual pattern).
3. **Case-insensitivity** — upstream lowercases before lookup; we pass raw to aria-query so `role="COMBOBOX"` misses. Minor bug.

---

## Concept 10 — `role-supports-aria-props`

**Our rule:** `template-no-unsupported-role-attributes`
**Peers:** jsx-a11y, lit-a11y
**Fixture:** `tests/audit/role-supports-aria-props/peer-parity.js` (32 cases)

### Divergences

1. **`<a>` without `href`** — upstream: no implicit role (so global ARIA attrs apply); ours: returns "generic" and flags. **Bug** — our `getImplicitRole` helper picks the first `elementRoles` entry regardless of `constraints`.
2. **`<input type="password|email|text|…">`** without a `list` attr — upstream yields "textbox"; we pick the first matching entry so return "combobox" for email/text/tel/url, "button" for password (not in aria-query at all). **Bug** — same root cause as #1.
3. **`<menu type="toolbar">`, `<body>`** — cosmetic message wording only; both flag the same attrs.

**Single root cause:** `getImplicitRole` doesn't honor aria-query's attribute `constraints` ("set"/"not set"). Fixing that helper alone likely resolves #1 and #2 in one change.

---

## Concept 11 — `label-form-association`

**Our rule:** `template-require-input-label`
**Peers:** jsx-a11y (split 3 ways), vue-a11y, angular
**Fixture:** `tests/audit/label-form-association/peer-parity.js` (43 cases)

### Scope note

Our single rule covers the control-perspective subset; jsx-a11y splits into `label-has-for`, `label-has-associated-control`, and `control-has-associated-label`. We don't lint from the `<label>` perspective at all.

### Divergences

1. **`<input type="button|submit|reset|image">`** — vue-a11y VALID (exempts these types); ours INVALID. Minor false positive — `value` attr typically supplies the accessible name.
2. **Multiple labels** — upstream VALID ("has SOME label"); ours INVALID (`multipleLabels`). Intentional-strict.
3. **No label-perspective errors** — upstream flags `<label htmlFor="x" />` (empty) and `<label>Text</label>` (no control); ours has no analogue. **Scope gap** — coverage hole if peer parity is the goal.

---

## Concept 12 — `aria-activedescendant-has-tabindex`

**Our rule:** `template-require-aria-activedescendant-tabindex`
**Peers:** jsx-a11y, lit-a11y
**Fixture:** `tests/audit/aria-activedescendant-has-tabindex/peer-parity.js` (33 cases)

### Divergences

1. **`tabindex="-1"` / `tabindex={{-1}}`** on non-interactive element — jsx-a11y + lit-a11y: VALID (they accept `tabindex >= -1`); ours: INVALID (we require `>= 0`). **Bug** — `-1` is the canonical "focusable but not in tab order" value, which is exactly what a composite widget with `aria-activedescendant` + roving focus wants. Our autofix rewrites `-1` → `0`, **silently changing semantics** (injecting the element into tab order when it shouldn't be).
2. **`tabindex="-1"`** on interactive `<button>` — same root cause, same bug.

**Shipping this fix would likely also drop an existing false-positive-autofix in the wild.**

---

## Concept 13 — `tabindex-no-positive`

**Our rule:** `template-no-positive-tabindex`
**Peers:** jsx-a11y, vue-a11y, angular, lit-a11y
**Fixture:** `tests/audit/tabindex-no-positive/peer-parity.js` (40 cases)

### Divergences

1. **Non-numeric literal** (`tabindex="text"`) — jsx-a11y/vue/angular: VALID (skip when NaN); lit-a11y + ours: INVALID. Intentional-strict (lit-a11y parity).
2. **Dynamic expression** (`tabindex={{someProperty}}`) — all 4 peers: VALID (can't statically know); ours: INVALID. Intentional-strict, but false-positive-prone.
3. **Valueless `tabindex`** — angular VALID; ours INVALID. Minor edge case.

---

## Concept 14 — `no-access-key`

**Our rule:** `template-no-accesskey-attribute`
**Peers:** jsx-a11y, vue-a11y, lit-a11y
**Fixture:** `tests/audit/no-access-key/peer-parity.js` (17 cases)

### Divergences

1. **Boolean/valueless `accesskey`** — peers: VALID (value-checked); ours: INVALID (presence-only). Intentional-strict — HTML parses valueless `accesskey` as empty-string which a UA may still register.
2. **`accesskey={{undefined}}` / `accesskey=""`** — peers: VALID; ours: INVALID. Same root cause. Minor, defensible on strict grounds.

---

## Findings summary — ranked

### Must-fix bugs (clear false positives/negatives with strong spec backing)

| #   | Concept                            | Divergence                                                                                               | Fix shape                                                               |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| B1  | aria-activedescendant-has-tabindex | Flags `tabindex="-1"`, autofixes to `0` — wrecks roving focus                                            | Accept `tabindex >= -1`; do not autofix `-1`                            |
| B2  | role-has-required-aria             | `<input type="checkbox" role="switch">` flagged despite APG documenting as accessible                    | Treat semantic input as contributing implicit aria-\* from native state |
| B3  | role-supports-aria-props           | `<a>` without href → "generic" instead of no role; `<input type=password>` → "button" etc.               | Honor aria-query's attribute constraints in `getImplicitRole`           |
| B4  | heading-has-content                | `<h1 aria-hidden />` (valueless boolean attr) flagged because we only match `aria-hidden="true"` literal | Accept boolean attr; spec-check first                                   |

### Minor bugs (false positives or small gaps, low-risk fixes)

| #   | Concept                              | Fix shape                                                                                                           |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| m5  | media-has-caption                    | Lowercase `kind` before compare                                                                                     |
| m6  | iframe-title                         | Accept whitespace-only title (or trim before emptiness check); flag `title={undefined}` / `title=""` / `title={42}` |
| m7  | aria-unsupported-elements            | Extend element set to match `aria-query`'s `dom.reserved`                                                           |
| m8  | no-redundant-roles                   | Lowercase role; add `select`→combobox mapping                                                                       |
| m9  | role-has-required-aria               | Split space-separated roles; lowercase                                                                              |
| m10 | aria-role (template-no-invalid-role) | Split space-separated roles; migrate to aria-query (covers DPUB/Graphics; fixes space-sep in one shot)              |
| m11 | alt-text                             | Flag empty-string `aria-label`/`aria-labelledby` on `<object>`/`<area>`/`<input type=image>`                        |

### Intentional divergences (document, don't change)

- aria-role: case-insensitive role value (ours; upstream is case-sensitive)
- alt-text: `<img aria-label>` without alt (we require alt; upstream accepts aria-label)
- alt-text: non-empty alt with `role="presentation"` (we flag; upstream accepts)
- scope: value validation (we don't validate `scope="column"`; lit-a11y does)
- iframe-title: `aria-hidden`/`hidden` exemption (we exempt; upstream doesn't)
- iframe-title: duplicate-title detection (ours only)
- heading-has-content: `role="heading"` coverage (ours only)
- no-redundant-roles: `<ul role="list">` / `<a role="link">` without href (we accept — documented Safari/VoiceOver workarounds)
- tabindex-no-positive: non-numeric and dynamic values (we flag; most peers skip)
- no-access-key: boolean/valueless/empty accesskey (we flag as presence)
- label-form-association: multiple labels (we flag; peers accept)

### Coverage gaps (vs peers; not bugs, but missing features)

- label-form-association: no `<label>`-perspective checks (empty label, label-without-control)
- Missing rules for M1–M17 concepts from parity matrix (click-events/mouse-events/no-aria-hidden-on-focusable/etc.) — see `audit-a11y-parity.md`

---

## Progress tracker

| Concept                            | Status           | Fixture                                           | Divergences found                                |
| ---------------------------------- | ---------------- | ------------------------------------------------- | ------------------------------------------------ |
| aria-role                          | ✅               | aria-role/peer-parity.js                          | 5 (2 bugs, 1 intentional, 2 minor)               |
| aria-props                         | ✅ (survey only) | —                                                 | 0                                                |
| alt-text                           | ✅               | alt-text/peer-parity.js                           | 3 (1 bug, 2 intentional)                         |
| iframe-title                       | ✅               | iframe-title/peer-parity.js                       | 4 (2 minor, 2 intentional)                       |
| media-has-caption                  | ✅               | media-has-caption/peer-parity.js                  | 1 (1-line bug fix)                               |
| scope on th                        | ✅               | scope/peer-parity.js                              | 1 (intentional)                                  |
| heading-has-content                | ✅               | heading-content/peer-parity.js                    | 4 (2 bugs shared fix, 2 intentional)             |
| aria-unsupported-elements          | ✅               | aria-unsupported-elements/peer-parity.js          | 2 (1 minor bug, 1 intentional)                   |
| no-redundant-roles                 | ✅               | no-redundant-roles/peer-parity.js                 | 4 (2 minor bugs, 2 intentional)                  |
| role-has-required-aria             | ✅               | role-has-required-aria/peer-parity.js             | 3 (1 bug, 2 minor bugs)                          |
| role-supports-aria-props           | ✅               | role-supports-aria-props/peer-parity.js           | 4 (1 root-cause bug, 3 cosmetic/shared)          |
| label-form-association             | ✅               | label-form-association/peer-parity.js             | 3 (1 false positive, 1 intentional, 1 scope gap) |
| aria-activedescendant-has-tabindex | ✅               | aria-activedescendant-has-tabindex/peer-parity.js | 2 (1 bug — semantic autofix hazard)              |
| tabindex-no-positive               | ✅               | tabindex-no-positive/peer-parity.js               | 3 (all intentional-strict)                       |
| no-access-key                      | ✅               | no-access-key/peer-parity.js                      | 2 (both intentional-strict)                      |

**14 concepts audited. 448 test cases across the fixtures; all passing. Findings → 4 must-fix bugs, 7 minor bugs, 11 intentional divergences, 1 scope gap.**

---

## Phase 3 — PR-wave + P1 follow-up (18 new fixtures, ~1228 cases)

Added in waves 1–5 after PR batch #5–#27. Fixtures for **8 P0 concepts** (new rules from PRs #17–#24) live on the corresponding PR branches; fixtures for **10 P1 concepts** (existing merged rules) live on `audit/phase3/<concept>` branches off this audit branch.

### Coverage summary

| #   | Concept                                       | Target rule                                              | Fixture location                              | Cases | Divergences                                                 |
| --- | --------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- | ----- | ----------------------------------------------------------- |
| B1  | click-events-have-key-events                  | `template-click-events-have-key-events`                  | on PR #17 branch                              | 59    | 9                                                           |
| B2  | mouse-events-have-key-events                  | `template-mouse-events-have-key-events`                  | on PR #18 branch                              | 45    | 4                                                           |
| B3  | no-aria-hidden-on-focusable                   | `template-no-aria-hidden-on-focusable`                   | on PR #19 branch                              | 38    | 2                                                           |
| B4  | no-interactive-element-to-noninteractive-role | `template-no-interactive-element-to-noninteractive-role` | on PR #20 branch                              | 184   | 9                                                           |
| B5  | no-noninteractive-element-to-interactive-role | `template-no-noninteractive-element-to-interactive-role` | on PR #21 branch                              | 292   | ~40 (incl. 22 FN + 3 FP classes + 18 recommended-vs-strict) |
| B6  | no-role-presentation-on-focusable             | `template-no-role-presentation-on-focusable`             | on PR #22 branch                              | 28    | 3                                                           |
| B7  | anchor-is-valid (invalidHref)                 | `template-no-invalid-link-href`                          | on PR #23 branch                              | 37    | 4                                                           |
| B8  | no-noninteractive-tabindex                    | `template-no-noninteractive-tabindex`                    | on PR #24 branch                              | 29    | 2                                                           |
| B9  | aria-props                                    | `template-no-invalid-aria-attributes`                    | `audit/phase3/aria-props`                     | 93    | 5                                                           |
| B10 | no-autofocus                                  | `template-no-autofocus-attribute`                        | `audit/phase3/no-autofocus`                   | 37    | 9                                                           |
| B11 | no-distracting-elements                       | `template-no-obsolete-elements`                          | `audit/phase3/no-distracting-elements`        | 49    | 1 (27-tag strict superset)                                  |
| B12 | no-static-element-interactions                | `template-no-invalid-interactive`                        | `audit/phase3/no-static-element-interactions` | 106   | 15                                                          |
| B13 | anchor-has-content                            | (coverage gap)                                           | `audit/phase3/anchor-has-content`             | 39    | 4 MISSING-COVERAGE                                          |
| B14 | interactive-supports-focus                    | (coverage gap)                                           | `audit/phase3/interactive-supports-focus`     | 63    | 7 MISSING + 18 DIVERGENCE                                   |
| B15 | html-has-lang + lang                          | `template-require-lang-attribute`                        | `audit/phase3/html-has-lang`                  | 38    | 3 minor                                                     |
| B16 | button-has-type                               | `template-require-button-type`                           | `audit/phase3/button-has-type`                | 31    | 3                                                           |
| B18 | anchor-ambiguous-text                         | `template-no-invalid-link-text`                          | `audit/phase3/anchor-ambiguous-text`          | 52    | 8                                                           |
| B19 | obj-alt                                       | `template-require-valid-alt-text` (object subset)        | `audit/phase3/obj-alt`                        | 16    | 2                                                           |

### Must-fix bugs

Load-bearing behavioral bugs confirmed against peer parity. Each is a follow-up PR candidate.

- **F1. `aria-orientation="undefined"` false positive.** `template-no-invalid-aria-attributes` short-circuits on `value === 'undefined'` via `attrDef.allowundefined` before checking the role's token list. `aria-orientation` legitimately accepts `undefined` as a token value per aria-query, but our guard causes us to flag it. Bug at `lib/rules/template-no-invalid-aria-attributes.js:20–22`. Source: B9.
- **F2. PascalCase-component collides with native HTML tag name.** Several rules apply `node.tag?.toLowerCase()` before checking against a lowercase tag whitelist, which means `<Article>` / `<Form>` / `<Main>` / `<Nav>` / `<Ul>` / `<Li>` / `<Table>` etc. (component invocations whose names match a native HTML tag when lowercased) are misclassified as the native tag. Confirmed false positives on:
  - `<Article tabindex={{0}}>` flagged as non-interactive tabindex (B8)
  - `<Article role="button">` flagged as non-interactive→interactive-role (B5)
  - Systemic: any rule that does `node.tag.toLowerCase()` and then compares to a set of HTML tag names is affected. Should live in `lib/utils/components.js` as a shared `isComponentInvocation(node)` helper that short-circuits on `/^[A-Z]/`, `startsWith('@')`, `startsWith('this.')`, `includes('.')`, `includes('::')` — matching `template-no-invalid-interactive.js:184` and `template-no-empty-headings.js` convention.
  - Rules to audit for this bug: `template-no-noninteractive-tabindex`, `template-no-noninteractive-element-to-interactive-role`, `template-no-interactive-element-to-noninteractive-role`, `template-no-role-presentation-on-focusable`, `template-no-aria-hidden-on-focusable`, `template-no-invalid-interactive` (already has the guard).
- **F3. `<option>` missing from `INHERENTLY_INTERACTIVE_TAGS`.** `template-click-events-have-key-events` flags `<option {{on "click" …}}>` but peers treat `<option>` as interactive. Source: B1.
- **F4. Missing non-interactive tags in `NON_INTERACTIVE_TAGS`.** `template-no-noninteractive-element-to-interactive-role` doesn't include `section`, `address`, `aside`, `code`, `del`, `em`, `fieldset`, `hr`, `html`, `ins`, `optgroup`, `output`, `strong`, `sub`, `sup`, `tbody`, `tfoot`, `thead`. These are non-interactive per HTML-AAM but our axobject-query-based filter drops the attribute-constrained schemas. jsx-a11y flags 22 of these; we don't. Source: B5.

### Behavioral gaps worth discussing (FP/FN potentially warranting a change)

- **G1. Multiple rules lack escape-hatch awareness** (`role="presentation"` / `role="none"` / `aria-hidden="true"`). `template-no-invalid-interactive` and `template-click-events-have-key-events` do NOT consult these as signals that an element is intentionally non-interactive. Peers (jsx-a11y + vue) DO. Sources: B1, B12.
- **G2. `template-no-invalid-interactive` missing elements.** `<option>`, `<menuitem>`, `<datalist>` absent from `NATIVE_INTERACTIVE_ELEMENTS`; `<audio>`/`<video>` without `controls` treated as interactive by peers but not by us; `<input type="hidden">` explicitly excluded by us but peers still treat as interactive. Source: B12.
- **G3. `template-no-autofocus-attribute` is value-blind.** Flags `autofocus="false"` and `autofocus={{false}}`, which jsx-a11y correctly treats as valid (opt-out). Source: B10.
- **G4. `<dialog autofocus>` exception missing.** Angular-eslint exempts `autofocus` inside `<dialog>` per MDN (dialogs can autofocus their initial element on open). We have no such exception. Source: B10.
- **G5. No descendant recursion in focusable-check rules.** `template-no-aria-hidden-on-focusable` and `template-no-role-presentation-on-focusable` check only the element carrying the role, not its focusable descendants. Vue-a11y does recurse. Either adopt vue's recursion or document the deliberate scope narrowing in both rules' docs. Sources: B3, B6.
- **G6. `template-no-invalid-aria-attributes` flags custom elements.** Our rule runs aria-\* validation on every tag including custom elements (`<app-foo aria-x="y">`). Angular-eslint's `valid-aria` skips tags with hyphen. Probably fine to align with angular since custom elements can define their own a11y contracts. Source: B9.
- **G7. Axobject-query-sourced tag set surfaces spec-adjacent FPs.** Several tags derived from axobject-query's widget-type mapping flag patterns jsx-a11y allows: `<embed role="img">`, `<summary role="img">`, `<td/th role="img">` in plain (non-grid) tables, `<datalist role="img">`. Consider whether to tighten the derivation to aria-query `elementRoles`-first (jsx-a11y's approach) rather than axobject-query-first. Source: B4.

### Intentional divergences (document in rule docs)

- **D1. Case-insensitive role values.** We lowercase before lookup; jsx-a11y compares case-sensitively. Aligns with memory feedback: "design alignment with upstream where spec permits". Sources: B5, several.
- **D2. `tabindex="-1"` exemptions.** Our `template-no-aria-hidden-on-focusable` flags the `<button aria-hidden tabindex="-1">` pattern; jsx-a11y accepts it. Our `template-no-role-presentation-on-focusable` likewise. Deliberate: focus is still programmatically reachable. Source: B3, B6. (Opposite side in `template-no-noninteractive-tabindex` and `template-require-aria-activedescendant-tabindex` where we DO accept `-1`.)
- **D3. Case-insensitive `JAVASCRIPT:` protocol in `template-no-invalid-link-href`.** We flag case-insensitively; peers use case-sensitive regex. Arguably a bug fix on our part — browsers treat URL schemes case-insensitively. Source: B7.
- **D4. Whitespace-only `href="   "` flagged.** Peers allow via `value.length > 0`; we trim first. Source: B7.
- **D5. `template-no-obsolete-elements` is a strict superset.** 27 tags beyond peers' 2 (`marquee`, `blink`). Derived from WHATWG "Obsolete features" section. Source: B11.
- **D6. `anchor-ambiguous-text` default word lists differ.** Only `"click here"` shared with jsx-a11y. Our `['click here','more info','read more','more']` vs jsx-a11y `['click here','here','link','a link','learn more']`. Consider widening or adding `words` option to the schema. Source: B18.
- **D7. `template-no-autofocus-attribute` form-context-aware fixer.** Emits `type="submit"` inside `<form>`. No peer equivalent. Source: B16. (Ember-specific enhancement.)
- **D8. Dialog autofocus, descendant recursion, etc.** — listed under G1–G7 above.

### Missing-rule ports (coverage gaps motivating new rules)

- **M1. `template-anchor-has-content`.** Flag `<a href><span aria-hidden>…</span></a>` where the only content is aria-hidden or renders to nothing. 4 MISSING-COVERAGE cases. Source: B13.
- **M2. `template-interactive-supports-focus`.** Flag `<div role="button" {{on "click" …}}>` without tabindex. 7 MISSING-COVERAGE cases + 18 divergences. Gap is larger than any single existing rule. Source: B14.
- **M3. `template-img-redundant-alt`** — Phase 2 M13. No audit fixture yet because we have no rule to target.

### Next-step recommendations

Prioritized fix PR backlog:

1. **F1** — one-liner fix; low-risk; add regression test for `aria-orientation="undefined"`.
2. **F2** — shared util; audit each affected rule; medium-effort but systemic improvement.
3. **F3** — add `option` to `INHERENTLY_INTERACTIVE_TAGS` in `template-click-events-have-key-events` (and any sibling rules that share the list).
4. **F4** — grow `NON_INTERACTIVE_TAGS` in `template-no-noninteractive-element-to-interactive-role` to match axobject-query's attribute-constrained schemas + HTML-AAM defaults.
5. **G1** — introduce shared `hasNonInteractiveEscape(node)` helper for `role="presentation"`/`role="none"`/`aria-hidden="true"`; call in `template-no-invalid-interactive` and `template-click-events-have-key-events`.
6. **G2** — reconcile `NATIVE_INTERACTIVE_ELEMENTS` list.
7. **G3** — make `template-no-autofocus-attribute` value-aware (accept `autofocus={{false}}` / `="false"`).
8. **G4** — `<dialog autofocus>` exception.
9. **G5** — decide recursion policy for focusable-check rules; either implement vue-style descent or document narrow scope.

Port PRs (separate): **M1, M2**.

Total: **~9 fix PRs + 2 port PRs** suggested from this Phase 3 wave. Each carries audit fixture as its regression harness.
