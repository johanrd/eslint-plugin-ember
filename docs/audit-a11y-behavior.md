# Behavioral divergences — eslint-plugin-ember vs. peer a11y plugins

Phase 3 of the audit (see `audit-a11y-parity.md`). For each concept where ≥2 peers have a comparable rule AND we have a rule, this document records translated test cases and any behavioral divergences surfaced.

**Translated fixtures live at `tests/audit/<concept>/peer-parity.js`.** They are not in CI — run on demand:

```sh
npx vitest run tests/audit/
```

Each fixture encodes our *current* behavior and annotates divergences with `// DIVERGENCE —` comments, so running it passes while making the divergences visible for human review.

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

## Concept — `aria-props` / aria-* attribute name validity *(no action needed)*

**Our rule:** `template-no-invalid-aria-attributes`
**Peer rules:** jsx-a11y/`aria-props`, vue-a11y/`aria-props`, lit-a11y/`aria-attrs`

**Note:** the original matrix flagged this as potentially missing value-type validation (concept row 8, `aria-proptypes`). That was wrong — `template-no-invalid-aria-attributes.js` already uses `aria-query` to validate BOTH names AND values (boolean/tristate/string/idlist/integer/number/token/tokenlist). Matrix row 8 is effectively covered by our rule.

Sampled jsx-a11y tests (`__tests__/src/rules/aria-props-test.js`) don't suggest any false positives/negatives in our coverage for the aria-* name family. No audit fixture written; a deeper pass may still be worthwhile but lower priority.

---

## Progress tracker

| Concept | Status | Fixture | Divergences found |
|---|---|---|---|
| aria-role | ✅ complete | aria-role/peer-parity.js | 5 (2 bugs, 1 intentional, 2 minor) |
| aria-props | ✅ surveyed — no action | — | 0 |
| alt-text | ⏳ pending | — | — |
| aria-unsupported-elements | ⏳ pending | — | — |
| no-redundant-roles | ⏳ pending | — | — |
| role-has-required-aria | ⏳ pending | — | — |
| role-supports-aria-props | ⏳ pending | — | — |
| label-form-association | ⏳ pending | — | — |
| aria-activedescendant-has-tabindex | ⏳ pending | — | — |
| iframe-title | ⏳ pending | — | — |
| media-has-caption | ⏳ pending | — | — |
| scope on th | ⏳ pending | — | — |
| tabindex-no-positive | ⏳ pending | — | — |
| heading-has-content | ⏳ pending | — | — |
| no-access-key | ⏳ pending | — | — |
