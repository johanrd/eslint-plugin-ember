// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// Validates <label for="x"> in two ways:
//   1. Points to a labelable HTML control defined in the same template
//      (not a <div> or other arbitrary element).
//   2. If the target is already nested inside the label, flag it as
//      redundant (the `for` adds nothing — the nested element is
//      already associated via the containment rule).
//
// Dynamic `for` values (mustache) are skipped. Targets we can't find in
// this template are also skipped (partial templates, yielded content).

const LABELABLE_TAGS = new Set([
  'button',
  'input',
  'meter',
  'output',
  'progress',
  'select',
  'textarea',
]);

// Ember's built-in <Input> / <Textarea> components render to native <input>
// and <textarea> and accept `id=` forwarding. They are valid targets for
// <label for="…"> in classic Handlebars where `<Input>` always resolves to
// the built-in. In strict GJS/GTS the tag could be an imported override,
// but we follow ember-template-lint's precedent in `require-input-label`
// ("better to risk false negatives than false positives") and treat them
// as labelable unconditionally.
const EMBER_LABELABLE_COMPONENTS = new Set(['Input', 'Textarea']);

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

function isInputHidden(node) {
  if (node.tag !== 'input') {
    return false;
  }
  const type = getStaticAttrString(node, 'type');
  return type !== null && type.toLowerCase() === 'hidden';
}

function isLabelable(node) {
  if (!node || node.type !== 'GlimmerElementNode') {
    return false;
  }
  if (EMBER_LABELABLE_COMPONENTS.has(node.tag)) {
    return true;
  }
  if (!LABELABLE_TAGS.has(node.tag)) {
    return false;
  }
  if (isInputHidden(node)) {
    return false;
  }
  return true;
}

function isDescendant(candidate, ancestor) {
  let current = candidate.parent;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

// Per HTML §4.10.4 ("The label element"), a label with BOTH `for=` and a
// labelable descendant binds to the `for`-referenced element — the
// containment rule is the *implicit* binding and only applies when no
// `for` is present. When `for` is present, it wins.
//
// So `redundantFor` should only fire when the `for` target is the same
// element that would have been the implicit control — i.e. the FIRST
// labelable descendant (HTML uses "first labelable element in tree order
// that is a descendant of the label element", excluding hidden inputs).
// A label with multiple labelable descendants and `for=` pointing at a
// non-first one is expressing an explicit choice and must not be flagged.
function findFirstLabelableDescendant(node) {
  if (!node.children) {
    return null;
  }
  for (const child of node.children) {
    if (!child || child.type !== 'GlimmerElementNode') {
      continue;
    }
    if (isLabelable(child)) {
      return child;
    }
    const nested = findFirstLabelableDescendant(child);
    if (nested) {
      return nested;
    }
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require `<label for>` to point at a labelable form control',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-valid-label-for.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      notLabelable:
        '`<label for="{{id}}">` must reference a labelable form control (`<input>`, `<select>`, `<textarea>`, `<button>`, `<meter>`, `<output>`, `<progress>`, or Ember `<Input>` / `<Textarea>`)',
      redundantFor:
        '`for="{{id}}"` is redundant: `<label>` already contains the referenced element',
    },
  },

  create(context) {
    const idToElement = new Map();
    const labels = [];

    return {
      GlimmerElementNode(node) {
        const idValue = getStaticAttrString(node, 'id');
        if (idValue && !idToElement.has(idValue)) {
          idToElement.set(idValue, node);
        }
        if (node.tag === 'label') {
          const forAttr = findAttr(node, 'for');
          const forValue = getStaticAttrString(node, 'for');
          if (forAttr && forValue) {
            labels.push({ labelNode: node, forAttr, forValue });
          }
        }
      },
      'Program:exit'() {
        for (const { labelNode, forAttr, forValue } of labels) {
          const target = idToElement.get(forValue);
          if (!target) {
            continue;
          }
          if (!isLabelable(target)) {
            context.report({
              node: forAttr,
              messageId: 'notLabelable',
              data: { id: forValue },
            });
            continue;
          }
          if (isDescendant(target, labelNode)) {
            // Only redundant when `for` resolves to the SAME element that
            // the implicit-containment rule would bind — the first
            // labelable descendant. If `for` points at a later labelable
            // descendant, the author is overriding the implicit choice,
            // which is not redundant.
            const implicit = findFirstLabelableDescendant(labelNode);
            if (implicit && implicit === target) {
              context.report({
                node: forAttr,
                messageId: 'redundantFor',
                data: { id: forValue },
              });
            }
          }
        }
      },
    };
  },
};
