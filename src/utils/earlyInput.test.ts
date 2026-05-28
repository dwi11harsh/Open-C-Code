import { describe, expect, it } from 'bun:test';
import {
	consumeEarlyInput,
	hasEarlyInput,
	isCapturingEarlyInput,
	seedEarlyInput,
	stopCapturingEarlyInput,
} from './earlyInput.js';

describe('earlyInput module state', () => {
	it('starts not capturing', () => {
		// In the test environment, stdin is not a TTY so startCapturingEarlyInput
		// would be a no-op anyway. We just test the state accessors.
		expect(isCapturingEarlyInput()).toBe(false);
	});

	it('hasEarlyInput returns false when buffer is empty', () => {
		consumeEarlyInput(); // clear any previous state
		expect(hasEarlyInput()).toBe(false);
	});
});

describe('seedEarlyInput', () => {
	it('seeds the buffer', () => {
		seedEarlyInput('hello world');
		expect(hasEarlyInput()).toBe(true);
	});

	it('consumeEarlyInput returns trimmed seed', () => {
		seedEarlyInput('  fix the bug  ');
		const result = consumeEarlyInput();
		expect(result).toBe('fix the bug');
	});

	it('consumeEarlyInput clears the buffer', () => {
		seedEarlyInput('something');
		consumeEarlyInput();
		expect(hasEarlyInput()).toBe(false);
	});

	it('consumeEarlyInput returns empty string when buffer is empty', () => {
		consumeEarlyInput(); // clear
		expect(consumeEarlyInput()).toBe('');
	});
});

describe('stopCapturingEarlyInput', () => {
	it('is safe to call when not capturing', () => {
		expect(() => stopCapturingEarlyInput()).not.toThrow();
	});
});
