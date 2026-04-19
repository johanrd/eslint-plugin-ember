'use strict';

const { transform, parseRules } = require('../../scripts/migrate-template-lint-directives');

const KNOWN = new Set([
  'template-no-bare-strings',
  'template-no-invalid-role',
  'template-no-implicit-this',
]);

function run(input) {
  return transform(input, { knownRules: KNOWN });
}

describe('migrate-template-lint-directives', () => {
  describe('basic rewrites', () => {
    it('rewrites a simple mustache disable with a rule name', () => {
      const { output } = run('{{! template-lint-disable no-bare-strings }}');
      expect(output).toBe('{{! eslint-disable ember/template-no-bare-strings }}');
    });

    it('rewrites a simple mustache disable with no rules (disable all)', () => {
      const { output } = run('{{! template-lint-disable }}');
      expect(output).toBe('{{! eslint-disable }}');
    });

    it('rewrites a block mustache disable', () => {
      const { output } = run('{{!-- template-lint-disable no-bare-strings --}}');
      expect(output).toBe('{{!-- eslint-disable ember/template-no-bare-strings --}}');
    });

    it('joins multiple rule names with commas', () => {
      const { output } = run(
        '{{! template-lint-disable no-bare-strings no-invalid-role }}'
      );
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings, ember/template-no-invalid-role }}'
      );
    });

    it('rewrites template-lint-enable with a rule', () => {
      const { output } = run('{{! template-lint-enable no-bare-strings }}');
      expect(output).toBe('{{! eslint-enable ember/template-no-bare-strings }}');
    });

    it('rewrites bare template-lint-enable', () => {
      const { output } = run('{{! template-lint-enable }}');
      expect(output).toBe('{{! eslint-enable }}');
    });

    it('strips single and double quotes from rule names', () => {
      const { output } = run(
        `{{! template-lint-disable "no-bare-strings" 'no-invalid-role' }}`
      );
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings, ember/template-no-invalid-role }}'
      );
    });

    it('splits rule names on any whitespace run, not commas', () => {
      // ETL splits on whitespace only; the separator in our output is always ", ".
      const { output } = run(
        '{{! template-lint-disable   no-bare-strings\tno-invalid-role }}'
      );
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings, ember/template-no-invalid-role }}'
      );
    });

    it('normalizes a no-space mustache open (`{{!template-lint-disable`) to `{{! ...`', () => {
      const { output } = run('{{!template-lint-disable no-bare-strings}}');
      expect(output).toBe('{{! eslint-disable ember/template-no-bare-strings }}');
    });

    it('handles CRLF line endings', () => {
      const { output } = run(
        '{{! template-lint-disable no-bare-strings }}\r\n<span>a</span>\r\n'
      );
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings }}\r\n<span>a</span>\r\n'
      );
    });
  });

  describe('skip + warn: tree and configure variants', () => {
    // Both -tree variants (disable-tree and enable-tree) hit the same
    // `endsWith('-tree')` branch; one test documents the skip + warn behavior.
    it('leaves -tree directives unchanged and warns', () => {
      const input = '{{! template-lint-disable-tree no-bare-strings }}';
      const { output, warnings, changed } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/tree scope/);
    });

    // Both configure variants (configure and configure-tree) hit the same
    // `startsWith('configure')` branch.
    it('leaves configure directives unchanged and warns', () => {
      const input = '{{! template-lint-configure no-bare-strings "foo" }}';
      const { output, warnings, changed } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/configure/);
    });
  });

  describe('malformed rule lists', () => {
    it('leaves the comment unchanged when the rule list contains non-rule-name tokens', () => {
      // Trailing prose would otherwise produce bogus IDs like
      // `ember/template-extra, ember/template-text`.
      const input = '{{!-- template-lint-disable no-bare-strings extra text --}}';
      const { output, warnings, changed } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/not valid rule names/);
    });

    it('strips trailing commas from rule names (common migration typo)', () => {
      // Users migrating from ESLint habits sometimes write rules comma-separated.
      // ETL itself splits on whitespace; the codemod tolerates trailing commas.
      const { output, warnings } = run(
        '{{! template-lint-disable no-bare-strings, no-invalid-role }}'
      );
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings, ember/template-no-invalid-role }}'
      );
      expect(warnings).toHaveLength(0);
    });
  });

  describe('unknown rules', () => {
    it('rewrites but warns about rules that do not exist in the plugin', () => {
      const { output, warnings } = run(
        '{{! template-lint-disable no-bare-strings no-nonexistent-rule }}'
      );
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings, ember/template-no-nonexistent-rule }}'
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/no-nonexistent-rule/);
    });
  });

  describe('non-directive comments and other non-ETL tokens', () => {
    it('leaves regular mustache comments untouched', () => {
      const input = '{{! this is just a comment }}';
      const { output, warnings, changed } = run(input);
      expect(output).toBe(input);
      expect(warnings).toHaveLength(0);
      expect(changed).toBe(false);
    });

    it('leaves existing eslint-disable comments untouched (also proves idempotency)', () => {
      const input = '{{! eslint-disable ember/template-no-bare-strings }}';
      const { output, changed } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
    });

    it('does not recognize `template-lint-disable-next-line` (not an ETL directive)', () => {
      // ESLint-style -next-line has no ETL equivalent; leave untouched so
      // users notice and migrate manually to {{! eslint-disable-next-line }}.
      const input = '{{! template-lint-disable-next-line no-bare-strings }}';
      const { output, changed, warnings } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
      expect(warnings).toHaveLength(0);
    });
  });

  describe('scope protection — nested / overlapping matches', () => {
    it('does not rewrite a mustache directive that appears inside a BLOCK comment body', () => {
      // Weird but possible. The outer block isn't a directive; the inner
      // mustache-looking text inside the block body must not be transformed.
      const input =
        '{{!-- disable this --> {{! template-lint-disable no-bare-strings }} --}}';
      const { output, changed } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
    });
  });

  describe('context preservation', () => {
    it('preserves surrounding template structure and indentation', () => {
      const input =
        '<template>\n' +
        '  <div>\n' +
        '    {{! template-lint-disable no-bare-strings }}\n' +
        '    <span>Hello</span>\n' +
        '  </div>\n' +
        '</template>\n';
      const expected =
        '<template>\n' +
        '  <div>\n' +
        '    {{! eslint-disable ember/template-no-bare-strings }}\n' +
        '    <span>Hello</span>\n' +
        '  </div>\n' +
        '</template>\n';
      const { output } = run(input);
      expect(output).toBe(expected);
    });

    it('handles block and simple comments mixed in one file', () => {
      const input =
        '<template>\n' +
        '  {{!-- template-lint-disable no-bare-strings --}}\n' +
        '  <span>Hello</span>\n' +
        '  {{! template-lint-enable }}\n' +
        '  {{! template-lint-disable-tree no-invalid-role }}\n' +
        '</template>\n';
      const { output, warnings } = run(input);
      expect(output).toContain('{{!-- eslint-disable ember/template-no-bare-strings --}}');
      expect(output).toContain('{{! eslint-enable }}');
      expect(output).toContain('{{! template-lint-disable-tree no-invalid-role }}');
      expect(warnings).toHaveLength(1);
    });

    it('handles multiple directives on the same line', () => {
      const input =
        '<span>{{! template-lint-disable no-bare-strings }}<x />{{! template-lint-enable }}</span>';
      const { output } = run(input);
      expect(output).toBe(
        '<span>{{! eslint-disable ember/template-no-bare-strings }}<x />{{! eslint-enable }}</span>'
      );
    });

    it('handles multiple simple comments on different lines independently', () => {
      const input =
        '{{! template-lint-disable no-bare-strings }}\n' +
        '<span>a</span>\n' +
        '{{! template-lint-enable no-bare-strings }}\n';
      const { output } = run(input);
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings }}\n' +
          '<span>a</span>\n' +
          '{{! eslint-enable ember/template-no-bare-strings }}\n'
      );
    });
  });

  describe('multi-line and whitespace variants', () => {
    it('handles multi-line block comments', () => {
      const input = '{{!--\n  template-lint-disable\n    no-bare-strings\n--}}';
      const { output } = run(input);
      expect(output).toBe('{{!-- eslint-disable ember/template-no-bare-strings --}}');
    });

    it('handles block comment with no whitespace between dashes and directive', () => {
      const input = '{{!--template-lint-disable no-bare-strings--}}';
      const { output } = run(input);
      expect(output).toBe('{{!-- eslint-disable ember/template-no-bare-strings --}}');
    });
  });

  describe('warnings reference original-source line numbers', () => {
    it('uses the original-source line even after a preceding BLOCK rewrite collapses lines', () => {
      // The block comment spans source lines 1-4 and rewrites to one line.
      // The -tree directive on source line 6 must report "line 6", not "line 3"
      // (which is where it would land if we used the post-transform output).
      const input =
        '{{!--\n' +
        '  template-lint-disable\n' +
        '    no-bare-strings\n' +
        '--}}\n' +
        'x\n' +
        '{{! template-lint-disable-tree no-invalid-role }}\n';
      const { warnings } = run(input);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/^line 6:/);
    });
  });
});

describe('parseRules', () => {
  it('returns empty array for empty input', () => {
    expect(parseRules('')).toEqual([]);
  });

  it('strips paired surrounding quotes but not mismatched or one-sided quotes', () => {
    expect(parseRules(`"a" 'b' c`)).toEqual(['a', 'b', 'c']);
    // Mismatched opening/closing quote pairs: left untouched.
    expect(parseRules(`"a' 'b"`)).toEqual([`"a'`, `'b"`]);
  });

  it('strips trailing commas', () => {
    expect(parseRules('a, b,, c')).toEqual(['a', 'b', 'c']);
  });

  it('splits on any whitespace', () => {
    expect(parseRules('a\tb  c\nd')).toEqual(['a', 'b', 'c', 'd']);
  });
});
