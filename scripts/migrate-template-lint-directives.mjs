import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zmod';
import { emberParser } from 'zmod-ember';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export function parseRules(rest) {
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

function analyzeDirective(body, knownRules, warn) {
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

  return { action: name === 'disable' ? 'eslint-disable' : 'eslint-enable', rules };
}

function formatComment(action, rules, longForm) {
  const mapped = rules.map((r) => `ember/template-${r}`);
  const ruleList = mapped.length > 0 ? ' ' + mapped.join(', ') : '';
  return longForm ? `{{!-- ${action}${ruleList} --}}` : `{{! ${action}${ruleList} }}`;
}

const j = z.withParser(emberParser);

function parseOptionsFor(filePath) {
  return filePath.endsWith('.hbs') ? { filePath, templateOnly: true } : { filePath };
}

export function transform(source, { knownRules, filePath = 'input.gjs' } = {}) {
  const warnings = [];

  let root;
  try {
    root = j(source, parseOptionsFor(filePath));
  } catch (err) {
    throw new Error(`${filePath}: parse error — ${err.message}`);
  }

  // Dedupe by `node.start`. Workaround for HBS where templateOnly parsing
  // currently exposes each comment twice (once in the body tree, once in a
  // parallel `comments` array). Without this dedupe, two `path.replace` calls
  // target the same source range and zmod rejects the overlapping patches.
  const seenStarts = new Set();
  let changedCount = 0;

  root.find('GlimmerMustacheCommentStatement').forEach((p) => {
    if (seenStarts.has(p.node.start)) return;
    seenStarts.add(p.node.start);

    const line = p.node.loc && p.node.loc.start ? p.node.loc.start.line : null;
    const emit = (msg) => warnings.push(line != null ? `line ${line}: ${msg}` : msg);

    const result = analyzeDirective(p.node.value, knownRules, emit);
    if (!result) return;

    const replacement = formatComment(result.action, result.rules, p.node.longForm);
    p.replace(replacement);
    changedCount++;
  });

  const output = changedCount > 0 ? root.toSource() : source;
  return { output, warnings, changed: changedCount > 0 };
}

export function loadKnownRules() {
  const rulesDir = path.join(__dirname, '..', 'lib', 'rules');
  return new Set(
    fs
      .readdirSync(rulesDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => f.slice(0, -3))
  );
}

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

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const inputs = args.filter((a) => !a.startsWith('--'));

  if (inputs.length === 0) {
    console.error(
      'usage: migrate-template-lint-directives.mjs [--write] <files-or-dirs>...\n' +
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
    let result;
    try {
      result = transform(src, { knownRules, filePath: file });
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
      continue;
    }
    const { output, warnings, changed } = result;
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
