// Logic inspired by html-validate (MIT), Copyright 2017 David Sveningsson.
// Role resolution delegates to `aria-query` — the authoritative WAI-ARIA
// data package (already a dependency of this plugin). The
// `roles.get(r).prohibitedProps` list drives the flag/allow decision.

const { roles, elementRoles } = require('aria-query');
const { isNativeElement } = require('../utils/is-native-element');

function findAttr(node, name) {
  return node.attributes?.find((attr) => attr.name === name);
}

function getStaticAttrString(node, name) {
  const attr = findAttr(node, name);
  if (!attr || !attr.value || attr.value.type !== 'GlimmerTextNode') {
    return null;
  }
  return attr.value.chars;
}

// Score how well an elementRoles entry matches the given node. Returns `null`
// if any constraint fails; otherwise the number of satisfied conditions
// (higher = more specific, used to pick the best match).
function scoreMatch(entry, node) {
  const attrs = entry.attributes || [];
  let score = 0;
  for (const spec of attrs) {
    const nodeAttr = findAttr(node, spec.name);
    const isPresent = Boolean(nodeAttr);
    const staticValue = getStaticAttrString(node, spec.name);

    // Specificity tiers: exact value match is strictest (3), "set" presence
    // is stricter than "undefined" absence (2 vs 1). Previously `set` and
    // `undefined` both scored 1, so a constraints-match on either tied; the
    // tier split ensures a more specific "set" entry beats a looser
    // "undefined" entry when both match — and an exact-value entry (e.g.
    // <img alt=""> → presentation) still beats a plain "set" entry.
    if (spec.value !== undefined) {
      if (staticValue === null || staticValue.toLowerCase() !== spec.value) {
        return null;
      }
      score += 3;
      continue;
    }
    if (spec.constraints?.includes('set')) {
      if (!isPresent) {
        return null;
      }
      score += 2;
      continue;
    }
    if (spec.constraints?.includes('undefined')) {
      if (isPresent) {
        return null;
      }
      score += 1;
      continue;
    }
    return null;
  }
  return score;
}

// Pre-index elementRoles by tag name at module load. aria-query's Map is
// static data; bucketing by tag turns the per-call scan (~80 keys) into a
// 1–5 key lookup per tag. Mirrors the optimization landed on PR #52's
// template-no-unsupported-role-attributes rule.
const ELEMENT_ROLES_KEYS_BY_TAG = buildElementRolesIndex();

function buildElementRolesIndex() {
  const index = new Map();
  for (const key of elementRoles.keys()) {
    if (!index.has(key.name)) {
      index.set(key.name, []);
    }
    index.get(key.name).push(key);
  }
  return index;
}

function getImplicitRole(node) {
  const keys = ELEMENT_ROLES_KEYS_BY_TAG.get(node.tag);
  if (!keys) {
    return null;
  }
  let best = null;
  let bestScore = -1;
  for (const key of keys) {
    const score = scoreMatch(key, node);
    if (score === null) {
      continue;
    }
    if (score > bestScore) {
      bestScore = score;
      best = elementRoles.get(key)[0];
    }
  }
  return best;
}

function getRole(node) {
  const roleAttr = findAttr(node, 'role');
  if (roleAttr) {
    // Present but dynamic (mustache / concat) — the runtime role is unknown,
    // and if it differs from the element's implicit role we'd false-positive
    // against the implicit. Skip rather than guess.
    const explicit = getStaticAttrString(node, 'role');
    if (explicit === null) {
      return null;
    }
    // Walk the whitespace-separated token list for the first RECOGNISED
    // role, matching WAI-ARIA §4.1 role-fallback semantics — UAs skip
    // unknown tokens and pick the first they implement. `role="xxyxyz
    // button"` resolves to `button`; later tokens are graceful-degradation
    // fallbacks. Unknown-only lists fall through to the implicit role.
    const tokens = explicit.trim().toLowerCase().split(/\s+/u);
    for (const token of tokens) {
      if (token && roles.has(token)) {
        return token;
      }
    }
    // `role` present but no recognised token (e.g. `role="bogus"`) — per
    // ARIA, invalid values are ignored and the implicit role applies.
  }
  return getImplicitRole(node);
}

function hasNonEmptyLabelAttr(node, name) {
  const attr = findAttr(node, name);
  if (!attr) {
    return false;
  }
  // A valueless attribute (e.g. `<div aria-label>`) carries no accessible
  // name. Treat it as empty — not as non-empty — so downstream checks don't
  // mistake it for an author-declared label.
  if (attr.value === null || attr.value === undefined) {
    return false;
  }
  if (attr.value.type === 'GlimmerTextNode') {
    return attr.value.chars !== '';
  }
  // Mustache — treat as non-empty (author has declared intent).
  return true;
}

function isExplicitlyDecorative(node) {
  const role = getStaticAttrString(node, 'role');
  if (!role) {
    return false;
  }
  const first = role.trim().split(/\s+/)[0]?.toLowerCase();
  return first === 'presentation' || first === 'none';
}

// Escape hatch: any `tabindex` value signals author-intent-to-interact,
// even when the computed ARIA role is still generic. Flagging here has a
// high false-positive cost (the author wants the label read on focus)
// relative to the true-positive it would catch. Disable via
// `strictTabindex: true` to get strict spec-role enforcement.
function hasTabindex(node) {
  return Boolean(findAttr(node, 'tabindex'));
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow aria-label and aria-labelledby on elements whose role prohibits an accessible name',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-aria-label-misuse.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          strictTabindex: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      misuse:
        '`{{attr}}` is prohibited on `<{{tag}}>` (role `{{role}}`). Elements with this role are not named from author; the attribute is ignored by assistive tech.',
    },
  },

  create(context) {
    const strictTabindex = Boolean(context.options[0]?.strictTabindex);
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      GlimmerElementNode(node) {
        // Gate on `isNativeElement` to correctly exclude custom elements
        // (<my-widget>), colon-namespaced tags (<svg:rect>), named blocks
        // (<:slot>), PascalCase components, dotted/at-prefixed path tags,
        // and scope-shadowed bindings. The previous first-char regex was
        // permissive and misclassified custom elements as native HTML.
        if (!isNativeElement(node, sourceCode)) {
          return;
        }
        if (isExplicitlyDecorative(node)) {
          return;
        }
        if (!strictTabindex && hasTabindex(node)) {
          return;
        }

        const role = getRole(node);
        if (!role) {
          return;
        }
        const def = roles.get(role);
        if (!def) {
          return;
        }

        for (const key of ['aria-label', 'aria-labelledby']) {
          if (!hasNonEmptyLabelAttr(node, key)) {
            continue;
          }
          if (def.prohibitedProps?.includes(key)) {
            const attr = findAttr(node, key);
            context.report({
              node: attr,
              messageId: 'misuse',
              data: { attr: key, tag: node.tag, role },
            });
          }
        }
      },
    };
  },
};
