'use strict';

const rule = require('../../../lib/rules/template-interactive-supports-focus');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-interactive-supports-focus', rule, {
  valid: [
    // === Base cases — nothing to flag when there is no interactive role. ===
    '<template><div /></template>',
    '<template><div></div></template>',
    '<template><span>hi</span></template>',
    '<template><section></section></template>',
    '<template><main></main></template>',
    '<template><article></article></template>',
    '<template><header></header></template>',
    '<template><footer></footer></template>',

    // === Inherently focusable elements with an interactive role — valid. ===
    '<template><button role="button">x</button></template>',
    '<template><a href="#" role="button">x</a></template>',
    '<template><a href="http://x.y.z" role="link">x</a></template>',
    '<template><area href="#" role="link" /></template>',
    '<template><input role="combobox" /></template>',
    '<template><input type="text" role="combobox" /></template>',
    '<template><select role="listbox"></select></template>',
    '<template><textarea role="textbox"></textarea></template>',
    '<template><summary role="button">x</summary></template>',
    '<template><iframe role="application"></iframe></template>',
    '<template><audio controls role="slider"></audio></template>',
    '<template><video controls role="slider"></video></template>',

    // === Interactive role on a non-focusable host but tabindex is present. ===
    '<template><div role="button" tabindex="0"></div></template>',
    '<template><div role="checkbox" tabindex="0"></div></template>',
    '<template><div role="link" tabindex="0"></div></template>',
    '<template><div role="menuitem" tabindex="0"></div></template>',
    '<template><div role="menuitemcheckbox" tabindex="0"></div></template>',
    '<template><div role="menuitemradio" tabindex="0"></div></template>',
    '<template><div role="option" tabindex="0"></div></template>',
    '<template><div role="radio" tabindex="0"></div></template>',
    '<template><div role="searchbox" tabindex="0"></div></template>',
    '<template><div role="slider" tabindex="0"></div></template>',
    '<template><div role="spinbutton" tabindex="0"></div></template>',
    '<template><div role="switch" tabindex="0"></div></template>',
    '<template><div role="tab" tabindex="0"></div></template>',
    '<template><div role="textbox" tabindex="0"></div></template>',
    '<template><div role="treeitem" tabindex="0"></div></template>',
    // tabindex="-1" is also sufficient — the role still has a focus target.
    '<template><div role="button" tabindex="-1"></div></template>',
    // Dynamic tabindex satisfies the check (the attribute is present).
    '<template><div role="button" tabindex={{this.ti}}></div></template>',

    // === Interactive role on a non-focusable host but contenteditable is truthy. ===
    '<template><div role="textbox" contenteditable="true">edit</div></template>',
    '<template><div role="textbox" contenteditable>edit</div></template>',
    '<template><div role="textbox" contenteditable={{this.edit}}>edit</div></template>',

    // === Dynamic role — conservatively skipped. ===
    '<template><div role={{this.role}}></div></template>',
    '<template><div role={{this.role}} onclick={{this.handle}}></div></template>',

    // === Non-interactive roles — outside scope. ===
    '<template><div role="region"></div></template>',
    '<template><div role="article"></div></template>',
    '<template><div role="presentation"></div></template>',
    '<template><div role="none"></div></template>',
    '<template><div role="heading"></div></template>',
    // Unknown / typo roles are not widget-descended → not flagged here
    // (covered by template-no-invalid-role).
    '<template><div role="invalid"></div></template>',

    // === Component invocations — out of scope. ===
    '<template><TestComponent role="button" /></template>',
    '<template><Foo.Bar role="button" /></template>',
    '<template><this.MyThing role="button" /></template>',
    '<template><@foo role="button" /></template>',
    '<template><foo::bar role="button" /></template>',

    // === Custom / non-DOM elements — not in aria-query's DOM map. ===
    '<template><my-widget role="button"></my-widget></template>',
    '<template><test-component role="button"></test-component>hi</template>',

    // === Non-widget roles (composite, section, etc.) — not in scope here. ===
    // `form` (role) is structure, not widget; `dialog` is window, not widget.
    '<template><div role="dialog"></div></template>',
    '<template><div role="form"></div></template>',

    // === Role with extra whitespace / multi-token is handled via tabindex. ===
    '<template><div role="button link" tabindex="0">x</div></template>',

    // === Peer parity: <div role="button"> without handler still
    // focus-required. But jsx-a11y gates on the handler, so no-handler is
    // valid there. Our rule is closer to angular-eslint (role-driven, not
    // handler-driven); however for parity with jsx-a11y's common case we
    // rely on the authored role alone. Document the behavior: static
    // role="button" with no tabindex IS flagged (see invalid section).
  ],

  invalid: [
    // === Elements with an interactive role but no tabindex and no inherent
    // focus — flagged (parity with jsx-a11y / vue-a11y / angular-eslint). ===
    {
      code: '<template><div role="button"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'button' } }],
    },
    {
      code: '<template><div role="checkbox"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'checkbox' } }],
    },
    {
      code: '<template><div role="link"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'link' } }],
    },
    {
      code: '<template><div role="menuitem"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'menuitem' } }],
    },
    {
      code: '<template><div role="switch"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'switch' } }],
    },
    {
      code: '<template><div role="tab"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'tab' } }],
    },
    {
      code: '<template><div role="textbox"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'textbox' } }],
    },

    // === With handlers attached — canonical peer pattern. ===
    {
      code: '<template><div role="button" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><span role="link" {{on "click" this.handle}}>x</span></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="menuitemcheckbox" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="menuitemradio" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="option" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="radio" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="searchbox" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="slider" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="spinbutton" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<template><div role="treeitem" {{on "click" this.handle}}></div></template>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },

    // === <a> without href is NOT inherently focusable — an interactive
    // role without tabindex must still be flagged. ===
    {
      code: '<template><a role="button">x</a></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'a', role: 'button' } }],
    },
    {
      code: '<template><area role="button" /></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'area', role: 'button' } }],
    },

    // === type="hidden" input loses inherent focus; an interactive role
    // without tabindex is flagged. (Vanishingly rare in practice.) ===
    {
      code: '<template><input type="hidden" role="button" /></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'input', role: 'button' } }],
    },

    // === audio / video without controls is not focusable. ===
    {
      code: '<template><audio role="slider"></audio></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'audio', role: 'slider' } }],
    },
    {
      code: '<template><video role="slider"></video></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'video', role: 'slider' } }],
    },

    // === contenteditable="false" is explicit opt-out — not focusable. ===
    {
      code: '<template><div role="textbox" contenteditable="false">x</div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'textbox' } }],
    },

    // === Multi-token role where at least one is interactive. ===
    {
      code: '<template><div role="button link"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'button' } }],
    },
    {
      code: '<template><div role="region button"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'button' } }],
    },

    // === Other widget-descended roles (combobox, scrollbar, toolbar). ===
    {
      code: '<template><div role="combobox"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'combobox' } }],
    },
    {
      code: '<template><div role="scrollbar"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'scrollbar' } }],
    },
    {
      code: '<template><div role="toolbar"></div></template>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'toolbar' } }],
    },
  ],
});

