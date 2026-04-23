const { roles, elementRoles } = require('aria-query');
const { AXObjects, elementAXObjects } = require('axobject-query');
const { INTERACTIVE_ROLES } = require('../utils/interactive-roles');
const { isComponentInvocation } = require('../utils/is-component-invocation');

// Interactive-element derivation. Mirrors jsx-a11y's layered approach:
//   1. Primary signal — aria-query's `elementRoles`: an element is inherently
//      interactive if one of its mapped roles is in INTERACTIVE_ROLES AND the
//      schema's attribute constraints match the node. (Handles <button>, <a
//      href>, <input type=…>, <select multiple>, <td>, <th scope=…>, <tr>,
//      <textarea>, <datalist>, <option>.)
//   2. AX-tree fallback — axobject-query's `elementAXObjects`: consulted only
//      for tag names that have NO interactive `elementRoles` entry. These are
//      elements whose AXObject is a widget but aria-query lists no inherent
//      ARIA role (e.g. <summary>, <menuitem>, <embed>).
//
// Why we do NOT use the shared `isHtmlInteractiveContent` util here:
//   Keep the rule's layered aria-query + axobject-query derivation — this
//   rule's scope is different. We care about tags that have INHERENT
//   interactive semantics per HTML-AAM / the ARIA widget role mappings (so
//   that applying a non-interactive role is a demotion of AT semantics).
//   `isHtmlInteractiveContent` answers a different question — "does HTML's
//   content model forbid nesting this inside an interactive parent?" — and
//   diverges on e.g. <label> (HTML-interactive, ARIA structure),
//   <option>/<datalist> (not HTML-interactive, but ARIA widgets), and
//   <canvas> (not HTML-interactive, AX widget).
//
// Deviations from jsx-a11y, driven by real-world false-positive patterns:
//   - `<canvas>` is NOT treated as inherently interactive. Its AXObject is
//     `CanvasRole` (widget), but per aria-query `<canvas>` has no inherent
//     ARIA role — authors commonly set `role="img"` or `role="presentation"`
//     as the accessibility surface, and that is legitimate.
//   - `<audio>` and `<video>` are only treated as interactive when the
//     `controls` attribute is present. Without `controls` they render no
//     user-operable UI (background / decorative media is a common real
//     pattern). axobject-query does not encode this constraint; we add it
//     here explicitly.

const interactiveRoleSet = INTERACTIVE_ROLES;

const elementRoleEntries = [...elementRoles];

// Schemas (element name + attribute constraints) whose role list contains at
// least one interactive role.
const interactiveElementRoleSchemas = elementRoleEntries
  .filter(([, rolesArr]) => [...rolesArr].some((r) => interactiveRoleSet.has(r)))
  .map(([schema]) => schema);

const tagsWithInteractiveElementRoleEntry = new Set(
  interactiveElementRoleSchemas.map((schema) => schema.name)
);

// AX-fallback tag set — tags whose AXObject list is entirely widget AND which
// have no interactive `elementRoles` entry. Excludes `canvas` per rationale
// above.
const EXCLUDED_AX_FALLBACK_TAGS = new Set(['canvas']);

// Tags where we require explicit attribute constraints before treating as
// interactive — overrides the unconstrained AX fallback.
const CONTROLS_GATED_TAGS = new Set(['audio', 'video']);

const interactiveAXObjects = new Set(
  [...AXObjects.keys()].filter((name) => AXObjects.get(name).type === 'widget')
);

const AX_FALLBACK_TAGS = (() => {
  const result = new Set();
  for (const [schema, axArr] of elementAXObjects) {
    if (schema.attributes && schema.attributes.length > 0) {
      continue;
    }
    const name = schema.name;
    if (tagsWithInteractiveElementRoleEntry.has(name)) {
      continue;
    }
    if (EXCLUDED_AX_FALLBACK_TAGS.has(name)) {
      continue;
    }
    if (CONTROLS_GATED_TAGS.has(name)) {
      continue; // handled via explicit controls check
    }
    if ([...axArr].every((o) => interactiveAXObjects.has(o))) {
      result.add(name);
    }
  }
  return result;
})();

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function hasAttr(node, name) {
  return Boolean(findAttr(node, name));
}

function getTextAttrValue(attr) {
  if (attr?.value?.type === 'GlimmerTextNode') {
    return attr.value.chars;
  }
  return undefined;
}

