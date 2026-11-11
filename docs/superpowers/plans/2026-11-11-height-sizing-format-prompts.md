# Single-Height Sizing, AVIF Support & Interactive Format Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `800px` height-only proportional resizing, `avif` output/input support with smart default quality (`65`), and an interactive `jpg / webp / avif` format prompt to `npm start`.

**Architecture:** Extend `src/parser.js` to return `{ width: null, height }` for single-height inputs and leave omitted `format`/`quality` undefined so `bin/cli.js` can distinguish explicit CLI flags from interactive TTY prompts (`src/prompt.js`) and format defaults. Add `resolveTargetDimensions` in `src/ratio.js` so `src/processor.js` computes each image's EXIF-aware proportional width in height mode while retaining strict ratio checks for `WxH`, and branch encoding cleanly across JPG (`mozjpeg`), WebP, and AVIF.

**Tech Stack:** Node.js `>= 20.0.0` (CommonJS), `sharp ^0.35.5`, built-in `node:test` and `node:readline/promises`.

**Spec:** `docs/superpowers/specs/2026-11-11-height-sizing-format-prompts-design.md`

## Global Constraints

- Node.js `>= 20.0.0`, CommonJS modules (`require`/`module.exports`), zero devDependencies, `sharp` (`^0.35.5`) as sole runtime dependency.
- Keep `convert.js` backwards-compatible, keep `--yes` defaults (`800x800`, `jpg`), and preserve user files inside `input/` and `output/`.
- Never crop, stretch, or silently alter explicit `WxH` mismatch checks (`1%` tolerance, EXIF-aware).
- Preserve exact original filename stems (`<name>.jpg` / `<name>.webp` / `<name>.avif`) and flatten transparency onto `bg` (`#ffffff` default).
- Verify all changes with `npm test` (`node --test test/*.test.js`).

## Review Focus

- **Invalid format typed interactively (`gif`) or CLI `--format gif`:** `parseFormat` rejects cleanly and `runCli` returns exit code `1` with an explicit error (tested in Task 1 & Task 4).
- **Computed width out of bounds in height mode (`10000x100` resized to `800px` height computes width `80000 > MAX_DIMENSION`):** returns `status: 'failed'` (`reason: 'dimension-out-of-range'`) for that file without aborting valid siblings (tested in Task 2 & Task 3).
- **Format casing, leading dot, and `jpeg` alias (`WEBP`, `.avif`, `JPEG`):** normalized cleanly to `webp`, `avif`, `jpg` (tested in Task 1).
- **EXIF-rotated photo in height-only mode (`800x400` with `orientation: 6` = portrait `400x800`):** height `400px` scales after orientation correction to `200x400` (tested in Task 3).
- **Explicit `--format` suppresses interactive format prompt in TTY mode:** `ask` is not called for format when `--format` / `-f` is already provided (tested in Task 4).

---

### Task 1: Size, Format, and Default-Quality Parsing (`src/parser.js`)

**Files:**
- Modify: `src/parser.js:1-252`
- Test: `test/parser.test.js:1-145`

**Interfaces:**
- Produces:
  - `parseSize(rawSize: string) -> { width: number | null, height: number }` (`width` is `null` for `800` / `800px`, positive integer for `WxH`)
  - `parseFormat(rawFormat: string) -> 'jpg' | 'webp' | 'avif'`
  - `getDefaultQuality(format: string) -> number` (`65` for `'avif'`, `85` otherwise)
  - `parseArgs(argv: string[]) -> { ..., quality: number | undefined, format: 'jpg' | 'webp' | 'avif' | undefined }`

- [ ] **Step 1: Write the failing tests in `test/parser.test.js`**

Update `parseArgs` default test and add assertions for `parseSize('800px')`, `parseSize('800')`, `parseFormat('avif')`, `parseFormat('.WEBP')`, `parseFormat('jpeg')`, `getDefaultQuality`, and `formatHelp()` containing `avif` and `800px`:

