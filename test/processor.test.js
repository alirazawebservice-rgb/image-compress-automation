const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { discoverImages, processBatch } = require('../src/processor');

async function makeTempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ica-proc-'));
  const inputDir = path.join(root, 'input');
  const outputDir = path.join(root, 'output');
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  return { root, inputDir, outputDir };
}

describe('discoverImages', () => {
  it('ignores dotfiles, unsupported files, and subdirectories while sorting supported images', async () => {
    const { root, inputDir } = await makeTempWorkspace();
    try {
      fs.writeFileSync(path.join(inputDir, '.gitkeep'), '');
      fs.writeFileSync(path.join(inputDir, '.hidden.png'), 'x');
      fs.writeFileSync(path.join(inputDir, 'notes.txt'), 'hello');
      fs.mkdirSync(path.join(inputDir, 'nested'));
      fs.writeFileSync(path.join(inputDir, 'b-photo.PNG'), 'x');
      fs.writeFileSync(path.join(inputDir, 'a-photo.webp'), 'x');

      const found = discoverImages(inputDir);
      assert.deepEqual(found, ['a-photo.webp', 'b-photo.PNG']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('processBatch', () => {
  it('resizes PNG to target JPG dimensions keeping exact original filename stem', async () => {
    const { root, inputDir, outputDir } = await makeTempWorkspace();
    try {
      await sharp({
        create: { width: 1600, height: 1600, channels: 3, background: { r: 20, g: 120, b: 200 } },
      })
        .png()
        .toFile(path.join(inputDir, 'Heart Sky Bandana.png'));

      const summary = await processBatch({ inputDir, outputDir, width: 800, height: 800 });
      assert.equal(summary.converted, 1);
      assert.equal(summary.skipped, 0);
      assert.equal(summary.failed, 0);

      const outFile = path.join(outputDir, 'Heart Sky Bandana.jpg');
      assert.equal(fs.existsSync(outFile), true);
      const outMeta = await sharp(outFile).metadata();
      assert.equal(outMeta.format, 'jpeg');
      assert.equal(outMeta.width, 800);
      assert.equal(outMeta.height, 800);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flattens transparent PNG onto white background instead of black', async () => {
    const { root, inputDir, outputDir } = await makeTempWorkspace();
    try {
      await sharp({
        create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .png()
        .toFile(path.join(inputDir, 'cutout.png'));

      const summary = await processBatch({ inputDir, outputDir, width: 200, height: 200 });
      assert.equal(summary.converted, 1);

      const { data } = await sharp(path.join(outputDir, 'cutout.jpg'))
        .raw()
        .toBuffer({ resolveWithObject: true });

      assert.ok(data[0] >= 250 && data[1] >= 250 && data[2] >= 250, `Expected white background, got rgb(${data[0]},${data[1]},${data[2]})`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects aspect ratio mismatch without writing output and includes dimension hints', async () => {
    const { root, inputDir, outputDir } = await makeTempWorkspace();
    try {
      await sharp({
        create: { width: 400, height: 800, channels: 3, background: { r: 255, g: 0, b: 0 } },
      })
        .png()
        .toFile(path.join(inputDir, 'banner-1x2.png'));

      const summary = await processBatch({ inputDir, outputDir, width: 800, height: 800 });
      assert.equal(summary.converted, 0);
      assert.equal(summary.skipped, 1);
      assert.equal(fs.existsSync(path.join(outputDir, 'banner-1x2.jpg')), false);
      assert.equal(summary.results[0].reason, 'aspect-ratio-mismatch');
      assert.deepEqual(summary.results[0].suggestedDimensions, ['800x1600', '400x800']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('respects EXIF orientation when checking aspect ratio and writing output', async () => {
    const { root, inputDir, outputDir } = await makeTempWorkspace();
    try {
      await sharp({
        create: { width: 800, height: 400, channels: 3, background: { r: 10, g: 180, b: 80 } },
      })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer()
        .then((buf) => fs.writeFileSync(path.join(inputDir, 'portrait-exif.jpg'), buf));

      const summary = await processBatch({ inputDir, outputDir, width: 200, height: 400 });
      assert.equal(summary.converted, 1);
      assert.equal(summary.skipped, 0);

      const outMeta = await sharp(path.join(outputDir, 'portrait-exif.jpg')).metadata();
      assert.equal(outMeta.width, 200);
      assert.equal(outMeta.height, 400);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('detects filename stem collisions and isolates corrupt images without aborting valid siblings', async () => {
    const { root, inputDir, outputDir } = await makeTempWorkspace();
    try {
      await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 20, g: 20, b: 200 } },
      })
        .jpeg()
        .toFile(path.join(inputDir, 'logo.jpg'));

      await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 200, g: 20, b: 20 } },
      })
        .png()
        .toFile(path.join(inputDir, 'logo.png'));

      fs.writeFileSync(path.join(inputDir, 'corrupt.png'), 'not-a-real-png');

      const summary = await processBatch({ inputDir, outputDir, width: 100, height: 100 });
      assert.equal(summary.converted, 1);
      assert.equal(summary.skipped, 1);
      assert.equal(summary.collisions, 1);
      assert.equal(summary.failed, 1);

      const collisionEntry = summary.results.find((r) => r.file === 'logo.png');
      assert.equal(collisionEntry.reason, 'filename-collision');

      const corruptEntry = summary.results.find((r) => r.file === 'corrupt.png');
      assert.equal(corruptEntry.status, 'failed');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
