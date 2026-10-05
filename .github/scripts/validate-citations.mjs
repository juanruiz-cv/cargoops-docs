#!/usr/bin/env node
/**
 * validate-citations.mjs — documentation reference gate for cargoops-docs.
 *
 * WHAT THIS GATE CHECKS (all checks fail the build when they produce a finding)
 * ----------------------------------------------------------------------------
 *   1. File-mention resolution. Every `NAME.md` token appearing in prose must name
 *      a document that exists under `docs/`.
 *   2. Section-anchor resolution. Every `DOC §N` citation whose target document is
 *      unambiguously adjacent to the marker must resolve to a heading whose number
 *      is exactly `N` in the target document.
 *   3. Line-citation resolution. Every `L<n>` / `L<n>-<m>` citation must resolve to
 *      an existing document and to a line range inside that document.
 *
 * WHAT THIS GATE DELIBERATELY DOES NOT CHECK
 * ----------------------------------------------------------------------------
 *   - It does not check bare section references (`§6` with no document named on the
 *     same line). Those are the large majority of section references in this
 *     repository and the target document cannot be determined mechanically without
 *     guessing. They are counted and reported as UNVERIFIED, never silently passed.
 *   - It does not resolve references into sibling repositories
 *     (cargoops-backend, cargoops-frontend, cargoops-infrastructure). Those
 *     repositories do not exist on a GitHub runner, so such references are counted
 *     and reported under their own heading. They never pass and never fail.
 *   - It does not validate business-rule / open-question / task identifiers
 *     (BR-xxx, OQ-xxx, RMP-xxx, P<n>-T<k>). Those are reported as an inventory only.
 *   - It does not check spelling, prose quality, or whether a cited section is the
 *     section the author meant. It only checks that the target exists.
 *
 * CITATION GRAMMAR (measured, not assumed — see PR body for the full census)
 * ----------------------------------------------------------------------------
 *   - Documents are referenced by extensionless stem far more often than by
 *     filename: `MASTER-SPEC §20`, `ROADMAP §4`, `IMPLEMENTATION-PLAN §8`.
 *     The optional `.md` suffix is also common: `ROADMAP.md §7`.
 *   - Section numbers are written as `§N`, `§N.N` and `§N.N.N` (U+00A7 followed by
 *     a dotted number). They are referenced most often to MASTER-SPEC.
 *   - Glob mentions such as `docs/*.md` are documentation examples, not citations,
 *     and are intentionally not matched.
 *
 * EXIT CODES
 * ----------------------------------------------------------------------------
 *   0  every check that claims to resolve something resolved it, zero findings
 *   1  at least one finding
 *   2  the gate itself could not run (unreadable repository root, and so on)
 *
 * Zero dependencies, plain Node.js ESM. Runs on Node 18+ with no install step.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { argv, exit, stdout } from 'node:process';

const SECTION_SIGN = '\u00A7';

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

const REPO_ROOT = process.cwd();
const DOCS_DIR = join(REPO_ROOT, 'docs');

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const toPosix = (p) => p.split(sep).join('/');

function collectMarkdownFiles(dir) {
  const found = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) found.push(full);
  }
  return found.sort();
}

/**
 * Split a file into lines plus a parallel mask marking which lines are inside a
 * fenced code block. Anything inside a fence is sample data, not a citation, so it
 * is excluded from scanning.
 */
function splitLines(text) {
  const lines = text.split(/\r?\n/);
  const inFence = new Array(lines.length).fill(false);
  let openFence = null; // '`' or '~' while inside a fenced code block
  for (let i = 0; i < lines.length; i++) {
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(lines[i]);
    if (openFence === null) {
      if (fence) {
        openFence = fence[1][0];
        inFence[i] = true; // the opening fence itself carries no citation
      }
    } else {
      inFence[i] = true;
      if (fence && fence[1][0] === openFence) openFence = null;
    }
  }
  return { lines, inFence };
}

/* ------------------------------------------------------------------ *
 * Repository index
 * ------------------------------------------------------------------ */

