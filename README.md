# Image Compress Automation

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Zero-Photoshop bulk image resizer & compressor for small businesses.**  
Turn **40+ MB** of heavy PNG product images into **fast-loading JPG, WebP, or AVIF** files in **under 10 seconds**—on Windows, macOS, or Linux.

> **New in v1.2:**
> - Enter a **single height like `800px`** to auto-calculate each photo's exact width and **never lose aspect ratio**!
> - Interactive prompt now asks **format (`jpg / webp / avif`)** right after size — or pass `--format webp` / `--format avif` on the CLI.

---

## Why This Exists

Small e-commerce stores (Shopify, WooCommerce, Etsy) often receive high-resolution PNG files straight from designers without having Photoshop installed. Uploading 2 MB+ PNGs slows down product pages and hurts SEO, while editing dozens of files one-by-one in browser tools takes forever.

With **Image Compress Automation**:
- ✅ **Works on any computer or drive** — asks you on first run where you want your `input` and `output` folders (Windows `C:\`/`D:\`/`F:\`, macOS, or Linux).
- ✅ **Fast bulk conversion** — converts entire batches of `.png`, `.jpg`, `.jpeg`, `.webp`, and `.avif` files in seconds using [`sharp`](https://sharp.pixelplumbing.com/).
- ✅ **Keeps your exact filenames** — `Heart Blue.png` becomes `Heart Blue.jpg`, `.webp`, or `.avif`.
- ✅ **JPG, WebP & AVIF output** — interactive prompt asks `jpg / webp / avif` right after size (`webp` is ~25–35% smaller, `avif` is ~30–50% smaller than JPG).
- ✅ **Single-height & strict ratio protection** — enter `800px` to scale proportionally without ever losing aspect ratio, or `800x800` to strictly guard exact ratios (EXIF-aware).
- ✅ **Clean backgrounds for transparent PNGs** — automatically flattens transparency onto white (`#ffffff`, customizable via `--bg`) instead of turning black.
- ✅ **AI Assistant ready** — includes [`AGENTS.md`](AGENTS.md) and [`skills/image-compress-automation/SKILL.md`](skills/image-compress-automation/SKILL.md) so AI coding tools follow the exact same safe workflow.

---

## How the Process Works

```mermaid
flowchart LR
    A["1. First Run<br/>Pick working folder"] --> B["2. Drop images<br/>into input/"]
    B --> C["3. Enter height (800px) or WxH<br/>& choose jpg / webp / avif"]
    C --> D{"Aspect ratio<br/>safe?"}
    D -- Yes --> E["4. Saved as .jpg / .webp / .avif<br/>in output/ (same filename)"]
    D -- No --> F["Skipped safely with error<br/>+ valid size suggestion"]
```

---

## Quick Start (4 Simple Steps)

> Need a super detailed beginner guide (with Node.js install steps)? Read the full walkthrough in **[`docs/PROCESS.md`](docs/PROCESS.md)**.

### 1. Install Node.js (one-time)
Download and install **Node.js 20 LTS or newer** from [nodejs.org](https://nodejs.org/).

### 2. Download or Clone This Repository
```bash
git clone https://github.com/alirazawebservice-rgb/image-compress-automation.git
cd image-compress-automation
```
*(Or click **Code → Download ZIP** on GitHub, unzip it, and open Terminal / PowerShell inside that folder.)*

### 3. Install Dependencies (one-time)
```bash
npm install
```

### 4. Run It!
```bash
npm start
```

**On your very first run**, it asks where you want to store your images:
```text
👋 First-time folder setup (you can change this anytime with --setup or --dir)
📁 Enter working folder for "input" & "output" [Press Enter for "..."]: D:\Store Images
💾 Saved working folder: D:\Store Images
```

It automatically creates:
- `D:\Store Images\input\` ← **drop your raw PNG/JPG/WEBP/AVIF images here**
- `D:\Store Images\output\` ← **pick up your compressed JPG / WebP / AVIF files here**

Run `npm start` again once your images are inside `input/`, enter your target height (e.g. `800px`) or exact `WxH` (`800x800`), pick your format (`jpg / webp / avif`), and watch it shrink the batch in seconds:

```text
📐 Found 24 image(s). Enter height (800px) or WxH (800x800) [Enter for 800x800]: 800px
🖼️ Choose output format (jpg / webp / avif) [Enter for jpg]: webp

  ✅ Boat Navy.png  →  Boat Navy.webp
     📐 1600x1600  →  800x800
     📦 1966.1 KB  →  54.8 KB  (97% smaller)
...
════════════════════════════════════════
✅ 24 converted   ⚠️  0 skipped   ❌ 0 failed
💾 Total space saved: 41.96 MB
📁 Output saved to: D:\Store Images\output
```

---

## Aspect Ratio Safety (No Accidental Cropping)

If you drop a **1:2 banner** (`500x1000`) into `input/` and ask for **800×800** (`1:1`), the tool **will not distort or crop it**. Instead, it protects your image and tells you what size matches its natural ratio:

```text
  ❌ ERROR (SKIPPED): tall-banner.png
     Source ratio: 1:2 (500x1000)
     Target ratio: 1:1
     Cannot distort 1:2 → 1:1.
     💡 Tip: Try 800x1600 or 400x800 to keep the original ratio.
```

*(A tiny 1% rounding tolerance is allowed so standard sizes like `1920x1080` → `1000x563` work smoothly.)*

---

## Command-Line Options

You can pass flags directly with `node bin/cli.js` (or `node convert.js` for backwards compatibility, or `npm start -- <flags>`):

| Option | Alias | Default | Description |
|---|---|---|---|
| `--size <px\|WxH>` | `-s` | Prompt / `800x800` | Target height (`800px`, auto-scales proportional width) or exact `WxH` (`800x800`, `1200x628`) |
| `--format <jpg\|webp\|avif>` | `-f` | Prompt / `jpg` | Output format: `jpg` (`mozjpeg`), `webp` (~25–35% smaller), or `avif` (~30–50% smaller) |
| `--dir <path>` | `-d` | Saved config / cwd | Working folder containing `input/` and `output/` |
| `--input <path>` | `-i` | `<dir>/input` | Custom input folder path |
| `--output <path>` | `-o` | `<dir>/output` | Custom output folder path |
| `--quality <1-100>` | `-q` | `85` (`65` AVIF) | Output quality (defaults: `85` for JPG/WebP, `65` for AVIF) |
| `--bg <hex>` | — | `#ffffff` | Background fill color for transparent PNGs |
| `--setup` | — | `false` | Re-prompt and save a new default working folder |
| `--reset` | — | `false` | Clear saved working folder config (`.imagerc.json`) |
| `--strict` | — | `false` | Exit with code `1` if any image is skipped or fails |
| `--yes` | `-y` | `false` | Skip interactive prompts and use defaults |
| `--help` | `-h` | — | Show help message |
| `--version` | `-v` | — | Show version number |

### Common Examples

```bash
# Interactive setup & prompts (asks folder, size/height, and jpg/webp/avif)
npm start

# Change your saved working folder anytime
npm run setup

# Resize to 800px height (keeps every image's natural aspect ratio) and convert to WebP
node bin/cli.js --dir "~/Desktop/my-products" --size 800px --format webp

# Ultra-light AVIF output (uses smart q65 default unless --quality is specified)
node bin/cli.js --dir "~/Desktop/my-products" --size 800px --format avif

# Custom input/output folders with 90% quality JPG and light-gray background for PNGs
node bin/cli.js --input ./raw --output ./ready --size 1200x1200 --quality 90 --bg "#f5f5f5"
```

---

## Using With an AI Coding Assistant

If you open this repository inside **Antigravity**, **Claude Code**, **Cursor**, or **Codex**, the assistant automatically reads [`AGENTS.md`](AGENTS.md) and [`skills/image-compress-automation/SKILL.md`](skills/image-compress-automation/SKILL.md).

Just tell your AI assistant:
- *"Help me set up my image folder and compress my PNGs"*
- *"Resize the images in my `input` folder to `800x800`"*

The assistant will ask for your folder (if not set), ask for your target dimensions, run the CLI safely, and report the exact MB saved.

---

## Project Structure

```text
image-compress-automation/
├── bin/cli.js                           # Main CLI entry point
├── convert.js                           # Backwards-compatible CLI wrapper
├── src/
│   ├── config.js                        # Cross-platform path & .imagerc.json management
│   ├── parser.js                        # Argument, height/WxH size, format, and color parsing
│   ├── processor.js                     # Sharp batch conversion (JPG/WebP/AVIF), flatten, collisions
│   ├── prompt.js                        # Interactive folder, size/height, and format prompts
│   └── ratio.js                         # EXIF-aware ratio validation & height-mode scaling
├── skills/image-compress-automation/
│   └── SKILL.md                         # Tested cross-agent AI skill
├── AGENTS.md                            # AI assistant repository instructions
├── docs/
│   ├── PROCESS.md                       # Beginner step-by-step user guide
│   └── ci.example.yml                   # Cross-OS GitHub Actions CI template
├── test/                                # Automated unit & integration tests (node --test)
└── LICENSE                              # MIT License
```

---

## Running Tests & Privacy Guarantee

Run the automated test suite (`node --test`):

```bash
npm test
```

Your personal product photos inside `input/`, compressed results in `output/`, and local folder setting in `.imagerc.json` are all excluded by [`.gitignore`](.gitignore) so private business assets are never accidentally pushed to Git.

---

## Further Reading

- **[Step-by-Step User Process Guide](docs/PROCESS.md)** — Beginner-friendly setup for Windows, macOS, and Linux
- **[Contributing Guide](CONTRIBUTING.md)** — How to run tests and submit pull requests
- **[Changelog](CHANGELOG.md)** — Release history
- **[MIT License](LICENSE)** — Free for personal and commercial small-business use
