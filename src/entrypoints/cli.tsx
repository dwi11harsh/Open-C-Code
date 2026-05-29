import {
	consumeEarlyInput,
	exitWithError,
	logForDebugging,
	profileCheckpoint,
	profileReport,
	startCapturingEarlyInput,
} from 'src/utils';

// ── Record import checkpoint immediately ─────────────────────────────────────
profileCheckpoint('cli_entry');

// ── Start buffering early keystrokes ─────────────────────────────────────────
startCapturingEarlyInput();

const VERSION = '0.0.1';
const PRODUCT_NAME = 'open-c-code';

async function main(): Promise<void> {
	profileCheckpoint('main_start');

	const args = process.argv.slice(2);
	logForDebugging('CLI started with args:', args);

	// ── Fast-path flags ──────────────────────────────────────────────
	// handle immediately, before loading anything heavy
	if (args.includes('--version') || args.includes('-v')) {
		console.log(`${PRODUCT_NAME} v${VERSION}`);
		return;
	}

	if (args.includes('--help') || args.includes('-h')) {
		printHelp();
		return;
	}

	// ── Load settings and resolve model ────────────────────────────────────────
	profileCheckpoint('settings_load_start');
	const { getSettings } = await import('src/utils/settings/settings');
	const { getMainLoopModel } = await import('src/utils/model/model');
	profileCheckpoint('settings_load_end');

	const settings = getSettings();
	const model = getMainLoopModel();

	profileCheckpoint('main_after_settings');

	// ── Consume early input ──────────────────────────────────────────────────
	const earlyInput = consumeEarlyInput();

	// ── Normal boot ──────────────────────────────────────────────
	// TODOs:
	// 1. load config files
	// 2. initialize the model client
	// 3. start Ink TUI

	console.log(`${PRODUCT_NAME} v${VERSION}`);
	console.log(`Model: ${model}`);

	settings.theme ?? console.log(`Theme: ${settings.theme}`);

	earlyInput ?? console.log(`Early input captured: ${earlyInput}`);

	console.log('Day 4: settings + model pipeline working!');

	profileReport();
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

	console.log(help);
};

// ── Top Level Handler ──────────────────────────────────────────────
// every cli needs this, withoug it, an unhandled rejection silently
// exits with code 0 (this lies to shell scripts about success)
main().catch((err: unknown) => {
	exitWithError(err);
});
