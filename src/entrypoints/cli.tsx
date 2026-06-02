/**
 * CLI Entry Point
 *
 * 1. Startup profiling + early input capture
 * 2. Parse args - fast-path for --version, --help
 * 3. Initialize session history
 * 4. Enter readline loop - read user input -> runAgentLoop -> stream to stdout
 * 5. Ctrl+C aborts the current request; second Ctrl+C exits
 */

import * as readline from 'readline';
import { runAgentLoop } from 'src/assistant/agentLoop';
import { SessionMessages } from 'src/assistant/sessionMessages';
import {
	consumeEarlyInput,
	exitWithError,
	logForDebugging,
	profileCheckpoint,
	profileReport,
	startCapturingEarlyInput,
} from 'src/utils';
import { createUserMessage } from 'src/utils/messages';

// ── Record import checkpoint immediately ─────────────────────────────────────
profileCheckpoint('cli_entry');

// ── Start buffering early keystrokes ─────────────────────────────────────────
startCapturingEarlyInput();

const VERSION = '0.0.1';
const PRODUCT_NAME = 'open-c-code';

// ── System prompt ─────────────────────────────────────────────────────────────
// TODO: minimal for now, will sophisticate this in later phases
const SYSTEM_PROMPT = `You are a helpful AI assistant. 
You are running inside a CLI tool called ${PRODUCT_NAME}.
Be concise and helpful. When writing code, use code blocks.
Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

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

	// **── Init ───────────────────────────────────────────────────────────────────**
	profileCheckpoint('settings_load_start');
	const { getSettings } = await import('src/utils/settings/settings');
	const { getMainLoopModel } = await import('src/utils/model/model');
	const settings = getSettings();
	const model = getMainLoopModel();
	profileCheckpoint('settings_load_end');

	profileCheckpoint('main_after_settings');

	// ── Consume early input ──────────────────────────────────────────────────
	const history = new SessionMessages();
	const earlyInput = consumeEarlyInput();

	// ── Normal boot ──────────────────────────────────────────────
	// TODOs:
	// 1. load config files
	// 2. initialize the model client
	// 3. start Ink TUI

	// ── Print header ───────────────────────────────────────────────────────────
	console.log(`${PRODUCT_NAME} v${VERSION}`);
	console.log(`Model: ${model}`);
	settings.theme ?? console.log(`Theme: ${settings.theme}`);
	earlyInput ?? console.log(`Early input captured: ${earlyInput}`);
	console.log(
		'Type your message and press Enter. Ctrl+C to cancel a request. Ctrl+D or type /exit to quit.\n',
	);

	profileReport();

	// ── Single prompt mode: --print / -p flag ─────────────────────────────────
	const printFlagIdx = args.findIndex((a) => a === '-p' || a === '--print');
	if (printFlagIdx !== -1) {
		const prompt = args[printFlagIdx + 1] || earlyInput;
		if (!prompt) {
			console.error('Error: -p flag requires a prompt argument');
			process.exit(1);
		}
		await runSingleTurn(history, model, prompt);
		return;
	}

	// ── Interactive REPL ───────────────────────────────────────────────────────
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true,
	});

	// Pre-fill prompt if early input was captured during startup
	const initialPrompt = earlyInput;

	const prompt = () => {
		process.stdout.write('\n\x1b[1;36m> \x1b[0m'); // Cyan bold prompt
	};

	// Ctrl + C handling
	let currentAbortController: AbortController | null = null;

	rl.on('SIGINT', () => {
		if (currentAbortController) {
			// first Ctrl + C: cancel current request
			currentAbortController.abort();
			currentAbortController = null;
			process.stdout.write('\n\x1b[33m[cancelled]\x1b[0m\n');
			prompt();
		} else {
			// second Ctrl + C (no request in progress): exit
			console.log('\n\x1b[2mBye!\x1b[0m');
			rl.close();
			process.exit(0);
		}
	});

	rl.on('close', () => {
		console.log('\n\x1b[2mBye!\x1b[0m');
		process.exit(0);
	});

	// Process an input line
	const processLine = async (line: string): Promise<void> => {
		const trimmed = line.trim();
		if (!trimmed) {
			prompt();
			return;
		}

		// Slash commands (very minimal for now)
		if (trimmed === '/exit' || trimmed === 'quit') {
			rl.close();
			return;
		}

		if (trimmed === '/clear') {
			history.clear();
			console.log('\x1b[2m[context cleared]\x1b[0m');
			prompt();
			return;
		}

		if (trimmed === '/cost') {
			const { sumTokenUsage } = await import('src/utils/tokens');
			const usage = sumTokenUsage(history.getAll());
			console.log(
				`\x1b[2mInput tokens: ${usage.input.toLocaleString()},
				Output tokens: ${usage.output.toLocaleString()}\x1b[0m`,
			);
			prompt();
			return;
		}

		if (trimmed === '/help') {
			console.log('\x1b[2mCommands: /clear, /cost, /exit, /help\x1b[0m');
			prompt();
			return;
		}

		// Normal message
		history.appendUser(createUserMessage(trimmed));

		currentAbortController = new AbortController();
		process.stdout.write('\n\x1b[2m'); // dim text for response

		let hasOutput = false;

		try {
			await runAgentLoop({
				history,
				systemPrompt: SYSTEM_PROMPT,
				model,
				signal: currentAbortController.signal,
				onText: (text) => {
					hasOutput = true;
					process.stdout.write(text);
				},
			});

			if (hasOutput) {
				process.stdout.write('\x1b[0m'); // reset dim
			}
		} catch (err: unknown) {
			process.stdout.write('\x1b[0m'); // reset on error

			if (err instanceof Error && err.name === 'AbortError') {
				// Already handled by SIGINT handler
			} else {
				console.error(
					`\n\x1b[31mError: ${err instanceof Error ? err.message : String(err)}\x1b[0m`,
				);
			}
		} finally {
			currentAbortController = null;
		}

		prompt();
	};

	if (initialPrompt) {
		prompt();
		process.stdout.write(`${initialPrompt}\n`);
		await processLine(initialPrompt);
	} else {
		prompt();
	}

	// Main REPL loop
	rl.on('line', processLine);
}

const runSingleTurn = async (
	history: SessionMessages,
	model: string,
	userInput: string,
): Promise<void> => {
	history.appendUser(createUserMessage(userInput));

	await runAgentLoop({
		history,
		systemPrompt: SYSTEM_PROMPT,
		model,
		onText: (text) => {
			process.stdout.write(text);
		},
	});

	process.stdout.write('\n');
};

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
