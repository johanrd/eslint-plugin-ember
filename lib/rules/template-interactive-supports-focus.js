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
  return node.attributes?.find((a) => a.name === name);
}

function getTextAttrValue(attr) {
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

// PascalCase (`Foo`), argument-invocation (`@foo`), path on `this.`, dotted
// path (`foo.bar`), or named-block-style (`foo::bar`). Mirrors the pattern
// used across other template-* rules (see template-no-invalid-interactive.js
// and template-anchor-has-content.js) until a shared utility lands.
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

// Is the element inherently focusable without needing tabindex?
function isInherentlyFocusable(node) {
  const tag = node.tag?.toLowerCase();

  if (ALWAYS_FOCUSABLE_TAGS.has(tag)) {
    return true;
  }

  if (tag === 'input') {
    const type = getTextAttrValue(findAttr(node, 'type'));
    // type="hidden" has no focus affordance; everything else is focusable.
    return type !== 'hidden';
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
  return attr.value.chars.toLowerCase() !== 'false';
}

// Return the static role token if one matches an interactive role. Dynamic
// role values return `{ dynamic: true }` so the caller can conservatively skip.
function getInteractiveRole(node) {
  const attr = findAttr(node, 'role');
  if (!attr) {
    return { role: null };
  }
  if (attr.value?.type !== 'GlimmerTextNode') {
    return { dynamic: true };
  }
  const tokens = attr.value.chars.trim().toLowerCase().split(/\s+/u);
  const match = tokens.find((t) => INTERACTIVE_ROLES.has(t));
  return { role: match || null };
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

        // Any tabindex — static or dynamic — satisfies the focus requirement.
        if (findAttr(node, 'tabindex')) {
          return;
        }

        // contenteditable also makes an element focusable.
        if (isContentEditable(node)) {
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
