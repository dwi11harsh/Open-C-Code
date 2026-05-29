/**
 * Provider-specific model ID strings.
 *
 * Each provider uses different identifiers for the same model:
 *   anthropic → "claude-opus-4-6"
 *   ollama   → "deepseek-r1:7b" (or whatever is set in OLLAMA_DEFAULT_MODEL)
 *   bedrock  → "anthropic.claude-opus-4-6-v1:0"
 *   vertex   → "claude-opus-4-6@20250514"
 *
 * We define a central table and derive the string for the current provider
 * at startup. This way, all of the model-selection logic just says
 * "getModelStrings().opus46" and gets the right ID automatically.
 */

import { logForDebugging } from '../debug';
import {
	type APIProvider,
	getAPIProvider,
	isOllamaProvider,
} from './providers';

// ── Model key type ────────────────────────────────────────────────────────────

/**
 * Canonical short names for each model version.
 * Adding a new model: add a key here and a row in MODEL_CONFIGS.
 */
export type ModelKey =
	| 'opus46'
	| 'opus45'
	| 'sonnet46'
	| 'sonnet45'
	| 'haiku45';

/**
 * Maps each ModelKey to its provider-specific model ID string.
 */
export type ModelStrings = Record<ModelKey, string>;

// ── Provider ID table ─────────────────────────────────────────────────────────
type ModelConfig = Record<APIProvider, string>;

/**
 * Central table of model IDs per provider.
 * Each row is one model; each column is one provider.
 *
 * When adding a new model:
 *   1. Add the key to ModelKey above
 *   2. Add a row here with all four provider strings
 */
const MODEL_CONFIGS: Record<ModelKey, ModelConfig> = {
	opus46: {
		anthropic: 'claude-opus-4-6',
		ollama: process.env.OLLAMA_DEFAULT_MODEL ?? 'deepseek-r1:7b',
		bedrock: 'anthropic.claude-opus-4-6-v1:0',
		vertex: 'claude-opus-4-6@20250514',
	},
	opus45: {
		anthropic: 'claude-opus-4-5',
		ollama: process.env.OLLAMA_DEFAULT_MODEL ?? 'deepseek-r1:7b',
		bedrock: 'anthropic.claude-opus-4-5-v1:0',
		vertex: 'claude-opus-4-5@20250514',
	},
	sonnet46: {
		anthropic: 'claude-sonnet-4-6',
		ollama: process.env.OLLAMA_DEFAULT_MODEL ?? 'deepseek-r1:7b',
		bedrock: 'anthropic.claude-sonnet-4-6-v1:0',
		vertex: 'claude-sonnet-4-6@20250514',
	},
	sonnet45: {
		anthropic: 'claude-sonnet-4-5',
		ollama: process.env.OLLAMA_DEFAULT_MODEL ?? 'deepseek-r1:7b',
		bedrock: 'anthropic.claude-sonnet-4-5-v1:0',
		vertex: 'claude-sonnet-4-5@20250514',
	},
	haiku45: {
		anthropic: 'claude-haiku-4-5',
		ollama: process.env.OLLAMA_DEFAULT_MODEL ?? 'deepseek-r1:7b',
		bedrock: 'anthropic.claude-haiku-4-5-v1:0',
		vertex: 'claude-haiku-4-5@20250514',
	},
};

// ── Build model strings for current provider ─────────────────────────────────

/** Cached model strings — built once at first call to getModelStrings(). */
let _modelStrings: ModelStrings | null = null;

/**
 * Returns the model ID strings for the current API provider.
 * Cached after first call — call resetModelStrings() in tests.
 */
export const getModelStrings = (): ModelStrings => {
	if (_modelStrings !== null) return _modelStrings;

	const provider = getAPIProvider();
	logForDebugging(`Building model strings for provider: ${provider}`);

	const out = {} as ModelStrings;
	for (const [key, config] of Object.entries(MODEL_CONFIGS) as [
		ModelKey,
		ModelConfig,
	][]) {
		out[key] =
			provider === 'ollama'
				? (process.env.OLLAMA_DEFAULT_MODEL ?? 'deepseek-r1:7b')
				: config[provider];
	}

	_modelStrings = out;
	return out;
};

/** Reset the cache — for use in tests only. */
export const resetModelStrings = (): void => {
	_modelStrings = null;
};

/**
 * List of all available model IDs for the current provider.
 * Used by the /model command to show valid choices.
 */
export const getAvailableModelIds = (): string[] => {
	// Ollama: parse OLLAMA_AVAILABLE_MODELS env var
	if (isOllamaProvider()) {
		const available = process.env.OLLAMA_AVAILABLE_MODELS;
		if (available) {
			return available
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		return [getModelStrings().sonnet46]; // fall back to default
	}

	// Standard providers: return all model IDs
	const strings = getModelStrings();
	return [...new Set(Object.values(strings))]; // dedup
};
