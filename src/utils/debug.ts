/**
 * Flag indicating whether debug logging is enabled.
 * True if environment variable `DEBUG` is "1" or "true", or `VERBOSE` is "1".
 */
const IS_DEBUG =
	Bun.env.DEBUG === '1' || Bun.env.DEBUG === 'true' || Bun.env.VERBOSE === '1';

/**
 * Logs debugging messages and data to standard error (`console.error`) with a timestamp,
 * if debug mode is enabled.
 *
 * @param args - One or more values to log.
 */
export const logForDebugging = (...args: unknown[]): void => {
	if (!IS_DEBUG) return;

	const timestamp = new Date().toISOString();
	console.error(`[DEBUG ${timestamp}]`, ...args);
};

/**
 * Checks if debug logging is enabled based on environmental variables.
 *
 * @returns `true` if debug mode is active, otherwise `false`.
 */
export const isDebugEnabled = (): boolean => {
	return IS_DEBUG;
};
