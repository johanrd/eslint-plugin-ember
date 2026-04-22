'use strict';

const rule = require('../../../lib/rules/template-mouse-events-have-key-events');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('template-mouse-events-have-key-events', rule, {
  valid: [
    // No mouse listeners — rule doesn't fire.
    '<template><div></div></template>',
    '<template><div {{on "click" this.onClick}}></div></template>',

    // Hover-in paired with focus.
    '<template><div {{on "mouseover" this.onHover}} {{on "focus" this.onHover}}></div></template>',
    '<template><div {{on "mouseenter" this.onHover}} {{on "focusin" this.onHover}}></div></template>',
    '<template><div {{on "mouseover" this.onHover}} {{on "focusin" this.onHover}}></div></template>',

    // Hover-out paired with blur.
    '<template><div {{on "mouseout" this.onLeave}} {{on "blur" this.onLeave}}></div></template>',
    '<template><div {{on "mouseleave" this.onLeave}} {{on "focusout" this.onLeave}}></div></template>',

    // Both pairings.
    `<template>
      <div
        {{on "mouseover" this.onHover}}
        {{on "focus" this.onHover}}
        {{on "mouseout" this.onLeave}}
        {{on "blur" this.onLeave}}
      ></div>
    </template>`,

    // Component — not a DOM element.
    '<template><CustomCard {{on "mouseover" this.onHover}} /></template>',

    // Custom element — not in aria-query's dom map.
    '<template><my-card {{on "mouseover" this.onHover}}></my-card></template>',

    // Default handler set matches jsx-a11y — mouseenter/mouseleave are NOT
    // flagged by default (opt-in via `hoverInHandlers`/`hoverOutHandlers`).
    '<template><div {{on "mouseenter" this.onHover}}></div></template>',
    '<template><div {{on "mouseleave" this.onLeave}}></div></template>',

    // Configurable handler set — opt in to mouseenter via config.
    {
      code: '<template><div {{on "mouseenter" this.onHover}} {{on "focus" this.onHover}}></div></template>',
      options: [{ hoverInHandlers: ['mouseover', 'mouseenter'] }],
    },
  ],
  invalid: [
    {
      code: '<template><div {{on "mouseover" this.onHover}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverInMissing' }],
    },
    // mouseenter flags ONLY when opted into via config.
    {
      code: '<template><div {{on "mouseenter" this.onHover}}></div></template>',
      options: [{ hoverInHandlers: ['mouseover', 'mouseenter'] }],
      output: null,
      errors: [{ messageId: 'hoverInMissing' }],
    },
    {
      code: '<template><div {{on "mouseout" this.onLeave}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },
    // mouseleave flags ONLY when opted into via config.
    {
      code: '<template><div {{on "mouseleave" this.onLeave}}></div></template>',
      options: [{ hoverOutHandlers: ['mouseout', 'mouseleave'] }],
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },
    {
      // Both unpaired → two errors on the same element.
      code: '<template><div {{on "mouseover" this.onHover}} {{on "mouseout" this.onLeave}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverInMissing' }, { messageId: 'hoverOutMissing' }],
    },
    {
      // Hover-in paired correctly but hover-out unpaired.
      code: '<template><div {{on "mouseover" this.onHover}} {{on "focus" this.onHover}} {{on "mouseout" this.onLeave}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },
    {
      // Hover-out paired with a NON-matching focus variant — still flagged.
      // mouseout pairs with blur or focusout; focus alone doesn't satisfy.
      code: '<template><div {{on "mouseout" this.onLeave}} {{on "focus" this.onLeave}}></div></template>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

hbsRuleTester.run('template-mouse-events-have-key-events', rule, {
  valid: [
    '<div></div>',
    '<div {{on "mouseover" this.onHover}} {{on "focus" this.onHover}}></div>',
    '<div {{on "mouseout" this.onLeave}} {{on "blur" this.onLeave}}></div>',
    '<CustomCard {{on "mouseover" this.onHover}} />',
  ],
  invalid: [
    {
      code: '<div {{on "mouseover" this.onHover}}></div>',
      output: null,
      errors: [{ messageId: 'hoverInMissing' }],
    },
    {
      code: '<div {{on "mouseout" this.onLeave}}></div>',
      output: null,
      errors: [{ messageId: 'hoverOutMissing' }],
    },
  ],
});
