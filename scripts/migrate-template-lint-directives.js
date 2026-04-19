'use strict';

const fs = require('fs');
const path = require('path');

const BLOCK_REGEX = /\{\{!--([\s\S]*?)--\}\}/g;
const SIMPLE_REGEX = /\{\{!(?!--)([^}]*?)\}\}/g;
const DIRECTIVE_RE =
  /^template-lint-(disable-tree|enable-tree|configure-tree|disable|enable|configure)(?:\s+([\s\S]*))?$/;
// Most template rules are kebab-case with at least one hyphen (`no-X`,
// `require-X`, `attribute-X`, etc.) — but a few are single words (e.g.
// `quotes`). A simple hyphen-only check would reject the single-word names.
// Instead, accept a token if either:
//   (a) the plugin already knows a rule with that name (`template-<token>`), or
//   (b) the token looks like kebab-case with at least one hyphen.
// (b) covers unknown-but-well-formed names (warned separately); together they
// reject plain prose tokens like `extra text` so we don't emit bogus
// `ember/template-extra` IDs.
const KEBAB_WITH_HYPHEN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;
function looksLikeRuleName(token, knownRules) {
  return knownRules.has(`template-${token}`) || KEBAB_WITH_HYPHEN.test(token);
}

function parseRules(rest) {
  return rest
    .split(/\s+/)
    .filter(Boolean)
    .map((r) =>
      r
        // Strip trailing commas first — common typo for users migrating from
        // ESLint habits. Must run before the paired-quote pass so that
        // `'foo',` becomes `'foo'` and then gets unquoted to `foo` (instead
        // of the paired-quote check failing because the `,` breaks the pair).
        .replace(/,+$/, '')
        // Strip paired surrounding quotes (matches ETL's unquote behavior).
        .replace(/^(['"])(.*)\1$/, '$2')
    );
}

function rewriteDirective(body, form, knownRules, warn) {
  const match = body.trim().match(DIRECTIVE_RE);
  if (!match) return null;
  const name = match[1];
  const rest = (match[2] || '').trim();

  if (name.startsWith('configure')) {
    warn(
      `template-lint-${name} has no ESLint equivalent; move configuration to your flat config file`
    );
    return null;
  }
  if (name.endsWith('-tree')) {
    warn(
      `template-lint-${name} (tree scope) has no ESLint equivalent; rewrite manually as a block-scoped eslint-disable/enable pair`
    );
    return null;
  }

  const rules = parseRules(rest);
  const invalid = rules.filter((r) => !looksLikeRuleName(r, knownRules));
  if (invalid.length > 0) {
    // Malformed rule list (trailing prose, special chars, etc.) — refuse to
    // rewrite rather than emit bogus ESLint directives like "ember/template-extra".
    warn(
      `rule list contains tokens that are not valid rule names: ${invalid
        .map((r) => JSON.stringify(r))
        .join(', ')}; comment left unchanged`
    );
    return null;
  }

  const unknown = rules.filter((r) => !knownRules.has(`template-${r}`));
  if (unknown.length > 0) {
    warn(
      `no matching rule in eslint-plugin-ember for: ${unknown.join(
        ', '
      )} (comment still rewritten — verify or remove)`
    );
  }

  const action = name === 'disable' ? 'eslint-disable' : 'eslint-enable';
  const mapped = rules.map((r) => `ember/template-${r}`);
  const ruleList = mapped.length > 0 ? ' ' + mapped.join(', ') : '';
  return form === 'block'
    ? `{{!-- ${action}${ruleList} --}}`
    : `{{! ${action}${ruleList} }}`;
}

function computeLine(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function transform(source, { knownRules } = {}) {
  const warnings = [];
  const blockRanges = []; // [start, end) — used to suppress SIMPLE matches nested inside BLOCK bodies
  const changes = [];

  for (const m of source.matchAll(BLOCK_REGEX)) {
    const start = m.index;
    const end = start + m[0].length;
    blockRanges.push([start, end]);
    const line = computeLine(source, start);
    const rewritten = rewriteDirective(m[1], 'block', knownRules, (w) =>
      warnings.push(`line ${line}: ${w}`)
    );
    if (rewritten != null) {
      changes.push({ start, end, replacement: rewritten });
    }
  }

  for (const m of source.matchAll(SIMPLE_REGEX)) {
    const start = m.index;
    // Skip SIMPLE matches that fall inside a BLOCK comment body — e.g. text
    // like `{{! template-lint-... }}` accidentally appearing inside a
    // `{{!-- ... --}}` block would otherwise be rewritten.
    if (blockRanges.some(([bs, be]) => start >= bs && start < be)) continue;
    const end = start + m[0].length;
    const line = computeLine(source, start);
    const rewritten = rewriteDirective(m[1], 'simple', knownRules, (w) =>
      warnings.push(`line ${line}: ${w}`)
    );
    if (rewritten != null) {
      changes.push({ start, end, replacement: rewritten });
    }
  }

  changes.sort((a, b) => b.start - a.start);
  let output = source;
  for (const c of changes) {
    output = output.slice(0, c.start) + c.replacement + output.slice(c.end);
  }

  return { output, warnings, changed: changes.length > 0 };
}

function loadKnownRules() {
  const rulesDir = path.join(__dirname, '..', 'lib', 'rules');
  return new Set(
    fs
      .readdirSync(rulesDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => f.slice(0, -3))
  );
}

module.exports = { transform, parseRules, loadKnownRules };

// Directories we never want to walk into when a directory is passed as input —
// running the codemod from a repo root should not descend into vendored
// templates or build output.
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'tmp', '.cache']);
const TEMPLATE_EXT = /\.(hbs|gjs|gts)$/;

function collectFiles(inputPath) {
  let stat;
  try {
    stat = fs.statSync(inputPath);
  } catch (err) {
    const msg = err.code === 'ENOENT' ? `no such file or directory: ${inputPath}` : err.message;
    throw new Error(msg);
  }

  if (!stat.isDirectory()) return [inputPath];

  const result = [];
  for (const entry of fs.readdirSync(inputPath, { recursive: true })) {
    const segments = entry.split(path.sep);
    if (segments.some((s) => EXCLUDED_DIRS.has(s))) continue;
    if (TEMPLATE_EXT.test(entry)) result.push(path.join(inputPath, entry));
  }
  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const inputs = args.filter((a) => !a.startsWith('--'));

  if (inputs.length === 0) {
    console.error(
      'usage: migrate-template-lint-directives.js [--write] <files-or-dirs>...\n' +
        '  Without --write, performs a dry run and reports planned changes.\n' +
        `  Directory walk excludes: ${[...EXCLUDED_DIRS].join(', ')}.`
    );
    process.exit(1);
  }

  const knownRules = loadKnownRules();
  const files = [];
  let hadInputError = false;
  for (const p of inputs) {
    try {
      files.push(...collectFiles(p));
    } catch (err) {
      console.error(`error: ${err.message}`);
      hadInputError = true;
    }
  }
  // Continue processing valid inputs even if some were bad — migrations are
  // usually run in bulk, and a typo in one path shouldn't stop work on the
  // others. The non-zero exit code surfaces the error for CI.
  if (hadInputError) process.exitCode = 1;

  let changedFiles = 0;
  let warningCount = 0;
  for (const file of files) {
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch (err) {
      console.error(`error reading ${file}: ${err.message}`);
      process.exitCode = 1;
      continue;
    }
    const { output, warnings, changed } = transform(src, { knownRules });
    if (changed) {
      changedFiles++;
      if (write) {
        try {
          fs.writeFileSync(file, output, 'utf8');
        } catch (err) {
          console.error(`error writing ${file}: ${err.message}`);
          process.exitCode = 1;
          continue;
        }
      }
      console.log(`${write ? 'wrote' : 'would write'}: ${file}`);
    }
    for (const w of warnings) {
      warningCount++;
      console.warn(`${file}: ${w}`);
    }
  }

  console.log(
    `\n${changedFiles} file(s) ${write ? 'rewritten' : 'would be rewritten'}, ${warningCount} warning(s)`
  );
  if (!write && changedFiles > 0) {
    console.log('Re-run with --write to apply changes.');
  }
}
