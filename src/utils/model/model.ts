/**
 * Main loop model selection.
 *
 * Determines which model to use for the agent's main conversation loop.
 * Resolves aliases, checks settings, checks env vars, and returns a
 * provider-specific model ID string.
 *
 * Priority order (highest to lowest):
 *   1. Session override (from /model command) — from bootstrap state
 *   2. --model CLI flag (stored in bootstrap state at startup)
 *   3. ANTHROPIC_MODEL environment variable
 *   4. model field in settings.json
 *   5. Built-in default (Sonnet for most users)
 */

import { logForDebugging } from '../debug';
import { getSettings } from '../settings/settings';
import { getModelStrings } from './modelStrings';
import { getAPIProvider } from './providers';

export type ModelName = string;
export type ModelAlias = 'sonnet' | 'opus' | 'haiku' | 'best';
export type ModelSetting = ModelName | ModelAlias | null;

/**
 * The set of string aliases users can type instead of a full model ID.
 * The /model command accepts these.
 */
export const MODEL_ALIASES: ModelAlias[] = ['sonnet', 'opus', 'haiku', 'best'];

export const isModelAlias = (s: string): s is ModelAlias => {
	return (MODEL_ALIASES as string[]).includes(s);
};

/**
 * Resolve a model alias to a concrete model ID for the current provider.
 *
 * "sonnet" → claude-sonnet-4-6 (or provider equivalent)
 * "opus"   → claude-opus-4-6
 * "haiku"  → claude-haiku-4-5
 * "best"   → claude-opus-4-6
 */
export const resolveModelAlias = (alias: ModelAlias): ModelName => {
	const strings = getModelStrings();
	switch (alias) {
		case 'sonnet':
			return strings.sonnet46;
		case 'opus':
			return strings.opus46;
		case 'haiku':
			return strings.haiku45;
		case 'best':
			return strings.opus46;
	}
};

/**
 * Resolve a user-specified model string — could be a full model ID or an alias.
 */
export const resolveModelSetting = (setting: ModelSetting): ModelName => {
	if (!setting) return getDefaultMainLoopModel();
	if (isModelAlias(setting)) return resolveModelAlias(setting);
	return setting; // already a full model ID
};

/**
 * The default model for the main loop.
 * Currently: Sonnet 4.6 for all users.
 * (The original codebase defaults to Opus for Max/Team-Premium subscribers,
 * but we skip that subscription logic for now.)
 */
export const getDefaultMainLoopModel = (): ModelName => {
	const provider = getAPIProvider();
	if (provider === 'ollama') {
		return process.env.OLLAMA_DEFAULT_MODEL ?? getModelStrings().sonnet46;
	}
	return getModelStrings().sonnet46;
};

/**
 * Get the model to use for the current session's main loop.
 *
 * Resolution order:
 *   1. Session override (e.g. from /model command) stored in bootstrap state
 *   2. ANTHROPIC_MODEL env var
 *   3. model setting in settings.json
 *   4. Built-in default
 */
export const getMainLoopModel = (): ModelName => {
	// 1. Session override — will be wired up when bootstrap state is extended
	//    (getMainLoopModelOverride() lives in bootstrap/state.ts, added later)

	// 2. Environment variable
	if (process.env.ANTHROPIC_MODEL) {
		logForDebugging(
			'Using ANTHROPIC_MODEL env var:',
			process.env.ANTHROPIC_MODEL,
		);
		return resolveModelSetting(process.env.ANTHROPIC_MODEL as ModelSetting);
	}

	// 3. Settings
	const settings = getSettings();
	if (settings.model) {
		logForDebugging('Using model from settings:', settings.model);
		return resolveModelSetting(settings.model as ModelSetting);
	}

	// 4. Default
	const defaultModel = getDefaultMainLoopModel();
	logForDebugging('Using default model:', defaultModel);
	return defaultModel;
};
