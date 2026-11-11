const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseSize,
  parseColor,
  parseFormat,
  getDefaultQuality,
  parseArgs,
  formatHelp,
} = require('../src/parser');

describe('parseSize', () => {
  it('parses standard dimension separators (x, X, *, ×, comma) with whitespace', () => {
    assert.deepEqual(parseSize('800x800'), { width: 800, height: 800 });
    assert.deepEqual(parseSize(' 1200X628 '), { width: 1200, height: 628 });
    assert.deepEqual(parseSize('1080*1080'), { width: 1080, height: 1080 });
    assert.deepEqual(parseSize('640×480'), { width: 640, height: 480 });
    assert.deepEqual(parseSize('400, 300'), { width: 400, height: 300 });
  });

  it('parses single integer or px size as target height with null width', () => {
    assert.deepEqual(parseSize('800'), { width: null, height: 800 });
    assert.deepEqual(parseSize('800px'), { width: null, height: 800 });
    assert.deepEqual(parseSize(' 1200 PX '), { width: null, height: 1200 });
  });

  it('rejects empty, zero, negative, fractional, oversized, or malformed dimensions', () => {
    assert.throws(() => parseSize(''), /Invalid size/i);
    assert.throws(() => parseSize('0x800'), /positive integer/i);
    assert.throws(() => parseSize('0px'), /positive integer/i);
    assert.throws(() => parseSize('-800x800'), /Invalid size/i);
    assert.throws(() => parseSize('-800px'), /Invalid size/i);
    assert.throws(() => parseSize('800.5x800'), /Invalid size/i);
    assert.throws(() => parseSize('abc'), /Invalid size/i);
    assert.throws(() => parseSize('20000x20000'), /16384/);
    assert.throws(() => parseSize('20000px'), /16384/);
  });
});

describe('parseFormat & getDefaultQuality', () => {
  it('supports jpg, webp, avif, jpeg alias, optional dot, and case-insensitive input', () => {
    assert.equal(parseFormat('jpg'), 'jpg');
    assert.equal(parseFormat('webp'), 'webp');
    assert.equal(parseFormat('avif'), 'avif');
    assert.equal(parseFormat('.WEBP'), 'webp');
    assert.equal(parseFormat('JPEG'), 'jpg');
    assert.equal(getDefaultQuality('jpg'), 85);
    assert.equal(getDefaultQuality('webp'), 85);
    assert.equal(getDefaultQuality('avif'), 65);
  });

  it('rejects unsupported formats', () => {
    assert.throws(() => parseFormat('gif'), /Invalid format/i);
    assert.throws(() => parseFormat('png'), /Invalid format/i);
    assert.throws(() => parseFormat(''), /Invalid format/i);
  });
});

describe('parseColor', () => {
  it('parses 3-digit and 6-digit hex colors with or without leading #', () => {
    assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255 });
    assert.deepEqual(parseColor('#103e76'), { r: 16, g: 62, b: 118 });
    assert.deepEqual(parseColor('ffcf00'), { r: 255, g: 207, b: 0 });
  });

  it('rejects invalid hex strings', () => {
    assert.throws(() => parseColor('red'), /Invalid hex color/i);
    assert.throws(() => parseColor('#12'), /Invalid hex color/i);
    assert.throws(() => parseColor('#zzzzzz'), /Invalid hex color/i);
  });
});

describe('parseArgs', () => {
  it('parses defaults when argv is empty leaving quality and format undefined', () => {
    const parsed = parseArgs([]);
    assert.deepEqual(parsed, {
      help: false,
      version: false,
      setup: false,
      reset: false,
      yes: false,
      strict: false,
      dir: undefined,
      input: undefined,
      output: undefined,
      sizeArg: undefined,
      quality: undefined,
      bg: { r: 255, g: 255, b: 255 },
      format: undefined,
    });
  });

  it('parses flags in space-separated and equals syntax alongside positional size', () => {
    const parsed = parseArgs([
      '--dir', 'D:\\Photos',
      '--quality=92',
      '--bg', '#103e76',
      '--strict',
      '--yes',
      '1000x1000',
    ]);
    assert.equal(parsed.dir, 'D:\\Photos');
    assert.equal(parsed.quality, 92);
    assert.deepEqual(parsed.bg, { r: 16, g: 62, b: 118 });
    assert.equal(parsed.strict, true);
    assert.equal(parsed.yes, true);
    assert.equal(parsed.sizeArg, '1000x1000');
  });

  it('rejects missing values, invalid quality bounds, unexpected extra positional args, and unknown flags', () => {
    assert.throws(() => parseArgs(['--dir']), /Missing value/i);
    assert.throws(() => parseArgs(['--quality', '150']), /1 and 100/);
    assert.throws(() => parseArgs(['--quality', '0']), /1 and 100/);
    assert.throws(() => parseArgs(['--quality', 'high']), /1 and 100/);
    assert.throws(() => parseArgs(['--nope']), /Unknown option/);
    assert.throws(() => parseArgs(['800x800', '900x900']), /Unexpected extra argument/i);
  });
});

describe('parseArgs --format flag', () => {
  it('leaves format undefined when omitted', () => {
    const parsed = parseArgs([]);
    assert.equal(parsed.format, undefined);
  });

  it('accepts --format webp and --format avif', () => {
    assert.equal(parseArgs(['--format', 'webp']).format, 'webp');
    assert.equal(parseArgs(['--format', 'avif']).format, 'avif');
  });

  it('accepts -f shorthand and normalizes jpeg/uppercase', () => {
    assert.equal(parseArgs(['-f', 'webp']).format, 'webp');
    assert.equal(parseArgs(['-f', 'AVIF']).format, 'avif');
    assert.equal(parseArgs(['--format', 'jpeg']).format, 'jpg');
  });

  it('accepts --format jpg explicitly', () => {
    assert.equal(parseArgs(['--format', 'jpg']).format, 'jpg');
  });

  it('throws for unsupported format values', () => {
    assert.throws(() => parseArgs(['--format', 'gif']), /Invalid format/i);
    assert.throws(() => parseArgs(['--format', 'png']), /Invalid format/i);
    assert.throws(() => parseArgs(['-f', '']), /Invalid format/i);
  });
});

describe('formatHelp', () => {
  it('documents CLI flags and examples including --format, avif, and 800px height', () => {
    const help = formatHelp();
    assert.match(help, /--dir/);
    assert.match(help, /--size/);
    assert.match(help, /--quality/);
    assert.match(help, /--strict/);
    assert.match(help, /--reset/);
    assert.match(help, /--format/);
    assert.match(help, /avif/);
    assert.match(help, /800px/);
  });
});
