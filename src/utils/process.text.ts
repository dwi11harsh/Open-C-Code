import { describe, expect, it } from 'bun:test';
import { isDebugEnabled, logForDebugging } from './debug';

describe('debug utilities', () => {
	// the actual value depends on environment, but it must be boolean
	expect(typeof isDebugEnabled()).toBe('boolean');
});

it('logForDebugging does not throw', () => {
	// even when debug is off, calling it should be safe (no-op)
	expect(() => logForDebugging('test message')).not.toThrow();
});

describe('process utilities', () => {
	it('module exports are available', async () => {
		const mod = await import('./process');
		expect(typeof mod.exitWithError).toBe('function');
		expect(typeof mod.exitCleanly).toBe('function');
	});
});
