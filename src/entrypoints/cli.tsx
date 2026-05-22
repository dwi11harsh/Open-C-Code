import { exitWithError, logForDebugging } from 'src/utils';

const VERSION = '0.0.1';
const PRODUCT_NAME = 'open-c-code';

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	logForDebugging('CLI started with args:', args);

	// ── Fast-path flags ──────────────────────────────────────────────
	// handle immediately, before loading anything heavy
	if (args.includes('--version') || args.includes('-v')) {
		// biome-ignore lint/suspicious/noConsole: intentional CLI output
		console.log(`${PRODUCT_NAME} v${VERSION}`);
		return;
	}

	if (args.includes('--help') || args.includes('-h')) {
		printHelp();
		return;
	}

	// ── Normal boot ──────────────────────────────────────────────
	// TODOs:
	// 1. load config files
	// 2. initialize the model client
	// 3. start Ink TUI

	// biome-ignore lint/suspicious/noConsole: intentional CLI output
	console.log(`${PRODUCT_NAME} v${VERSION}`);
	// biome-ignore lint/suspicious/noConsole: intentional CLI output
	console.log('Day 1 scaffold is working!');
	// biome-ignore lint/suspicious/noConsole: intentional CLI output
	console.log('');

	if (args.length > 0) {
		// biome-ignore lint/suspicious/noConsole: intentional CLI output
		console.log('Args received:', args);
	} else {
		// biome-ignore lint/suspicious/noConsole: intentional CLI output
		console.log('Run with --help to see available options.');
	}
}

const printHelp = (): void => {
	const help = `
Usage: ${PRODUCT_NAME} [options] [prompt]

Options:
  -v, --version     Print version and exit
  -h, --help        Show this help message
  --debug           Enable debug logging

Examples:
  ${PRODUCT_NAME}                  Start interactive chat
  ${PRODUCT_NAME} "fix the bug"   Start with an initial prompt
  ${PRODUCT_NAME} --version       Print version

Documentation: https://github.com/your-username/${PRODUCT_NAME}
`.trim();

	// biome-ignore lint/suspicious/noConsole: intentional CLI output
	console.log(help);
};

// ── Top Level Handler ──────────────────────────────────────────────
// every cli needs this, withoug it, an unhandled rejection silently
// exits with code 0 (this lies to shell scripts about success)
main().catch((err: unknown) => {
	exitWithError(err);
});
