function isYieldOnly(node) {
  return (
    node.type === 'GlimmerMustacheStatement' &&
    node.path &&
    node.path.type === 'GlimmerPathExpression' &&
    node.path.original === 'yield' &&
    node.params &&
    node.params.length === 0
  );
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow components that only yield',
      category: 'Best Practices',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-yield-only.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      noYieldOnly: '{{yieldExpression}}-only templates are not allowed',
    },
    originallyFrom: {
      name: 'ember-template-lint',
      rule: 'lib/rules/no-yield-only.js',
      docs: 'docs/rule/no-yield-only.md',
      tests: 'test/unit/rules/no-yield-only-test.js',
    },
  },

  create(context) {
    let isOnlyYield = false;

    return {
      GlimmerTemplate(node) {
        // In GJS/GTS, `node.body` is a one-element list wrapping a
        // `<template>` element whose `children` is the actual template
        // content. In classic HBS, `node.body` is the template content
        // directly. Require `body.length === 1` before descending so we
        // don't mistake a native HTML `<template>` element that happens
        // to be the first child of an HBS template for the GJS wrapper —
        // e.g. `<template>{{yield}}</template>{{#each items}}…{{/each}}`
        // would otherwise be wrongly flagged as yield-only.
        const templateNodes =
          node.body.length === 1 &&
          node.body[0].type === 'GlimmerElementNode' &&
          node.body[0].tag === 'template'
            ? node.body[0].children
            : node.body;

        if (templateNodes.length === 1 && isYieldOnly(templateNodes[0])) {
          isOnlyYield = true;
        }
      },

      GlimmerMustacheStatement(node) {
        if (isOnlyYield) {
          context.report({
            node,
            messageId: 'noYieldOnly',
            data: { yieldExpression: '{{yield}}' },
          });
        }
      },
    };
  },
};