// Verify a single aria-query attribute-constraint entry matches the node.
function attrConstraintMatches(baseAttr, node) {
  const attr = findAttr(node, baseAttr.name);
  const constraints = baseAttr.constraints || [];

  if (constraints.includes('set')) {
    return Boolean(attr);
  }
  if (constraints.includes('undefined')) {
    if (!attr) {
      return true;
    }
    // For boolean-present attributes (no value) we treat the presence as "set".
    // Otherwise check value against any literal value constraint below.
  }

  if (baseAttr.value !== undefined) {
    const value = getTextAttrValue(attr);
    if (value === undefined) {
      return false;
    }
    // HTML attribute values for known enumerated attributes (type, autocomplete,
    // contenteditable, …) are ASCII case-insensitive per the HTML spec, and
    // may carry incidental whitespace. Normalize both sides so `type="TEXT"`
    // and `type=" text "` match aria-query's `"text"` constraint. Aligns with
    // the `type === 'hidden'` guard below that does the same normalization.
    return value.trim().toLowerCase() === String(baseAttr.value).toLowerCase();
  }

  // Attribute named without a value or constraint — match means present.
  return Boolean(attr);
}

function attributesMatchSchema(schema, node) {
  const baseAttrs = schema.attributes || [];
  if (baseAttrs.length === 0) {
    return true;
  }
  return baseAttrs.every((baseAttr) => attrConstraintMatches(baseAttr, node));
}

function isInteractiveElement(node) {
  const tag = node.tag?.toLowerCase();
  if (!tag) {
    return false;
  }

  // Tag not in DOM per aria-query — treat as component (conservatively skip).
  // aria-query's `dom` map covers HTML element names; unknown tag = not ours.
  // (We don't import `dom` separately — `elementRoles` / AX maps cover the
  // element-name surface for the rule's purpose, and unknown tags simply fail
  // every schema match below.)

  // Primary signal: elementRoles with at least one interactive role + schema
  // constraints match the node's attributes.
  for (const schema of interactiveElementRoleSchemas) {
    if (schema.name !== tag) {
      continue;
    }
    if (!attributesMatchSchema(schema, node)) {
      continue;
    }
    // Special case: <input type="hidden"> is never user-facing. aria-query's
    // textbox entry would not match (it requires type=text/email/url/…), so
    // normally we'd be fine — but keep the explicit guard for clarity.
    if (tag === 'input') {
      const type = getTextAttrValue(findAttr(node, 'type'));
      // HTML type values are ASCII case-insensitive and may carry incidental
      // whitespace; normalize before comparison (matches the same guard in
      // sibling rules like template-interactive-supports-focus).
      if (typeof type === 'string' && type.trim().toLowerCase() === 'hidden') {
        return false;
      }
    }
    return true;
  }

  // AX-tree fallback for tags with no interactive elementRoles entry.
  if (AX_FALLBACK_TAGS.has(tag)) {
    return true;
  }

  // Controls-gated fallback for <audio>/<video>: only interactive when the
  // `controls` attribute is present (matches user-facing-widget reality).
  if (CONTROLS_GATED_TAGS.has(tag) && hasAttr(node, 'controls')) {
    return true;
  }

  return false;
}

function getRoleTokens(node) {
  const attr = findAttr(node, 'role');
  if (!attr || attr.value?.type !== 'GlimmerTextNode') {
    return undefined;
  }
  const chars = attr.value.chars.trim();
  if (!chars) {
    return undefined;
  }
  return chars.toLowerCase().split(/\s+/u);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow native interactive elements being assigned non-interactive ARIA roles',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-interactive-element-to-noninteractive-role.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      mismatch:
        'Interactive element <{{tag}}> should not have a non-interactive role "{{role}}". Native interactive semantics are lost.',
    },
  },

  create(context) {
    return {
      GlimmerElementNode(node) {
        // Skip component invocations — the rule targets native HTML elements.
        if (isComponentInvocation(node)) {
          return;
        }

        if (!isInteractiveElement(node)) {
          return;
        }

        const tokens = getRoleTokens(node);
        if (!tokens) {
          return;
        }

        // Pick the first token that's a known role (matching ARIA 1.2 §5.3
        // role-fallback behavior — UAs use the first recognised role).
        for (const token of tokens) {
          if (token === 'presentation' || token === 'none') {
            context.report({ node, messageId: 'mismatch', data: { tag: node.tag, role: token } });
            return;
          }
          const def = roles.get(token);
          if (!def || def.abstract) {
            continue;
          }
          if (!INTERACTIVE_ROLES.has(token)) {
            context.report({ node, messageId: 'mismatch', data: { tag: node.tag, role: token } });
          }
          return;
        }
      },
    };
  },
};
