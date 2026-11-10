# Contributing to Image Compress Automation

Thank you for helping make bulk image optimization faster and easier for small businesses!

## Development Setup

1. Ensure **Node.js >= 20.0.0** is installed.
2. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/alirazawebservice-rgb/image-compress-automation.git
   cd image-compress-automation
   npm install
   ```
3. Run the automated test suite (`node --test`):
   ```bash
   npm test
   ```

## Guidelines

- **Keep dependencies minimal:** `sharp` is the sole production dependency; avoid adding unnecessary packages or `devDependencies` when Node built-ins (`node:test`, `node:assert`, `node:fs`, `node:path`) suffice.
- **Cross-platform paths always:** Use `path.join` / `path.resolve` and test paths with spaces and quotes. Never hardcode drive letters (`C:\`, `F:\`) or OS-specific separators.
- **Write tests first (TDD):** Add or update tests under `test/` for any bug fix or new CLI flag, and confirm `npm test` passes across all suites before opening a PR.
- **Preserve privacy:** Never commit sample personal/client images in `input/` or `output/`, or a personal `.imagerc.json`.

## Pull Request Checklist

- [ ] `npm test` passes with 0 failures.
- [ ] `node bin/cli.js --help` reflects any CLI flag changes.
- [ ] [`README.md`](README.md) and [`docs/PROCESS.md`](docs/PROCESS.md) updated if user-facing behavior changed.
- [ ] [`skills/image-compress-automation/SKILL.md`](skills/image-compress-automation/SKILL.md) updated if agent workflow changed.
