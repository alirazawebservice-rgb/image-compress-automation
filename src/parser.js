const MAX_DIMENSION = 16384;
const DEFAULT_QUALITY = 85;
const DEFAULT_BG = { r: 255, g: 255, b: 255 };

const VALUE_FLAGS = {
  '--dir': 'dir',
  '-d': 'dir',
  '--input': 'input',
  '-i': 'input',
  '--output': 'output',
  '-o': 'output',
  '--size': 'sizeArg',
  '-s': 'sizeArg',
  '--quality': 'quality',
  '-q': 'quality',
  '--bg': 'bg',
};

const BOOLEAN_FLAGS = {
  '--help': 'help',
  '-h': 'help',
  '--version': 'version',
  '-v': 'version',
  '--setup': 'setup',
  '--reset': 'reset',
  '--yes': 'yes',
  '-y': 'yes',
  '--strict': 'strict',
};

/**
 * Parse a dimension string such as "800x800", "1200X628", or "1080*1080".
 * @param {string} rawSize
 * @returns {{ width: number, height: number }}
 */
function parseSize(rawSize) {
  const input = typeof rawSize === 'string' ? rawSize.trim() : '';
  const match = input.match(/^(\d+)\s*[xX×*,]\s*(\d+)$/);
  if (!match) {
    throw new Error(
      `Invalid size "${rawSize}". Use <width>x<height>, for example: 800x800 or 1200x628.`
    );
  }

  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);

  if (width <= 0 || height <= 0) {
    throw new Error(`Size dimensions must be positive integers, got ${width}x${height}.`);
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(
      `Size dimensions cannot exceed ${MAX_DIMENSION}px, got ${width}x${height}.`
    );
  }

  return { width, height };
}

/**
 * Parse a 3- or 6-digit hex color string into an RGB object.
 * @param {string} rawHex
 * @returns {{ r: number, g: number, b: number }}
 */
function parseColor(rawHex) {
  const cleaned = typeof rawHex === 'string' ? rawHex.trim().replace(/^#/, '') : '';
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new Error(`Invalid hex color "${rawHex}". Use #fff or #ffffff.`);
  }

  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : cleaned;

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/**
 * Parse JPEG quality integer between 1 and 100.
 * @param {string} rawQuality
 * @returns {number}
 */
function parseQuality(rawQuality) {
  if (!/^\d+$/.test(String(rawQuality).trim())) {
    throw new Error(`Quality must be an integer between 1 and 100, got "${rawQuality}".`);
  }
  const value = Number.parseInt(rawQuality, 10);
  if (value < 1 || value > 100) {
    throw new Error(`Quality must be between 1 and 100, got ${value}.`);
  }
  return value;
}

/**
 * Parse CLI arguments into a normalized options object.
 * @param {string[]} argv
 * @returns {{
 *   help: boolean,
 *   version: boolean,
 *   setup: boolean,
 *   reset: boolean,
 *   yes: boolean,
 *   strict: boolean,
 *   dir: string | undefined,
 *   input: string | undefined,
 *   output: string | undefined,
 *   sizeArg: string | undefined,
 *   quality: number,
 *   bg: { r: number, g: number, b: number }
 * }}
 */
function parseArgs(argv = []) {
  const options = {
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
    quality: DEFAULT_QUALITY,
    bg: { ...DEFAULT_BG },
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith('-') || token === '-') {
      if (options.sizeArg !== undefined) {
        throw new Error(`Unexpected extra argument "${token}".`);
      }
      options.sizeArg = token;
      continue;
    }

    const eqIndex = token.indexOf('=');
    const flag = eqIndex === -1 ? token : token.slice(0, eqIndex);
    const inlineValue = eqIndex === -1 ? undefined : token.slice(eqIndex + 1);

    if (BOOLEAN_FLAGS[flag]) {
      if (inlineValue !== undefined) {
        throw new Error(`Option "${flag}" does not accept a value.`);
      }
      options[BOOLEAN_FLAGS[flag]] = true;
      continue;
    }

    const targetKey = VALUE_FLAGS[flag];
    if (!targetKey) {
      throw new Error(`Unknown option "${flag}". Run with --help to see valid options.`);
    }

    let value = inlineValue;
    if (value === undefined) {
      if (i + 1 >= argv.length) {
        throw new Error(`Missing value for option "${flag}".`);
      }
      i += 1;
      value = argv[i];
    }

    if (targetKey === 'quality') {
      options.quality = parseQuality(value);
    } else if (targetKey === 'bg') {
      options.bg = parseColor(value);
    } else {
      options[targetKey] = value;
    }
  }

  return options;
}

/**
 * Return formatted CLI usage instructions.
 * @returns {string}
 */
function formatHelp() {
  return `
Image Compress Automation — Bulk Resize & JPG Compressor (No Photoshop Needed)

Usage:
  npm start
  node bin/cli.js [size] [options]
  node convert.js [size] [options]

Examples:
  npm start
  node bin/cli.js 800x800
  node bin/cli.js --dir "D:\\My Store Images" --size 800x800
  node bin/cli.js --input ./raw --output ./web --size 1200x628 --quality 85

Options:
  -s, --size <WxH>       Target dimensions (e.g. 800x800, 1200x628)
  -d, --dir <path>       Working folder containing input/ and output/ folders
  -i, --input <path>     Custom input folder (overrides <dir>/input)
  -o, --output <path>    Custom output folder (overrides <dir>/output)
  -q, --quality <1-100>  JPG quality (default: 85)
      --bg <hex>         Background fill for transparent PNGs (default: #ffffff)
      --setup            Re-ask and save the default working folder
      --reset            Clear saved working folder configuration
      --strict           Exit with code 1 if any image is skipped or fails
  -y, --yes              Skip interactive prompts and use defaults when needed
  -h, --help             Show this help message
  -v, --version          Show version number
`.trimStart();
}

module.exports = {
  MAX_DIMENSION,
  parseSize,
  parseColor,
  parseArgs,
  formatHelp,
};
