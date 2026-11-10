const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CONFIG_FILENAME = '.imagerc.json';

/**
 * Strip matching quotes, expand leading ~, and resolve a user-provided path.
 * @param {string} rawPath
 * @param {string} [cwd=process.cwd()]
 * @returns {string}
 */
function normalizeUserPath(rawPath, cwd = process.cwd()) {
  let trimmed = typeof rawPath === 'string' ? rawPath.trim() : '';

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  if (!trimmed) {
    return path.resolve(cwd);
  }

  if (trimmed === '~') {
    return os.homedir();
  }

  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.resolve(os.homedir(), trimmed.slice(2));
  }

  return path.resolve(cwd, trimmed);
}

/**
 * Resolve effective working, input, and output directories from options and defaults.
 * @param {{ dir?: string, input?: string, output?: string, workDir?: string, cwd?: string }} params
 * @returns {{ workDir: string, inputDir: string, outputDir: string }}
 */
function resolveFolders({ dir, input, output, workDir, cwd = process.cwd() } = {}) {
  const effectiveWorkDir = dir
    ? normalizeUserPath(dir, cwd)
    : workDir
      ? normalizeUserPath(workDir, cwd)
      : path.resolve(cwd);

  const inputDir = input
    ? normalizeUserPath(input, cwd)
    : path.join(effectiveWorkDir, 'input');

  const outputDir = output
    ? normalizeUserPath(output, cwd)
    : path.join(effectiveWorkDir, 'output');

  return {
    workDir: effectiveWorkDir,
    inputDir,
    outputDir,
  };
}

/**
 * Load saved working folder configuration from .imagerc.json, or null if absent/invalid.
 * @param {string} configDir
 * @returns {{ workDir: string } | null}
 */
function loadConfig(configDir) {
  const configPath = path.join(configDir, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.workDir === 'string' && parsed.workDir.trim()) {
      return { workDir: parsed.workDir };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist working folder configuration to .imagerc.json.
 * @param {string} configDir
 * @param {{ workDir: string }} config
 * @returns {string}
 */
function saveConfig(configDir, config) {
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, CONFIG_FILENAME);
  const payload = { workDir: config.workDir };
  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return configPath;
}

/**
 * Remove saved .imagerc.json if present.
 * @param {string} configDir
 * @returns {boolean}
 */
function resetConfig(configDir) {
  const configPath = path.join(configDir, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    return false;
  }
  fs.unlinkSync(configPath);
  return true;
}

/**
 * Create input and output directories if they do not exist.
 * @param {string} inputDir
 * @param {string} outputDir
 * @returns {{ inputDir: string, outputDir: string }}
 */
function ensureFolders(inputDir, outputDir) {
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  return { inputDir, outputDir };
}

module.exports = {
  CONFIG_FILENAME,
  normalizeUserPath,
  resolveFolders,
  loadConfig,
  saveConfig,
  resetConfig,
  ensureFolders,
};
