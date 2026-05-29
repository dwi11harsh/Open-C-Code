/**
 * Settings loader — reads, validates, and merges settings from all sources.
 *
 * Priority order (later sources override earlier ones):
 *   userSettings     → ~/.openc/settings.json
 *   projectSettings  → .openc/settings.json  (committed)
 *   localSettings    → .openc/settings.local.json  (gitignored)
 *   flagSettings     → --settings CLI flag (not yet implemented)
 *   policySettings   → enterprise managed-settings.json (not yet implemented)
 *
 * All reads go through the three-layer cache (settingsCache.ts).
 * Call resetSettingsCache() to invalidate after any settings write.
 */

import { existsSync, readFileSync } from 'node:fs';
import { getOriginalCwd } from 'src/bootstrap/state';
import { logForDebugging } from '../debug';
import {
	getLocalSettingsPath,
	getProjectSettingsPath,
	getUserSettingsPath,
} from '../env';
import {
	getEnabledSettingSources,
	getSettingSourceName,
	type SettingSource,
} from './constants';
import {
	resetSettingsCache as _resetSettingsCache,
	type SettingsJson as CachedSettingsJson,
	getCachedParsedFile,
	getCachedSettingsForSource,
	getSessionSettingsCache,
	setCachedParsedFile,
	setCachedSettingsForSource,
	setSessionSettingsCache,
} from './settingsCache';
import {
	type SettingsJson,
	SettingsSchema,
	type ValidationError,
} from './types';

/**
 * Parse and validate a single settings file from disk.
 * Results are cached by file path — repeated calls for the same file are free.
 *
 * Returns:
 *   settings — the validated SettingsJson (or null if file doesn't exist or is invalid)
 *   errors   — list of validation errors to surface to the user
 */
export function parseSettingsFile(filePath: string): {
	settings: SettingsJson | null;
	errors: ValidationError[];
} {
	// Layer 3 cache: parsed file content by path
	const cached = getCachedParsedFile(filePath);
	if (cached !== undefined) {
		return {
			settings: cached.settings as SettingsJson | null,
			errors: cached.errors,
		};
	}

	const result = parseSettingsFileUncached(filePath);
	// Store in cache (cast to the opaque CachedSettingsJson type)
	setCachedParsedFile(filePath, {
		settings: result.settings as CachedSettingsJson | null,
		errors: result.errors,
	});
	return result;
}

function parseSettingsFileUncached(filePath: string): {
	settings: SettingsJson | null;
	errors: ValidationError[];
} {
	// File doesn't exist — not an error, just means no settings for this source
	if (!existsSync(filePath)) {
		logForDebugging(`Settings file not found: ${filePath}`);
		return { settings: null, errors: [] };
	}

	let raw: string;
	try {
		raw = readFileSync(filePath, 'utf-8');
	} catch (err) {
		logForDebugging(`Failed to read settings file ${filePath}:`, err);
		return { settings: null, errors: [] };
	}

	// Empty file → treat as empty settings (not an error)
	if (raw.trim() === '') {
		return { settings: {} as SettingsJson, errors: [] };
	}

	// Parse JSON
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return {
			settings: null,
			errors: [
				{
					path: filePath,
					field: '(root)',
					message: 'File contains invalid JSON',
				},
			],
		};
	}

	// Validate with Zod
	const result = SettingsSchema().safeParse(data);
	if (!result.success) {
		const errors: ValidationError[] = result.error.issues.map((e) => ({
			path: filePath,
			field: e.path.join('.') || '(root)',
			message: e.message,
		}));
		return { settings: null, errors };
	}

	return { settings: result.data, errors: [] };
}

/**
 * Get the resolved settings for a single source.
 * Uses the per-source cache (Layer 2).
 */
export function getSettingsForSource(
	source: SettingSource,
): SettingsJson | null {
	// Layer 2 cache: per-source
	const cached = getCachedSettingsForSource(source);
	if (cached !== undefined) {
		return cached as SettingsJson | null;
	}

	const result = getSettingsForSourceUncached(source);
	setCachedSettingsForSource(source, result as CachedSettingsJson | null);
	return result;
}

function getSettingsForSourceUncached(
	source: SettingSource,
): SettingsJson | null {
	const filePath = getSettingsFilePathForSource(source);
	if (!filePath) return null;

	const { settings } = parseSettingsFile(filePath);
	return settings;
}

/**
 * Get the file path for a given settings source.
 * Returns undefined for sources that don't have a file yet (flagSettings, policySettings).
 */
export function getSettingsFilePathForSource(
	source: SettingSource,
): string | undefined {
	const cwd = (() => {
		try {
			return getOriginalCwd();
		} catch {
			return process.cwd();
		}
	})();

	switch (source) {
		case 'userSettings':
			return getUserSettingsPath();
		case 'projectSettings':
			return getProjectSettingsPath(cwd);
		case 'localSettings':
			return getLocalSettingsPath(cwd);
		case 'flagSettings':
			return undefined; // implemented in a later phase
		case 'policySettings':
			return undefined; // enterprise only
	}
}

/**
 * Get the merged settings for the current session.
 * Merges all enabled sources in priority order (later sources win).
 * Result is cached in Layer 1 (session cache).
 */
export function getSettings(): SettingsJson {
	// Layer 1 cache: full merged session settings
	const cached = getSessionSettingsCache();
	if (cached !== null) return cached as SettingsJson;

	const merged = buildMergedSettings();
	setSessionSettingsCache(merged as CachedSettingsJson);
	return merged;
}

function buildMergedSettings(): SettingsJson {
	let result: SettingsJson = {} as SettingsJson;

	for (const source of getEnabledSettingSources()) {
		const sourceSettings = getSettingsForSource(source);
		if (sourceSettings) {
			logForDebugging(`Merging settings from ${getSettingSourceName(source)}`);
			// Shallow merge for top-level keys, with later sources winning.
			// Arrays (allow, deny rules) are replaced entirely by later sources.
			result = { ...result, ...sourceSettings };
		}
	}

	return result;
}

/**
 * Convenience getter for a single setting value.
 * Returns the value from the merged settings, or the provided default.
 */
export function getSetting<K extends keyof SettingsJson>(
	key: K,
	defaultValue: SettingsJson[K],
): SettingsJson[K] {
	const settings = getSettings();
	return settings[key] ?? defaultValue;
}

/**
 * Re-export resetSettingsCache under an alias to avoid leaking internals.
 * Call this after any settings write.
 */
export { _resetSettingsCache as resetSettingsCache };
