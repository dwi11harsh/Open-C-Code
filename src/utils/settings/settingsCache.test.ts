import { beforeEach, describe, expect, it } from 'bun:test';
import {
	getCachedParsedFile,
	getCachedSettingsForSource,
	getSessionSettingsCache,
	resetSettingsCache,
	setCachedParsedFile,
	setCachedSettingsForSource,
	setSessionSettingsCache,
} from './settingsCache.js';

// Reset before each test so they're fully isolated
beforeEach(() => {
	resetSettingsCache();
});

describe('session-level cache', () => {
	it('starts null (cache miss)', () => {
		expect(getSessionSettingsCache()).toBeNull();
	});

	it('stores and retrieves settings', () => {
		setSessionSettingsCache({ theme: 'dark', model: 'deepseek' });
		const cached = getSessionSettingsCache();
		expect(cached).not.toBeNull();
		expect(cached?.theme).toBe('dark');
	});

	it('is cleared by resetSettingsCache', () => {
		setSessionSettingsCache({ x: 1 });
		resetSettingsCache();
		expect(getSessionSettingsCache()).toBeNull();
	});
});

describe('per-source cache', () => {
	it('returns undefined for a cache miss', () => {
		// undefined = never looked; null = looked and found nothing
		expect(getCachedSettingsForSource('userSettings')).toBeUndefined();
	});

	it('caches null to represent missing file', () => {
		setCachedSettingsForSource('userSettings', null);
		expect(getCachedSettingsForSource('userSettings')).toBeNull();
	});

	it('caches actual settings object', () => {
		setCachedSettingsForSource('projectSettings', { key: 'value' });
		expect(getCachedSettingsForSource('projectSettings')).toEqual({
			key: 'value',
		});
	});

	it('is cleared by resetSettingsCache', () => {
		setCachedSettingsForSource('userSettings', { x: 1 });
		resetSettingsCache();
		expect(getCachedSettingsForSource('userSettings')).toBeUndefined();
	});
});

describe('per-path cache', () => {
	it('returns undefined for a cache miss', () => {
		expect(getCachedParsedFile('/some/path.json')).toBeUndefined();
	});

	it('stores parsed file with errors array', () => {
		setCachedParsedFile('/settings.json', {
			settings: { theme: 'light' },
			errors: ['field x is invalid'],
		});
		const cached = getCachedParsedFile('/settings.json');
		expect(cached?.settings?.theme).toBe('light');
		expect(cached?.errors).toHaveLength(1);
	});

	it('is cleared by resetSettingsCache', () => {
		setCachedParsedFile('/settings.json', { settings: null, errors: [] });
		resetSettingsCache();
		expect(getCachedParsedFile('/settings.json')).toBeUndefined();
	});
});

describe('resetSettingsCache clears all three layers together', () => {
	it('simultaneously clears session + source + file caches', () => {
		setSessionSettingsCache({ a: 1 });
		setCachedSettingsForSource('userSettings', { b: 2 });
		setCachedParsedFile('/x.json', { settings: { c: 3 }, errors: [] });

		resetSettingsCache();

		expect(getSessionSettingsCache()).toBeNull();
		expect(getCachedSettingsForSource('userSettings')).toBeUndefined();
		expect(getCachedParsedFile('/x.json')).toBeUndefined();
	});
});
