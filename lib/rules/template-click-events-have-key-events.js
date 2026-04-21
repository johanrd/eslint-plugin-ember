const { dom } = require('aria-query');

// Elements whose default HTML semantics make them interactive — a click handler
// here doesn't need a keyboard fallback because keyboard focus/activation is
// already built in. Derived from aria-query's `elementRoles` (tags whose
// inherent ARIA role descends from `widget`); matches jsx-a11y's
// `isInteractiveElement` treatment.
const INHERENTLY_INTERACTIVE_TAGS = new Set([
  'button',
  'datalist',
  'details',
  'embed',
  'iframe',
  'input',
  'label',
  'option',
  'select',
  'summary',
  'textarea',
]);

// Roles whose keyboard semantics are widget-like. When a non-interactive element
// declares one of these, the user is opting in to a widget contract and the
// click handler does need a keyboard equivalent — so we still check.
// (Matches the jsx-a11y `isInteractiveRole` set.)

const KEYBOARD_EVENT_NAMES = new Set(['keydown', 'keyup', 'keypress']);

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function getTextAttrValue(attr) {
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

function isHiddenFromScreenReader(node) {
  const ariaHidden = findAttr(node, 'aria-hidden');
  if (ariaHidden) {
    const v = getTextAttrValue(ariaHidden);
    // Presence without "false" is truthy (boolean attribute convention).
    if (v === undefined || v === '' || v === 'true') {
      return true;
    }
  }
  if (findAttr(node, 'hidden')) {
    return true;
  }
  return false;
}

function hasPresentationRole(node) {
  const role = getTextAttrValue(findAttr(node, 'role'));
  if (!role) {
    return false;
  }
  return role
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .some((token) => token === 'presentation' || token === 'none');
}

function isInteractiveElement(node) {
  const tag = node.tag?.toLowerCase();
  if (!tag) {
    return false;
  }
  if (INHERENTLY_INTERACTIVE_TAGS.has(tag)) {
    // <input type="hidden"> is not interactive.
    if (tag === 'input') {
      const type = getTextAttrValue(findAttr(node, 'type'));
      if (type === 'hidden') {
        return false;
      }
    }
    return true;
  }
  if (tag === 'a' && findAttr(node, 'href')) {
    return true;
  }
  return false;
}

function getOnModifierEventName(modifier) {
  if (modifier.type !== 'GlimmerElementModifierStatement') {
    return undefined;
  }
  if (modifier.path?.type !== 'GlimmerPathExpression' || modifier.path.original !== 'on') {
    return undefined;
  }
  const firstParam = modifier.params?.[0];
  if (firstParam?.type === 'GlimmerStringLiteral') {
    return firstParam.value;
  }
  return undefined;
}

function modifierEvents(node) {
  const events = new Set();
  for (const modifier of node.modifiers || []) {
    const eventName = getOnModifierEventName(modifier);
    if (eventName) {
      events.add(eventName);
    }
  }
  return events;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'require a clickable non-interactive element to have at least one keyboard event listener',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-click-events-have-key-events.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      needsKeyEvent:
        'Visible, non-interactive elements with click handlers must have at least one keyboard listener (keydown/keyup/keypress).',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (!node.tag) {
          return;
        }

        // Skip components (not DOM elements).
        if (!dom.has(node.tag)) {
          return;
        }

        const events = modifierEvents(node);
        if (!events.has('click')) {
          return;
        }

        if (isHiddenFromScreenReader(node) || hasPresentationRole(node)) {
          return;
        }

        if (isInteractiveElement(node)) {
          return;
        }

        // If any of the keyboard events is already handled, we're done.
        for (const event of events) {
          if (KEYBOARD_EVENT_NAMES.has(event)) {
            return;
          }
        }

        context.report({ node, messageId: 'needsKeyEvent' });
      },
    };
  },
};
