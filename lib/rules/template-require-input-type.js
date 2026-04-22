// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.

const VALID_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'email',
  'file',
  'hidden',
  'image',
  'month',
  'number',
  'password',
  'radio',
  'range',
  'reset',
  'search',
  'submit',
  'tel',
  'text',
  'time',
  'url',
  'week',
]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require input elements to have a valid type attribute',
      category: 'Best Practices',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-require-input-type.md',
      templateMode: 'both',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          requireExplicit: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missing: 'All `<input>` elements should have a `type` attribute',
      invalid: '`<input type="{{value}}">` is not a valid input type',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    // Flagging a missing `type` is a style/consistency check, not a correctness
    // one: `<input>` without `type` is spec-compliant (defaults to the Text
    // state). Opt-in so teams that want parity with template-require-button-
    // type can enable it without imposing it on others.
    const requireExplicit = Boolean(context.options[0]?.requireExplicit);

    return {
      GlimmerElementNode(node) {
        if (node.tag !== 'input') {
          return;
        }

        const typeAttr = node.attributes?.find((attr) => attr.name === 'type');

        if (!typeAttr) {
          if (!requireExplicit) {
            return;
          }
          context.report({
            node,
            messageId: 'missing',
            fix(fixer) {
              // Insert right after `<input` so the new attribute is the first
              // one — avoids the fragile "find end of open tag" regex that can
              // mis-place the attribute past the `/` in self-closing syntax.
              const insertPos = node.range[0] + '<input'.length;
              return fixer.insertTextBeforeRange([insertPos, insertPos], ' type="text"');
            },
          });
          return;
        }

        const value = typeAttr.value;
        if (value && value.type === 'GlimmerTextNode') {
          const typeValue = value.chars.toLowerCase();
          if (typeValue === '') {
            context.report({
              node: typeAttr,
              messageId: 'invalid',
              data: { value: '' },
              fix(fixer) {
                return fixer.replaceText(typeAttr, 'type="text"');
              },
            });
          } else if (!VALID_TYPES.has(typeValue)) {
            context.report({
              node: typeAttr,
              messageId: 'invalid',
              data: { value: value.chars },
              fix(fixer) {
                return fixer.replaceText(typeAttr, 'type="text"');
              },
            });
          }
        }
      },
    };
  },
};
