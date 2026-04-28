'use strict';

const { dom, roles } = require('aria-query');

// Interactive ARIA roles — non-abstract roles that descend from `widget`, plus
// `toolbar` (per jsx-a11y's convention: toolbar behaves as a widget even
// though it is modelled as `structure` in the ARIA taxonomy).
const INTERACTIVE_ROLES = buildInteractiveRoleSet();

function buildInteractiveRoleSet() {
  const result = new Set();
  for (const [role, def] of roles) {
    if (def.abstract) {
      continue;
    }
    const descendsFromWidget = (def.superClass || []).some((chain) => chain.includes('widget'));
    if (descendsFromWidget) {
      result.add(role);
    }
  }
  result.add('toolbar');
  return result;
}

// Tags whose *default* semantics expose focus. `a`/`area` also need `href`,
// and `audio`/`video` need `controls`; these are handled as special cases.
const ALWAYS_FOCUSABLE_TAGS = new Set([
  'button',
  'select',
  'textarea',
  'summary',
  'iframe',
  'object',
  'embed',
]);

function findAttr(node, name) {
  // HTML attribute names are case-insensitive. Normalize both sides so that
  // `TABINDEX` / `Role` etc. match the same lookup as lowercase.
  const target = name.toLowerCase();
  return node.attributes?.find((a) => a.name?.toLowerCase() === target);
}

