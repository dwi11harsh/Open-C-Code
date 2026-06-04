import { describe, expect, it } from 'bun:test';
import { measureText } from './measure-text.js';

describe('measureText', () => {
	it('returns zeros for empty string', () => {
		expect(measureText('', Infinity)).toEqual({ width: 0, height: 0 });
	});
	it('measures a single line', () => {
		expect(measureText('hello', Infinity)).toEqual({ width: 5, height: 1 });
	});
	it('measures multiple newline-separated lines', () => {
		const r = measureText('hello\nworld\n!', Infinity);
		expect(r.width).toBe(5);
		expect(r.height).toBe(3);
	});
	it('wraps lines at maxWidth', () => {
		// 'hello world' = 11 cells, maxWidth = 6 → ceil(11/6) = 2 rows
		expect(measureText('hello world', 6).height).toBe(2);
	});
	it('counts empty lines as height 1', () => {
		expect(measureText('\n', Infinity).height).toBe(2);
	});
	it('measures CJK correctly', () => {
		expect(measureText('こんにちは', Infinity).width).toBe(10);
	});
	it('does not wrap when maxWidth is 0', () => {
		expect(measureText('a very long line', 0).height).toBe(1);
	});
});
