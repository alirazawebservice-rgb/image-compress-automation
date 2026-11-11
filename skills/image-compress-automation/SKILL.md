---
name: image-compress-automation
description: Use when compressing, resizing, or converting bulk product images (PNG, JPG, WEBP, AVIF) to web-ready JPG, WebP, or AVIF files in this repository, setting up a user's working folder on a new machine, or troubleshooting height-only sizing, aspect-ratio errors, and CLI flags.
---

# Image Compress Automation

## Overview

Bulk-resize and compress product images into web-ready `.jpg`, `.webp`, or `.avif` files in seconds using `sharp`, while preserving original filenames, flattening transparent PNGs onto white, and strictly preserving aspect ratios (`800px` single-height auto-scaling or `WxH` exact check).

**Core principle:** Never assume a working drive (`F:\`), never silently fall back to `800x800` or `jpg` without confirming when omitted, and never crop or distort an image.

## Quick Reference

| Situation | Action |
|---|---|
| First run (`node_modules/` missing) | Run `npm install` (requires Node.js `>= 20.0.0`) |
| `.imagerc.json` absent & no `--dir` given | **Ask the user** for their working folder before running |
| Target size/height or format omitted | **Ask the user** for size (`800px` height or `WxH`) and format (`jpg`, `webp`, or `avif`) before running |
| User gives height only (e.g. `800px in webp`) | Pass `--size 800px --format webp` (auto-computes proportional width per image) |
| User gives working folder + `WxH` + format | Run `node bin/cli.js --dir "<folder>" --size "<WxH>" --format <jpg\|webp\|avif>` |
| User has separate raw & export folders | Run `node bin/cli.js --input "<in>" --output "<out>" --size "<px\|WxH>" --format <fmt>` |
| Exact `WxH` aspect-ratio mismatch | Do **not** crop/stretch; report suggested matching sizes from output (or suggest `800px` height mode if appropriate) |
| Transparent PNG background | Automatically flattened onto `#ffffff` (change via `--bg "#hex"`) |

## Step-by-Step Agent Workflow

Follow these steps in order whenever a user asks you to compress or resize images using this repository:

### 1. Check Setup & Dependencies
1. Verify `node_modules/sharp` exists. If cloned fresh, run `npm install`.
2. Check if `.imagerc.json` exists in the repository root (unless the user already specified a folder in their prompt).
   - If **neither** `.imagerc.json` exists **nor** the user named a folder, **ask the user first**:
     *"Which folder would you like to use for your `input` and `output` image folders? (For example, `./` for this project folder, `~/Desktop/store-images`, or `D:\Images`.)"*
   - Never assume `F:\Image Compress Automation` or guess `~/Desktop`.

### 2. Inspect `input/` & Confirm Size + Format
1. Ensure `<folder>/input` and `<folder>/output` exist (or pass `--dir "<folder>"` so the CLI creates them).
2. Check how many supported images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`) are in the input folder. If `0`, tell the user the exact `<folder>/input` path to drop their images into and stop.
3. If the user has **not** explicitly stated the target height/dimensions or output format in the current request, **ask before executing** — **even though non-TTY/flagless fallbacks default to `800x800` and `jpg`.**

### 3. Execute Non-Interactively & Report Results
Run the CLI explicitly with flags (avoid bare `node bin/cli.js` in non-TTY tool shells so nothing relies on silent defaults):

```bash
node bin/cli.js --dir "<working-folder>" --size "<HEIGHTpx or WIDTHxHEIGHT>" --format "<jpg|webp|avif>"
```

Optional flags when requested by the user:
- `--format <jpg|webp|avif>` (default `jpg`; `webp` is ~25–35% smaller, `avif` is ~30–50% smaller)
- `--quality <1-100>` (defaults to `85` for JPG `mozjpeg` / WebP `effort: 6`, and `65` for AVIF `effort: 4`)
- `--bg "<#hex>"` (default `#ffffff` for transparent PNG flattening)
- `--strict` (return exit code `1` if any file is skipped or fails)

If the user wants this working folder remembered for interactive terminal runs (`npm start`), you may mention or save `.imagerc.json` (gitignored) or have them run `npm run setup`.

### 4. Verify & Summarize Output
Report straight from the command output:
- Total converted / skipped / failed counts and space saved (`MB` and `%`).
- Exact output folder path (`<working-folder>/output`).
- For any `aspect-ratio-mismatch` skip, surface the file's original dimensions/ratio and the suggested proportional dimensions printed by the CLI.

## Common Mistakes & Red Flags

| Thought / Mistake | Why It Fails & What To Do Instead |
|---|---|
| "I'll just run `node bin/cli.js` without `--size` or `--format`" | Non-TTY fallback silently picks `800x800` and `jpg`. Always confirm folder, size/height (`800px` or `WxH`), and format (`jpg`/`webp`/`avif`) with the user first and pass `--dir`, `--size`, and `--format`. |
| "User wants 800×800 on a 1:2 photo — I'll pass `fit: cover` or write a custom crop script" | Violates core rule: never crop or stretch silently. Let the CLI reject mismatches and give proportional dimensions. |
| "I'll commit `.imagerc.json` or test PNGs in `input/`" | `.imagerc.json`, `input/*`, and `output/*` (except `.gitkeep`) are gitignored to protect user privacy. Keep them untracked. |
| "I'll pass `--input` without `--output`" | Without `--output` or `--dir`, output falls back to `<cwd>/output`. Always pass `--dir` (standard flow) or both `--input` and `--output`. |
