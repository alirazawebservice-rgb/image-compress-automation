const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const { promptForFolder, promptForSize } = require('../src/prompt');
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
    assert.equal(folder, '/tmp/work');
    assert.equal(size, '800x800');
    assert.equal(called, false);
  });

  it('asks user for folder and size in TTY mode and uses entered values', async () => {
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
    assert.equal(folder, 'D:\\Store Images');
    assert.equal(size, '1200x628');
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
});
