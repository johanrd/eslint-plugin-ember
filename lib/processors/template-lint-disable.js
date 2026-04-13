'use strict';

const noop = require('ember-eslint-parser/noop');

/**
 * Regex patterns for template-lint-disable/enable mustache comments.
 * Two variants each to avoid polynomial backtracking (ReDoS):
 *   {{! template-lint-disable rule1 rule2 }}
 *   {{!-- template-lint-disable rule1 rule2 --}}
 *
 * Lookahead (?=\s|…) ensures we match exactly "template-lint-disable" /
 * "template-lint-enable" and not suffixed variants like -next-line or -tree.
 */
const MUSTACHE_DISABLE_REGEX = /{{!\s+template-lint-disable(?=\s|}})([\s\w,/@-]*)}}/g;
const MUSTACHE_BLOCK_DISABLE_REGEX = /{{!--\s*template-lint-disable(?=\s|--)([\s\w,/@-]*)--}}/g;
const MUSTACHE_ENABLE_REGEX = /{{!\s+template-lint-enable(?=\s|}})([\s\w,/@-]*)}}/g;
const MUSTACHE_BLOCK_ENABLE_REGEX = /{{!--\s*template-lint-enable(?=\s|--)([\s\w,/@-]*)--}}/g;

const GJS_GTS_EXT = /\.(gjs|gts)$/;

// Store disable ranges per file
const fileDisableRanges = new Map();

function parseRules(capture) {
  const s = (capture || '').trim();
  return s ? s.split(/[\s,]+/).filter(Boolean) : [];
}

/**
 * Scan source text and return a list of disable ranges:
 *   { startLine, endLine, rules }
 *
 * Semantics match ember-template-lint block-scope:
 *   - `template-lint-disable` opens a range starting at the comment's line (inclusive).
 *   - `template-lint-enable` closes the range at the comment's line (exclusive — the
 *     enable line itself is no longer suppressed).
 *   - A disable with no matching enable closes at Infinity (rest of file).
 *
 * `template-lint-enable` with no rules closes all open disable ranges.
 * `template-lint-enable rule-a` closes only open ranges whose rules are fully
 * covered by the enable list (i.e. the exact same rule set was disabled).
 * A "disable all" (no rules) range is only closed by "enable all" (no rules).
 *
 * CAVEAT: The processor runs on the entire file text, not just template regions.
 * A JS string literal containing `{{! template-lint-disable }}` in a gjs file
 * would match and open a range. This is unlikely in practice but impossible to
 * fix without region-aware parsing.
 */
function parseDisableRanges(text) {
  const lines = text.split('\n');
  const openRanges = []; // { startLine, rules }
  const ranges = []; // { startLine, endLine, rules }

  for (const [i, line] of lines.entries()) {
    const lineNum = i + 1; // 1-indexed

    for (const regex of [MUSTACHE_DISABLE_REGEX, MUSTACHE_BLOCK_DISABLE_REGEX]) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        openRanges.push({ startLine: lineNum, rules: parseRules(match[1]) });
      }
    }

    for (const regex of [MUSTACHE_ENABLE_REGEX, MUSTACHE_BLOCK_ENABLE_REGEX]) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const enableRules = parseRules(match[1]);
        if (enableRules.length === 0) {
          // Enable all: close every open range
          for (const open of openRanges) {
            ranges.push({ startLine: open.startLine, endLine: lineNum, rules: open.rules });
          }
          openRanges.length = 0;
        } else {
          // Enable specific rules: close open ranges whose rule sets are fully covered
          const remaining = [];
          for (const open of openRanges) {
            if (
              open.rules.length > 0 &&
              open.rules.every((r) => enableRules.includes(r))
            ) {
              ranges.push({ startLine: open.startLine, endLine: lineNum, rules: open.rules });
            } else {
              remaining.push(open);
            }
          }
          openRanges.length = 0;
          openRanges.push(...remaining);
        }
      }
    }
  }

  // Unclosed disables extend to end of file
  for (const open of openRanges) {
    ranges.push({ startLine: open.startLine, endLine: Infinity, rules: open.rules });
  }

  return ranges;
}

/**
 * Map a rule name from template-lint format to eslint-plugin-ember format.
 * Accepts three forms:
 *   "no-bare-strings"                  -> "ember/template-no-bare-strings"
 *   "template-no-bare-strings"         -> "ember/template-no-bare-strings"
 *   "ember/template-no-bare-strings"   -> exact match
 */
function matchesRule(ruleId, disableRuleName) {
  if (ruleId === disableRuleName) {
    return true;
  }
  if (ruleId === `ember/${disableRuleName}`) {
    return true;
  }
  if (ruleId === `ember/template-${disableRuleName}`) {
    return true;
  }
  return false;
}

function shouldSuppressMessage(message, ranges) {
  for (const range of ranges) {
    // startLine is inclusive, endLine is exclusive (the line of the enable comment itself is not suppressed)
    if (message.line < range.startLine || message.line >= range.endLine) {
      continue;
    }
    if (range.rules.length === 0) {
      return true; // disable all
    }
    if (range.rules.some((rule) => matchesRule(message.ruleId, rule))) {
      return true;
    }
  }
  return false;
}

module.exports = {
  preprocess(text, fileName) {
    if (!text.includes('template-lint-disable')) {
      fileDisableRanges.delete(fileName);
      return [text];
    }

    const ranges = parseDisableRanges(text);
    if (ranges.length > 0) {
      fileDisableRanges.set(fileName, ranges);
    } else {
      fileDisableRanges.delete(fileName);
    }
    return [text];
  },

  postprocess(messages, fileName) {
    // Only run noop's postprocess for gjs/gts files — it appends gjs/gts setup
    // instructions on parse failures, which corrupts hbs error messages since
    // the hbs parser never calls registerParsedFile.
    const msgs = GJS_GTS_EXT.test(fileName)
      ? noop.postprocess(messages, fileName)
      : messages.flat();

    const ranges = fileDisableRanges.get(fileName);
    if (!ranges) {
      return msgs;
    }

    fileDisableRanges.delete(fileName);
    return msgs.filter((message) => !shouldSuppressMessage(message, ranges));
  },

  supportsAutofix: true,
};
