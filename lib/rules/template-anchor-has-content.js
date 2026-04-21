// Matches a tag string that is a component invocation rather than a plain
// HTML element: PascalCase (`Foo`), argument-invocation (`@foo`), path on
// `this.` (`this.foo`), dotted path (`foo.bar`), or named-block-style
// `foo::bar`. Keep this mirrored with the inline pattern in
// lib/rules/template-no-invalid-interactive.js until a shared utility lands.
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

function isDynamicValue(value) {
  return value?.type === 'GlimmerMustacheStatement' || value?.type === 'GlimmerConcatStatement';
}

// Returns true if the `aria-hidden` attribute is explicitly set to "true"
// (case-insensitive) or mustache-literal `{{true}}`. Per WAI-ARIA 1.2 §6.6
// + aria-hidden value table, valueless / empty-string `aria-hidden` resolves
// to the default `undefined` — NOT `true` — so those forms do NOT hide the
// element per spec. This aligns with the spec-first decisions in #2717 /
// #19 / #33, and diverges from jsx-a11y's JSX-coercion convention.
function isAriaHiddenTrue(attr) {
  if (!attr?.value) {
    return false;
  }
  if (attr.value.type === 'GlimmerTextNode') {
    return attr.value.chars.trim().toLowerCase() === 'true';
  }
  if (attr.value.type === 'GlimmerMustacheStatement') {
    const path = attr.value.path;
    if (path?.type === 'GlimmerBooleanLiteral') {
      return path.value === true;
    }
    if (path?.type === 'GlimmerStringLiteral') {
      return path.value.trim().toLowerCase() === 'true';
    }
  }
  return false;
}

// True if the anchor itself declares an accessible name via a statically
// non-empty `aria-label`, `aria-labelledby`, or `title`, OR via a dynamic
// value (we can't know at lint time whether a mustache resolves to an empty
// string, so we give the author the benefit of the doubt — matching the
// "skip dynamic" posture used by `template-no-invalid-link-text`).
function hasAccessibleNameAttribute(node) {
  const attrs = node.attributes || [];
  for (const name of ['aria-label', 'aria-labelledby', 'title']) {
    const attr = attrs.find((a) => a.name === name);
    if (!attr) {
      continue;
    }
    if (isDynamicValue(attr.value)) {
      return true;
    }
    if (attr.value?.type === 'GlimmerTextNode' && attr.value.chars.trim().length > 0) {
      return true;
    }
  }
  return false;
}

// Recursively inspect a single child node and report how it would contribute
// to the anchor's accessible name.
//   { dynamic: true }       — opaque at lint time; treat anchor as labeled.
//   { accessible: true }    — statically contributes a non-empty name.
//   { accessible: false }   — contributes nothing (empty text, aria-hidden
//                             subtree, <img> without non-empty alt, …).
function evaluateChild(child) {
  if (child.type === 'GlimmerTextNode') {
    const text = child.chars.replaceAll('&nbsp;', ' ').trim();
    return { dynamic: false, accessible: text.length > 0 };
  }

  if (
    child.type === 'GlimmerMustacheStatement' ||
    child.type === 'GlimmerSubExpression' ||
    child.type === 'GlimmerBlockStatement'
  ) {
    // Dynamic content — can't statically tell whether it renders to something.
    // Mirror `template-no-invalid-link-text`'s stance and skip.
    return { dynamic: true, accessible: false };
  }

  if (child.type === 'GlimmerElementNode') {
    const attrs = child.attributes || [];
    const ariaHidden = attrs.find((a) => a.name === 'aria-hidden');
    if (isAriaHiddenTrue(ariaHidden)) {
      // aria-hidden subtrees contribute nothing, regardless of content.
      return { dynamic: false, accessible: false };
    }

    // Component invocations are opaque — we can't see inside them.
    if (isComponentInvocation(child.tag)) {
      return { dynamic: true, accessible: false };
    }

    // An <img> child contributes its alt text to the anchor's accessible name.
    if (child.tag?.toLowerCase() === 'img') {
      const altAttr = attrs.find((a) => a.name === 'alt');
      if (!altAttr) {
        // Missing alt is a separate a11y concern; treat as no contribution.
        return { dynamic: false, accessible: false };
      }
      if (isDynamicValue(altAttr.value)) {
        return { dynamic: true, accessible: false };
      }
      if (altAttr.value?.type === 'GlimmerTextNode') {
        return { dynamic: false, accessible: altAttr.value.chars.trim().length > 0 };
      }
      return { dynamic: false, accessible: false };
    }

    // For any other HTML element child, recurse into its children AND its own
    // aria-label/aria-labelledby/title (author may label an inner <span>).
    if (hasAccessibleNameAttribute(child)) {
      return { dynamic: false, accessible: true };
    }

    return evaluateChildren(child.children || []);
  }

  return { dynamic: false, accessible: false };
}

function evaluateChildren(children) {
  let dynamic = false;
  for (const child of children) {
    const result = evaluateChild(child);
    if (result.accessible) {
      return { dynamic: false, accessible: true };
    }
    if (result.dynamic) {
      dynamic = true;
    }
  }
  return { dynamic, accessible: false };
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require anchor elements to contain accessible content',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-anchor-has-content.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      anchorHasContent:
        'Anchors must have content and the content must be accessible by a screen reader.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        if (node.tag !== 'a') {
          return;
        }

        // Only anchors acting as links (with href) are in scope. An <a> without
        // href is covered by `template-link-href-attributes` / not a link.
        const hasHref = (node.attributes || []).some((a) => a.name === 'href');
        if (!hasHref) {
          return;
        }

        if (hasAccessibleNameAttribute(node)) {
          return;
        }

        const result = evaluateChildren(node.children || []);
        if (result.accessible || result.dynamic) {
          return;
        }

        context.report({ node, messageId: 'anchorHasContent' });
      },
    };
  },
};
