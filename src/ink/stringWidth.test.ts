import { describe, expect, it } from 'bun:test';
import { stringWidth } from './stringWidth.js';

describe('stringWidth', () => {
	it('measures ASCII', () => expect(stringWidth('hello')).toBe(5));
	it('returns 0 for empty string', () => expect(stringWidth('')).toBe(0));
	it('treats ANSI codes as zero-width', () =>
		expect(stringWidth('\x1b[32mhi\x1b[0m')).toBe(2));
	it('returns 0 for ANSI-only string', () =>
		expect(stringWidth('\x1b[1m\x1b[32m')).toBe(0));
	it('counts CJK as 2 cells', () => expect(stringWidth('こんにちは')).toBe(10));
	it('treats ⚠ as narrow (1)', () => expect(stringWidth('⚠')).toBe(1));
	it('counts standard emoji as 2', () => expect(stringWidth('😀')).toBe(2));
	it('counts ZWJ family as 2', () => {
		expect(stringWidth('👨\u200d👩\u200d👧\u200d👦')).toBe(2);
	});
	it('handles mixed ASCII and CJK', () =>
		expect(stringWidth('hi 日本語')).toBe(9));
});
