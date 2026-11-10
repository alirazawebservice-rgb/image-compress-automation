const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

/**
 * Create a disposable readline prompt helper bound to stdin/stdout.
 * @returns {{ ask: (question: string) => Promise<string>, close: () => void }}
 */
function createPromptSession() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  return {
    ask: (question) => rl.question(question),
    close: () => rl.close(),
  };
}

/**
 * Prompt the user for their working folder on first setup or --setup.
 * @param {{ defaultDir: string, isTTY: boolean, ask: (q: string) => Promise<string> }} params
 * @returns {Promise<string>}
 */
async function promptForFolder({ defaultDir, isTTY, ask }) {
  if (!isTTY) {
    return defaultDir;
  }

  const answer = await ask(
    `📁 Enter working folder for "input" & "output" [Press Enter for "${defaultDir}"]: `
  );
  const trimmed = typeof answer === 'string' ? answer.trim() : '';
  return trimmed || defaultDir;
}

/**
 * Prompt the user for target dimensions when no --size argument was provided.
 * @param {{ imageCount: number, defaultSize?: string, isTTY: boolean, ask: (q: string) => Promise<string> }} params
 * @returns {Promise<string>}
 */
async function promptForSize({ imageCount, defaultSize = '800x800', isTTY, ask }) {
  if (!isTTY) {
    return defaultSize;
  }

  const answer = await ask(
    `📐 Found ${imageCount} image(s). Enter target size (e.g. 800x800, 1200x628) [Enter for ${defaultSize}]: `
  );
  const trimmed = typeof answer === 'string' ? answer.trim() : '';
  return trimmed || defaultSize;
}

module.exports = {
  createPromptSession,
  promptForFolder,
  promptForSize,
};
