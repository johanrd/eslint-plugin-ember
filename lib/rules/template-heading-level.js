// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// Scope caveat: this rule sees ONE template file at a time. Ember apps
// compose pages from many templates; the true heading outline spans
// route/component boundaries we can't cross. So this rule validates only
// the heading order *within* this file and cannot catch cross-file jumps
// (e.g. a route template starts at <h2> because its layout supplies <h1>).
// To support layout-provided <h1>, set `minInitialRank` to a lower rank.

const { roles: ariaRoles } = require('aria-query');

const HEADING_RE = /^h([1-6])$/;

// Valid ARIA role tokens — used to find the first recognised token in a
// space-separated role-fallback list (WAI-ARIA §4.1). `presentation`/`none`
// are included in aria-query's role map.
const VALID_ROLE_TOKENS = new Set(ariaRoles.keys());

function extractLevel(tag) {
  const match = HEADING_RE.exec(tag);
  return match ? Number.parseInt(match[1], 10) : null;
}

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

function isSectioningRoot(node) {
  if (node.tag === 'dialog') {
    return true;
  }
  const role = getStaticAttrString(node, 'role');
  if (!role) {
    return false;
  }
  // ARIA role values are case-insensitive per HTML spec, and the attribute
  // holds a space-separated token list (role-fallback). Per WAI-ARIA §4.1,
  // the effective role is the first token recognised by the user agent; any
  // invalid-token prefix is skipped. Walk tokens in order and return true
  // only when the first recognised token is dialog/alertdialog.
  const tokens = role.trim().toLowerCase().split(/\s+/u);
  const firstValid = tokens.find((token) => VALID_ROLE_TOKENS.has(token));
  return firstValid === 'dialog' || firstValid === 'alertdialog';
}

function parseMinInitialRank(value) {
  if (value === 'any' || value === false || value === undefined) {
    return 6;
  }
  const match = /^h([1-6])$/.exec(value);
  return match ? Number.parseInt(match[1], 10) : 1;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce heading hierarchy within a template',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-heading-level.md',
      templateMode: 'both',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowMultipleH1: { type: 'boolean' },
          allowSkippedLevels: { type: 'boolean' },
          minInitialRank: { enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'any'] },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      multipleH1: 'Multiple `<h1>` are not allowed',
      skipped:
        'Heading level can only increase by one: expected `<h{{expected}}>` but got `<h{{actual}}>`',
      initial:
        'Initial heading level must be `<h{{expected}}>` or higher rank but got `<h{{actual}}>`',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    // Only the multiple-h1 check is reliable within a single template file —
    // finding two <h1> in one file is a within-file signal regardless of
    // what ancestors render. The other two checks (initial rank, skipped
    // levels) defeat themselves in a component-based app: layouts and child
    // components supply headings the lint can't see. So both default to off.
    const allowMultipleH1 = Boolean(options.allowMultipleH1);
    const allowSkippedLevels =
      options.allowSkippedLevels === undefined ? true : Boolean(options.allowSkippedLevels);
    const minInitialRank = parseMinInitialRank(options.minInitialRank || 'any');

    const stack = [{ node: null, current: 0, h1Count: 0 }];

    function currentRoot() {
      return stack.at(-1);
    }

    return {
      GlimmerElementNode(node) {
        const level = extractLevel(node.tag);
        if (level !== null) {
          const root = currentRoot();
          if (level === 1 && !allowMultipleH1) {
            if (root.h1Count >= 1) {
              context.report({ node, messageId: 'multipleH1' });
            } else {
              root.h1Count += 1;
            }
          }
          if (level <= root.current) {
            root.current = level;
          } else {
            const expected = root.current + 1;
            if (root.current === 0) {
              if (level > minInitialRank) {
                context.report({
                  node,
                  messageId: 'initial',
                  data: { expected: String(minInitialRank), actual: String(level) },
                });
              }
            } else if (level !== expected && !allowSkippedLevels) {
              context.report({
                node,
                messageId: 'skipped',
                data: { expected: String(expected), actual: String(level) },
              });
            }
            root.current = level;
          }
        }

        if (isSectioningRoot(node)) {
          stack.push({ node, current: 0, h1Count: 0 });
        }
      },

      'GlimmerElementNode:exit'(node) {
        const root = currentRoot();
        if (root.node === node) {
          stack.pop();
        }
      },
    };
  },
};
