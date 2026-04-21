'use strict';

// Acceptance test: verifies end-to-end that .hbs files lint correctly
// under ESLint flat config when routed to `ember-eslint-parser/hbs` via
// the `hbsParser` export from `eslint-plugin-ember/recommended`.
//
// Exercises real file-path resolution and parser wiring — `RuleTester`
// does not.

const { FlatESLint } = require('eslint/use-at-your-own-risk');
const plugin = require('../../../lib');

// Mirrors `import { hbsParser } from 'eslint-plugin-ember/recommended'`
// in a consumer's eslint.config.mjs.
const hbsParser = require('ember-eslint-parser/hbs');
const tsParser = require('@typescript-eslint/parser');

describe('hbs flat-config acceptance', () => {
  test('template-no-bare-strings flags a bare string in an .hbs file', async () => {
    const eslint = new FlatESLint({
      overrideConfigFile: true,
      baseConfig: [
        {
          files: ['**/*.hbs'],
          languageOptions: { parser: hbsParser },
          plugins: { ember: plugin },
          rules: { 'ember/template-no-bare-strings': 'error' },
        },
      ],
    });
    const [result] = await eslint.lintText('<div>Hello world</div>\n', {
      filePath: 'app/templates/x.hbs',
    });
    expect(result.fatalErrorCount).toBe(0);
    expect(result.messages.map((m) => m.ruleId)).toContain(
      'ember/template-no-bare-strings'
    );
  });

  // Reproduces the "was not found by the project service" failure: a TS
  // parser block with `projectService: true` whose `files` reaches .hbs
  // gets applied to the .hbs file. The error comes from
  // @typescript-eslint/typescript-estree, not from eslint-plugin-ember.
  test('repro: TS parser on .hbs without an hbs block emits a fatal parse error', async () => {
    const eslint = new FlatESLint({
      overrideConfigFile: true,
      baseConfig: [
        {
          files: ['**/*.{ts,gts,hbs}'],
          languageOptions: {
            parser: tsParser,
            parserOptions: { projectService: true },
          },
        },
      ],
    });
    const [result] = await eslint.lintText('<a href="#">Click</a>\n', {
      filePath: 'app/templates/x.hbs',
    });
    const fatals = result.messages.filter((m) => m.fatal);
    expect(fatals.length).toBeGreaterThan(0);
    expect(fatals[0].message).toMatch(/project service|extraFileExtensions/);
  });

  // Adding an .hbs-specific block with the hbs parser after the TS block
  // resolves the fatal parse error, but note: rules from the TS block
  // still layer on. A type-info-requiring rule like @typescript-eslint/
  // await-thenable would still fail here — see README "Linting .hbs
  // files" for scoping guidance on typescript-eslint shared configs.
  test('fix (parser only): adding an hbs block with the hbs parser resolves the parse error', async () => {
    const eslint = new FlatESLint({
      overrideConfigFile: true,
      baseConfig: [
        {
          files: ['**/*.{ts,gts,hbs}'],
          languageOptions: {
            parser: tsParser,
            parserOptions: { projectService: true },
          },
        },
        {
          files: ['**/*.hbs'],
          languageOptions: { parser: hbsParser },
          plugins: { ember: plugin },
          rules: { 'ember/template-no-bare-strings': 'error' },
        },
      ],
    });
    const [result] = await eslint.lintText('<div>Hello world</div>\n', {
      filePath: 'app/templates/x.hbs',
    });
    expect(result.fatalErrorCount).toBe(0);
    expect(result.messages.map((m) => m.ruleId)).toContain(
      'ember/template-no-bare-strings'
    );
  });

  // Full fix: narrow the TS block's `files` so it doesn't match .hbs at
  // all. Now no TS rules layer on; the hbs block stands alone.
  test('fix (scope TS block): narrowing the TS block keeps its rules off .hbs', async () => {
    const eslint = new FlatESLint({
      overrideConfigFile: true,
      baseConfig: [
        {
          files: ['**/*.{ts,gts}'],
          languageOptions: {
            parser: tsParser,
            parserOptions: { projectService: true },
          },
        },
        {
          files: ['**/*.hbs'],
          languageOptions: { parser: hbsParser },
          plugins: { ember: plugin },
          rules: { 'ember/template-no-bare-strings': 'error' },
        },
      ],
    });
    const [result] = await eslint.lintText('<div>Hello world</div>\n', {
      filePath: 'app/templates/x.hbs',
    });
    expect(result.fatalErrorCount).toBe(0);
    expect(result.messages.map((m) => m.ruleId)).toEqual([
      'ember/template-no-bare-strings',
    ]);
  });
});
