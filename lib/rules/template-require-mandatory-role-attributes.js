const { roles } = require('aria-query');

function createRequiredAttributeErrorMessage(attrs, role) {
  if (attrs.length < 2) {
    return `The attribute ${attrs[0]} is required by the role ${role}`;
  }

  return `The attributes ${attrs.join(', ')} are required by the role ${role}`;
}

// ARIA role values are whitespace-separated tokens compared ASCII-case-insensitively.
// Returns the list of normalised tokens, or undefined when the attribute is
// missing or dynamic.
function getStaticRolesFromElement(node) {
  const roleAttr = node.attributes?.find((attr) => attr.name === 'role');

  if (roleAttr?.value?.type === 'GlimmerTextNode') {
    return splitRoleTokens(roleAttr.value.chars);
  }

  return undefined;
}

function getStaticRolesFromMustache(node) {
  const rolePair = node.hash?.pairs?.find((pair) => pair.key === 'role');

  if (rolePair?.value?.type === 'GlimmerStringLiteral') {
    return splitRoleTokens(rolePair.value.value);
  }

  return undefined;
}

function splitRoleTokens(value) {
  if (!value) {
    return undefined;
  }
  const tokens = value.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return tokens.length > 0 ? tokens : undefined;
}

// For an ARIA role-fallback list like "combobox listbox", check required
// attributes against the FIRST recognised role (the primary) per ARIA 1.2
// role-fallback semantics — a user agent picks the first role it recognises.
// Diverges from jsx-a11y, which validates every recognised token.
function getMissingRequiredAttributes(roleTokens, foundAriaAttributes) {
  for (const role of roleTokens) {
    const roleDefinition = roles.get(role);
    if (!roleDefinition) {
      continue;
    }
    const requiredAttributes = Object.keys(roleDefinition.requiredProps);
    const missingRequiredAttributes = requiredAttributes.filter(
      (requiredAttribute) => !foundAriaAttributes.includes(requiredAttribute)
    );
    return {
      role,
      missing: missingRequiredAttributes.length > 0 ? missingRequiredAttributes : null,
    };
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require mandatory ARIA attributes for ARIA roles',
      category: 'Accessibility',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-require-mandatory-role-attributes.md',
      templateMode: 'both',
    },
    fixable: null,
    schema: [],
    messages: {
      missingAttributes:
        'The {{attributeWord}} {{attributes}} {{verb}} required by the role {{role}}',
    },
    originallyFrom: {
      name: 'ember-template-lint',
      rule: 'lib/rules/require-mandatory-role-attributes.js',
      docs: 'docs/rule/require-mandatory-role-attributes.md',
      tests: 'test/unit/rules/require-mandatory-role-attributes-test.js',
    },
  },

  create(context) {
    function reportMissingAttributes(node, role, missingRequiredAttributes) {
      context.report({
        node,
        messageId: 'missingAttributes',
        data: {
          attributeWord: missingRequiredAttributes.length < 2 ? 'attribute' : 'attributes',
          attributes: missingRequiredAttributes.join(', '),
          verb: missingRequiredAttributes.length < 2 ? 'is' : 'are',
          role,
        },
      });
    }

    return {
      GlimmerElementNode(node) {
        const roleTokens = getStaticRolesFromElement(node);

        if (!roleTokens) {
          return;
        }

        const foundAriaAttributes = (node.attributes ?? [])
          .filter((attribute) => attribute.name?.startsWith('aria-'))
          .map((attribute) => attribute.name);

        const result = getMissingRequiredAttributes(roleTokens, foundAriaAttributes);

        if (result?.missing) {
          reportMissingAttributes(node, result.role, result.missing);
        }
      },

      GlimmerMustacheStatement(node) {
        const roleTokens = getStaticRolesFromMustache(node);

        if (!roleTokens) {
          return;
        }

        const foundAriaAttributes = (node.hash?.pairs ?? [])
          .filter((pair) => pair.key.startsWith('aria-'))
          .map((pair) => pair.key);

        const result = getMissingRequiredAttributes(roleTokens, foundAriaAttributes);

        if (result?.missing) {
          reportMissingAttributes(node, result.role, result.missing);
        }
      },
    };
  },
};
