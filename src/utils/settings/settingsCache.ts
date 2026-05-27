/**
 * In memory cache for settings reads.
 * 
 * Three-layer cache to avoid repeated disk reads during a session:
 *   1. sessionSettingsCache — the final merged SettingsJson for this session
 *   2. perSourceCache — raw SettingsJson per source (before merging)
 *   3. parseFileCache — parsed file content per file path (dedupes disk reads)
 *
 * All three are invalidated together by resetSettingsCache().
 * Call resetSettingsCache() whenever:
 *   - The user writes a settings file
 *   - A --add-dir flag is processed
 *   - A plugin modifies settings
 *   - A hook refreshes settings
 */

import type { SettingSource } from './constants';

// ── Layer 1: merged session cache ─────────────────────────────────────────────

/**
 * type of merged settings object
 */
export type SettingsJson = Record<string, unknown>;

/**
 * merged, validated settings for current session
 * null means "not yet loaded" (cache miss)
 */
let sessionSettingsCache: SettingsJson | null = null;

export const getSessionSettingsCache = (): SettingsJson | null => {
    return sessionSettingsCache;
}

export const setSessionSettingsCache = (value: SettingsJson): void => {
  sessionSettingsCache = value;
}

// ── Layer 2: per-source cache ─────────────────────────────────────────────────
/**
 * Cached raw settings per source
 * 
 * null value = "we looked and there was no file for this source"
 * undefined (missing key) = "we haven't looked yet" (cache miss)
 * 
 */
const perSourceCache = new Map<SettingSource, SettingsJson | null>();

/**
 * @returns the cached settings for a source, or undefined if not cached.
 * null = cached empty (file doesn't exist); undefined = cache miss.
 */
export const getCachedSettingsForSource = (source: SettingSource): SettingsJson | null | undefined => {
    return perSourceCache.has(source) ? perSourceCache.get(source) : undefined
}

export const setCachedSettingsForSource = (source: SettingSource, value: SettingsJson | null): void => {
    perSourceCache.set(source, value)
}


// ── Layer 3: per-file-path cache ──────────────────────────────────────────────

/**
 * Cached parsed content per file path.
 * Used to deduplicate disk reads when multiple sources point to the same file.
 */
type ParsedSettings = {
  settings: SettingsJson | null;
  errors: string[]; // validation error messages (full ValidationError type added later)
};

const parsedFileCache = new Map<string, ParsedSettings>();

export const getCachedParsedFile = (path: string): ParsedSettings | undefined => {
    return parsedFileCache.get(path)
}

export const setCachedParsedFile = (path: string, value: ParsedSettings): void => {
    parsedFileCache.set(path, value)
}

/**
 * Invalidate ALL settings caches.
 *
 * Call this whenever any settings file changes. It clears all three layers
 * so the next read is guaranteed to be fresh from disk.
 *
 * Callers:
 *   - Settings write operations (internalWrites.ts)
 *   - Plugin initialization
 *   - --add-dir processing
 *   - Hook refresh
 *   - resetStateForTests()
 */
export const resetSettingsCache = ():void => {
    sessionSettingsCache = null
    perSourceCache.clear()
    parsedFileCache.clear()
}