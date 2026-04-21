// Mustache path nodes that produce no accessible name. Booleans, null, undefined
// all coerce to empty-ish strings; numeric literals ("42") are accepted by HTML
// but provide no useful title for assistive tech.
function isInvalidTitleLiteral(path) {
  if (!path) {
    return false;
  }
  if (path.type === 'GlimmerBooleanLiteral') {
    return true;
  }
  if (path.type === 'GlimmerNullLiteral' || path.type === 'GlimmerUndefinedLiteral') {
    return true;
  }
  if (path.type === 'GlimmerNumberLiteral') {
    return true;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require iframe elements to have a title attribute',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-require-iframe-title.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      // Four messageIds (missingTitle, emptyTitle, dynamicFalseTitle,
      // duplicateTitle) for richer diagnostic detail.
      missingTitle: '<iframe> elements must have a unique title property.',
      emptyTitle: '<iframe> elements must have a unique title property.',
      dynamicFalseTitle: '<iframe> elements must have a unique title property.',
      duplicateTitleFirst: 'This title is not unique. #{{index}}',
      duplicateTitleOther:
        '<iframe> elements must have a unique title property. Value title="{{title}}" already used for different iframe. #{{index}}',
    },
    originallyFrom: {
      name: 'ember-template-lint',
      rule: 'lib/rules/require-iframe-title.js',
      docs: 'docs/rule/require-iframe-title.md',
      tests: 'test/unit/rules/require-iframe-title-test.js',
    },
  },
  create(context) {
    // Each entry: { value, node, index }
    //  - value: trimmed title string
    //  - node: original element node for the first occurrence
    //  - index: duplicate-group index (1-based), assigned lazily on collision
    const knownTitles = [];
    let nextDuplicateIndex = 1;

    return {
      GlimmerElementNode(node) {
        if (node.tag !== 'iframe') {
          return;
        }

        // Skip if aria-hidden or hidden
        const hasAriaHidden = node.attributes?.some((a) => a.name === 'aria-hidden');
        const hasHidden = node.attributes?.some((a) => a.name === 'hidden');
        if (hasAriaHidden || hasHidden) {
          return;
        }

        // Check for title attribute
        const titleAttr = node.attributes?.find((a) => a.name === 'title');
        if (!titleAttr) {
          context.report({ node, messageId: 'missingTitle' });
          return;
        }

        if (titleAttr.value) {
          switch (titleAttr.value.type) {
            case 'GlimmerTextNode': {
              const value = titleAttr.value.chars.trim();
              if (value.length === 0) {
                context.report({ node, messageId: 'emptyTitle' });
              } else {
                // Check for duplicate titles. Reports BOTH the first and the
                // current occurrence on every collision, sharing a `#N` index
                // so users can correlate them. For three or more duplicates
                // the first occurrence is therefore re-reported once per
                // collision.
                const existing = knownTitles.find((entry) => entry.value === value);
                if (existing) {
                  if (existing.index === null) {
                    existing.index = nextDuplicateIndex++;
                  }
                  const index = existing.index;

                  // Report on the first occurrence on every collision.
                  context.report({
                    node: existing.node,
                    messageId: 'duplicateTitleFirst',
                    data: { index: String(index) },
                  });

                  // Report on the current (duplicate) occurrence.
                  context.report({
                    node,
                    messageId: 'duplicateTitleOther',
                    data: { title: titleAttr.value.chars, index: String(index) },
                  });
                } else {
                  knownTitles.push({ value, node, index: null });
                }
              }
              break;
            }
            case 'GlimmerMustacheStatement': {
              // title={{false}} / title={{null}} / title={{undefined}} / title={{42}}
              // — any literal that doesn't produce a meaningful accessible name.
              if (isInvalidTitleLiteral(titleAttr.value.path)) {
                context.report({ node, messageId: 'dynamicFalseTitle' });
              }
              break;
            }
            case 'GlimmerConcatStatement': {
              // title="{{false}}" / "{{undefined}}" / etc. — ConcatStatement
              // with a single literal part that doesn't produce a name.
              const parts = titleAttr.value.parts || [];
              if (
                parts.length === 1 &&
                parts[0].type === 'GlimmerMustacheStatement' &&
                isInvalidTitleLiteral(parts[0].path)
              ) {
                context.report({ node, messageId: 'dynamicFalseTitle' });
              }
              break;
            }
            default: {
              break;
            }
          }
        }
      },
    };
  },
};
