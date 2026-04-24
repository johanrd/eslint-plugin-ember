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
  const value = attr?.value;
  if (!value) {
    // Valueless attribute (e.g., `<a href>`).
    return '';
  }
  if (value.type === 'GlimmerTextNode') {
    return value.chars;
  }
  // ConcatStatement with only text parts = known static string.
  if (value.type === 'GlimmerConcatStatement') {
    const parts = value.parts || [];
    if (parts.every((p) => p.type === 'GlimmerTextNode')) {
      return parts.map((p) => p.chars).join('');
    }
  }
  // Mustache or dynamic — can't statically determine; skip.
  return undefined;
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
        'The href attribute requires a valid, navigable URL. Values like "#", "javascript:...", or an empty string break link semantics — use a <button> for clickable elements that do not navigate.',
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
