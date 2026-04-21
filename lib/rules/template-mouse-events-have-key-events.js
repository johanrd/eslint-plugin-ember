const { dom } = require('aria-query');

// Mouse-event → focus/blur pairings. Each hover-in event should be accompanied
// by a focusin-style event; each hover-out event by a focusout-style event.
// The mapping reflects the spirit of jsx-a11y's default config:
//   hoverIn  = mouseover  → focus (or focusin)
//   hoverOut = mouseout   → blur  (or focusout)
// mouseenter/mouseleave are also recognised as they bubble similarly but are
// the usual "stay within this element" variants used with matching focus/blur.
const DEFAULT_HOVER_IN_HANDLERS = ['mouseover', 'mouseenter'];
const DEFAULT_HOVER_OUT_HANDLERS = ['mouseout', 'mouseleave'];
const FOCUS_IN_EVENTS = new Set(['focus', 'focusin']);
const FOCUS_OUT_EVENTS = new Set(['blur', 'focusout']);

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

function findOnModifier(node, eventName) {
  return (node.modifiers || []).find((m) => getOnModifierEventName(m) === eventName);
}

function hasAnyEvent(node, events) {
  for (const modifier of node.modifiers || []) {
    const name = getOnModifierEventName(modifier);
    if (name && events.has(name)) {
      return true;
    }
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'require mouseover/mouseout to be accompanied by focus/blur for keyboard-only users',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-mouse-events-have-key-events.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          hoverInHandlers: { type: 'array', items: { type: 'string' } },
          hoverOutHandlers: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hoverInMissing:
        '{{hoverInHandler}} must be accompanied by a focus/focusin listener for keyboard-only users.',
      hoverOutMissing:
        '{{hoverOutHandler}} must be accompanied by a blur/focusout listener for keyboard-only users.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const hoverInHandlers = options.hoverInHandlers || DEFAULT_HOVER_IN_HANDLERS;
    const hoverOutHandlers = options.hoverOutHandlers || DEFAULT_HOVER_OUT_HANDLERS;

    return {
      GlimmerElementNode(node) {
        if (!node.tag || !dom.has(node.tag)) {
          return;
        }

        // Check hover-in / focus pairing.
        const hoverInMatch = hoverInHandlers
          .map((event) => ({ event, modifier: findOnModifier(node, event) }))
          .find(({ modifier }) => modifier !== undefined);
        if (hoverInMatch && !hasAnyEvent(node, FOCUS_IN_EVENTS)) {
          context.report({
            node: hoverInMatch.modifier,
            messageId: 'hoverInMissing',
            data: { hoverInHandler: `{{on "${hoverInMatch.event}" …}}` },
          });
        }

        // Check hover-out / blur pairing.
        const hoverOutMatch = hoverOutHandlers
          .map((event) => ({ event, modifier: findOnModifier(node, event) }))
          .find(({ modifier }) => modifier !== undefined);
        if (hoverOutMatch && !hasAnyEvent(node, FOCUS_OUT_EVENTS)) {
          context.report({
            node: hoverOutMatch.modifier,
            messageId: 'hoverOutMissing',
            data: { hoverOutHandler: `{{on "${hoverOutMatch.event}" …}}` },
          });
        }
      },
    };
  },
};