// =============================================================================
// HBS (non-strict) mode
// =============================================================================

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-interactive-supports-focus', rule, {
  valid: [
    '<div></div>',
    '<button role="button">x</button>',
    '<a href="#" role="button">x</a>',
    '<input role="combobox" />',
    '<select role="listbox"></select>',
    '<textarea role="textbox"></textarea>',
    '<div role="button" tabindex="0"></div>',
    '<div role="textbox" contenteditable="true">x</div>',
    '<div role={{this.role}}></div>',
    '<div role="region"></div>',
    '<TestComponent role="button" />',
    '<my-widget role="button"></my-widget>',
  ],
  invalid: [
    {
      code: '<div role="button"></div>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'button' } }],
    },
    {
      code: '<span role="link">x</span>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'span', role: 'link' } }],
    },
    {
      code: '<div role="checkbox" {{on "click" this.handle}}></div>',
      output: null,
      errors: [{ messageId: 'focusable' }],
    },
    {
      code: '<a role="button">x</a>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'a', role: 'button' } }],
    },
    {
      code: '<input type="hidden" role="button" />',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'input', role: 'button' } }],
    },
    {
      code: '<div role="textbox" contenteditable="false">x</div>',
      output: null,
      errors: [{ messageId: 'focusable', data: { tag: 'div', role: 'textbox' } }],
    },
  ],
});
