#!/usr/bin/env node
const path = require('node:path');
const pkg = require('../package.json');
const { parseArgs, parseSize, formatHelp } = require('../src/parser');
const { simplifyRatio } = require('../src/ratio');
const {
  normalizeUserPath,
  resolveFolders,
  loadConfig,
  saveConfig,
  resetConfig,
  ensureFolders,
} = require('../src/config');
const { discoverImages, processBatch } = require('../src/processor');
const { createPromptSession, promptForFolder, promptForSize } = require('../src/prompt');

/**
 * Resolve input/output folders from CLI flags, saved config, or interactive prompt.
 * @param {object} params
 * @returns {Promise<{ workDir: string, inputDir: string, outputDir: string, configuredNow: boolean }>}
 */
async function resolveRunFolders({ options, cwd, configDir, isTTY, ask, log }) {
  if (options.dir || options.input || options.output) {
    const folders = resolveFolders({
      dir: options.dir,
      input: options.input,
      output: options.output,
      cwd,
    });
    return { ...folders, configuredNow: false };
  }

  const saved = loadConfig(configDir);
  if (saved && !options.setup) {
    const folders = resolveFolders({ workDir: saved.workDir, cwd });
    return { ...folders, configuredNow: false };
  }

  const defaultDir = saved ? saved.workDir : configDir;
  let chosenDir = defaultDir;

  if (!options.yes && isTTY) {
    log('👋 First-time folder setup (you can change this anytime with --setup or --dir)');
    const raw = await promptForFolder({ defaultDir, isTTY, ask });
    chosenDir = normalizeUserPath(raw, cwd);
    saveConfig(configDir, { workDir: chosenDir });
    log(`💾 Saved working folder: ${chosenDir}\n`);
  }

  const folders = resolveFolders({ workDir: chosenDir, cwd });
  return { ...folders, configuredNow: !options.yes && isTTY };
}

/**
 * Format a byte count into KB with one decimal place.
 * @param {number} bytes
 * @returns {string}
 */
function formatKB(bytes) {
  return (bytes / 1024).toFixed(1);
}

/**
 * Print per-image status line for converted, skipped, or failed items.
 * @param {object} result
 * @param {(msg: string) => void} log
 */
function printFileResult(result, log) {
  if (result.status === 'converted') {
    const savedPct =
      result.inputBytes > 0
        ? Math.max(0, Math.round(((result.inputBytes - result.outputBytes) / result.inputBytes) * 100))
        : 0;
    log(`  ✅ ${result.file}  →  ${result.outputName}`);
    log(`     📐 ${result.srcWidth}x${result.srcHeight}  →  ${result.width}x${result.height}`);
    log(`     📦 ${formatKB(result.inputBytes)} KB  →  ${formatKB(result.outputBytes)} KB  (${savedPct}% smaller)\n`);
    return;
  }

  if (result.reason === 'aspect-ratio-mismatch') {
    log(`  ❌ ERROR (SKIPPED): ${result.file}`);
    log(`     Source ratio: ${result.srcRatioLabel} (${result.srcWidth}x${result.srcHeight})`);
    log(`     Target ratio: ${result.targetRatioLabel}`);
    log(`     Cannot distort ${result.srcRatioLabel} → ${result.targetRatioLabel}.`);
    if (result.suggestedDimensions.length > 0) {
      log(`     💡 Tip: Try ${result.suggestedDimensions.join(' or ')} to keep the original ratio.\n`);
    }
    return;
  }

  if (result.reason === 'filename-collision') {
    log(`  ⚠️  SKIPPED (COLLISION): ${result.file} → ${result.outputName} already queued in this batch.\n`);
    return;
  }

  log(`  ❌ FAILED: ${result.file} — ${result.error}\n`);
}

/**
 * Print final summary metrics after processing a batch.
 * @param {object} summary
 * @param {string} outputDir
 * @param {(msg: string) => void} log
 */