```js
const { parseSize, parseColor, parseFormat, getDefaultQuality, parseArgs, formatHelp } = require('../src/parser');

describe('parseSize single height', () => {
  it('treats single integer or px size as target height with null width', () => {
    assert.deepEqual(parseSize('800'), { width: null, height: 800 });
    assert.deepEqual(parseSize('800px'), { width: null, height: 800 });
    assert.deepEqual(parseSize(' 1200 PX '), { width: null, height: 1200 });
  });

  it('rejects zero, negative, or oversized single heights', () => {
    assert.throws(() => parseSize('0px'), /positive integer/i);
    assert.throws(() => parseSize('-800px'), /Invalid size/i);
    assert.throws(() => parseSize('20000px'), /16384/);
  });
});

describe('parseFormat & getDefaultQuality', () => {
  it('supports jpg, webp, avif, jpeg alias, optional dot, and case-insensitive input', () => {
    assert.equal(parseFormat('avif'), 'avif');
    assert.equal(parseFormat('.WEBP'), 'webp');
    assert.equal(parseFormat('JPEG'), 'jpg');
    assert.equal(getDefaultQuality('jpg'), 85);
    assert.equal(getDefaultQuality('webp'), 85);
    assert.equal(getDefaultQuality('avif'), 65);
  });
});
```

Update `parseArgs` empty-argv expectation to `quality: undefined, format: undefined`, remove stale duplicate `parseArgs defaults include format` block if redundant, update `formatHelp` assertions to check `/avif/` and `/800px/`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:\Image Compress Automation"; node --test test/parser.test.js`
Expected: FAIL (`getDefaultQuality is not a function`, `parseSize('800px')` throws Invalid size).

- [ ] **Step 3: Implement `parseSize`, `parseFormat`, `getDefaultQuality`, `parseArgs`, `formatHelp` in `src/parser.js`**

- Add `'avif'` to `VALID_FORMATS`.
- Update `parseSize` to match single integer `^(\d+)\s*(?:px)?$/i` cleanly alongside exact `WxH`, enforcing `1 <= dim <= MAX_DIMENSION`, returning `{ width: null, height }` for single height and updating the invalid-size message to ``Invalid size "${rawSize}". Use <height> (e.g. 800px) or <width>x<height> (e.g. 800x800).``.
- Normalize `parseFormat` by trimming, lowercasing, stripping leading `.`, mapping `'jpeg'` → `'jpg'`, and rejecting unknown values with `'Supported values: jpg, webp, avif.'`.
- Export `getDefaultQuality(format)` returning `format === 'avif' ? 65 : DEFAULT_QUALITY`.
- Set `quality: undefined` and `format: undefined` initially in `parseArgs`.
- Update `formatHelp()` to document `--size <px|WxH>`, `--format <jpg|webp|avif>`, `800px` examples, and AVIF default quality `65`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:\Image Compress Automation"; node --test test/parser.test.js`
Expected: PASS (all parser tests green).

- [ ] **Step 5: Commit**

```bash
git add src/parser.js test/parser.test.js
git commit -m "feat(parser): support single-height sizes, avif format, and deferred format/quality defaults"
```

---

### Task 2: EXIF-Aware Height-Mode Dimension Resolution (`src/ratio.js`)

**Files:**
- Modify: `src/ratio.js:1-102`
- Test: `test/ratio.test.js:1-65`

**Interfaces:**
- Consumes: `MAX_DIMENSION` from `src/parser.js`
- Produces:
  - `resolveTargetDimensions(srcW: number, srcH: number, targetW: number | null | undefined, targetH: number) -> { ok: boolean, mode: 'height' | 'exact', width: number, height: number, reason?: string, srcRatioLabel: string, targetRatioLabel?: string, suggestedDimensions?: string[] }`

- [ ] **Step 1: Write failing tests in `test/ratio.test.js`**

