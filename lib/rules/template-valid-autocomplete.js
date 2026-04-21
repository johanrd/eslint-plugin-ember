// Logic adapted from html-validate (MIT), Copyright 2017 David Sveningsson.
//
// The HTML spec for autocomplete is substantial; this port matches the
// html-validate rule's logic but reports errors on the attribute node
// rather than at per-token source locations.

const FIELD_NAMES_NO_CONTACT = new Set([
  'name',
  'honorific-prefix',
  'given-name',
  'additional-name',
  'family-name',
  'honorific-suffix',
  'nickname',
  'username',
  'new-password',
  'current-password',
  'one-time-code',
  'organization-title',
  'organization',
  'street-address',
  'address-line1',
  'address-line2',
  'address-line3',
  'address-level4',
  'address-level3',
  'address-level2',
  'address-level1',
  'country',
  'country-name',
  'postal-code',
  'cc-name',
  'cc-given-name',
  'cc-additional-name',
  'cc-family-name',
  'cc-number',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-csc',
  'cc-type',
  'transaction-currency',
  'transaction-amount',
  'language',
  'bday',
  'bday-day',
  'bday-month',
  'bday-year',
  'sex',
  'url',
  'photo',
]);

const FIELD_NAMES_WITH_CONTACT = new Set([
  'tel',
  'tel-country-code',
  'tel-national',
  'tel-area-code',
  'tel-local',
  'tel-local-prefix',
  'tel-local-suffix',
  'tel-extension',
  'email',
  'impp',
]);

const FIELD_NAME_GROUP = {
  name: 'text',
  'honorific-prefix': 'text',
  'given-name': 'text',
  'additional-name': 'text',
  'family-name': 'text',
  'honorific-suffix': 'text',
  nickname: 'text',
  username: 'username',
  'new-password': 'password',
  'current-password': 'password',
  'one-time-code': 'password',
  'organization-title': 'text',
  organization: 'text',
  'street-address': 'multiline',
  'address-line1': 'text',
  'address-line2': 'text',
  'address-line3': 'text',
  'address-level4': 'text',
  'address-level3': 'text',
  'address-level2': 'text',
  'address-level1': 'text',
  country: 'text',
  'country-name': 'text',
  'postal-code': 'text',
  'cc-name': 'text',
  'cc-given-name': 'text',
  'cc-additional-name': 'text',
  'cc-family-name': 'text',
  'cc-number': 'text',
  'cc-exp': 'month',
  'cc-exp-month': 'numeric',
  'cc-exp-year': 'numeric',
  'cc-csc': 'text',
  'cc-type': 'text',
  'transaction-currency': 'text',
  'transaction-amount': 'numeric',
  language: 'text',
  bday: 'date',
  'bday-day': 'numeric',
  'bday-month': 'numeric',
  'bday-year': 'numeric',
  sex: 'text',
  url: 'url',
  photo: 'url',
  tel: 'tel',
  'tel-country-code': 'text',
  'tel-national': 'text',
  'tel-area-code': 'text',
  'tel-local': 'text',
  'tel-local-prefix': 'text',
  'tel-local-suffix': 'text',
  'tel-extension': 'text',
  email: 'username',
  impp: 'url',
};

const ALL_GROUPS = ['text', 'multiline', 'password', 'url', 'username', 'tel', 'numeric', 'month', 'date'];

const TYPE_GROUPS = {
  hidden: ALL_GROUPS,
  text: ALL_GROUPS.filter((g) => g !== 'multiline'),
  search: ALL_GROUPS.filter((g) => g !== 'multiline'),
  password: ['password'],
  url: ['url'],
  email: ['username'],
  tel: ['tel'],
  number: ['numeric'],
  month: ['month'],
  date: ['date'],
};

const DISALLOWED_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'file',
  'submit',
  'image',
  'reset',
  'button',
]);

const EXPECTED_ORDER = ['section', 'hint', 'contact', 'field1', 'field2', 'webauthn'];
const CONTACT_TOKENS = new Set(['home', 'work', 'mobile', 'fax', 'pager']);

function classifyToken(token) {
  if (token.startsWith('section-')) {
    return 'section';
  }
  if (token === 'shipping' || token === 'billing') {
    return 'hint';
  }
  if (FIELD_NAMES_NO_CONTACT.has(token)) {
    return 'field1';
  }
  if (FIELD_NAMES_WITH_CONTACT.has(token)) {
    return 'field2';
  }
  if (CONTACT_TOKENS.has(token)) {
    return 'contact';
  }
  if (token === 'webauthn') {
    return 'webauthn';
  }
  return null;
}

function findAttr(node, name) {
  return node.attributes?.find((a) => a.name === name);
}

