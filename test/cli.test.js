const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const { promptForFolder, promptForSize, promptForFormat } = require('../src/prompt');
const { runCli } = require('../bin/cli');

describe('prompt helpers', () => {
  it('returns defaults immediately in non-TTY mode', async () => {
    let called = false;
    const ask = async () => {
      called = true;
      return 'ignored';
    };
    const folder = await promptForFolder({ defaultDir: '/tmp/work', isTTY: false, ask });
    const size = await promptForSize({ imageCount: 2, defaultSize: '800x800', isTTY: false, ask });
    const format = await promptForFormat({ defaultFormat: 'jpg', isTTY: false, ask });
    assert.equal(folder, '/tmp/work');
    assert.equal(size, '800x800');
    assert.equal(format, 'jpg');
    assert.equal(called, false);
  });

  it('asks user for folder, size, and format in TTY mode and uses entered values', async () => {
    const folder = await promptForFolder({
      defaultDir: '/tmp/work',
      isTTY: true,
      ask: async () => '  D:\\Store Images  ',
    });
    const size = await promptForSize({
      imageCount: 5,
      defaultSize: '800x800',
      isTTY: true,
      ask: async () => '1200x628',
    });
    const format = await promptForFormat({
      defaultFormat: 'jpg',
      isTTY: true,
      ask: async () => '  avif ',
    });
    assert.equal(folder, 'D:\\Store Images');
    assert.equal(size, '1200x628');
    assert.equal(format, 'avif');
  });
});

describe('runCli end-to-end', () => {
  it('prompts for folder on first run, creates input/output, saves config, and guides when empty', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ica-first-'));
    const chosenFolder = path.join(tempRoot, 'my shop');
    const logs = [];

    try {
      const code = await runCli([], {
        cwd: tempRoot,
        configDir: tempRoot,
        isTTY: true,
        log: (msg) => logs.push(msg),
        error: (msg) => logs.push(msg),
        ask: async () => chosenFolder,
      });

      assert.equal(code, 0);
      assert.equal(fs.existsSync(path.join(chosenFolder, 'input')), true);
      assert.equal(fs.existsSync(path.join(chosenFolder, 'output')), true);
      assert.equal(fs.existsSync(path.join(tempRoot, '.imagerc.json')), true);
      assert.match(logs.join('\n'), /Drop your/i);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('processes images non-interactively via --dir and --size flags and returns 1 when all mismatch', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ica-run-'));
    const inputDir = path.join(tempRoot, 'input');
    const outputDir = path.join(tempRoot, 'output');
    fs.mkdirSync(inputDir, { recursive: true });

    try {
      await sharp({
        create: { width: 400, height: 400, channels: 3, background: { r: 40, g: 90, b: 150 } },
      })
        .png()
        .toFile(path.join(inputDir, 'Dog Collar.png'));

      const okCode = await runCli(['--dir', tempRoot, '--size', '200x200'], {
        cwd: tempRoot,
        configDir: tempRoot,
        isTTY: false,
        log: () => {},
        error: () => {},
      });
      assert.equal(okCode, 0);
      assert.equal(fs.existsSync(path.join(outputDir, 'Dog Collar.jpg')), true);

      const badRatioCode = await runCli(['--dir', tempRoot, '--size', '800x400'], {
        cwd: tempRoot,
        configDir: tempRoot,
        isTTY: false,
        log: () => {},
        error: () => {},
      });
      assert.equal(badRatioCode, 1);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('supports --help and --version via convert.js and bin/cli.js subprocesses', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const helpOut = execFileSync(process.execPath, ['convert.js', '--help'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    assert.match(helpOut, /Image Compress Automation/);
    assert.match(helpOut, /--dir/);

    const verOut = execFileSync(process.execPath, ['bin/cli.js', '--version'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    assert.match(verOut.trim(), /^v\d+\.\d+\.\d+$/);
  });

  it('prompts for size and jpg/webp/avif format in TTY mode, supports height-only 800px, and skips format prompt if --format is passed', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ica-tty-'));
    const inputDir = path.join(tempRoot, 'input');
    const outputDir = path.join(tempRoot, 'output');
    fs.mkdirSync(inputDir, { recursive: true });

    try {
      await sharp({
        create: { width: 1600, height: 1600, channels: 3, background: { r: 20, g: 120, b: 200 } },
      })
        .png()
        .toFile(path.join(inputDir, 'sq.png'));

      const answers = ['800px', 'avif'];
      const prompts = [];
      const code = await runCli(['--dir', tempRoot], {
        cwd: tempRoot,
        configDir: tempRoot,
        isTTY: true,
        log: () => {},
        error: () => {},
        ask: async (q) => {
          prompts.push(q);
          return answers.shift();
        },
      });

      assert.equal(code, 0);
      assert.equal(prompts.length, 2);
      assert.match(prompts[1], /jpg\s*\/\s*webp\s*\/\s*avif/i);
      const avifMeta = await sharp(path.join(outputDir, 'sq.avif')).metadata();
      assert.equal(avifMeta.format, 'heif');
      assert.equal(avifMeta.compression, 'av1');
      assert.equal(avifMeta.width, 800);
      assert.equal(avifMeta.height, 800);

      // Passing --format skips the interactive format prompt cleanly
      const promptsWithFlag = [];
      const flagCode = await runCli(['--dir', tempRoot, '--format', 'webp'], {
        cwd: tempRoot,
        configDir: tempRoot,
        isTTY: true,
        log: () => {},
        error: () => {},
        ask: async (q) => {
          promptsWithFlag.push(q);
          return '800px';
        },
      });
      assert.equal(flagCode, 0);
      assert.equal(promptsWithFlag.length, 1);
      assert.equal(fs.existsSync(path.join(outputDir, 'sq.webp')), true);

      // Invalid format typed interactively returns 1 with clear error
      const errs = [];
      const badAnswers = ['800px', 'gif'];
      const badCode = await runCli(['--dir', tempRoot], {
        cwd: tempRoot,
        configDir: tempRoot,
        isTTY: true,
        log: () => {},
        error: (msg) => errs.push(msg),
        ask: async () => badAnswers.shift(),
      });
      assert.equal(badCode, 1);
      assert.match(errs.join('\n'), /Invalid format/i);
    } finally {
      try {
        fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {
        /* ignore Windows sharp lock */
      }
    }
  });
});
