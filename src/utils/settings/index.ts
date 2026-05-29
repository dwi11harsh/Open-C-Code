/**
 * Barrel export for the settings module.
 */

export {
	type EditableSettingSource,
	getEnabledSettingSources,
	getSettingSourceDisplayNameCapitalized,
	getSettingSourceDisplayNameLowercase,
	getSettingSourceName,
	isSettingSourceEnabled,
	SETTING_SOURCES,
	type SettingSource,
	setAllowedSettingSources,
} from './constants';

export {
	getCachedParsedFile,
	getCachedSettingsForSource,
	getSessionSettingsCache,
	resetSettingsCache,
	type SettingsJson,
	setCachedParsedFile,
	setCachedSettingsForSource,
	setSessionSettingsCache,
} from './settingsCache';