function getTextAttrValue(attr) {
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

// PascalCase (`Foo`), argument-invocation (`@foo`), path on `this.`, dotted
// path (`foo.bar`), or named-block-style (`foo::bar`). Mirrors the pattern
// used across other template-* rules until a shared utility lands.
function isComponentInvocation(tag) {
  if (!tag) {
    return false;
  }
  return (
    /^[A-Z]/.test(tag) ||
    tag.startsWith('@') ||
    tag.startsWith('this.') ||
    tag.includes('.') ||
    tag.includes('::')
  );
}

// Form controls that accept a `disabled` attribute. Per HTML spec a disabled
// form control is not keyboard-focusable, so `disabled` suppresses the
// inherent-focusability we'd otherwise grant the tag.
const DISABLABLE_FORM_CONTROLS = new Set(['button', 'input', 'select', 'textarea', 'fieldset']);

// True when the UA ignores otherwise-focusing attributes (`tabindex`,
// `contenteditable`) on this element because the element is itself removed
// from sequential focus navigation by HTML semantics:
//   - disabled form controls (HTML §4.10.18.5)
//   - <input type="hidden"> (no rendered element)
function isSuppressedFromFocus(node, tag, getTextAttrValueFn) {
  if (DISABLABLE_FORM_CONTROLS.has(tag) && findAttr(node, 'disabled')) {
    return true;
  }
  if (tag === 'input') {
    const type = getTextAttrValueFn(findAttr(node, 'type'));
    if (typeof type === 'string' && type.trim().toLowerCase() === 'hidden') {
      return true;
    }
  }
  return false;
}

// Is the element inherently focusable without needing tabindex?
function isInherentlyFocusable(node) {
  const tag = node.tag?.toLowerCase();

  // Disabled form controls are not keyboard-focusable per HTML spec.
  if (DISABLABLE_FORM_CONTROLS.has(tag) && findAttr(node, 'disabled')) {
    return false;
  }

  if (ALWAYS_FOCUSABLE_TAGS.has(tag)) {
    return true;
  }

  if (tag === 'input') {
    const type = getTextAttrValue(findAttr(node, 'type'));
    // type="hidden" has no focus affordance; everything else is focusable.
    // HTML type values are ASCII case-insensitive and may carry incidental
    // whitespace; normalize before comparison.
    return type === undefined || type === null || type.trim().toLowerCase() !== 'hidden';
  }

  if ((tag === 'a' || tag === 'area') && findAttr(node, 'href')) {
    return true;
  }

  if ((tag === 'audio' || tag === 'video') && findAttr(node, 'controls')) {
    return true;
  }

  return false;
}

// Does the element have a `contenteditable` attribute that is truthy?
// Bare attribute (no value) and anything other than explicit "false" counts
// as truthy, matching HTML semantics.
function isContentEditable(node) {
  const attr = findAttr(node, 'contenteditable');
  if (!attr) {
    return false;
  }
  // Valueless attribute: parser models this as no `value` or a null value.
  if (attr.value === null || attr.value === undefined) {
    return true;
  }
  // Dynamic value (mustache/concat) — treat as truthy; we cannot prove otherwise.
  if (attr.value.type !== 'GlimmerTextNode') {
    return true;
  }
  return attr.value.chars.trim().toLowerCase() !== 'false';
}

// Return the first RECOGNISED role token that's interactive — or null if no
// recognised interactive role appears in the list. Per WAI-ARIA §4.1, space-
// separated role tokens are a fallback list: UAs walk the list for the first
// role they implement, skipping unknown tokens. So `role="xxyxyz button"`
// resolves to `button`; the rule should treat that as interactive even
// though the author put an unknown token first. Dynamic role values return
// `{ dynamic: true }` so the caller can conservatively skip.
function getInteractiveRole(node) {
  const attr = findAttr(node, 'role');
  if (!attr) {
    return { role: null };
  }
  if (attr.value?.type !== 'GlimmerTextNode') {
    return { dynamic: true };
  }
  const tokens = attr.value.chars.trim().toLowerCase().split(/\s+/u);
  for (const token of tokens) {
    if (!roles.has(token)) {
      continue; // unknown token — UAs skip per §4.1 fallback semantics
    }
    if (INTERACTIVE_ROLES.has(token)) {
      return { role: token };
    }
    // First recognised role is non-interactive — subsequent tokens are just
    // graceful-degradation fallbacks for this non-interactive intent.
    return { role: null };
  }
  return { role: null };
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require elements with an interactive ARIA role to be focusable',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-interactive-supports-focus.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      focusable:
        'Element <{{tag}}> has interactive role "{{role}}" but is not focusable — add a `tabindex` or use an inherently focusable element.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        const tag = node.tag?.toLowerCase();
        if (!tag) {
          return;
        }

        // Skip component invocations — they may render anything.
        if (isComponentInvocation(node.tag)) {
          return;
        }

        // Skip unknown / custom elements (not in aria-query's DOM map).
        if (!dom.has(tag)) {
          return;
        }

        const { role, dynamic } = getInteractiveRole(node);
        if (dynamic) {
          return;
        }
        if (!role) {
          return;
        }

        // Already focusable by default?
        if (isInherentlyFocusable(node)) {
          return;
        }

        // Any tabindex — static or dynamic — satisfies the focus requirement,
        // EXCEPT on elements that HTML removes from the tab order regardless:
        //   - disabled form controls (HTML §4.10.18.5) — the disabled state
        //     removes the element from sequential focus navigation.
        //   - <input type="hidden"> — not visible, not focusable.
        // tabindex on these is ignored by the UA; the a11y conflict the rule
        // targets still exists.
        // HTML attribute names are case-insensitive, so accept `tabindex` or
        // any other casing (e.g. `tabIndex`, the React-style camelCase).
        const hasTabindex = node.attributes?.some((a) => a.name?.toLowerCase() === 'tabindex');
        if (hasTabindex && !isSuppressedFromFocus(node, tag, getTextAttrValue)) {
          return;
        }

        // contenteditable also makes an element focusable, with the same
        // HTML-spec carve-outs as tabindex: the UA ignores it on disabled
        // form controls (HTML §4.10.18.5) and on <input type="hidden">
        // (no rendered element to edit), so the a11y conflict still stands.
        if (isContentEditable(node) && !isSuppressedFromFocus(node, tag, getTextAttrValue)) {
          return;
        }

        context.report({
          node,
          messageId: 'focusable',
          data: { tag: node.tag, role },
        });
      },
    };
  },
};
