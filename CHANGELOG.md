# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-11-10

### Added
- Cross-platform CLI (`bin/cli.js` + backwards-compatible `convert.js` wrapper) supporting Windows, macOS, and Linux.
- First-run interactive working folder prompt persisted in gitignored `.imagerc.json`, plus `--dir`, `--input`, `--output`, `--setup`, and `--reset` flags.
- Interactive dimension prompt and `--size` parser accepting `800x800`, `1200X628`, `1080*1080`, `640×480`, and `400,300`.
- EXIF-aware aspect ratio validation (`validateAspectRatio`) with 1% rounding tolerance and automatic proportional size suggestions on mismatch.
- Transparent PNG white background flattening (`#ffffff`, customizable via `--bg`) before `mozjpeg` compression (`--quality`, default `85`).
- Exact original filename preservation (`<stem>.jpg`) and duplicate-stem collision protection.
- Tested cross-agent skill (`skills/image-compress-automation/SKILL.md`) and `AGENTS.md`.
- Beginner-friendly process documentation (`README.md`, `docs/PROCESS.md`), `CONTRIBUTING.md`, MIT `LICENSE`, unit/integration test suite (`npm test`), and cross-OS GitHub Actions CI template (`docs/ci.example.yml`).
