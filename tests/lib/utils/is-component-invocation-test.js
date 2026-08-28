'use strict';

const { isComponentInvocation } = require('../../../lib/utils/is-component-invocation');

describe('isComponentInvocation', () => {
  it('returns true for PascalCase tags', () => {
    expect(isComponentInvocation({ tag: 'Button' })).toBe(true);
    expect(isComponentInvocation({ tag: 'MyWidget' })).toBe(true);
    // PascalCase tags that match a native HTML element name — the core bug case
    expect(isComponentInvocation({ tag: 'Article' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Form' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Main' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Nav' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Ul' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Li' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Aside' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Section' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Table' })).toBe(true);
  });

  it('returns false for lowercase native HTML tags', () => {
    expect(isComponentInvocation({ tag: 'div' })).toBe(false);
    expect(isComponentInvocation({ tag: 'article' })).toBe(false);
    expect(isComponentInvocation({ tag: 'form' })).toBe(false);
    expect(isComponentInvocation({ tag: 'h1' })).toBe(false);
    expect(isComponentInvocation({ tag: 'button' })).toBe(false);
  });

  it('returns true for named-arg invocations', () => {
    expect(isComponentInvocation({ tag: '@heading' })).toBe(true);
    expect(isComponentInvocation({ tag: '@tag.foo' })).toBe(true);
  });

  it('returns true for this-path invocations', () => {
    expect(isComponentInvocation({ tag: 'this.myComponent' })).toBe(true);
    expect(isComponentInvocation({ tag: 'this.comp.sub' })).toBe(true);
  });

  it('returns true for dot-path invocations', () => {
    expect(isComponentInvocation({ tag: 'foo.bar' })).toBe(true);
    expect(isComponentInvocation({ tag: 'ns.widget' })).toBe(true);
  });

  it('returns true for named-block / namespaced invocations', () => {
    expect(isComponentInvocation({ tag: 'foo::bar' })).toBe(true);
    expect(isComponentInvocation({ tag: 'Foo::Bar' })).toBe(true);
  });

  it('returns false for empty-string tag', () => {
    expect(isComponentInvocation({ tag: '' })).toBe(false);
  });

  it('returns false for undefined node', () => {
    expect(isComponentInvocation()).toBe(false);
    expect(isComponentInvocation(undefined)).toBe(false);
    expect(isComponentInvocation(null)).toBe(false);
  });

  it('returns false for node with undefined tag', () => {
    expect(isComponentInvocation({})).toBe(false);
    expect(isComponentInvocation({ tag: undefined })).toBe(false);
  });

  it('returns false for node with non-string tag', () => {
    expect(isComponentInvocation({ tag: 123 })).toBe(false);
    expect(isComponentInvocation({ tag: null })).toBe(false);
  });
});
