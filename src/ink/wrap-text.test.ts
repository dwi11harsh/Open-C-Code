import { describe, expect, it } from 'bun:test';
import wrapText from './wrap-text.js';

const E = '\u2026';

describe('wrapText', () => {
	describe('wrap mode', () => {
		it('wraps long text', () =>
			expect(wrapText('hello world', 6, 'wrap')).toContain('\n'));
		it('passes short text through', () =>
			expect(wrapText('hi', 20, 'wrap')).toBe('hi'));
	});

	describe('truncate modes', () => {
		it('truncate appends ellipsis', () =>
			expect(wrapText('hello world', 8, 'truncate').endsWith(E)).toBe(true));
		it('truncate-start prepends ellipsis', () =>
			expect(wrapText('hello world', 8, 'truncate-start').startsWith(E)).toBe(
				true,
			));
		it('truncate-middle puts ellipsis in middle', () => {
			const r = wrapText('hello world', 8, 'truncate-middle');
			expect(r).toContain(E);
			expect(r.startsWith(E)).toBe(false);
			expect(r.endsWith(E)).toBe(false);
		});
		it('does not truncate short strings', () =>
			expect(wrapText('hi', 10, 'truncate')).toBe('hi'));
		it('aliases: end, truncate-end, truncate all work', () => {
			const a = wrapText('hello world', 8, 'end');
			const b = wrapText('hello world', 8, 'truncate-end');
			const c = wrapText('hello world', 8, 'truncate');
			expect(a).toBe(b);
			expect(b).toBe(c);
		});
		it('alias: middle = truncate-middle', () => {
			expect(wrapText('hello world', 8, 'middle')).toBe(
				wrapText('hello world', 8, 'truncate-middle'),
			);
		});
	});

	describe('edge cases', () => {
		it('returns text unchanged when wrapType is undefined', () => {
			expect(wrapText('hello world', 5, undefined)).toBe('hello world');
		});
		it('returns text unchanged when maxWidth is 0', () => {
			expect(wrapText('hello', 0, 'wrap')).toBe('hello');
		});
	});
});
