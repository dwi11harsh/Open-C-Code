/**
 * Measure the display dimensions of a text block.
 *
 * Returns { width, height } where:
 *   width  = widest line in display cells
 *   height = number of visual rows (accounting for word-wrap at maxWidth)
 *
 * This is the measure function passed to Yoga for text nodes.
 * Single-pass indexOf('\n') loop avoids array allocation on the hot path.
 */

import { lineWidth } from './line-width-cache';

type MeasureResult = { width: number; height: number };

/**
 * Measure a text block for Yoga layout.
 *
 * @param text     - The text to measure (may contain newlines and ANSI codes)
 * @param maxWidth - Column limit for word-wrap simulation (0 or Infinity = no wrap)
 */
export const measureText = (text: string, maxWidth: number): MeasureResult => {
	if (text.length === 0) return { width: 0, height: 0 };

	// maxWidth <= 0 or Infinity means no wrapping — each logical line = one visual line.
	// Must check before the loop since Math.ceil(w / Infinity) === 0.
	const noWrap = maxWidth <= 0 || !Number.isFinite(maxWidth);

	let height = 0;
	let width = 0;
	let start = 0;

	while (start <= text.length) {
		const end = text.indexOf('\n', start);
		const line =
			end === -1 ? text.substring(start) : text.substring(start, end);

		const w = lineWidth(line);
		width = Math.max(width, w);

		if (noWrap) {
			height++;
		} else {
			// Empty lines (w === 0) still occupy one visual row.
			// Non-empty lines wrap to ceil(w / maxWidth) visual rows.
			height += w === 0 ? 1 : Math.ceil(w / maxWidth);
		}

		if (end === -1) break;
		start = end + 1;
	}

	return { width, height };
};

export default measureText;
