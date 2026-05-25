/**
 * Open C Code reads settings from up to 5 places simultaneously, this file defines that ordered list
 *
 * Priority Order (later overrides earlier - This means enterprise policy always wins over the user's personal settings.)
 * 1. userSettings      → ~/.openc/settings.json
 * 2. projectSettings   → .openc/settings.json  (in project root, committed to git)
 * 3. localSettings     → .openc/settings.local.json  (gitignored, personal overrides)
 * 4. flagSettings      → passed via --settings CLI flag
 * 5. policySettings    → enterprise managed settings (cannot be overridden by user)
 */

/**
 * Setting sources - where configs can come from
 *
 * Used as a const tuple so TS infers the exact string literals
 */
export const SETTING_SOURCES = [
	'userSettings', // → ~/.openc/settings.json
	'projectSettings', // → .openc/settings.json  (in project root, committed to git)
	'localSettings', // → .openc/settings.local.json  (gitignored, personal overrides)
	'flagSettings', // → passed via --settings CLI flag
	'policySettings', // → enterprise managed settings (cannot be overridden by user)
] as const;

/**
 * A union type of all valid setting source names
 * TS derives this from the const array above
 */
export type SettingSource = (typeof SETTING_SOURCES)[number];

/**
 * A setting source that the user is allowed to write to.
 *
 * policySettings is excluded - it's read-only managed settings
 */
export type EditableSettingSource = Exclude<SettingSource, 'policySettings'>;

/**
 * Returns a short internal name for a setting source
 * Used in diagnostic output and the /settings command
 */
export const getSettingSourceName = (source: SettingSource): string => {
	switch (source) {
		case 'userSettings':
			return 'user';
		case 'projectSettings':
			return 'project';
		case 'localSettings':
			return 'project, gitignored';
		case 'flagSettings':
			return 'cli flag';
		case 'policySettings':
			return 'managed';
	}
};

/**
 * Lowercase display name - for use mid-sentence.
 * e.g. "This setting is controlled by enterprise managed settings"
 */
export const getSettingSourceDisplayNameLowercase = (
	source: SettingSource | 'cliArg' | 'command' | 'session',
): string => {
	switch (source) {
		case 'userSettings':
			return 'user settings';
		case 'projectSettings':
			return 'shared project settings';
		case 'localSettings':
			return 'project local settings';
		case 'flagSettings':
			return 'command line arguments';
		case 'policySettings':
			return 'enterprise managed settings';
		case 'cliArg':
			return 'CLI argument';
		case 'command':
			return 'command configuration';
		case 'session':
			return 'current session';
	}
};

/**
 * Capitalized display name — for UI labels and headings.
 * e.g. "Source: Enterprise Managed Settings"
 */
export function getSettingSourceDisplayNameCapitalized(
	source: SettingSource | 'cliArg' | 'command' | 'session',
): string {
	switch (source) {
		case 'userSettings':
			return 'User settings';
		case 'projectSettings':
			return 'Shared project settings';
		case 'localSettings':
			return 'Project local settings';
		case 'flagSettings':
			return 'Command line arguments';
		case 'policySettings':
			return 'Enterprise managed settings';
		case 'cliArg':
			return 'CLI argument';
		case 'command':
			return 'Command configuration';
		case 'session':
			return 'Current session';
	}
}

/**
 * Session-wide allowlist of enabled setting sources.
 * Initially all sources are enabled.
 * The SDK can restrict this (e.g., isolation mode with no file sources).
 */
let allowedSources: ReadonlyArray<SettingSource> = SETTING_SOURCES;

/**
 * Override the allowed setting sources for this process.
 * Only called from bootstrap/state.ts during initialization.
 */
export function setAllowedSettingSources(
	sources: ReadonlyArray<SettingSource>,
): void {
	allowedSources = sources;
}

/**
 * Returns the currently allowed setting sources in priority order.
 * Modules that read settings iterate this instead of SETTING_SOURCES directly.
 */
export function getEnabledSettingSources(): ReadonlyArray<SettingSource> {
	return allowedSources;
}

/**
 * Returns true if the given source is currently enabled.
 * Quick check before reading from a specific source.
 *
 * @example
 *   if (isSettingSourceEnabled('userSettings')) {
 *     const settings = await readUserSettings();
 *   }
 */
export function isSettingSourceEnabled(source: SettingSource): boolean {
	return (allowedSources as ReadonlyArray<string>).includes(source);
}
