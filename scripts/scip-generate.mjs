#!/usr/bin/env node
/**
 * scip-generate.mjs — Deterministically generate a full SCIP graph of this repo.
 *
 * SCIP (Code Intelligence Protocol) is a language-agnostic representation of a
 * codebase: a graph where every definition, reference and type relationship of
 * every symbol carries a stable, deterministic symbol-id, and every source file
 * is a "document". The binary graph is written to `index.scip`.
 *
 * `scip-typescript` (Sourcegraph's official SCIP indexer for TS/JS) drives the
 * real TypeScript compiler against a tsconfig. It emits a document for EVERY
 * file in the program's `include` set (not just files reachable from an entry
 * point), so the result deterministically covers all source. See
 * tsconfig.scip.json, which extends this repo's tsconfig and adds the tests.
 *
 * `index.scip` is protobuf — great for machines, opaque for LLMs. `scip
 * snapshot` (the scip CLI) renders each document to a text view where every
 * token is annotated with its SCIP symbol id (definitions, references,
 * documentation signatures, enclosing-range markers). This script stitches
 * every per-file snapshot into one file `scip-graph.llm.txt` (the thing to
 * hand to an LLM), writes `scip-coverage.txt` (a manifest proving every
 * .ts/.tsx on disk is represented) and prints a stats summary.
 *
 * Usage (local-only tool):
 *   node scripts/scip-generate.mjs            # = all (index + snapshot + report)
 *   node scripts/scip-generate.mjs index      # just produce index.scip
 *   node scripts/scip-generate.mjs snapshot   # index.scip -> scip-snapshot/
 *   node scripts/scip-generate.mjs report     # snapshots -> single LLM file
 *
 * This is a LOCAL, out-of-band tool. It is intentionally NOT wired into
 * package.json, npm scripts, CI, or any build/deploy path — running it never
 * changes the repo's package.json or package-lock.json, and it does not touch
 * the app's node_modules. Every dependency (the `scip` CLI binary and the
 * `@sourcegraph/scip-typescript` indexer) is installed once, in isolation,
 * under scripts/.tools/ (gitignored).
 *
 * Requirements: Node 20+ and network access on the FIRST run only, to fetch
 * the pinned scip CLI binary (from GitHub releases) and the pinned indexer
 * (from the npm registry). The cached copies live in scripts/.tools/.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolDir = path.join(ROOT, 'scripts', '.tools');
const scipBin = path.join(toolDir, 'scip');
const scipVersion = process.env.SCIP_VERSION || 'v0.9.0';
const indexerVersion = process.env.SCIP_INDEXER_VERSION || '0.4.0';
const indexerDir = path.join(toolDir, 'indexer');
const INDEXER_MAIN = path.join(
  indexerDir, 'node_modules', '@sourcegraph', 'scip-typescript', 'dist', 'src', 'main.js',
);

const TSCONFIG = path.join(ROOT, 'tsconfig.scip.json');
const INDEX_OUT = path.join(ROOT, 'index.scip');
const SNAPSHOT_DIR = path.join(ROOT, 'scip-snapshot');
const LLM_FILE = path.join(ROOT, 'scip-graph.llm.txt');
const COVERAGE_FILE = path.join(ROOT, 'scip-coverage.txt');

function log(msg) { console.log('[scip] ' + msg); }
function fail(msg) {
  console.error('[scip] error: ' + msg);
  process.exit(1);
}
function enc(s) { return new Uint8Array(Buffer.from(s, 'utf8')); }
function norm(p) { return p.split(path.sep).join('/'); }
/* ------------------------------------------------------------------ */
/* scip CLI binary (fetched once, pinned version)                      */
/* ------------------------------------------------------------------ */

function ensureScipBinary() {
  if (fs.existsSync(scipBin)) {
    const v = spawnSync(scipBin, ['--version'], { encoding: 'utf8' }).stdout;
    if (/\d+\.\d+\.\d+/.test(v)) return; // already a usable scip binary
  }
  const platform = os.platform(); // darwin | linux
  const archMap = { x64: 'amd64', arm64: 'arm64' };
  const arch = archMap[os.arch()];
  if ((platform !== 'darwin' && platform !== 'linux') || !arch) {
    fail(
      'no prebuilt scip CLI for ' + os.platform() + '/' + os.arch() +
      '; download from https://github.com/scip-code/scip/releases and place it at ' + scipBin
    );
  }
  const url =
    'https://github.com/scip-code/scip/releases/download/' + scipVersion +
    '/scip-' + platform + '-' + arch + '.tar.gz';
  log('fetching scip CLI ' + scipVersion + ' (' + platform + '/' + arch + ') -> scripts/.tools/');
  fs.mkdirSync(toolDir, { recursive: true });
  const tmp = path.join(toolDir, 'scip-download.tmp');
  const curl = spawnSync('curl', ['-fsSL', url], { maxBuffer: 64 * 1024 * 1024 });
  if (curl.status !== 0) fail('could not download scip CLI (' + url + ')');
  fs.writeFileSync(tmp, curl.stdout);
  const tar = spawnSync('tar', ['xzf', tmp, '-C', toolDir, 'scip'], { encoding: 'utf-8' });
  fs.rmSync(tmp, { force: true });
  if (tar.status !== 0) fail('could not extract scip CLI from tarball: ' + tar.stderr);
  fs.chmodSync(scipBin, 0o755);
  log('scip CLI ready: ' + spawnSync(scipBin, ['--version'], { encoding: 'utf-8' }).stdout.trim());
}

