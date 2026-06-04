/**
 * Thin wrapper around the `wrap-ansi` npm package.
 * Exists so we can swap the implementation without touching call sites.
 */
import _wrapAnsi from 'wrap-ansi';

export const wrapAnsi = (
	str: string,
	columns: number,
	options?: { trim?: boolean; hard?: boolean; wordWrap?: boolean },
): string => {
	return _wrapAnsi(str, columns, options);
};