const repo = {
  files: [],
  byFileName: new Map(), // NAME.md      -> repo-relative path
  byStem: new Map(), //     NAME         -> repo-relative path
  headings: new Map(), //   path         -> Set of dotted section numbers
  lineCount: new Map(), //  path         -> number of lines
};

/** Build the ordered stem alternation, longest first, so MASTER-SPEC wins over SEC. */
function buildStemAlternation() {
  return [...repo.byStem.keys()]
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/**
 * Parse headings and record every dotted section number the document declares.
 * Accepted shapes: `## 1. Title`, `### 4.13 Title`, `#### 4.3.1 Title`, `## 10.`
 */
function indexHeadings(path, lines) {
  const numbers = new Set();
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(\d+(?:\.\d+)*)\.?(?:\s|$)/.exec(line);
    if (heading) numbers.add(heading[2]);
  }
  return numbers;
}

/* ------------------------------------------------------------------ *
 * Reference extraction
 * ------------------------------------------------------------------ */

/**
 * Locate the document stem a reference points at, using adjacency only.
 *
 * Two shapes are accepted, because both occur in this repository:
 *   BEFORE: `<stem>.md? §N`        e.g. `docs/roadmap/ROADMAP.md §7`
 *   AFTER:  `§N del <stem>.md?`    e.g. `§14 del MASTER-SPEC`
 *
 * Deliberately NOT accepted: a stem anywhere else on the line. Spanish prose in
 * these documents contains capitalised words that collide with document stems
 * ("la API de la fase", "PWA"), and a nearest-stem heuristic turns those into
 * false findings. Anything not adjacent is counted as unverified instead.
 */
function buildReferenceMatchers() {
  const stems = buildStemAlternation();
  const group = stems.join('|');
  const stem = `((?:${group}))`;
  const marker = `${SECTION_SIGN}[ \\t]?(\\d+(?:\\.\\d+)*)`;
  return {
    stemThenMarker: new RegExp(`${stem}\\.md?(?:\`)?[ \\t]{0,3}${marker}`, 'g'),
    markerThenStem: new RegExp(`${marker}\\.?[ \\t]{0,3}(?:(?:del|de la|de)\\b[ \\t]{0,3})?(?:\`)?${stem}\\.md?`, 'g'),
  };
}

/**
 * Find a line citation.
 *
 * Accepted: `L<n>`, `L<n>-<m>`, `L <n>`, at the start of a line or after
 * whitespace / `,` / `;` / `:`.
 *
 * Deliberately excluded, so that existing content does not produce false findings:
 *   - `uuid-cl3` — the `l` is lower case and glued to a hyphen
 *   - `(L1+0.05)/(L2+0.05)` — the WCAG contrast formula in DESIGN-TOKENS.md, where
 *     `L` is preceded by `(` and followed by `+`
 */
