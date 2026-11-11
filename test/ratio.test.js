const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  gcd,
  simplifyRatio,
  getEffectiveDimensions,
  validateAspectRatio,
  resolveTargetDimensions,
} = require('../src/ratio');

describe('gcd & simplifyRatio', () => {
  it('computes GCD and simplifies common aspect ratios', () => {
    assert.equal(gcd(1600, 1600), 1600);
    assert.equal(simplifyRatio(1600, 1600), '1:1');
    assert.equal(simplifyRatio(800, 1600), '1:2');
    assert.equal(simplifyRatio(1920, 1080), '16:9');
  });
});

describe('getEffectiveDimensions', () => {
  it('keeps dimensions for orientations 1-4 or undefined and swaps for 5-8', () => {
    assert.deepEqual(getEffectiveDimensions({ width: 1600, height: 800 }), {
      width: 1600,
      height: 800,
    });
    assert.deepEqual(getEffectiveDimensions({ width: 1600, height: 800, orientation: 1 }), {
      width: 1600,
      height: 800,
    });
    assert.deepEqual(getEffectiveDimensions({ width: 1600, height: 800, orientation: 6 }), {
      width: 800,
      height: 1600,
    });
    assert.deepEqual(getEffectiveDimensions({ width: 1600, height: 800, orientation: 8 }), {
      width: 800,
      height: 1600,
    });
  });
});

describe('validateAspectRatio', () => {
  it('accepts matching ratios and 1% integer rounding variance', () => {
    const exact = validateAspectRatio(1600, 1600, 800, 800);
    assert.equal(exact.ok, true);
    assert.equal(exact.srcRatioLabel, '1:1');
    assert.equal(exact.targetRatioLabel, '1:1');

    const rounded = validateAspectRatio(1920, 1080, 1000, 563);
    assert.equal(rounded.ok, true);
  });

  it('rejects mismatched aspect ratios and suggests valid proportional dimensions', () => {
    const mismatch = validateAspectRatio(500, 1000, 800, 800);
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.srcRatioLabel, '1:2');
    assert.equal(mismatch.targetRatioLabel, '1:1');
    assert.ok(mismatch.diff > 0.01);
    assert.deepEqual(mismatch.suggestedDimensions, ['800x1600', '400x800']);
  });

  it('omits suggested dimensions that exceed MAX_DIMENSION (16384px)', () => {
    const extreme = validateAspectRatio(100, 5000, 800, 800);
    assert.equal(extreme.ok, false);
    assert.deepEqual(extreme.suggestedDimensions, ['16x800']);
  });
});

describe('resolveTargetDimensions', () => {
  it('computes proportional width when targetW is null without losing aspect ratio', () => {
    const sq = resolveTargetDimensions(1600, 1600, null, 800);
    assert.deepEqual({ ok: sq.ok, mode: sq.mode, width: sq.width, height: sq.height }, {
      ok: true,
      mode: 'height',
      width: 800,
      height: 800,
    });

    const wide = resolveTargetDimensions(1920, 1080, null, 800);
    assert.deepEqual({ ok: wide.ok, mode: wide.mode, width: wide.width, height: wide.height }, {
      ok: true,
      mode: 'height',
      width: 1422,
      height: 800,
    });

    const tall = resolveTargetDimensions(800, 1600, undefined, 800);
    assert.deepEqual({ ok: tall.ok, mode: tall.mode, width: tall.width, height: tall.height }, {
      ok: true,
      mode: 'height',
      width: 400,
      height: 800,
    });
  });

  it('rejects computed width below 1 or above MAX_DIMENSION in height mode', () => {
    const tooWide = resolveTargetDimensions(10000, 100, null, 800);
    assert.equal(tooWide.ok, false);
    assert.equal(tooWide.reason, 'dimension-out-of-range');

    const tooNarrow = resolveTargetDimensions(1, 5000, null, 800);
    assert.equal(tooNarrow.ok, false);
    assert.equal(tooNarrow.reason, 'dimension-out-of-range');
  });

  it('delegates exact WxH to strict aspect ratio validation', () => {
    const match = resolveTargetDimensions(1600, 1600, 800, 800);
    assert.equal(match.ok, true);
    assert.equal(match.mode, 'exact');
    assert.equal(match.width, 800);
    assert.equal(match.height, 800);

    const mismatch = resolveTargetDimensions(500, 1000, 800, 800);
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.mode, 'exact');
    assert.deepEqual(mismatch.suggestedDimensions, ['800x1600', '400x800']);
  });
});