function getStaticAttrString(node, name) {
  const attr = findAttr(node, name);
  if (!attr || !attr.value || attr.value.type !== 'GlimmerTextNode') {
    return null;
  }
  return attr.value.chars;
}

function getInputType(node) {
  const t = getStaticAttrString(node, 'type');
  if (t === null) {
    return node.tag === 'input' ? 'text' : null;
  }
  return t.toLowerCase();
}

function tokenize(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'validate autocomplete attribute values against the HTML spec',
      category: 'Possible Errors',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-valid-autocomplete.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      formValue: '`<form autocomplete>` can only be `"on"` or `"off"` (got `"{{value}}"`)',
      hiddenOnOff: '`<input type="hidden">` cannot use the autocomplete value `"{{value}}"`',
      disallowedType: '`autocomplete` cannot be used on `<input type="{{type}}">`',
      onOffCombine:
        '`"{{value}}"` cannot be combined with other autocomplete tokens',
      invalidToken: '`"{{token}}"` is not a valid autocomplete token or field name',
      missingField: '`autocomplete` attribute is missing a field name',
      multipleFields: 'autocomplete attribute must contain exactly one field name',
      contactMismatch:
        '`"{{contact}}"` cannot be combined with field name `"{{field}}"`',
      order: '`"{{second}}"` must appear before `"{{first}}"` in autocomplete',
      wrongGroup:
        '`"{{value}}"` cannot be used on `<input type="{{type}}">`',
    },
  },

  create(context) {
    function report(attr, messageId, data) {
      context.report({ node: attr, messageId, data });
    }

    function validateControl(node, attr, value) {
      const type = getInputType(node) ?? 'text';

      if (node.tag === 'input' && DISALLOWED_INPUT_TYPES.has(type)) {
        report(attr, 'disallowedType', { type });
        return;
      }

      const tokens = tokenize(value);
      if (tokens.length === 0) {
        return;
      }

      const onOffIdx = tokens.findIndex((t) => t === 'on' || t === 'off');
      if (onOffIdx !== -1) {
        const token = tokens[onOffIdx];
        if (tokens.length > 1) {
          report(attr, 'onOffCombine', { value: token });
        }
        if (node.tag === 'input' && type === 'hidden') {
          report(attr, 'hiddenOnOff', { value: token });
        }
        return;
      }

      const order = [];
      for (const tok of tokens) {
        const kind = classifyToken(tok);
        if (!kind) {
          report(attr, 'invalidToken', { token: tok });
          return;
        }
        order.push({ tok, kind });
      }

      // Field presence.
      const fieldIndices = order
        .map((o, i) => (o.kind === 'field1' || o.kind === 'field2' ? i : -1))
        .filter((i) => i !== -1);

      if (fieldIndices.length === 0) {
        report(attr, 'missingField', {});
        return;
      }
      if (fieldIndices.length > 1) {
        report(attr, 'multipleFields', {});
        return;
      }

      // Contact can only pair with field2.
      const fieldIdx = fieldIndices[0];
      const field = order[fieldIdx];
      const contactIdx = order.findIndex((o) => o.kind === 'contact');
      if (contactIdx !== -1 && field.kind === 'field1') {
        report(attr, 'contactMismatch', { contact: order[contactIdx].tok, field: field.tok });
        return;
      }

      // Order validation.
      const expectedIdx = order.map((o) => EXPECTED_ORDER.indexOf(o.kind));
      for (let i = 0; i < expectedIdx.length - 1; i++) {
        if (expectedIdx[i] > expectedIdx[i + 1]) {
          report(attr, 'order', { first: order[i].tok, second: order[i + 1].tok });
          return;
        }
      }

      // Control group validation (only for <input> with a known type).
      if (node.tag === 'input') {
        const groups = TYPE_GROUPS[type];
        if (!groups) {
          return;
        }
        const fieldGroup = FIELD_NAME_GROUP[field.tok];
        if (fieldGroup && !groups.includes(fieldGroup)) {
          report(attr, 'wrongGroup', { value: field.tok, type });
        }
      }
    }

    function validateForm(node, attr, value) {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'on' || trimmed === 'off') {
        return;
      }
      report(attr, 'formValue', { value: trimmed });
    }

    return {
      GlimmerElementNode(node) {
        const attr = findAttr(node, 'autocomplete');
        if (!attr) {
          return;
        }
        if (!attr.value || attr.value.type !== 'GlimmerTextNode') {
          return;
        }
        const value = attr.value.chars;
        if (value === '') {
          return;
        }

        if (node.tag === 'form') {
          validateForm(node, attr, value);
          return;
        }
        if (node.tag === 'input' || node.tag === 'textarea' || node.tag === 'select') {
          validateControl(node, attr, value);
        }
      },
    };
  },
};