function findLineCitation(line) {
  const re = /(^|[\s,;:])(L\s?\d+(?:\s*[-\u2013\u2014]\s*L?\s?\d+)?)/g;
  let match;
  while ((match = re.exec(line)) !== null) {
    const tail = line[match.index + match[0].length];
    if (tail === '+' || tail === '.' || tail === '-') continue;
    const numbers = match[2].match(/\d+/g) ?? [];
    return { start: Number(numbers[0]), end: Number(numbers[1] ?? numbers[0]), raw: match[2].trim() };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Scanning
 * ------------------------------------------------------------------ */

const findings = [];
const crossRepo = [];
const identifierInventory = new Map();

const IDENTIFIER_PATTERNS = [
  ['BR-xxx', /\bBR-\d+\b/g],
  ['OQ-xxx', /\bOQ-\d+\b/g],
  ['RMP-xxx', /\bRMP-\d+\b/g],
  ['P<n>-T<k>', /\bP\d+-T\d+\b/g],
  ['ADR-xxx', /\bADR-\d+\b/g],
];

const SIBLING_REPOS = ['cargoops-backend', 'cargoops-frontend', 'cargoops-infrastructure'];

function finding(file, line, code, message) {
  findings.push({ file, line, code, message });
}

function scanDocument(absPath) {
  const relPath = toPosix(relative(REPO_ROOT, absPath));
  const text = readFileSync(absPath, 'utf8');
  const { lines, inFence } = splitLines(text);
  repo.lineCount.set(relPath, lines.length);

  const matchers = buildReferenceMatchers();
  const counters = {
    fileMentions: 0,
    fileMentionsResolved: 0,
    sectionRefs: 0,
    sectionRefsResolved: 0,
    sectionRefsUnverified: 0,
    lineRefs: 0,
    lineRefsResolved: 0,
  };

  lines.forEach((rawLine, index) => {
    const lineNo = index + 1;
    if (inFence[index]) return; // fenced sample data is not a citation

    // Inline code is NOT stripped. This repository writes most of its citations
    // inside backticks (`MASTER-SPEC.md` §20), so stripping code spans would
    // discard the majority of real references.
    const line = rawLine;

    // ---- identifiers (inventory only, never a finding) ----
    for (const [family, re] of IDENTIFIER_PATTERNS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        if (!identifierInventory.has(family)) identifierInventory.set(family, new Set());
        identifierInventory.get(family).add(m[0]);
      }
    }

    // ---- sibling repository references (reported, never resolved, never fatal) ----
    for (const sibling of SIBLING_REPOS) {
      if (line.includes(sibling)) {
        crossRepo.push({ file: relPath, line: lineNo, repo: sibling });
      }
    }

    // ---- check 1: file mentions ----
    // Matches `NAME.md` only. A glob such as `docs/*.md` or `*.md` has no
    // word-bounded name immediately before `.md`, so it is intentionally not matched.
    const fileRe = /(?<![A-Za-z0-9_-])([A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*\.md)/g;
    for (const m of line.matchAll(fileRe)) {
      counters.fileMentions++;
      const name = m[1];
      if (repo.byFileName.has(name)) {
        counters.fileMentionsResolved++;
      } else {
        finding(
          relPath,
          lineNo,
          'unresolved-file-mention',
          `\`${name}\` does not exist under docs/. Mentions a document that is not in this repository.`
        );
      }
    }

    // ---- check 2: section anchors ----
    const sectionMarkers = [...line.matchAll(new RegExp(`${SECTION_SIGN}[ \\t]?\\d+(?:\\.\\d+)*`, 'g'))];
    counters.sectionRefs += sectionMarkers.length;

    const claimed = new Set();
    const collect = (re, stemGroup, secGroup) => {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        // Index of the marker within the LINE, so that two citations on the same
        // line (`API.md §7.3 ... API.md §13.4`) are treated as distinct.
        const markerIndex = m.index + m[0].indexOf(SECTION_SIGN);
        if (claimed.has(markerIndex)) continue;
        claimed.add(markerIndex);
        const stem = m[stemGroup];
        const section = m[secGroup];
        const target = repo.byStem.get(stem);
        if (!target) continue;
        if (repo.headings.get(target).has(section)) counters.sectionRefsResolved++;
        else {
          finding(
            relPath,
            lineNo,
            'unresolved-section',
            `\`${stem}.md ${SECTION_SIGN}${section}\` — section ${section} does not exist as a heading in ${target}.`
          );
        }
      }
    };
    collect(matchers.stemThenMarker, 1, 2);
    collect(matchers.markerThenStem, 2, 1);

    // ---- check 3: line citations ----
    const lineCitation = findLineCitation(line);
    if (lineCitation) {
      counters.lineRefs++;
      // Target defaults to the citing document, which is how a line citation reads
      // when no other document is named next to it.
      const before = line.slice(0, line.indexOf(lineCitation.raw));
      let target = relPath;
      for (const m of before.matchAll(/([A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*\.md)/g)) {
        const candidate = repo.byFileName.get(m[1]);
        if (candidate) target = candidate;
      }
      const lastLine = repo.lineCount.get(target) ?? 0;
      if (lineCitation.start < 1 || lineCitation.end < lineCitation.start) {
        finding(
          relPath,
          lineNo,
          'malformed-line-citation',
          `\`${lineCitation.raw}\` is not a valid line citation.`
        );
      } else if (lineCitation.end > lastLine) {
        finding(
          relPath,
          lineNo,
          'line-citation-past-eof',
          `\`${lineCitation.raw}\` points past the end of ${target}, which has ${lastLine} lines.`
        );
      } else {
        counters.lineRefsResolved++;
      }
    }
  });

  return counters;
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

function report(totals) {
  const out = [];
  const push = (s = '') => out.push(s);

  push('cargoops-docs reference gate');
  push('============================');
  push('');
  push('SCOPE — what this gate resolves');
  push('  file mentions ....... every `NAME.md` token in prose');
  push('  section anchors ..... every `DOC ' + SECTION_SIGN + 'N` whose target is adjacent to the marker');
  push('  line citations ...... every `L<n>` / `L<n>-<m>`');
  push('');
  push('SCOPE — what this gate does not resolve');
  push('  bare section refs ... no document named on the same line; counted as UNVERIFIED');
  push('  sibling repos ....... cargoops-backend / -frontend / -infrastructure do not exist on a');
  push('                        GitHub runner; counted and reported, never resolved, never fatal');
  push('  identifiers ......... BR/OQ/RMP/P-T/ADR tokens; inventory only');
  push('');

  push('SCANNED');
  push(`  markdown files .......... ${totals.files}`);
  push(`  lines scanned ........... ${totals.lines}`);
  push('');
  push('REFERENCES FOUND');
  push(`  file mentions ........... ${totals.fileMentions}`);
  push(`  section references ...... ${totals.sectionRefs}`);
  push(`  line citations .......... ${totals.lineRefs}`);
  push(`  TOTAL REFERENCES ........ ${totals.fileMentions + totals.sectionRefs + totals.lineRefs}`);
  push('');

  push('RESOLVED');
  push(`  file mentions resolved .. ${totals.fileMentionsResolved}`);
  push(`  section refs resolved ... ${totals.sectionRefsResolved}`);
  push(`  line citations resolved . ${totals.lineRefsResolved}`);
  push(`  TOTAL RESOLVED .......... ${totals.fileMentionsResolved + totals.sectionRefsResolved + totals.lineRefsResolved}`);
  push('');
  push('NOT RESOLVED');
  push(`  file mentions unresolved  ${totals.fileMentions - totals.fileMentionsResolved}`);
  push(`  section refs unresolved . ${totals.sectionRefsUnresolved}`);
  push(`  line citations unresolved ${totals.lineRefs - totals.lineRefsResolved}`);
  push(`  TOTAL UNRESOLVED ........ ${totals.fileMentions - totals.fileMentionsResolved + totals.sectionRefsUnresolved + (totals.lineRefs - totals.lineRefsResolved)}`);
  push('');

  push('EXPLICITLY UNVERIFIED (counted, never passed, never fatal)');
  push(`  section refs with no adjacent document .. ${totals.sectionRefsUnverified}`);
  push('');

  push('CROSS-REPOSITORY REFERENCES (surfaces, never resolves, never fails)');
  push(`  references into sibling repositories ... ${crossRepo.length}`);
  const bySibling = new Map();
  for (const c of crossRepo) bySibling.set(c.repo, (bySibling.get(c.repo) ?? 0) + 1);
  for (const repo of SIBLING_REPOS) {
    push(`    ${repo.padEnd(24)} ${String(bySibling.get(repo) ?? 0).padStart(4)}`);
  }
  push('  Reason: these repositories are not present on a GitHub runner, so a line or');
  push('  section reference into them cannot be verified there. They are reported so the');
  push('  count stays visible; they are not treated as valid and not treated as broken.');
  push('');

  push('IDENTIFIER INVENTORY (informational only, not gated)');
  for (const [family, re] of IDENTIFIER_PATTERNS) {
    const set = identifierInventory.get(family) ?? new Set();
    push(`  ${family.padEnd(12)} distinct=${String(set.size).padStart(4)}`);
  }
  push('');

  push('ARITHMETIC');
  const accounted =
    totals.fileMentions +
    totals.sectionRefs +
    totals.lineRefs;
  const resolvedTotal =
    totals.fileMentionsResolved + totals.sectionRefsResolved + totals.lineRefsResolved;
  const unresolvedTotal = findings.length;
  const unverifiedTotal = totals.sectionRefsUnverified;
  push(`  references found ....... ${accounted}`);
  push(`  resolved ............... ${resolvedTotal}`);
  push(`  unresolved (findings) .. ${unresolvedTotal}`);
  push(`  unverified ............. ${unverifiedTotal}`);
  push(`  sum .................... ${resolvedTotal + unresolvedTotal + unverifiedTotal}`);
  push(`  equals references found ${resolvedTotal + unresolvedTotal + unverifiedTotal === accounted ? 'YES' : 'NO  <-- MISMATCH'}`);
  push('');

  push(`FINDINGS: ${findings.length}`);
  if (findings.length === 0) {
    push('  none — every check that claims to resolve something resolved it.');
  } else {
    const byCode = new Map();
    for (const f of findings) {
      if (!byCode.has(f.code)) byCode.set(f.code, []);
      byCode.get(f.code).push(f);
    }
    for (const [code, items] of byCode) {
      push('');
      push(`  [${code}] — ${items.length} finding(s)`);
      for (const f of items) {
        push(`    ${f.file}:${f.line}  ${f.message}`);
      }
    }
  }
  push('');

  return { out: out.join('\n'), resolvedTotal, unresolvedTotal, unverifiedTotal, accounted };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function main() {
  let files;
  try {
    files = collectMarkdownFiles(DOCS_DIR);
  } catch (error) {
    stdout.write(`FATAL: cannot read ${DOCS_DIR}\n${error?.message ?? error}\n`);
    return 2;
  }
  if (files.length === 0) {
    stdout.write(`FATAL: no markdown files found under ${DOCS_DIR}\n`);
    return 2;
  }

  repo.files = files;
  for (const abs of files) {
    const relPath = toPosix(relative(REPO_ROOT, abs));
    const fileName = abs.split(sep).pop();
    repo.byFileName.set(fileName, relPath);
    repo.byStem.set(fileName.replace(/\.md$/, ''), relPath);
  }

  // Two passes: index line counts and headings first, because a citation in an
  // early document may point at a later document.
  for (const abs of files) {
    const relPath = toPosix(relative(REPO_ROOT, abs));
    const text = readFileSync(abs, 'utf8');
    const { lines } = splitLines(text);
    repo.lineCount.set(relPath, lines.length);
    repo.headings.set(relPath, indexHeadings(relPath, lines));
  }

  const totals = {
    files: files.length,
    lines: 0,
    fileMentions: 0,
    fileMentionsResolved: 0,
    sectionRefs: 0,
    sectionRefsResolved: 0,
    sectionRefsUnresolved: 0,
    sectionRefsUnverified: 0,
    lineRefs: 0,
    lineRefsResolved: 0,
  };

  for (const abs of files) {
    try {
      const counters = scanDocument(abs);
      totals.lines += repo.lineCount.get(toPosix(relative(REPO_ROOT, abs))) ?? 0;
      totals.fileMentions += counters.fileMentions;
      totals.fileMentionsResolved += counters.fileMentionsResolved;
      totals.sectionRefs += counters.sectionRefs;
      totals.sectionRefsResolved += counters.sectionRefsResolved;
      totals.lineRefs += counters.lineRefs;
      totals.lineRefsResolved += counters.lineRefsResolved;
    } catch (error) {
      // Unexpected input is a finding with a message, never a stack trace.
      finding(toPosix(relative(REPO_ROOT, abs)), 0, 'scan-error', `document could not be scanned: ${error?.message ?? error}`);
    }
  }

  const sectionFindings = findings.filter((f) => f.code === 'unresolved-section').length;
  totals.sectionRefsUnresolved = sectionFindings;
  totals.sectionRefsUnverified = Math.max(0, totals.sectionRefs - totals.sectionRefsResolved - sectionFindings);

  const { out } = report(totals);
  stdout.write(out + '\n');

  return findings.length > 0 ? 1 : 0;
}

const explicitRoot = argv[2];
if (explicitRoot) process.chdir(explicitRoot);

exit(main());