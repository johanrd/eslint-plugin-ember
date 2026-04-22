// Logic inspired by html-validate (MIT), Copyright 2017 David Sveningsson.
// Role resolution delegates to `aria-query` — the authoritative WAI-ARIA
// data package (already a dependency of this plugin). `roles.get(r)
// .prohibitedProps` drives the flag/allow decision.

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
  const explicit = getStaticAttrString(node, 'role');
  if (explicit) {
    const first = explicit.trim().split(/\s+/)[0]?.toLowerCase();
    if (first && roles.has(first)) {
      return first;
    }
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

// Escape hatch: if the author has added `tabindex`, they've signalled
// "this is interactive" even when the role is still generic per ARIA.
// Real-world screen readers (NVDA, JAWS, VoiceOver) will read `aria-label`
// on a tabindexed generic element in practice, so flagging here would be
// a false positive.
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
    schema: [],
    messages: {
      misuse:
        '`{{attr}}` is prohibited on `<{{tag}}>` (role `{{role}}`). Elements with this role are not named from author; the attribute is ignored by assistive tech.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (!isHtmlElement(node)) {
          return;
        }
        if (isExplicitlyDecorative(node)) {
          return;
        }
        if (hasTabindex(node)) {
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
