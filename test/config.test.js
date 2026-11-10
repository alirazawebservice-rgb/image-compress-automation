const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  CONFIG_FILENAME,
  normalizeUserPath,
  resolveFolders,
  loadConfig,
  saveConfig,
  resetConfig,
  ensureFolders,
} = require('../src/config');

describe('normalizeUserPath', () => {
  it('strips matching quotes, expands ~, and resolves relative paths cleanly', () => {
    assert.equal(
      normalizeUserPath('  "~/photos/shop"  '),
      path.join(os.homedir(), 'photos', 'shop')
    );
    assert.equal(normalizeUserPath('~'), os.homedir());

    const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ica-norm-'));
    try {
      assert.equal(
        normalizeUserPath("'./my images/'", tempBase),
        path.join(tempBase, 'my images')
      );
      assert.equal(normalizeUserPath('   ', tempBase), path.resolve(tempBase));
    } finally {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });
});

describe('config persistence and folder creation', () => {
  it('saves, loads, handles corrupt JSON safely, and resets .imagerc.json', () => {
    const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ica-cfg-'));
    try {
      assert.equal(loadConfig(tempBase), null);

      const workDir = path.join(tempBase, 'store assets');
      const savedPath = saveConfig(tempBase, { workDir });
      assert.equal(savedPath, path.join(tempBase, CONFIG_FILENAME));
      assert.deepEqual(loadConfig(tempBase), { workDir });

      fs.writeFileSync(savedPath, '{not-valid-json', 'utf8');
      assert.equal(loadConfig(tempBase), null);

      assert.equal(resetConfig(tempBase), true);
      assert.equal(resetConfig(tempBase), false);
    } finally {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('resolves folders with --input/--output overrides and ensures both directories exist', () => {
    const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ica-dirs-'));
    try {
      const workDir = path.join(tempBase, 'workspace');
      const customOut = path.join(tempBase, 'web-ready');

      const resolved = resolveFolders({
        dir: workDir,
        output: customOut,
        cwd: tempBase,
      });

      assert.equal(resolved.workDir, workDir);
      assert.equal(resolved.inputDir, path.join(workDir, 'input'));
      assert.equal(resolved.outputDir, customOut);

      ensureFolders(resolved.inputDir, resolved.outputDir);
      assert.equal(fs.existsSync(resolved.inputDir), true);
      assert.equal(fs.existsSync(resolved.outputDir), true);
    } finally {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });
});
