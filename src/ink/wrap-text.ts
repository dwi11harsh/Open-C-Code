/**
 * Text wrapping and truncation for terminal display.
 *
 * Matches Ink's textWrap prop values exactly:
 *   'wrap'            - word-wrap, preserving words
 *   'wrap-trim'       - word-wrap, trim leading/trailing whitespace
 *   'truncate'        - cut with '...' at end (alias: 'truncate-end', 'end')
 *   'truncate-start'  - cut with '...' at start
 *   'truncate-middle' - cut with '...' in middle (alias: 'middle')
 *
 * All modes handle ANSI escape sequences correctly.
 */

import sliceAnsi from '../utils/sliceAnsi';
import { stringWidth } from './stringWidth';
import { wrapAnsi } from './wrapAnsi';

const ELLIPSIS = '\u2026'; // '…' — Unicode ellipsis (1 char, 1 cell)

/**
 * Slice a string safely at a cell boundary.
 * A CJK character at position `end-1` may overshoot by 1 cell —
 * retry with end-1 to ensure the result fits within the target width.
 */
const sliceFit = (text: string, start: number, end: number): string => {
	const s = sliceAnsi(text, start, end);
	return stringWidth(s) > end - start ? sliceAnsi(text, start, end - 1) : s;
};

/**
 * Truncate a string to at most `columns` display cells with an ellipsis.
 */
const truncate = (
	text: string,
	columns: number,
	position: 'start' | 'middle' | 'end',
): string => {
	if (columns < 1) return '';
	if (columns === 1) return ELLIPSIS;
	const length = stringWidth(text);
	if (length <= columns) return text;

	if (position === 'start') {
		return ELLIPSIS + sliceFit(text, length - columns + 1, length);
	}
	if (position === 'middle') {
		const half = Math.floor(columns / 2);
		return (
			sliceFit(text, 0, half) +
			ELLIPSIS +
			sliceFit(text, length - (columns - half) + 1, length)
		);
	}
	// 'end'
	return sliceFit(text, 0, columns - 1) + ELLIPSIS;
};

type TextWrapMode =
	| 'wrap'
	| 'wrap-trim'
	| 'truncate'
	| 'truncate-end'
	| 'end'
	| 'truncate-start'
	| 'truncate-middle'
	| 'middle';

/**
 * Wrap or truncate text to fit within maxWidth display cells.
 */
export const wrapText = (
	text: string,
	maxWidth: number,
	wrapType: TextWrapMode | undefined,
): string => {
	if (!wrapType || maxWidth <= 0) return text;

	switch (wrapType) {
		case 'wrap':
			return wrapAnsi(text, maxWidth, { trim: false, hard: true });
		case 'wrap-trim':
			return wrapAnsi(text, maxWidth, { trim: true, hard: true });
		case 'truncate':
		case 'truncate-end':
		case 'end':
			return truncate(text, maxWidth, 'end');
		case 'truncate-start':
			return truncate(text, maxWidth, 'start');
		case 'truncate-middle':
		case 'middle':
			return truncate(text, maxWidth, 'middle');
		default:
			return text;
	}
};

export default wrapText;
