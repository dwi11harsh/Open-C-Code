import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Returns true if an env var is set to "truty" string else false
 * "truthy" strings = "1", "true", "yes", "on"
 *
 * @example
 *  isEnvTruthy(process.env.DEBUG) // true if DEBUG=1
 *  isEnvTruthy(process.env.VERBOSE) // true if VERBOSE=true
 */
export const isEnvTruthy = (value: string | undefined): boolean => {
	if (value === undefined) return false;

	const normalized = value.toLowerCase().trim();

	return (
		normalized === '1' ||
		normalized === 'true' ||
		normalized === 'yes' ||
		normalized === 'on'
	);
};

/**
 * Returns true if an env var is explicitely set to a "falsy" string
 * "falsy" strings = "0", "false", "no", "off"
 * Returns false for undefined (not set) - "not set" is different from "explicitely disabled"
 *
 * Use case: feature flags where the default is ON but user can opt out.
 */
export const isEnvDefinedFalsy = (value: string | undefined): boolean => {
	if (value === undefined) return false;

	const normalized = value.toLowerCase().trim();
	return (
		normalized === '0' ||
		normalized === 'false' ||
		normalized === 'no' ||
		normalized === 'off'
	);
};

/**
 * Returns the root directory for all config files
 * Default: ~/.openc/
 * Override: set OPENC_CONFIG_HOME env var (usefule in tests or custom installs)
 *
 * All other path helpers (getSessionsDir, getSettingsPath, etc.) are built on top of this
 * Change this one value and the whole config tree moves
 */
export const getOpenCConfigHomeDir = (): string => {
	if (process.env.OPENC_CONFIG_HOME) return process.env.OPENC_CONFIG_HOME;
	return join(homedir(), '.openc');
};

/**
 * Returns the directory where session transcript (.jsonl files) are stored.
 * Default: ~/.openc/projects/
 */
export const getSessionsDir = (): string => {
	return join(getOpenCConfigHomeDir(), 'projects');
};

/**
 * Returns the path to the global user settings file
 * Default: ~/.openc/settings.json
 */
export const getUserSettingsPath = (): string => {
	return join(getOpenCConfigHomeDir(), 'settings.json');
};

/**
 * Returns the path to the project settings file
 * This is always relative to the given project root, not the config home.
 * Default: <projectRoot>/.openc/settings.json
 */
export const getProjectSettingsPath = (projectRoot: string): string => {
	return join(projectRoot, '.openc', 'settings.json');
};

/**
 * Returns the path to the local (gitignored) project settings file.
 * Default: <projectRoot>/.openc/settings.local.json
 */
export const getLocalSettingsPath = (projectRoot: string): string => {
	return join(projectRoot, '.openc', 'settings.local.json');
};
