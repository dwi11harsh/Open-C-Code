import { describe, expect, it } from 'bun:test';
import {
	SETTING_SOURCES,
	getEnabledSettingSources,
	getSettingSourceDisplayNameCapitalized,
	getSettingSourceDisplayNameLowercase,
	getSettingSourceName,
	isSettingSourceEnabled,
	setAllowedSettingSources,
	type SettingSource,
} from './constants.js';

describe('SETTING_SOURCES', () => {
	it('has 5 entries in priority order', () => {
		expect(SETTING_SOURCES).toHaveLength(5);
		expect(SETTING_SOURCES[0]).toBe('userSettings');
		expect(SETTING_SOURCES[4]).toBe('policySettings');
	});

	it('policySettings is last (highest priority = last override)', () => {
		const idx = SETTING_SOURCES.indexOf('policySettings' as SettingSource);
		expect(idx).toBe(SETTING_SOURCES.length - 1);
	});
});

describe('display names', () => {
	it('getSettingSourceName returns short internal names', () => {
		expect(getSettingSourceName('userSettings')).toBe('user');
		expect(getSettingSourceName('policySettings')).toBe('managed');
	});

	it('lowercase names are all lowercase', () => {
		for (const source of SETTING_SOURCES) {
			const name = getSettingSourceDisplayNameLowercase(source);
			expect(name).toBe(name.toLowerCase());
		}
	});

	it('capitalized names start with uppercase', () => {
		for (const source of SETTING_SOURCES) {
			const name = getSettingSourceDisplayNameCapitalized(source);
			expect(name[0]).toBe(name[0]!.toUpperCase());
		}
	});

	it('handles extended sources (cliArg, command, session)', () => {
		expect(getSettingSourceDisplayNameLowercase('cliArg')).toBe('CLI argument');
		expect(getSettingSourceDisplayNameLowercase('session')).toBe(
			'current session',
		);
	});
});

describe('allowlist system', () => {
	it('all sources enabled by default', () => {
		setAllowedSettingSources([...SETTING_SOURCES]); // reset
		expect(getEnabledSettingSources()).toHaveLength(5);
		expect(isSettingSourceEnabled('userSettings')).toBe(true);
		expect(isSettingSourceEnabled('policySettings')).toBe(true);
	});

	it('setAllowedSettingSources restricts enabled sources', () => {
		setAllowedSettingSources(['userSettings', 'projectSettings']);
		expect(isSettingSourceEnabled('userSettings')).toBe(true);
		expect(isSettingSourceEnabled('localSettings')).toBe(false);
		expect(isSettingSourceEnabled('policySettings')).toBe(false);
		expect(getEnabledSettingSources()).toHaveLength(2);
	});

	it('empty allowlist disables everything', () => {
		setAllowedSettingSources([]);
		expect(isSettingSourceEnabled('userSettings')).toBe(false);
		setAllowedSettingSources([...SETTING_SOURCES]); // restore
	});
});
