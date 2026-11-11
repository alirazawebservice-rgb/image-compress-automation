# Design Spec: Single-Height Proportional Sizing, `jpg / webp / avif`, and Interactive Format Prompt

Date: 2026-11-11  
Version target: v1.2.0

## 1. Intent & Why
Small-business users often know the exact height they want for product listings (for example, `800px`) and want the lightest format (`jpg`, `webp`, or `avif`) without doing width math or memorizing CLI flags like `--format webp`. Right now `npm start` prompts only for folder and `WidthxHeight` size, rejects single-value sizes like `800px`, supports only `jpg`/`webp`, and uses quality `85` for everything.

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Support **`jpg`**, **`webp`**, and **`avif`** output formats via `--format` / `-f` and interactive prompts (`npm start`), plus `.avif` input discovery.
  - Prompt interactively for output format (`jpg / webp / avif`, default `jpg`) right after size when running `npm start` in a TTY without an explicit `--format` flag or `--yes`.
  - Support **single-value height sizing** (`800`, `800px`) in `--size`, positional args, and interactive prompts: treat the number as target height and compute each photo's exact proportional width after EXIF orientation (`round(height * srcWidth / srcHeight)`), never losing aspect ratio.
  - Keep strict aspect-ratio mismatch checks (`1%` tolerance) whenever an explicit `WidthxHeight` (`800x800`) is provided.
  - Use format-appropriate default quality (`85` for `jpg`/`webp`, `65` for `avif`) when `--quality` is omitted so AVIF outputs are smaller than JPG (`~60 KB` vs `~88 KB` on a `1254x1254` product PNG) instead of larger (`~111 KB` at `q85`).
- **Non-Goals:**
  - Cropping, stretching, width-only syntax, print DPI prompts, or saving format preferences in `.imagerc.json`.
- **Anti-Goals:**
  - Never silently bypass strict ratio checks when `WxH` is explicitly given.
  - Never prompt interactively when `--yes`, non-TTY mode, or explicit `--format` / `--size` flags are active.
  - Never lose filename stems (only extension changes to `.jpg`, `.webp`, or `.avif`) or overwrite same-stem inputs cleanly guarded by collision checks.

## 3. Constraints
- Node.js `>= 20.0.0`, CommonJS modules, `sharp` (`^0.35.5`) as sole runtime dependency, zero devDependencies (`node:test`).
- Preserve backwards compatibility for `node convert.js`, `--yes` non-interactive defaults (`800x800`, `jpg`), and existing user `input/` assets.
- Note from Sharp verification: `sharp().avif()` metadata reports `format: 'heif'` and `compression: 'av1'`.

## 4. Approaches Considered
1. **Approach 1 (Selected): Per-image proportional width in height mode + interactive format prompt + smart AVIF default quality**
   - `parseSize` returns `{ width: 800, height: 800 }` for `WxH` and `{ width: null, height: 800 }` for `800` / `800px`.
   - In `processBatch`, when `width == null`, each image computes `targetWidth = Math.round(height * (effective.width / effective.height))` after EXIF orientation (erroring cleanly if computed width `< 1` or `> MAX_DIMENSION`), while `WxH` continues calling `validateAspectRatio`.
   - **Trade-off:** Mixed-ratio photos in a `800px` batch keep uniform `800px` height while widths vary naturally to preserve proportions.
2. **Approach 2 (Rejected): Lock height-only batch to the first image's aspect ratio**
   - Computes `Wx800` once from the first photo and skips later photos with different ratios.
   - **Trade-off:** Rejects valid rectangular photos in mixed batches even when the user only requested a consistent `800px` height.

## 5. Key Decisions
- **Interactive prompts (`src/prompt.js` & `bin/cli.js`):**
  1. First-run / `--setup`: working folder (`promptForFolder`).
  2. Size (`promptForSize`): `Enter height (800px) or WxH (800x800) [Enter for 800x800]`.
  3. Format (`promptForFormat`, skipped if `--format` passed or `--yes` or non-TTY): `Choose output format (jpg / webp / avif) [Enter for jpg]`.
- **Argument defaults (`src/parser.js`):** `options.format` and `options.quality` stay `undefined` when omitted so `cli.js` can tell whether to prompt interactively (`format`) and apply format-aware defaults (`85` for `jpg`/`webp`, `65` for `avif`) cleanly. `parseFormat` accepts `jpg`, `webp`, `avif` (plus `.jpg`/`.webp`/`.avif` and `jpeg` normalized cleanly to `jpg` if helpful).
- **Single-height computed bounds:** Clamp/validate computed width (`>= 1` and `<= MAX_DIMENSION`), logging the resulting `WxH` in batch output (`1920x1080 -> 1422x800`).
- **Transparency flattening:** Keep `--bg` flattening (`#ffffff` default) uniform across `jpg`, `webp`, and `avif` for clean e-commerce backgrounds.
- **Docs, Skill, Repo Hygiene:** Update `README.md`, `docs/PROCESS.md`, `AGENTS.md`, `skills/image-compress-automation/SKILL.md`, `CHANGELOG.md`, `package.json`, and restore tracked `input/.gitkeep` & `output/.gitkeep`.

## 6. Left to Builder / Implementation Plan
- Exact helper boundaries (`resolveTargetDimensions` in `src/ratio.js`), exact test cases in `test/`, and exact AVIF effort parameter (`effort: 4` for balanced speed ~1.2s vs `6` much slower on CPU) to be detailed in the implementation plan after approval.

