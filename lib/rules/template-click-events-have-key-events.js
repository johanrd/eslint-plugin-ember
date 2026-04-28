const { dom } = require('aria-query');
const { isNativeElement } = require('../utils/is-native-element');
const { isHtmlInteractiveContent } = require('../utils/html-interactive-content');
const { getStaticAttrValue } = require('../utils/static-attr-value');

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

function isHiddenFromScreenReader(node) {
  const ariaHidden = findAttr(node, 'aria-hidden');
  if (ariaHidden) {
    // WAI-ARIA 1.2: aria-hidden is NOT a boolean HTML attribute. Only the
    // string value "true" hides the element. A valueless attribute or an
    // empty string is invalid and must NOT be treated as hiding the element.
    //
    // getStaticAttrValue resolves GlimmerTextNode, GlimmerMustacheStatement
    // with a literal path (boolean/string), and GlimmerConcatStatement whose
    // parts are all static — covering aria-hidden="TRUE", aria-hidden={{true}},
    // aria-hidden={{"true"}}, and aria-hidden="{{true}}". Dynamic expressions
    // return undefined and are intentionally not treated as hidden.
    const resolved = getStaticAttrValue(ariaHidden.value);
    if (resolved !== undefined && resolved.trim().toLowerCase() === 'true') {
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
        'Non-interactive elements with click handlers must have at least one keyboard listener (keydown/keyup/keypress).',
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
        // the spec-normative list; these are explicit exemptions for elements
        // that do not qualify as interactive content under the HTML spec but
        // are carved out here due to their ARIA roles or browser-native
        // behavior (see `html-interactive-content.js` docstring for context).
        //   - <canvas>: drawing/game surface (axobject-query: CanvasRole).
        //   - <option>: ARIA role="option" (widget), but not keyboard-activatable
        //     as a standalone element — exempted as a special case.
        //   - <datalist>: ARIA role="listbox" (widget), same rationale as <option>.
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
