import { describe, expect, it } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
	getLocalSettingsPath,
	getOpenCConfigHomeDir,
	getProjectSettingsPath,
	getSessionsDir,
	getUserSettingsPath,
	isEnvDefinedFalsy,
	isEnvTruthy,
} from './env';

describe('isEnvTruthy', () => {
	it('recognizes truthy string', () => {
		expect(isEnvTruthy('1')).toBe(true);
		expect(isEnvTruthy('true')).toBe(true);
		expect(isEnvTruthy('yes')).toBe(true);
		expect(isEnvTruthy('on')).toBe(true);
		expect(isEnvTruthy('TRUE')).toBe(true);
		expect(isEnvTruthy('YES')).toBe(true);
	});

	it('recognizes falsy strings', () => {
		expect(isEnvTruthy('0')).toBe(false);
		expect(isEnvTruthy('false')).toBe(false);
		expect(isEnvTruthy('no')).toBe(false);
		expect(isEnvTruthy('')).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isEnvTruthy(undefined)).toBe(false);
	});
});

describe('isEnvDefinedFalsy', () => {
	it('recognizes explicitly-false strings', () => {
		expect(isEnvDefinedFalsy('0')).toBe(true);
		expect(isEnvDefinedFalsy('false')).toBe(true);
		expect(isEnvDefinedFalsy('no')).toBe(true);
		expect(isEnvDefinedFalsy('off')).toBe(true);
	});

	it('returns false for undefined (not the same as disabled)', () => {
		// This is the KEY behaviour — "not set" is different from "explicitly off"
		expect(isEnvDefinedFalsy(undefined)).toBe(false);
	});

	it('returns false for truthy values', () => {
		expect(isEnvDefinedFalsy('1')).toBe(false);
		expect(isEnvDefinedFalsy('true')).toBe(false);
	});
});

describe('path helpers', () => {
	it('getopencConfigHomeDir returns ~/.openc by default', () => {
		// Remove override if set
		const saved = process.env.OPENC_CONFIG_HOME;
		delete process.env.OPENC_CONFIG_HOME;

		expect(getOpenCConfigHomeDir()).toBe(join(homedir(), '.openc'));

		if (saved !== undefined) process.env.OPENC_CONFIG_HOME = saved;
	});

	it('getSessionsDir is under config home', () => {
		const dir = getSessionsDir();
		expect(dir).toContain('projects');
		expect(dir).toContain('.openc');
	});

	it('getUserSettingsPath ends with settings.json', () => {
		expect(getUserSettingsPath()).toMatch(/settings\.json$/);
	});

	it('getProjectSettingsPath is relative to project root', () => {
		const p = getProjectSettingsPath('/home/user/myapp');
		expect(p).toBe('/home/user/myapp/.openc/settings.json');
	});

	it('getLocalSettingsPath uses settings.local.json', () => {
		const p = getLocalSettingsPath('/home/user/myapp');
		expect(p).toBe('/home/user/myapp/.openc/settings.local.json');
	});
});
