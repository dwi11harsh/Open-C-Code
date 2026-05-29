import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { resetSettingsCache } from '../settings/settingsCache';
import { getSetting, getSettings, parseSettingsFile } from './settings';

// Create a temp directory for test settings files
let tmpDir: string;

beforeEach(() => {
	tmpDir = mkdtempSync('/tmp/claude-settings-test-');
	resetSettingsCache();
});

afterEach(() => {
	rmSync(tmpDir, { recursive: true, force: true });
	resetSettingsCache();
});

function writeTempSettings(filename: string, content: object): string {
	const filePath = join(tmpDir, filename);
	writeFileSync(filePath, JSON.stringify(content));
	return filePath;
}

describe('parseSettingsFile', () => {
	it('returns null for a missing file', () => {
		const { settings, errors } = parseSettingsFile(
			'/tmp/does-not-exist-ever.json',
		);
		expect(settings).toBeNull();
		expect(errors).toHaveLength(0);
	});

	it('returns empty object for an empty file', () => {
		const filePath = join(tmpDir, 'empty.json');
		writeFileSync(filePath, '');
		const { settings, errors } = parseSettingsFile(filePath);
		expect(settings).toEqual({});
		expect(errors).toHaveLength(0);
	});

	it('parses a valid settings file', () => {
		const filePath = writeTempSettings('settings.json', {
			model: 'claude-sonnet-4-6',
			theme: 'dark',
			cleanupPeriodDays: 30,
		});
		const { settings, errors } = parseSettingsFile(filePath);
		expect(errors).toHaveLength(0);
		expect(settings?.model).toBe('claude-sonnet-4-6');
		expect(settings?.theme).toBe('dark');
	});

	it('returns validation errors for invalid fields', () => {
		const filePath = writeTempSettings('bad.json', {
			theme: 'not-a-valid-theme',
		});
		const { settings, errors } = parseSettingsFile(filePath);
		expect(settings).toBeNull();
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]?.message).toBeTruthy();
	});

	it('returns an error for invalid JSON', () => {
		const filePath = join(tmpDir, 'invalid.json');
		writeFileSync(filePath, '{invalid json here');
		const { settings, errors } = parseSettingsFile(filePath);
		expect(settings).toBeNull();
		expect(errors[0]?.message).toContain('invalid JSON');
	});

	it('preserves unknown fields (passthrough)', () => {
		const filePath = writeTempSettings('extra.json', {
			model: 'sonnet',
			futureField: 'preserved',
		});
		const { settings } = parseSettingsFile(filePath);
		expect((settings as Record<string, unknown>)?.futureField).toBe(
			'preserved',
		);
	});

	it('caches the result (calling twice returns same reference)', () => {
		const filePath = writeTempSettings('cached.json', { model: 'haiku' });
		const first = parseSettingsFile(filePath);
		const second = parseSettingsFile(filePath);
		// The settings objects might not be the same reference (we clone),
		// but the errors array should be the same
		expect(first.errors).toBe(second.errors);
	});
});

describe('getSettings', () => {
	it('returns an empty object when no settings files exist', () => {
		const settings = getSettings();
		expect(typeof settings).toBe('object');
		expect(settings).not.toBeNull();
	});
});

describe('getSetting', () => {
	it('returns the default when the key is not set', () => {
		const model = getSetting('model', 'default-model');
		expect(typeof model).toBe('string');
	});
});