```js
const { resolveTargetDimensions } = require('../src/ratio');

describe('resolveTargetDimensions', () => {
  it('computes proportional width when targetW is null without losing aspect ratio', () => {
    const sq = resolveTargetDimensions(1600, 1600, null, 800);
    assert.deepEqual({ ok: sq.ok, mode: sq.mode, width: sq.width, height: sq.height }, {
      ok: true, mode: 'height', width: 800, height: 800,
    });

    const wide = resolveTargetDimensions(1920, 1080, null, 800);
    assert.deepEqual({ ok: wide.ok, mode: wide.mode, width: wide.width, height: wide.height }, {
      ok: true, mode: 'height', width: 1422, height: 800,
    });
  });

  it('rejects computed width below 1 or above MAX_DIMENSION in height mode', () => {
    const extreme = resolveTargetDimensions(10000, 100, null, 800);
    assert.equal(extreme.ok, false);
    assert.equal(extreme.reason, 'dimension-out-of-range');
  });

  it('delegates exact WxH to strict aspect ratio validation', () => {
    const mismatch = resolveTargetDimensions(500, 1000, 800, 800);
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.mode, 'exact');
    assert.deepEqual(mismatch.suggestedDimensions, ['800x1600', '400x800']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:\Image Compress Automation"; node --test test/ratio.test.js`
Expected: FAIL (`resolveTargetDimensions is not a function`).

- [ ] **Step 3: Implement `resolveTargetDimensions` in `src/ratio.js` and export it**

Validate `targetW == null` path (`Math.round(targetH * (srcW / srcH))`, bounds `1..MAX_DIMENSION`), and delegate exact path to `validateAspectRatio(srcW, srcH, targetW, targetH)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:\Image Compress Automation"; node --test test/ratio.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ratio.js test/ratio.test.js
git commit -m "feat(ratio): add resolveTargetDimensions for proportional single-height scaling"
```

---

### Task 3: AVIF Support & Height-Only Batch Processing (`src/processor.js`)

**Files:**
- Modify: `src/processor.js:1-218`
- Test: `test/processor.test.js:1-200`

**Interfaces:**
- Consumes: `getDefaultQuality` from `src/parser.js`, `resolveTargetDimensions` from `src/ratio.js`
- Produces: `SUPPORTED_EXTENSIONS` including `'.avif'`; `processBatch({ inputDir, outputDir, width, height, quality, bg, format = 'jpg', onProgress })` returning `results` where `width` reflects each image's computed proportional width when `width` was `null`/`undefined`.

- [ ] **Step 1: Write failing tests in `test/processor.test.js`**

Add tests covering:
1. `discoverImages` detects `.avif` files.
2. `processBatch(..., format: 'avif')` writes `<name>.avif`, readable via Sharp (`metadata().format === 'heif'`, `compression === 'av1'`), using smart default quality `65` (so size <= JPG `85` equivalent on a textured test image).
3. `processBatch(..., width: null, height: 800, format: 'webp')` converts a `1600x1600` PNG to `800x800.webp` AND a `1600x800` PNG in the same folder to `1600x800.webp` (neither skipped!).
4. Height mode respects EXIF `orientation: 6` (`800x400` stored -> `400x800` effective) at `height: 400` producing `200x400`.
5. Height mode isolates an extreme `dimension-out-of-range` image (`width > MAX_DIMENSION`) as `status: 'failed'` without aborting valid siblings.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:\Image Compress Automation"; node --test test/processor.test.js`
Expected: FAIL (`.avif` ignored/outputs `.jpg`, `width: null` breaks `validateAspectRatio`).

- [ ] **Step 3: Implement AVIF encoding, `.avif` input discovery, and height-mode support in `src/processor.js`**

