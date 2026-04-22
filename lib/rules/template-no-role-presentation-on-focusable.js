// Per WAI-ARIA 1.2 §4.6 Conflict Resolution, role="presentation" / role="none"
// does NOT cascade to descendants — each descendant retains its own role and
// semantics. So `<div role="presentation"><button>X</button></div>` is NOT a
// semantic problem: the div's role is a no-op (div had no meaningful role to
// suppress), and the button remains fully interactive with its role intact.
//
// Therefore, unlike our template-no-aria-hidden-on-focusable rule (which recurses
// into descendants because aria-hidden DOES cascade and creates a keyboard trap
// landing on AT-hidden content), this rule only checks the element carrying the
// presentation role.
//
// Deliberately diverges from vue-a11y's no-role-presentation-on-focusable, which
// recurses into descendants. Vue's recursion is uncommented in their source and
// appears to be a copy-paste from their aria-hidden rule.

'use strict';

const { isComponentInvocation } = require('../utils/is-component-invocation');
const { isHtmlInteractiveContent } = require('../utils/html-interactive-content');

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function getTextAttrValue(node, name) {
  const attr = findAttr(node, name);
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

function hasPresentationRole(node) {
  const attr = findAttr(node, 'role');
  if (!attr || attr.value?.type !== 'GlimmerTextNode') {
    return false;
  }
  return attr.value.chars
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .some((t) => t === 'presentation' || t === 'none');
}

function isFocusable(node) {
  // tabindex makes any element focusable (including tabindex="-1" — still
  // programmatically focusable; see audit notes for the divergence from
  // vue-a11y's treatment of tabindex="-1").
  if (findAttr(node, 'tabindex')) {
    return true;
  }
  // <area href> is focusable (part of an image map's sequential focus order
  // per HTML §6.6.3) but is not HTML §3.2.5.2.7 interactive content, so the
  // shared util doesn't classify it. Rule-level special case.
  if (typeof node.tag === 'string' && node.tag.toLowerCase() === 'area') {
    return Boolean(findAttr(node, 'href'));
  }
  return isHtmlInteractiveContent(node, getTextAttrValue);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow role="presentation" / role="none" on focusable elements',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-role-presentation-on-focusable.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      invalidPresentation:
        'role="presentation"/"none" must not be used on focusable elements — stripping semantics from a focusable element leaves it announced as text while keyboard users can still focus it.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (isComponentInvocation(node)) {
          return;
        }
        if (!hasPresentationRole(node)) {
          return;
        }
        if (isFocusable(node)) {
          context.report({ node, messageId: 'invalidPresentation' });
        }
      },
    };
  },
};
