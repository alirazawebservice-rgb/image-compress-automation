const { MAX_DIMENSION } = require('./parser');
const DEFAULT_RATIO_TOLERANCE = 0.01;

/**
 * Greatest common divisor for two positive integers.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function gcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Simplify pixel width and height into a human-readable aspect ratio string.
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function simplifyRatio(width, height) {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

/**
 * Return effective display dimensions accounting for EXIF orientations 5-8.
 * @param {{ width: number, height: number, orientation?: number }} metadata
 * @returns {{ width: number, height: number }}
 */
function getEffectiveDimensions(metadata) {
  const { width, height, orientation } = metadata;
  if (orientation && orientation >= 5 && orientation <= 8) {
    return { width: height, height: width };
  }
  return { width, height };
}

/**
 * Validate whether source dimensions match target dimensions within tolerance.
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} targetW
 * @param {number} targetH
 * @param {number} [tolerance=0.01]
 * @returns {{
 *   ok: boolean,
 *   srcRatio: number,
 *   targetRatio: number,
 *   srcRatioLabel: string,
 *   targetRatioLabel: string,
 *   diff: number,
 *   suggestedDimensions: string[]
 * }}
 */
function validateAspectRatio(srcW, srcH, targetW, targetH, tolerance = DEFAULT_RATIO_TOLERANCE) {
  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;
  const diff = Math.abs(srcRatio - targetRatio) / srcRatio;
  const ok = diff <= tolerance;

  const suggestedDimensions = [];
  if (!ok) {
    const keepWidthH = Math.max(1, Math.round(targetW / srcRatio));
    const keepHeightW = Math.max(1, Math.round(targetH * srcRatio));
    if (targetW <= MAX_DIMENSION && keepWidthH <= MAX_DIMENSION) {
      suggestedDimensions.push(`${targetW}x${keepWidthH}`);
    }
    const byHeight = `${keepHeightW}x${targetH}`;
    if (
      keepHeightW <= MAX_DIMENSION &&
      targetH <= MAX_DIMENSION &&
      !suggestedDimensions.includes(byHeight)
    ) {
      suggestedDimensions.push(byHeight);
    }
  }

  return {
    ok,
    srcRatio,
    targetRatio,
    srcRatioLabel: simplifyRatio(srcW, srcH),
    targetRatioLabel: simplifyRatio(targetW, targetH),
    diff,
    suggestedDimensions,
  };
}

module.exports = {
  DEFAULT_RATIO_TOLERANCE,
  gcd,
  simplifyRatio,
  getEffectiveDimensions,
  validateAspectRatio,
};
