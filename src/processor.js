const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { getDefaultQuality, parseFormat } = require('./parser');
const { getEffectiveDimensions, resolveTargetDimensions } = require('./ratio');

const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const DEFAULT_BG = { r: 255, g: 255, b: 255 };

const FORMAT_SPECS = {
  jpg: {
    ext: '.jpg',
    encode: (pipeline, quality) => pipeline.jpeg({ quality, mozjpeg: true }),
  },
  webp: {
    ext: '.webp',
    encode: (pipeline, quality) => pipeline.webp({ quality, effort: 6 }),
  },
  avif: {
    ext: '.avif',
    encode: (pipeline, quality) => pipeline.avif({ quality, effort: 4 }),
  },
};

/**
 * Discover supported image files inside inputDir, ignoring dotfiles and subdirectories.
 * @param {string} inputDir
 * @returns {string[]}
 */
function discoverImages(inputDir) {
  if (!fs.existsSync(inputDir)) {
    return [];
  }

  return fs
    .readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isFile() || entry.name.startsWith('.')) {
        return false;
      }
      const ext = path.extname(entry.name).toLowerCase();
      return SUPPORTED_EXTENSIONS.has(ext);
    })
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Convert and validate a single image file into target dimensions.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function processSingleImage({
  file,
  inputDir,
  outputDir,
  width,
  height,
  quality,
  bg,
  formatSpec,
  usedOutputKeys,
}) {
  const inputPath = path.join(inputDir, file);
  const outputName = `${path.parse(file).name}${formatSpec.ext}`;
  const outputKey = outputName.toLowerCase();

  if (usedOutputKeys.has(outputKey)) {
    return {
      file,
      outputName,
      status: 'skipped',
      reason: 'filename-collision',
      message: `Duplicate filename stem would overwrite "${outputName}".`,
    };
  }
  usedOutputKeys.add(outputKey);

  try {
    const metadata = await sharp(inputPath).metadata();
    const effective = getEffectiveDimensions(metadata);

    if (!effective.width || !effective.height) {
      return {
        file,
        outputName,
        status: 'failed',
        reason: 'missing-dimensions',
        error: 'Could not read image width or height.',
      };
    }

    const dimCheck = resolveTargetDimensions(effective.width, effective.height, width, height);
    if (!dimCheck.ok) {
      if (dimCheck.reason === 'dimension-out-of-range') {
        return {
          file,
          outputName,
          status: 'failed',
          reason: 'dimension-out-of-range',
          error: dimCheck.error,
        };
      }
      return {
        file,
        outputName,
        status: 'skipped',
        reason: 'aspect-ratio-mismatch',
        srcWidth: effective.width,
        srcHeight: effective.height,
        srcRatioLabel: dimCheck.srcRatioLabel,
        targetRatioLabel: dimCheck.targetRatioLabel,
        suggestedDimensions: dimCheck.suggestedDimensions,
      };
    }

    const inputBytes = fs.statSync(inputPath).size;
    const pipeline = sharp(inputPath)
      .rotate()
      .flatten({ background: bg })
      .resize(dimCheck.width, dimCheck.height, { fit: 'fill' });

    const outputBuffer = await formatSpec.encode(pipeline, quality).toBuffer();

    const outputPath = path.join(outputDir, outputName);
    fs.writeFileSync(outputPath, outputBuffer);

    return {
      file,
      outputName,
      outputPath,
      status: 'converted',
      srcWidth: effective.width,
      srcHeight: effective.height,
      width: dimCheck.width,
      height: dimCheck.height,
      quality,
      inputBytes,
      outputBytes: outputBuffer.length,
    };
  } catch (err) {
    return {
      file,
      outputName,
      status: 'failed',
      reason: 'processing-error',
      error: err.message,
    };
  }
}

/**
 * Process all supported images from inputDir into outputDir at target height or exact WxH.
 * @param {object} options
 * @param {string} options.inputDir
 * @param {string} options.outputDir
 * @param {number | null | undefined} [options.width]
 * @param {number} options.height
 * @param {number} [options.quality]
 * @param {{ r: number, g: number, b: number }} [options.bg]
 * @param {'jpg' | 'webp' | 'avif'} [options.format='jpg']
 * @param {(result: object) => void} [options.onProgress]
 * @returns {Promise<{
 *   total: number,
 *   converted: number,
 *   skipped: number,
 *   failed: number,
 *   collisions: number,
 *   totalInputBytes: number,
 *   totalOutputBytes: number,
 *   results: object[]
 * }>}
 */
async function processBatch({
  inputDir,
  outputDir,
  width = null,
  height,
  quality,
  bg = DEFAULT_BG,
  format = 'jpg',
  onProgress,
}) {
  const normalizedFormat = parseFormat(format);
  const formatSpec = FORMAT_SPECS[normalizedFormat];
  const resolvedQuality = quality ?? getDefaultQuality(normalizedFormat);

  fs.mkdirSync(outputDir, { recursive: true });
  const files = discoverImages(inputDir);
  const usedOutputKeys = new Set();

  const summary = {
    total: files.length,
    converted: 0,
    skipped: 0,
    failed: 0,
    collisions: 0,
    totalInputBytes: 0,
    totalOutputBytes: 0,
    results: [],
  };

  for (const file of files) {
    const result = await processSingleImage({
      file,
      inputDir,
      outputDir,
      width,
      height,
      quality: resolvedQuality,
      bg,
      formatSpec,
      usedOutputKeys,
    });

    if (result.status === 'converted') {
      summary.converted += 1;
      summary.totalInputBytes += result.inputBytes;
      summary.totalOutputBytes += result.outputBytes;
    } else if (result.status === 'skipped') {
      summary.skipped += 1;
      if (result.reason === 'filename-collision') {
        summary.collisions += 1;
      }
    } else {
      summary.failed += 1;
    }

    summary.results.push(result);
    if (typeof onProgress === 'function') {
      onProgress(result);
    }
  }

  return summary;
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  discoverImages,
  processBatch,
};
