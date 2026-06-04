/**
 * Slice a string by display cell position, preserving ANSI excape codes.
 *
 * Unlike str.slice(start, end) which operates on byte offsets,
 * this function counts terminal display cells.
 *
 * ANSI codes are zero-width and are preserved across the cut point.
 *
 * Wraps the `slice-ansi` npm package. This indirection exists so we can
 * swap the implementation without touching call sites.
 *
 * @param str   - Input string (may contain ANSI escape codes)
 * @param start - Start cell index (inclusive)
 * @param end   - End cell index (exclusive); omit to slice to end
 *
 * @example
 *      sliceAnsi('\x1b[32mhello world\x1b[0m', 0, 5) // → '\x1b[32mhello\x1b[0m'
 *
 *      sliceAnsi('こんにちは', 0, 4)  // → 'こん'  (each CJK char = 2 cells)
 */
import _sliceAnsi from 'slice-ansi';

const sliceAnsi = (str: string, start: number, end?: number): string => {
	return _sliceAnsi(str, start, end);
};

export default sliceAnsi;
