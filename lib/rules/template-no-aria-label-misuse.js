// Logic inspired by html-validate (MIT), Copyright 2017 David Sveningsson.
// Role resolution delegates to `aria-query` — the authoritative WAI-ARIA
// data package (already a dependency of this plugin). The
// `roles.get(r).prohibitedProps` list drives the flag/allow decision.

const { roles, elementRoles } = require('aria-query');

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

function isHtmlElement(node) {
  const tag = node.tag || '';
  return /^[a-z]/.test(tag) && !tag.includes('.') && !tag.startsWith('@');
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

    if (spec.value !== undefined) {
      if (staticValue === null || staticValue.toLowerCase() !== spec.value) {
        return null;
      }
      score += 2;
      continue;
    }
    if (spec.constraints?.includes('set')) {
      if (!isPresent) {
        return null;
      }
      score += 1;
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

function getImplicitRole(node) {
  let best = null;
  let bestScore = -1;
  for (const [key, roleList] of elementRoles.entries()) {
    if (key.name !== node.tag) {
      continue;
    }
    const score = scoreMatch(key, node);
    if (score === null) {
      continue;
    }
    if (score > bestScore) {
      bestScore = score;
      best = roleList[0];
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
    const first = explicit.trim().split(/\s+/)[0]?.toLowerCase();
    if (first && roles.has(first)) {
      return first;
    }
    // `role` present with an unknown token (e.g. `role="bogus"`) — per ARIA
    // the invalid value is ignored and the implicit role applies. Fall
    // through to the implicit-role lookup.
  }
  return getImplicitRole(node);
}

function hasNonEmptyLabelAttr(node, name) {
  const attr = findAttr(node, name);
  if (!attr) {
    return false;
  }
  if (!attr.value) {
    return true;
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

    return {
      GlimmerElementNode(node) {
        if (!isHtmlElement(node)) {
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
