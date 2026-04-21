// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// Simplifications vs. upstream for v1: we don't support `name[]` array syntax,
// the <input type="hidden"> + <input type="checkbox"> default-value pattern,
// or the full form-associated element registry. Scope is <input>/<select>/
// <textarea>/<button>/<output>. Types allowed to share a name: radio, submit,
// reset, button.

const FORM_CONTROL_TAGS = new Set(['input', 'select', 'textarea', 'button', 'output']);
const SHARED_NAME_TYPES = new Set(['radio', 'submit', 'reset', 'button']);

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

function isDisabled(node) {
  return Boolean(findAttr(node, 'disabled') || findAttr(node, 'hidden'));
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
        const form = findEnclosingFormOrRoot(node);
        const map = getMapForForm(form);

        const previous = map.get(name);
        if (!previous) {
          map.set(name, { type });
          return;
        }
        const prevCanShare = SHARED_NAME_TYPES.has(previous.type);
        const currCanShare = SHARED_NAME_TYPES.has(type);
        if (prevCanShare && currCanShare && previous.type === type) {
          return;
        }
        const nameAttr = findAttr(node, 'name');
        context.report({
          node: nameAttr || node,
          messageId: 'duplicate',
          data: { name },
        });
      },
    };
  },
};
