# Step-by-Step Process Guide (For Store Owners & Beginners)

No Photoshop or coding experience needed! Follow this walkthrough once, and every future batch of product photos takes **under 10 seconds**.

---

## Step 1 — One-Time Setup on Your Computer

### 1.1 Install Node.js
1. Go to **[nodejs.org](https://nodejs.org/)**.
2. Download and install the **LTS** version (**v20 or newer**).
3. Verify it worked by opening **PowerShell** (Windows) or **Terminal** (Mac/Linux) and typing:
   ```bash
   node -v
   ```
   You should see something like `v20.x.x`, `v22.x.x`, or `v26.x.x`.

### 1.2 Get This Tool
- **Option A (No Git needed):** Click the green **Code** button on GitHub → **Download ZIP** → extract the folder anywhere you like (e.g., `Documents\image-compress-automation` or `Desktop\image-compress-automation`).
- **Option B (With Git):**
  ```bash
  git clone https://github.com/alirazawebservice-rgb/image-compress-automation.git
  ```

### 1.3 Install the Image Engine (`sharp`)
Open **PowerShell** or **Terminal** inside that folder and run:
```bash
npm install
```
Wait a few seconds for it to finish. You only do this **once**.

---

## Step 2 — Choose Your Working Folder (First Run)

Run:
```bash
npm start
```

The first time you run it, it will ask:
```text
👋 First-time folder setup (you can change this anytime with --setup or --dir)
📁 Enter working folder for "input" & "output" [Press Enter for "..."]:
```

You have **two easy choices**:
1. **Press Enter** — uses `input/` and `output/` right inside this downloaded folder.
2. **Type or paste any folder path on your computer** — for example:
   - Windows: `D:\My Shop Photos` or `F:\Image Compress Automation`
   - macOS: `~/Desktop/Store-Images`
   - Linux: `/home/alex/store-images`

It remembers your choice in a local `.imagerc.json` file and automatically creates two folders inside it:
- **`input`** — where you drop original PNG / JPG / WEBP / AVIF files
- **`output`** — where compressed, resized JPG / WebP / AVIF files appear

> **Want to change your folder later?** Run `npm run setup` anytime, or pass `--dir "path\to\folder"` for a one-off run.

---

## Step 3 — Compress a Batch of Images (Every Day, 10 Seconds)

1. **Copy/drop your product photos** into your **`input`** folder.
2. Run:
   ```bash
   npm start
   ```
3. Enter your target **height** (like `800px` — automatically keeps every image's natural ratio) or exact **`WxH`** (`800x800`), then choose **`jpg`**, **`webp`**, or **`avif`**:
   ```text
   📐 Found 20 image(s). Enter height (800px) or WxH (800x800) [Enter for 800x800]: 800px
   🖼️ Choose output format (jpg / webp / avif) [Enter for jpg]: webp
   ```
4. Open your **`output`** folder — all your `.jpg`, `.webp`, or `.avif` images are ready with the **exact same filenames** and tiny file sizes for fast website loading!

> **Fastest one-liner (skip the questions):**
> ```bash
> node bin/cli.js 800px --format webp
> ```

---

## Step 4 — How Aspect Ratios & Special Cases Are Handled

| Case | What Happens |
|---|---|
| **Square photo (`1600×1600`) → `800px` or `800x800`** | ✅ Resizes cleanly to `800×800` JPG/WebP/AVIF, ~95% smaller. |
| **Wide photo (`1920×1080`) → `800px` (height only)** | ✅ Keeps natural `16:9` ratio automatically (`1422×800`). |
| **Transparent PNG cutout** | ✅ Transparent area becomes clean white (`#ffffff`), never black. Need another color? Add `--bg "#f5f5f5"`. |
| **Tall `1:2` banner (`500×1000`) → exact `800x800`** | ❌ Safely skipped with an error and tip (`Try 800x1600 or 400x800`). Your image is **never** stretched or cropped! |
| **Phone photo rotated via EXIF** | ✅ Automatically reads true orientation and rotates pixels properly before checking aspect ratio. |
| **Both `logo.png` and `logo.jpg` in `input/`** | ⚠️ Second file is skipped with a collision notice instead of silently overwriting the first output file. |
| **Non-image files or subfolders in `input/`** | ✅ Ignored safely without crashing your batch. |

---

## Troubleshooting

- **`node` is not recognized / command not found:** Close and reopen PowerShell/Terminal after installing Node.js from [nodejs.org](https://nodejs.org/).
- **`Cannot find module 'sharp'`:** Make sure you ran `npm install` inside the project folder first.
- **`Found 0 images` / `Folders are ready!`:** Put `.png`, `.jpg`, `.jpeg`, `.webp`, or `.avif` files directly inside the `input` folder (not inside subfolders).
- **Files look slightly blurry or too big?** Adjust `--quality` (default is `85` for JPG/WebP and `65` for AVIF):
  ```bash
  node bin/cli.js 800px --format webp --quality 90   # sharper, slightly larger file
  node bin/cli.js 800px --format avif --quality 60   # ultra-light for slow connections
  ```
