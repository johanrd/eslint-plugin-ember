'use strict';

/**
 * Returns true if the Glimmer element node is a component invocation
 * rather than a native HTML element. Includes:
 * - PascalCase tags (<Button>, <MyWidget>)
 * - Named-arg invocations (<@heading>, <@tag.foo>)
 * - This-path invocations (<this.myComponent>, <this.comp.sub>)
 * - Dot-path invocations (<foo.bar>)
 * - Named-block syntax (<foo::bar>)
 */
module.exports.isComponentInvocation = function isComponentInvocation(node) {
  const tag = node?.tag;
  if (typeof tag !== 'string') {
    return false;
  }
  return (
    /^[A-Z]/.test(tag) ||
    tag.startsWith('@') ||
    tag.startsWith('this.') ||
    tag.includes('.') ||
    tag.includes('::')
  );
};
