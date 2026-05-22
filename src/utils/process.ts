/**
 * Logs a fatal error and terminates the process with the specified exit code.
 *
 * If the error is an instance of `Error`, its message is logged. If the environment
 * variable `DEBUG` is set to `'1'` and a stack trace is available, the stack trace
 * is logged; otherwise, the error object itself is logged.
 *
 * @param error - The error that caused the process termination.
 * @param exitCode - The exit code to terminate the process with. Defaults to `1`.
 */
export const exitWithError = (error: unknown, exitCode = 1): never => {
	if (error instanceof Error) {
		console.error(`Fatal: ${error.message}`);
		if (Bun.env.DEBUG === '1' && error.stack) {
			console.error(error.stack);
		} else {
			console.error('Fatal:', error);
		}
	}

	process.exit(exitCode);
};

/**
 * Terminates the process cleanly with a successful exit code of `0`.
 * Use this instead of bare `process.exit(0)` for consistency.
 */
export const exitCleanly = (): never => {
	process.exit(0);
};
