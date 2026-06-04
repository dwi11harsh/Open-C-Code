/**
 * Development-time warning helpers.
 *
 * Box checks that all spacing values (padding, margin, gap) are integers.
 * Fractional values produce sub-pixel layout in Yoga that snaps unpredictably.
 *
 * Warnings are printed once per unique prop+value combination to avoid
 * flooding the output during re-renders.
 */

const warned = new Set<string>();

/**
 * Warn if `value` is a non-integer number.
 * Silently ignored if value is undefined, null, or already an integer.
 *
 * @param value - The spacing value to check
 * @param propName - The prop name (e.g. 'padding', 'marginTop') for the warning message
 */
export const ifNotInteger = (
	value: number | undefined | null,
	propName: string,
): void => {
	if (value === undefined || value === null) return;
	if (Number.isInteger(value)) return;

	const key = `${propName}:${value}`;
	if (warned.has(key)) return;
	warned.add(key);

	// Use stderr to avoid corrupting Ink's stdout render
	process.stderr.write(
		`[ink] Warning: ${propName}=${value} is not an integer. ` +
			`Fractional layout values may cause unexpected rendering.\n`,
	);
};

/** Clear all warnings. Tests only. */
export const clearWarnings = (): void => {
	warned.clear();
};
