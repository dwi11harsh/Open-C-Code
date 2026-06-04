/**
 * Per-line widht memoization.
 *
 * The most impactful optimization in the layout pipeline:
 *      caches the display width of each unique line string
 *      so stringWidth() is called at most once per unique line per session.
 *
 * Cache is bounded at 8192 entries to prevent unbounded growth during long sessions.
 * Eviction uses Map's insertion-order iteration (LRU-ish).
 */

import { stringWidth } from './stringWidth';

const CACHE_MAX = 8192;
const cache = new Map<string, number>();

/**
 * Get the display width of a single line (no newlines).
 * Result is cached by the line string.
 *
 * @param line - A single line of text (no newlines)
 *
 * @returns Display cell count
 */
export const lineWidth = (line: string): number => {
	const cached = cache.get(line);
	if (cached !== undefined) return cached;

	const w = stringWidth(line);

	if (cache.size >= CACHE_MAX) {
		const firstKey = cache.keys().next().value;
		if (firstKey !== undefined) cache.delete(firstKey);
	}

	cache.set(line, w);
	return w;
};

/** Clear the cache. Tests only. */
export const clearLineWidthCache = (): void => {
	cache.clear();
};
