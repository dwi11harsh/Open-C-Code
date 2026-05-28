/**
 * Early Input Capture
 *
 * Captures terminal input typed BEFORE the REPL is fully initialized.
 * Users often type `claude` and immediately start typing — this catches
 * those early keystrokes so nothing is lost during the boot sequence.
 *
 * Lifecycle:
 *   1. cli.tsx calls startCapturingEarlyInput() as early as possible
 *   2. When the REPL is ready, it calls consumeEarlyInput() to get buffered text
 *   3. consumeEarlyInput() automatically stops capturing
 *
 * Only active in interactive TTY mode. Never active with -p/--print flags.
 */

/** Characters buffered since capture started. */
let earlyInputBuffer = '';
/** Whether we are currently capturing. */
let isCapturing = false;
/** Reference to the readable handler so we can remove it precisely. */
let readableHandler: (() => void) | null = null;

/**
 * Start capturing stdin in raw mode as early as possible.
 *
 * Raw mode disables the terminal's line-buffering — we get each keystroke
 * immediately rather than waiting for Enter. This is necessary to catch
 * early input, but it also means we must handle all control characters
 * ourselves (Ctrl+C, Ctrl+D, backspace, etc.).
 *
 * Safe to call multiple times — subsequent calls after the first are no-ops.
 */
export const startCapturingEarlyInput = (): void => {
	// Guard: only in interactive TTY mode, not in pipe/print mode
	if (
		!process.stdin.isTTY ||
		isCapturing ||
		process.argv.includes('-p') ||
		process.argv.includes('--print')
	) {
		return;
	}

	isCapturing = true;
	earlyInputBuffer = '';

	try {
		process.stdin.setEncoding('utf8');
		process.stdin.setRawMode(true);
		process.stdin.ref(); // Prevent Node from exiting while we're listening

		// Use 'readable' event — same approach as Ink, ensures smooth handoff
		readableHandler = () => {
			let chunk = process.stdin.read();
			while (chunk !== null) {
				if (typeof chunk === 'string') {
					processChunk(chunk);
				}
				chunk = process.stdin.read();
			}
		};

		process.stdin.on('readable', readableHandler);
	} catch {
		// setRawMode throws on non-TTYs and in some CI environments.
		// Silently continue — early capture is a UX enhancement, not required.
		isCapturing = false;
	}
};

/**
 * Process a raw chunk of stdin bytes.
 * This is called once per 'readable' event with potentially many characters.
 *
 * We handle:
 *   Ctrl+C (0x03)  → exit immediately
 *   Ctrl+D (0x04)  → stop capturing (EOF)
 *   Backspace      → remove last grapheme cluster
 *   Escape seqs    → skip entirely (arrow keys, function keys, etc.)
 *   CR (0x0D)      → treat as newline
 *   Other printable → append to buffer
 */
const processChunk = (str: string): void => {
	let i = 0;

	while (i < str.length) {
		const char = str[i]!;
		const code = char.charCodeAt(0);

		// Ctrl+C — exit immediately
		// At this point in startup, shutdown machinery isn't initialized yet,
		// so we call process.exit directly. Exit code 130 = SIGINT convention.
		if (code === 3) {
			stopCapturingEarlyInput();
			process.exit(130);
			return;
		}

		// Ctrl+D — EOF, stop capturing
		if (code === 4) {
			stopCapturingEarlyInput();
			return;
		}

		// Backspace (127 or 8) — remove last character
		// We use a simple slice here. A full grapheme cluster implementation
		// would use Intl.Segmenter, but that's overkill for an early-input buffer.
		if (code === 127 || code === 8) {
			if (earlyInputBuffer.length > 0) {
				// Remove last code point (handles basic Unicode)
				const codePoints = [...earlyInputBuffer];
				codePoints.pop();
				earlyInputBuffer = codePoints.join('');
			}
			i++;
			continue;
		}

		// Escape sequences — skip until the terminating byte (@ to ~, 0x40-0x7E)
		// These are arrow keys, function keys, mouse events, focus events, etc.
		if (code === 27) {
			i++; // Skip ESC
			while (i < str.length) {
				const c = str.charCodeAt(i);
				i++;
				if (c >= 0x40 && c <= 0x7e) break; // Terminating byte — sequence done
			}
			continue;
		}

		// Skip other control characters (except tab=9, newline=10)
		if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
			i++;
			continue;
		}

		// Carriage return → newline
		if (code === 13) {
			earlyInputBuffer += '\n';
			i++;
			continue;
		}

		// Printable character — append to buffer
		earlyInputBuffer += char;
		i++;
	}
};

/**
 * Stop capturing early input.
 * Removes the stdin listener and clears the capturing flag.
 * Does NOT reset stdin state — Ink will manage that when it initializes.
 */
export const stopCapturingEarlyInput = (): void => {
	if (!isCapturing) return;

	isCapturing = false;

	if (readableHandler) {
		process.stdin.removeListener('readable', readableHandler);
		readableHandler = null;
	}

	// Do NOT call setRawMode(false) here. Ink sets up raw mode itself and
	// calling it here would race with Ink's initialization.
};

/**
 * Consume the captured early input.
 * Returns trimmed buffer contents and clears the buffer.
 * Automatically stops capturing.
 *
 * Call this once when the REPL is ready to accept input.
 */
export const consumeEarlyInput = (): string => {
	stopCapturingEarlyInput();
	const input = earlyInputBuffer.trim();
	earlyInputBuffer = '';
	return input;
};

/**
 * Check if any early input has been captured without consuming it.
 */
export const hasEarlyInput = (): boolean => {
	return earlyInputBuffer.trim().length > 0;
};

/**
 * Seed the buffer with text that should appear pre-filled in the prompt.
 * Used by --resume and similar flags that want to pre-populate the input.
 */
export const seedEarlyInput = (text: string): void => {
	earlyInputBuffer = text;
};

/**
 * Check if early input capture is currently active.
 */
export const isCapturingEarlyInput = (): boolean => {
	return isCapturing;
};
