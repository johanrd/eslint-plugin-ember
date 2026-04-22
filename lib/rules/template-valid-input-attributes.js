// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.

const RESTRICTED = new Map([
  ['accept', new Set(['file'])],
  ['alt', new Set(['image'])],
  ['capture', new Set(['file'])],
  ['checked', new Set(['checkbox', 'radio'])],
  ['dirname', new Set(['text', 'search'])],
  ['height', new Set(['image'])],
  [
    'list',
    new Set([
      'text',
      'search',
      'url',
      'tel',
      'email',
      'date',
      'month',
      'week',
      'time',
      'datetime-local',
      'number',
      'range',
      'color',
    ]),
  ],
  ['max', new Set(['date', 'month', 'week', 'time', 'datetime-local', 'number', 'range'])],
  ['maxlength', new Set(['text', 'search', 'url', 'tel', 'email', 'password'])],
  ['min', new Set(['date', 'month', 'week', 'time', 'datetime-local', 'number', 'range'])],
  ['minlength', new Set(['text', 'search', 'url', 'tel', 'email', 'password'])],
  ['multiple', new Set(['email', 'file'])],
  ['pattern', new Set(['text', 'search', 'url', 'tel', 'email', 'password'])],
  ['placeholder', new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number'])],
  [
    'readonly',
    new Set([
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
      'date',
      'month',
      'week',
      'time',
      'datetime-local',
      'number',
    ]),
  ],
  [
    'required',
    new Set([
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
      'date',
      'month',
      'week',
      'time',
      'datetime-local',
      'number',
      'checkbox',
      'radio',
      'file',
    ]),
  ],
  ['size', new Set(['text', 'search', 'url', 'tel', 'email', 'password'])],
  ['src', new Set(['image'])],
  ['step', new Set(['date', 'month', 'week', 'time', 'datetime-local', 'number', 'range'])],
  ['width', new Set(['image'])],
]);

function getStaticAttrString(node, name) {
  const attr = node.attributes?.find((a) => a.name === name);
  if (!attr || !attr.value || attr.value.type !== 'GlimmerTextNode') {
    return null;
  }
  return attr.value.chars;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow input attributes that are incompatible with the declared type',
      category: 'Possible Errors',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-valid-input-attributes.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      incompatible: 'Attribute `{{attr}}` is not allowed on `<input type="{{type}}">`',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (node.tag !== 'input') {
          return;
        }
        const typeValue = getStaticAttrString(node, 'type');
        if (typeValue === null) {
          return;
        }
        const type = typeValue.toLowerCase();

        for (const attr of node.attributes || []) {
          const validTypes = RESTRICTED.get(attr.name);
          if (!validTypes) {
            continue;
          }
          if (validTypes.has(type)) {
            continue;
          }
          context.report({
            node: attr,
            messageId: 'incompatible',
            data: { attr: attr.name, type },
          });
        }
      },
    };
  },
};
