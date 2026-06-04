/**
 * Terminal display widht of a string -> most called function in render pipeline.
 *
 * TWO implementations:
 *      1. Bun.stringWidth() — C++ native, ~10× faster. Used when running under Bun.
 *      2. JavaScript fallback — grapheme-cluster-aware. Used in Node.js and tests.
 *
 * Correctness rule: ambiguous-width characters (⚠, ℹ, etc.) are NARROW (width 1), not wide.
 * The npm `string-width` package gets this wrong. We use `eastAsianWidth`
 *  with `ambiguousAsWide: false` to match actual terminal behavior on Western systems.
 */
import emojiRegex from 'emoji-regex';
import { eastAsianWidth } from 'get-east-asian-width';
import { getGraphemeSegmenter } from 'src/utils/intl';
import stripAnsi from 'strip-ansi';

const EMOJI_REGEX = emojiRegex();

// ── Bun native fast path ──────────────────────────────────────────────────────
const bunStringWidth = (() => {
	// biome-ignore lint/suspicious/noExplicitAny: Bun global
	const bun = (globalThis as any).Bun;

	if (typeof bun?.stringWidth === 'function')
		return bun.stringWidth as (s: string) => number;

	return null;
})();

// ── Zero-width codepoint detection ───────────────────────────────────────────

const isZeroWidth = (cp: number): boolean => {
	return (
		(cp >= 0x0300 && cp <= 0x036f) || // Combining diacritical marks
		(cp >= 0xfe00 && cp <= 0xfe0f) || // Variation selectors
		cp === 0x200d || // ZWJ
		cp === 0x200b || // Zero Width Space
		cp === 0xfeff // BOM
	);
};

const needsSegmentation = (str: string): boolean => {
	for (const char of str) {
		const cp = char.codePointAt(0) ?? 0;
		if (cp >= 0x1f300 && cp <= 0x1faff) return true; // Emoji
		if (cp >= 0x2600 && cp <= 0x27bf) return true; // Misc symbols
		if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return true; // Regional indicators (flags)
		if (cp >= 0xfe00 && cp <= 0xfe0f) return true; // Variation selectors
		if (cp === 0x200d) return true; // ZWJ
	}
	return false;
};

const getEmojiWidth = (grapheme: string): number => {
	const first = grapheme.codePointAt(0) ?? 0;
	// Flag sequences (two regional indicators) = width 2; single regional = width 1
	if (first >= 0x1f1e6 && first <= 0x1f1ff) {
		let count = 0;
		for (const _ of grapheme) count++;
		return count === 1 ? 1 : 2;
	}
	// Incomplete keycap: digit + VS16 without U+20E3 = width 1
	if (grapheme.length === 2) {
		const second = grapheme.codePointAt(1);
		if (
			second === 0xfe0f &&
			((first >= 0x30 && first <= 0x39) || first === 0x23 || first === 0x2a)
		) {
			return 1;
		}
	}
	return 2; // Most emoji are 2 cells wide
};

const stringWidthJS = (str: string): number => {
	if (typeof str !== 'string' || str.length === 0) return 0;

	// Fast path: pure ASCII (no ANSI, no wide chars)
	let isPureAscii = true;
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		if (code >= 127 || code === 0x1b) {
			isPureAscii = false;
			break;
		}
	}
	if (isPureAscii) {
		let w = 0;
		for (let i = 0; i < str.length; i++) {
			if (str.charCodeAt(i) > 0x1f) w++;
		}
		return w;
	}

	// Strip ANSI escape sequences
	if (str.includes('\x1b')) {
		str = stripAnsi(str);
		if (str.length === 0) return 0;
	}

	// Fast path: no emoji or combining chars
	if (!needsSegmentation(str)) {
		let w = 0;
		for (const char of str) {
			const cp = char.codePointAt(0) ?? 0;
			if (!isZeroWidth(cp)) w += eastAsianWidth(cp, { ambiguousAsWide: false });
		}
		return w;
	}

	// Full grapheme-cluster path
	let w = 0;
	for (const { segment: grapheme } of getGraphemeSegmenter().segment(str)) {
		EMOJI_REGEX.lastIndex = 0;
		if (EMOJI_REGEX.test(grapheme)) {
			w += getEmojiWidth(grapheme);
			continue;
		}
		for (const char of grapheme) {
			const cp = char.codePointAt(0) ?? 0;
			if (!isZeroWidth(cp)) {
				w += eastAsianWidth(cp, { ambiguousAsWide: false });
				break; // Only first non-zero-width code point counts for the cluster
			}
		}
	}
	return w;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the display width of a string in terminal cells.
 *
 * Uses Bun.stringWidth() when available (~10× faster).
 * Falls back to the JS implementation for Node.js and non-Bun envs.
 *
 * @example
 *   stringWidth('hello')             → 5
 *   stringWidth('こんにちは')        → 10
 *   stringWidth('\x1b[32mhi\x1b[0m') → 2
 *   stringWidth('⚠')                 → 1  (narrow, NOT 2)
 *   stringWidth('👨‍👩‍👧‍👦')    → 2  (ZWJ sequence)
 */
export const stringWidth = (str: string): number =>
	bunStringWidth ? bunStringWidth(str) : stringWidthJS(str);

export default stringWidth;