- Add `'.avif'` to `SUPPORTED_EXTENSIONS`.
- Define a small format map `{ jpg: { ext: '.jpg', encode: ... }, webp: { ext: '.webp', encode: ... }, avif: { ext: '.avif', encode: (p, q) => p.avif({ quality: q, effort: 4 }) } }`.
- Resolve effective quality in `processBatch`: `const resolvedQuality = quality ?? getDefaultQuality(format);`.
- Use `resolveTargetDimensions(effective.width, effective.height, width, height)` in `processSingleImage`, returning explicit `'dimension-out-of-range'` or `'aspect-ratio-mismatch'` on failure/skip, and resizing to `dimCheck.width, dimCheck.height`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:\Image Compress Automation"; node --test test/processor.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/processor.js test/processor.test.js
git commit -m "feat(processor): add AVIF encoding/discovery and per-image proportional height sizing"
```

---

### Task 4: Interactive Format Prompt & CLI Wiring (`src/prompt.js`, `bin/cli.js`)

**Files:**
- Modify: `src/prompt.js:1-54`
- Modify: `bin/cli.js:150-228`
- Test: `test/cli.test.js:1-119`

**Interfaces:**
- Consumes: `parseSize`, `parseFormat`, `getDefaultQuality` from `src/parser.js`; `processBatch` from `src/processor.js`
- Produces: `promptForFormat({ defaultFormat = 'jpg', isTTY, ask }) -> Promise<string>` and updated `runCli`

- [ ] **Step 1: Write failing tests in `test/cli.test.js`**

Add tests verifying:
1. `promptForFormat` skips `ask` in non-TTY mode (returns `'jpg'`) and reads entered format (`'avif'`) in TTY mode.
2. `runCli` in TTY mode with images in `input/` prompts for size (`'800px'`) and format (`'avif'`), converts a `1600x1600` PNG into `800x800` `.avif` (verifying Sharp metadata `format: 'heif'`, `compression: 'av1'`).
3. `runCli` in TTY mode when `--format webp` IS passed does **not** invoke the format prompt.
4. `runCli` in TTY mode when user types an invalid format (`'gif'`) in prompt returns exit code `1` with an error message.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:\Image Compress Automation"; node --test test/cli.test.js`
Expected: FAIL (`promptForFormat is not a function`, `runCli` does not prompt for format or rejects `'800px'`).

- [ ] **Step 3: Implement `promptForFormat` in `src/prompt.js` and wire into `bin/cli.js`**

- Update `promptForSize` prompt text to mention height (`e.g. 800px`) or `WxH` (`e.g. 800x800`).
- Add `promptForFormat` asking ``🖼️ Choose output format (jpg / webp / avif) [Enter for ${defaultFormat}]: ``.
- In `bin/cli.js`:
  - Prompt for `format` after `size` when `!options.format`: `options.yes ? 'jpg' : await promptForFormat({ defaultFormat: 'jpg', isTTY, ask })`, then validate via `parseFormat` (returning `1` on invalid format).
  - Resolve `const effectiveQuality = options.quality ?? getDefaultQuality(format);`.
  - Log clear header whether `target.width` is numeric (`800 x 800px (ratio 1:1)`) or `null` (`800px height (preserve ratio)`).
  - Update empty-folder log message to mention `PNG/JPG/WEBP/AVIF` inputs and `JPG / WebP / AVIF` outputs.

- [ ] **Step 4: Run full test suite**

Run: `cd "F:\Image Compress Automation"; node --test test/*.test.js`
Expected: PASS (0 failures across all test files).

- [ ] **Step 5: Commit**

```bash
git add src/prompt.js bin/cli.js test/cli.test.js
git commit -m "feat(cli): add interactive format prompt and single-height sizing workflow"
```

---

### Task 5: Docs, Skill, Repo Hygiene & GitHub Push

**Files:**
- Modify: `README.md`, `docs/PROCESS.md`, `AGENTS.md`, `skills/image-compress-automation/SKILL.md`, `CHANGELOG.md`, `package.json` (`1.2.0`)
- Restore in Git: `input/.gitkeep`, `output/.gitkeep`
- Also verify `docs/superpowers/specs/2026-11-11-height-sizing-format-prompts-design.md` and this plan are committed cleanly.

- [ ] **Step 1: Update version and docs**

- `package.json`: bump version to `"1.2.0"` and update description for JPG/WebP/AVIF + proportional height sizing.
- `README.md`, `docs/PROCESS.md`, `AGENTS.md`, `skills/image-compress-automation/SKILL.md`: document `800px` single-height mode, `jpg / webp / avif` format prompt and `--format avif` / `--quality` defaults (`85` jpg/webp, `65` avif).
- `CHANGELOG.md`: add `[1.2.0] - 2026-11-11` entry.

- [ ] **Step 2: Run full test suite + smoke test `convert.js --help` / `--version`**

Run: `cd "F:\Image Compress Automation"; npm test; node convert.js --help; node bin/cli.js --version`
Expected: `npm test` 0 failures, CLI prints `v1.2.0` and updated help text.

- [ ] **Step 3: Commit docs, spec, plan, and `.gitkeep` placeholders cleanly (never staging user photos!)**

Verify `git status` does not show any `.png`/`.jpg`/`.webp` inside `input/` or `output/`.
Commit and push to `origin main`.
