const { dom } = require('aria-query');
const { isNativeElement } = require('../utils/is-native-element');
const { isHtmlInteractiveContent } = require('../utils/html-interactive-content');

const KEYBOARD_EVENT_NAMES = new Set(['keydown', 'keyup', 'keypress']);

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function getAttrTextValue(attr) {
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

// Adapter matching the `isHtmlInteractiveContent` util's expected signature:
// `(node, attrName) -> string | undefined` for static attribute text values.
function getTextAttrValue(node, attrName) {
  return getAttrTextValue(findAttr(node, attrName));
}

// True iff the attribute's mustache value is the literal boolean `true` —
// e.g. `aria-hidden={{true}}`. Any other expression (path reference, helper
// call, etc.) is left to runtime and not treated as a static escape hatch.
function isMustacheLiteralTrue(attr) {
  if (attr?.value?.type !== 'GlimmerMustacheStatement') {
    return false;
  }
  const path = attr.value.path;
  return path?.type === 'GlimmerBooleanLiteral' && path.value === true;
}

function isHiddenFromScreenReader(node) {
  const ariaHidden = findAttr(node, 'aria-hidden');
  if (ariaHidden) {
    // Static text values: bare `aria-hidden` (empty chars, boolean-attribute
    // convention) or the literal "true".
    if (ariaHidden.value?.type === 'GlimmerTextNode') {
      const chars = ariaHidden.value.chars;
      if (chars === '' || chars.trim().toLowerCase() === 'true') {
        return true;
      }
    }
    // Mustache-literal `{{true}}` — unambiguous static escape hatch. Any
    // other mustache shape (path reference, helper invocation) is dynamic
    // and intentionally NOT treated as hidden.
    if (isMustacheLiteralTrue(ariaHidden)) {
      return true;
    }
  }
  if (findAttr(node, 'hidden')) {
    return true;
  }
  return false;
}

function hasPresentationRole(node) {
  const role = getAttrTextValue(findAttr(node, 'role'));
  if (!role) {
    return false;
  }
  return role
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .some((token) => token === 'presentation' || token === 'none');
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
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      GlimmerElementNode(node) {
        if (!node.tag) {
          return;
        }

        // Skip component invocations (PascalCase, named-arg, this-path, dot-path, named-block)
        // and scope-shadowed tag names.
        if (!isNativeElement(node, sourceCode)) {
          return;
        }

        // Skip tags aria-query doesn't recognize as DOM elements (e.g. hyphenated
        // custom elements like `<my-widget>`).
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

        if (isHtmlInteractiveContent(node, getTextAttrValue)) {
          return;
        }

        // Elements outside HTML §3.2.5.2.7 that are nonetheless ARIA widgets
        // or conventionally interactive surfaces — click-without-key on them
        // isn't what this rule targets. The HTML-content-model util covers
        // the spec-normative list; these are the ARIA-widget / convention
        // additions (see `html-interactive-content.js` docstring for why the
        // two authorities diverge).
        //   - <canvas>: drawing/game surface (axobject-query: CanvasRole).
        //   - <option>: ARIA role="option" (widget).
        //   - <datalist>: ARIA role="listbox" (widget).
        const lowerTag = node.tag.toLowerCase();
        if (lowerTag === 'canvas' || lowerTag === 'option' || lowerTag === 'datalist') {
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
