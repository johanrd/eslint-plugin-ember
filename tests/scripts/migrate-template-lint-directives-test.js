import { describe, expect, it } from 'vitest';
import { transform, parseRules } from '../../scripts/migrate-template-lint-directives.mjs';

const KNOWN = new Set([
  'template-no-bare-strings',
  'template-no-invalid-role',
  'template-no-implicit-this',
  // Single-word rule name — a real ETL/plugin rule (`template-quotes.js`).
  // Exercises the layered validator that accepts known single-word rules.
  'template-quotes',
]);

// Inputs in tests are templates without a surrounding JS shell, so they only
// parse cleanly under the `.hbs` (templateOnly) path. For test ergonomics we
// default to `demo.hbs` unless a specific file type is needed.
function run(input, filePath = 'demo.hbs') {
  return transform(input, { knownRules: KNOWN, filePath });
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

    it('splits rule names on any whitespace run', () => {
      const { output } = run(
        '{{! template-lint-disable   no-bare-strings\tno-invalid-role }}'
      );
      expect(output).toBe(
        '{{! eslint-disable ember/template-no-bare-strings, ember/template-no-invalid-role }}'
      );
    });

    it('rewrites a single-word rule name that exists in the plugin (e.g. quotes)', () => {
      // Would regress if the validator required a hyphen unconditionally —
      // `template-quotes` is a real single-word ETL/plugin rule.
      const { output, warnings } = run('{{! template-lint-disable quotes }}');
      expect(output).toBe('{{! eslint-disable ember/template-quotes }}');
      expect(warnings).toHaveLength(0);
    });
  });

  describe('skip + warn: tree and configure variants', () => {
    it('leaves -tree directives unchanged and warns', () => {
      const input = '{{! template-lint-disable-tree no-bare-strings }}';
      const { output, warnings, changed } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/tree scope/);
    });

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
      const input = '{{!-- template-lint-disable no-bare-strings extra text --}}';
      const { output, warnings, changed } = run(input);
      expect(output).toBe(input);
      expect(changed).toBe(false);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/not valid rule names/);
    });

    it('strips trailing commas from rule names (common migration typo)', () => {
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

    it('leaves existing eslint-disable comments untouched (idempotent)', () => {
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

  describe('context preservation', () => {
    it('preserves surrounding template structure and indentation', () => {
      const input =
        '<div>\n' +
        '  {{! template-lint-disable no-bare-strings }}\n' +
        '  <span>Hello</span>\n' +
        '</div>\n';
      const expected =
        '<div>\n' +
        '  {{! eslint-disable ember/template-no-bare-strings }}\n' +
        '  <span>Hello</span>\n' +
        '</div>\n';
      const { output } = run(input);
      expect(output).toBe(expected);
    });

    it('handles block and simple comments mixed in one file', () => {
      const input =
        '<div>\n' +
        '  {{!-- template-lint-disable no-bare-strings --}}\n' +
        '  <span>Hello</span>\n' +
        '  {{! template-lint-enable }}\n' +
        '  {{! template-lint-disable-tree no-invalid-role }}\n' +
        '</div>\n';
      const { output, warnings } = run(input);
      expect(output).toContain('{{!-- eslint-disable ember/template-no-bare-strings --}}');
      expect(output).toContain('{{! eslint-enable }}');
      expect(output).toContain('{{! template-lint-disable-tree no-invalid-role }}');
      expect(warnings).toHaveLength(1);
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
  });

  describe('file-type dispatch', () => {
    it('parses .gjs files (JS shell around <template>)', () => {
      const input =
        "import Component from '@glimmer/component';\n" +
        'export default class Demo extends Component {\n' +
        '  <template>\n' +
        '    {{! template-lint-disable no-bare-strings }}\n' +
        '    <span>x</span>\n' +
        '  </template>\n' +
        '}\n';
      const { output, changed } = transform(input, { knownRules: KNOWN, filePath: 'demo.gjs' });
      expect(changed).toBe(true);
      expect(output).toContain('{{! eslint-disable ember/template-no-bare-strings }}');
      expect(output).toContain('export default class Demo');
    });

    it('parses .gts files (TS shell around <template>)', () => {
      const input =
        "import Component from '@glimmer/component';\n" +
        'export default class Demo extends Component<{ Args: {} }> {\n' +
        '  <template>\n' +
        '    {{! template-lint-disable no-bare-strings }}\n' +
        '    <span>x</span>\n' +
        '  </template>\n' +
        '}\n';
      const { output, changed } = transform(input, { knownRules: KNOWN, filePath: 'demo.gts' });
      expect(changed).toBe(true);
      expect(output).toContain('{{! eslint-disable ember/template-no-bare-strings }}');
    });

    it('parses .hbs files as raw template content', () => {
      const { output, changed } = transform(
        '{{! template-lint-disable no-bare-strings }}',
        { knownRules: KNOWN, filePath: 'demo.hbs' }
      );
      expect(changed).toBe(true);
      expect(output).toBe('{{! eslint-disable ember/template-no-bare-strings }}');
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

  it('strips both a surrounding quote pair and a trailing comma (order-sensitive)', () => {
    expect(parseRules(`'foo', "bar",`)).toEqual(['foo', 'bar']);
  });

  it('splits on any whitespace', () => {
    expect(parseRules('a\tb  c\nd')).toEqual(['a', 'b', 'c', 'd']);
  });
});
