const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseSize, parseColor, parseArgs, formatHelp } = require('../src/parser');

describe('parseSize', () => {
  it('parses standard dimension separators (x, X, *, ×, comma) with whitespace', () => {
    assert.deepEqual(parseSize('800x800'), { width: 800, height: 800 });
    assert.deepEqual(parseSize(' 1200X628 '), { width: 1200, height: 628 });
    assert.deepEqual(parseSize('1080*1080'), { width: 1080, height: 1080 });
    assert.deepEqual(parseSize('640×480'), { width: 640, height: 480 });
    assert.deepEqual(parseSize('400, 300'), { width: 400, height: 300 });
  });

  it('rejects empty, zero, negative, fractional, oversized, or malformed dimensions', () => {
    assert.throws(() => parseSize(''), /Invalid size/i);
    assert.throws(() => parseSize('0x800'), /positive integer/i);
    assert.throws(() => parseSize('-800x800'), /Invalid size/i);
    assert.throws(() => parseSize('800.5x800'), /Invalid size/i);
    assert.throws(() => parseSize('abc'), /Invalid size/i);
    assert.throws(() => parseSize('20000x20000'), /16384/);
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
  it('parses defaults when argv is empty', () => {
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
      quality: 85,
      bg: { r: 255, g: 255, b: 255 },
      format: 'jpg',
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
  it('defaults format to "jpg" when flag is omitted', () => {
    const parsed = parseArgs([]);
    assert.equal(parsed.format, 'jpg');
  });

  it('accepts --format webp', () => {
    const parsed = parseArgs(['--format', 'webp']);
    assert.equal(parsed.format, 'webp');
  });

  it('accepts -f webp shorthand', () => {
    const parsed = parseArgs(['-f', 'webp']);
    assert.equal(parsed.format, 'webp');
  });

  it('accepts --format jpg explicitly', () => {
    const parsed = parseArgs(['--format', 'jpg']);
    assert.equal(parsed.format, 'jpg');
  });

  it('throws for unsupported format values', () => {
    assert.throws(() => parseArgs(['--format', 'gif']), /Invalid format/i);
    assert.throws(() => parseArgs(['--format', 'png']), /Invalid format/i);
    assert.throws(() => parseArgs(['-f', '']), /Invalid format/i);
  });
});

describe('parseArgs defaults include format', () => {
  it('parses defaults when argv is empty including format: jpg', () => {
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
      quality: 85,
      bg: { r: 255, g: 255, b: 255 },
      format: 'jpg',
    });
  });
});

describe('formatHelp', () => {
  it('documents CLI flags and examples including --format', () => {
    const help = formatHelp();
    assert.match(help, /--dir/);
    assert.match(help, /--size/);
    assert.match(help, /--quality/);
    assert.match(help, /--strict/);
    assert.match(help, /--reset/);
    assert.match(help, /--format/);
  });
});
