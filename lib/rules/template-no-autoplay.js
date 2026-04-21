// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.

const DEFAULT_ELEMENTS = new Set(['audio', 'video']);

function classifyAttrValue(attr) {
  if (!attr.value) {
    return 'truthy';
  }
  if (attr.value.type === 'GlimmerTextNode') {
    return 'truthy';
  }
  if (attr.value.type === 'GlimmerMustacheStatement' && attr.value.path) {
    const path = attr.value.path;
    if (path.type === 'GlimmerBooleanLiteral') {
      return path.value ? 'truthy' : 'falsy';
    }
    if (path.type === 'GlimmerStringLiteral') {
      return path.value.toLowerCase() === 'false' ? 'falsy' : 'truthy';
    }
    return 'unknown';
  }
  return 'truthy';
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow autoplay attribute on audio and video elements',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-autoplay.md',
      templateMode: 'both',
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalElements: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noAutoplay:
        'The `autoplay` attribute is disruptive for users and has accessibility concerns on `<{{tag}}>`',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const extraElements = new Set(options.additionalElements || []);
    const watched = new Set([...DEFAULT_ELEMENTS, ...extraElements]);

    return {
      GlimmerElementNode(node) {
        if (!watched.has(node.tag)) {
          return;
        }
        const autoplayAttr = node.attributes?.find((attr) => attr.name === 'autoplay');
        if (!autoplayAttr) {
          return;
        }
        const classification = classifyAttrValue(autoplayAttr);
        if (classification === 'falsy' || classification === 'unknown') {
          return;
        }
        context.report({
          node: autoplayAttr,
          messageId: 'noAutoplay',
          data: { tag: node.tag },
        });
      },
    };
  },
};