function printSummary(summary, outputDir, log) {
  const savedMB = ((summary.totalInputBytes - summary.totalOutputBytes) / (1024 * 1024)).toFixed(2);
  log('════════════════════════════════════════');
  log(`✅ ${summary.converted} converted   ⚠️  ${summary.skipped} skipped   ❌ ${summary.failed} failed`);
  if (summary.converted > 0) {
    log(`💾 Total space saved: ${savedMB} MB`);
    log(`📁 Output saved to: ${outputDir}`);
  }
  log('');
}

/**
 * Execute the CLI workflow and return an integer exit code.
 * @param {string[]} [argv]
 * @param {object} [deps]
 * @returns {Promise<number>}
 */
async function runCli(argv = process.argv.slice(2), deps = {}) {
  const cwd = deps.cwd || process.cwd();
  const configDir = deps.configDir || path.resolve(__dirname, '..');
  const isTTY = deps.isTTY !== undefined ? deps.isTTY : Boolean(process.stdin.isTTY);
  const log = deps.log || console.log;
  const error = deps.error || console.error;

  let options;
  try {
    options = parseArgs(argv);
  } catch (err) {
    error(`❌ ${err.message}`);
    return 1;
  }

  if (options.help) {
    log(formatHelp());
    return 0;
  }

  if (options.version) {
    log(`v${pkg.version}`);
    return 0;
  }

  if (options.reset) {
    const removed = resetConfig(configDir);
    log(removed ? '🔄 Cleared saved working folder configuration.' : 'ℹ️  No saved folder configuration found.');
    if (!options.setup && !options.dir && !options.input && !options.sizeArg) {
      return 0;
    }
  }

  const promptSession = deps.ask ? null : isTTY && !options.yes ? createPromptSession() : null;
  const ask = deps.ask || (promptSession ? promptSession.ask : async () => '');

  try {
    log('\n╔══════════════════════════════════════╗');
    log('║   🖼️   Image Compress Automation     ║');
    log('╚══════════════════════════════════════╝\n');

    const folders = await resolveRunFolders({ options, cwd, configDir, isTTY, ask, log });
    ensureFolders(folders.inputDir, folders.outputDir);

    const files = discoverImages(folders.inputDir);
    if (files.length === 0) {
      log(`📂 Folders are ready!`);
      log(`   Drop your PNG/JPG/WEBP images into: ${folders.inputDir}`);
      log(`   Compressed files (JPG or WebP) will save into: ${folders.outputDir}`);
      log('   Then run this command again to compress them.\n');
      return 0;
    }

    let sizeRaw = options.sizeArg;
    if (!sizeRaw) {
      sizeRaw = options.yes
        ? '800x800'
        : await promptForSize({ imageCount: files.length, defaultSize: '800x800', isTTY, ask });
    }

    let target;
    try {
      target = parseSize(sizeRaw);
    } catch (err) {
      error(`❌ ${err.message}`);
      return 1;
    }

    const ratioLabel = simplifyRatio(target.width, target.height);
    const fmtLabel = options.format === 'webp' ? 'WebP' : 'JPG';
    log(`\n📐 Target: ${target.width} x ${target.height}px  (ratio ${ratioLabel})  |  Format: ${fmtLabel}  |  Quality: ${options.quality}%`);
    log(`📂 Input:  ${folders.inputDir}`);
    log(`📁 Output: ${folders.outputDir}\n`);
    log(`🗂️  Processing ${files.length} image(s)...\n`);

    const summary = await processBatch({
      inputDir: folders.inputDir,
      outputDir: folders.outputDir,
      width: target.width,
      height: target.height,
      quality: options.quality,
      bg: options.bg,
      format: options.format,
      onProgress: (res) => printFileResult(res, log),
    });

    printSummary(summary, folders.outputDir, log);

    if (options.strict && (summary.skipped > 0 || summary.failed > 0)) {
      return 1;
    }
    if (summary.total > 0 && summary.converted === 0) {
      return 1;
    }
    return 0;
  } finally {
    if (promptSession) {
      promptSession.close();
    }
  }
}

if (require.main === module) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}

module.exports = { runCli };
