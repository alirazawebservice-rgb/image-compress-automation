# Repository Agent Instructions

This repository provides a cross-platform CLI and AI skill for small-business bulk image resizing and JPG compression (`sharp`).

## Skill to Load First
Before helping a user compress images or modify this repository, read and follow:
- [`skills/image-compress-automation/SKILL.md`](skills/image-compress-automation/SKILL.md)

## Non-Negotiable Rules
1. **Ask folder first if unconfigured:** Never hardcode `F:\` or OS-specific user paths. Check `.imagerc.json` or ask the user which folder holds their `input/` and `output/` directories.
2. **Confirm target size before running:** Do not rely on non-TTY silent defaults; confirm `WxH` with the user and pass `--dir` and `--size` explicitly to `node bin/cli.js`.
3. **Preserve aspect ratio & filenames:** Keep exact original file stems (`<name>.jpg`) and reject aspect-ratio mismatches rather than cropping or distorting.
4. **Keep user assets private:** Never commit `input/*`, `output/*` (other than `.gitkeep`), `node_modules/`, or `.imagerc.json`.
5. **Run tests after code edits:** Run `npm test` (`node --test test/*.test.js`) before finishing any change.