/* ------------------------------------------------------------------ */
/* TS indexer (installed once, isolated, pinned version)               */
/* ------------------------------------------------------------------ */

function ensureIndexer() {
  if (fs.existsSync(INDEXER_MAIN)) return INDEXER_MAIN; // already installed
  fs.mkdirSync(indexerDir, { recursive: true });
  fs.writeFileSync(
    path.join(indexerDir, 'package.json'),
    JSON.stringify({ name: 'local-scip-indexer', private: true, version: '0.0.0' }, null, 2),
  );
  log('installing @sourcegraph/scip-typescript@' + indexerVersion
    + ' (isolated) -> scripts/.tools/indexer/');
  const res = spawnSync(
    'npm', ['install', '--no-save', '--no-audit', '--no-fund', '@sourcegraph/scip-typescript@' + indexerVersion],
    { cwd: indexerDir, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
  );
  process.stdout.write(res.stdout || '');
  process.stderr.write(res.stderr || '');
  if (res.status !== 0) fail('could not install the TypeScript SCIP indexer.');
  if (!fs.existsSync(INDEXER_MAIN)) {
    fail('indexer installed but expected entry was not found: ' + INDEXER_MAIN);
  }
  log('indexer ready: @sourcegraph/scip-typescript@' + indexerVersion);
  return INDEXER_MAIN;
}

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

function runIndex() {
  log('=== STEP 1/3: index -> index.scip ===');
  const indexerMain = ensureIndexer();
  fs.rmSync(INDEX_OUT, { force: true });
  const heapMb = process.env.SCIP_MAX_HEAP_MB || '8192';
  const args = [
    '--max-old-space-size=' + heapMb,
    indexerMain,
    'index',
    '--cwd', ROOT,
    '--output', INDEX_OUT,
    TSCONFIG
  ];
  const res = spawnSync(process.execPath, args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  process.stdout.write(res.stdout || '');
  process.stderr.write(res.stderr || '');
  if (res.status !== 0) fail('scip-typescript index failed.');
  if (!fs.existsSync(INDEX_OUT)) fail('scip-typescript produced no index.scip');
  log('index written: ' + path.relative(ROOT, INDEX_OUT) + ' (' + byteFormat(fs.statSync(INDEX_OUT).size) + ')');
}

function runSnapshot() {
  log('=== STEP 2/3: index -> scip-snapshot/ (annotated, one file per doc) ===');
  ensureScipBinary();
  fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
  // --strict=false: scip-typescript emits references to *external* package
  // symbols (e.g. @types/react, vitest) whose bodies live outside this repo.
  // Snapshot validation flags those as unresolved; they are valid external
  // links, so we still emit the full per-document view.
  const args = ['snapshot', '--from', INDEX_OUT, '--to', SNAPSHOT_DIR, '--strict=false'];
  const res = spawnSync(scipBin, args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  process.stdout.write(res.stdout || '');
  process.stderr.write(res.stderr || '');
  if (res.status !== 0) fail('scip snapshot failed.');
  const count = walkFiles(SNAPSHOT_DIR).length;
  log('snapshot written: ' + count + ' documents -> ' + path.relative(ROOT, SNAPSHOT_DIR) + '/');
  return count;
}

function runStats() {
  const res = spawnSync(scipBin, ['stats', '--from', INDEX_OUT], { encoding: 'utf-8' });
  // `scip stats` prints a multi-line pretty-printed JSON object to stdout.
  const text = (res.stdout || '').trim();
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function walkFiles(dir, out = undefined) {
  if (out === undefined) out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function byteFormat(bytes) {
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  if (bytes > 0) i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + units[i];
}
/* ------------------------------------------------------------------ */
/*  Report: coverage manifest + single LLM snapshot file               */
/* ------------------------------------------------------------------ */

function runReport() {
  log('=== STEP 3/3: coverage manifest + single LLM snapshot file ===');
  const stats = runStats();
  const docPaths = walkFiles(SNAPSHOT_DIR)
    .map((f) => norm(path.relative(SNAPSHOT_DIR, f)))
    .sort();

  // 3a: coverage manifest — every document the graph contains, one path/line.
  writeFile(COVERAGE_FILE, enc(docPaths.join('\n') + '\n'));
  log('coverage manifest: ' + path.relative(ROOT, COVERAGE_FILE) + ' (' + docPaths.length + ' files)');

  // 3b: on-disk .ts/.tsx that did NOT make it into the graph (should be none).
  const missing = scanMissing(docPaths);
  if (missing.length > 0) {
    log('WARNING: these on-disk files are NOT represented in the graph:');
    missing.forEach((m) => log('  - ' + m));
  }

  // 3c: one concatenated LLM file: header + a section per document.
  const chunks = [enc(buildHeader(stats, docPaths.length))];
  for (const rel of docPaths) {
    chunks.push(enc('\n\n' + repl('=', 80) + '\n'));
    chunks.push(enc('# DOCUMENT: ' + rel + '\n'));
    chunks.push(enc(repl('=', 80) + '\n'));
    chunks.push(fs.readFileSync(path.join(SNAPSHOT_DIR, rel)));
  }
  writeFile(LLM_FILE, Buffer.concat(chunks.map(Buffer.from)));
  log('combined LLM snapshot: ' + path.relative(ROOT, LLM_FILE) + ' (' + byteFormat(fs.statSync(LLM_FILE).size) + ')');

  console.log('');
  console.log(buildSummary(stats, docPaths.length, docPaths.length));
}

function sizeOf() { return fs.statSync(INDEX_OUT).size; }
function repl(char, n) { return new Array(n + 1).join(char); }

function scanMissing(docPaths) {
  const covered = new Set(docPaths);
  const missing = [];
  for (const base of ['src', 'tests']) {
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    for (const f of walkFiles(dir)) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const rel = norm(path.relative(ROOT, f));
      if (!covered.has(rel)) missing.push(rel);
    }
  }
  for (const f of ['next.config.ts', 'tailwind.config.ts', 'vitest.config.ts', 'next-env.d.ts']) {
    if (fs.existsSync(path.join(ROOT, f)) && !covered.has(f)) missing.push(f);
  }
  return missing;
}
function writeFile(p, buffer) { fs.writeFileSync(p, Buffer.from(buffer)); }
function buildSummary(stats, docTotal, covered) {
  return [
    'SCIP for resume-tailor',
    '  documents      : ' + docTotal,
    '  occurrences    : ' + (stats.occurrences ?? 0),
    '  definitions    : ' + (stats.definitions ?? 0),
    '  coverage       : ' + covered + ' files (see ' + path.relative(ROOT, COVERAGE_FILE) + ')',
    '  binary graph   : ' + path.relative(ROOT, INDEX_OUT),
    '  per-file views : ' + path.relative(ROOT, SNAPSHOT_DIR) + '/',
    '  LLM report     : ' + path.relative(ROOT, LLM_FILE),
    '  regenerate     : node scripts/scip-generate.mjs (deterministic)',
  ].join('\n');
}

function buildHeader(stats, docCount) {
  return [
    '[ SCIP GRAPH - FULL REPOSITORY ]',
    'project_root      : ' + ROOT,
    'protocol          : SCIP ' + scipVersion,
    'indexer           : @sourcegraph/scip-typescript (via tsconfig.scip.json)',
    'graph bytes        : ' + byteFormat(sizeOf()),
    'documents         : ' + docCount,
    'occurrences       : ' + (stats.occurrences ?? 0),
    'definitions       : ' + (stats.definitions ?? 0),
    '',
    'HOW TO READ THIS FILE',
    'Every .ts/.tsx document in the repo is rendered below with the SCIP',
    'occurrence annotations its indexer produced. Each token is annotated with',
    'a stable symbol-id such as:',
    '',
    '    scip-typescript npm resume-tailor 0.1.0 src/app/utils/`fontSize.ts`/getFontSizeClass().',
    '',
    'Reading a symbol-id (left to right):',
    ' - `scip-typescript` : the indexing scheme; `npm` the package manager.',
    ' - `resume-tailor`   : package name, `0.1.0` the project version.',
    ' - `src/app/...`     : the file path holding the symbol.',
    ' - Descriptors: `/` followed by an identifier = a value; `#` = a type/member;',
    '   `.` = a field/property; `()` = a method; `#method()` = a method of a type.',
    '',
    ' - `definition` marks where a symbol is DECLARED; `reference` marks a USE.',
    ' - The `^` markers sit under the tokens they annotate; indentation keeps',
    '   each caret under its token. `documentation` blocks show signatures.',
    ' - `enclosing_range_start/end` marks a construct spanning multiple lines.',
    '',
    'External symbols (node_modules packages such as @types/react, vitest,',
    '@supabase/...) point at symbol-ids whose source lives outside this repo,',
    'so the caret shows the symbol name but not its body. That body is not part',
    'of the `resume-tailor` graph.',
    '',
    'Sections are ordered alphabetically by relative path, each below a',
    '`# DOCUMENT: <path>` banner. This concatenation is a deterministic and',
    'complete graph view you can hand to an LLM for deep repository analysis.',
    '',
    repl('=', 86),
    '# DOCUMENTS (alphabetical by relative path)',
    repl('=', 86),
    '',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/*  Entry                                                              */
/* ------------------------------------------------------------------ */

const cmd = process.argv[2] || 'all';

function internalMain() {
  if (cmd === 'index') {
    runIndex();
  } else if (cmd === 'snapshot') {
    runSnapshot();
  } else if (cmd === 'report') {
    runReport();
  } else {
    runIndex();
    runSnapshot();
    runReport();
  }
}

internalMain();