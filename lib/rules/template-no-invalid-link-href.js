const { getStaticAttrValue } = require('../utils/static-attr-value');

// Matches the `javascript:` protocol when it is the actual URL scheme.
// HTML's URL parser trims leading/trailing ASCII whitespace from hrefs before
// parsing (WHATWG URL §3.1 "basic URL parser"), so `" javascript:void(0)"`
// resolves to the javascript: scheme. Any other leading characters (`./`,
// `#`, etc.) mean the value is a relative URL or fragment, not a javascript:
// URL, and must not match.
const JS_PROTOCOL_REGEX = /^\s*javascript:/iu;

function isInvalidHrefValue(value) {
  if (value === undefined || value === null) {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return true;
  }
  // Anchor pointing to nothing navigable — "#" or "#!" are common "no-op"
  // placeholders that break screen-reader navigation semantics.
  if (trimmed === '#' || trimmed === '#!') {
    return true;
  }
  if (JS_PROTOCOL_REGEX.test(trimmed)) {
    return true;
  }
  return false;
}

function getStaticHrefValue(attr) {
  // Uses the shared `getStaticAttrValue` helper so mustache-literal hrefs
  // (`{{"#"}}`, `{{"javascript:void(0)"}}`) and single-part concat
  // equivalents are validated the same as their text-node counterparts.
  // Returns `undefined` for dynamic values (PathExpressions, concat with a
  // dynamic part) so the rule can skip them.
  return getStaticAttrValue(attr?.value);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow invalid href values on anchor elements',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-invalid-link-href.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      invalidHref:
        'The href attribute requires a valid, navigable URL. Values like "#", "javascript:...", or an empty string break link semantics — use a native non-link element (e.g. <button> for <a>) when the element does not navigate.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        // Both <a href> and <area href> carry URL semantics per HTML §4.5.1
        // / §4.8.14. Same validity rules apply — empty/`#`/`javascript:`
        // href values are equally invalid on either.
        if (node.tag !== 'a' && node.tag !== 'area') {
          return;
        }

        const hrefAttr = node.attributes?.find((a) => a.name === 'href');
        if (!hrefAttr) {
          // Missing href — handled by template-link-href-attributes, not this rule.
          return;
        }

        const value = getStaticHrefValue(hrefAttr);
        if (value === undefined) {
          // Dynamic value — can't validate statically.
          return;
        }

        if (isInvalidHrefValue(value)) {
          context.report({ node: hrefAttr, messageId: 'invalidHref' });
        }
      },
    };
  },
};
