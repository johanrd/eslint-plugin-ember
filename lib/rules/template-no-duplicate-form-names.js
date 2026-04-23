// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// Simplifications vs. upstream for v1: we don't support `name[]` array syntax,
// the <input type="hidden"> + <input type="checkbox"> default-value pattern,
// or the full form-associated element registry. Scope is <input>/<select>/
// <textarea>/<button>/<output>.
//
// Types that do not contribute to the form-data entry list (per HTML spec
// §4.10.21.4) are skipped entirely — no name collision is possible because
// they never submit. This covers <input type="button"|"reset"> and
// <button type="button"|"reset">.
//
// Types whose duplicate-name pattern is legitimate (activation-only contributes
// one value, or a radio group selects one) are tracked but allowed to share a
// name with same-type siblings: radio, submit.

const FORM_CONTROL_TAGS = new Set(['input', 'select', 'textarea', 'button', 'output']);
const NON_SUBMITTING_TYPES = new Set(['button', 'reset']);
const SHARED_NAME_TYPES = new Set(['radio', 'submit']);

function findAttr(node, name) {
  return node.attributes?.find((attr) => attr.name === name);
}

function getStaticAttrValue(node, name) {
  const attr = findAttr(node, name);
  if (!attr || !attr.value) {
    return { kind: attr ? 'empty' : 'absent', value: '' };
  }
  if (attr.value.type === 'GlimmerTextNode') {
    return { kind: 'static', value: attr.value.chars };
  }
  return { kind: 'dynamic', value: '' };
}

function getControlType(node) {
  if (node.tag === 'button') {
    const t = getStaticAttrValue(node, 'type');
    if (t.kind === 'static') {
      return t.value.toLowerCase();
    }
    return 'submit';
  }
  if (node.tag === 'input') {
    const t = getStaticAttrValue(node, 'type');
    if (t.kind === 'static') {
      return t.value.toLowerCase();
    }
    return 'text';
  }
  return node.tag;
}

function findEnclosingFormOrRoot(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'GlimmerElementNode' && current.tag === 'form') {
      return current;
    }
    current = current.parent;
  }
  return null;
}

const { getBranchPath, areMutuallyExclusive } = require('../utils/control-flow');

// Per HTML spec (§4.10.21.4 "Constructing the entry list"), only `disabled`
// controls are skipped when building the form-data entry list. `hidden`
// does NOT affect submission — a hidden control still contributes its name
// and value. Duplicate-name collisions can therefore happen even when one
// of the controls is `hidden`.
function isDisabled(node) {
  return Boolean(findAttr(node, 'disabled'));
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow duplicate form control names within the same form',
      category: 'Possible Errors',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-duplicate-form-names.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      duplicate: 'Duplicate form control `name="{{name}}"` within the same form',
    },
  },

  create(context) {
    // Per-form: Map<name, entries[]>. Each entry records { type, path } so we
    // can pairwise compare against subsequent occurrences — mutually exclusive
    // branches (different `program`/`inverse` subtrees of the same
    // `{{#if}}`/`{{#unless}}`) never both render, so their same-name
    // "collision" is a false positive.
    const nameMapByForm = new WeakMap();
    const rootMap = new Map();

    function getMapForForm(formNode) {
      if (!formNode) {
        return rootMap;
      }
      let map = nameMapByForm.get(formNode);
      if (!map) {
        map = new Map();
        nameMapByForm.set(formNode, map);
      }
      return map;
    }

    return {
      GlimmerElementNode(node) {
        if (!FORM_CONTROL_TAGS.has(node.tag)) {
          return;
        }
        if (isDisabled(node)) {
          return;
        }
        const nameInfo = getStaticAttrValue(node, 'name');
        if (nameInfo.kind !== 'static' || nameInfo.value === '') {
          return;
        }
        const name = nameInfo.value;
        const type = getControlType(node);
        // Non-submitting controls contribute nothing to the form-data entry
        // list, so their `name` can't collide with anything.
        if ((node.tag === 'input' || node.tag === 'button') && NON_SUBMITTING_TYPES.has(type)) {
          return;
        }
        const form = findEnclosingFormOrRoot(node);
        const map = getMapForForm(form);
        const path = getBranchPath(node);

        const entries = map.get(name);
        if (!entries) {
          map.set(name, [{ type, path }]);
          return;
        }

        const currCanShare = SHARED_NAME_TYPES.has(type);
        const collides = entries.some((prev) => {
          // Same-type shared-name controls (radio/submit) coexist legitimately.
          if (currCanShare && SHARED_NAME_TYPES.has(prev.type) && prev.type === type) {
            return false;
          }
          // Mutually exclusive control-flow branches never render together.
          if (areMutuallyExclusive(prev.path, path)) {
            return false;
          }
          return true;
        });

        entries.push({ type, path });

        if (collides) {
          const nameAttr = findAttr(node, 'name');
          context.report({
            node: nameAttr || node,
            messageId: 'duplicate',
            data: { name },
          });
        }
      },
    };
  },
};
