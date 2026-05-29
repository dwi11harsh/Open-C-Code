/**
 * API provider detection.
 *
 * Detection is done once at startup by reading env vars.
 *
 * All model-selection logic checks getAPIProvider() to return the correct
 * model ID string for the current provider
 */

import { isEnvTruthy } from '../env';

/**
 * The supported API providers.
 *
 *  ollama:     Ollama Cloud / local Ollama (default)
 *  anthropic:  api.anthropic.com (OPENC_CODE_USE_ANTHROPIC=1)
 *  bedrock:    AWS Bedrock (OPENC_CODE_USE_BEDROCK=1)
 *  vertex:     Google Vertex AI (OPENC_CODE_USE_VERTEX=1)
 *
 *  TODO: Add support for open router
 */
export type APIProvider = 'ollama' | 'anthropic' | 'bedrock' | 'vertex';

/**
 * Detect which API provider to use based on environment variables.
 *
 * Priority order:
 *   1. OPENC_CODE_USE_BEDROCK=1 → bedrock
 *   2. OPENC_CODE_USE_VERTEX=1 → vertex
 *   3. OPENC_CODE_USE_ANTHROPIC=1 → anthropic (api.anthropic.com)
 *   4. Default → ollama
 */
export const getAPIProvider = (): APIProvider => {
	if (isEnvTruthy(process.env.OPENC_CODE_USE_BEDROCK)) return 'bedrock';
	if (isEnvTruthy(process.env.OPENC_CODE_USE_VERTEX)) return 'vertex';
	if (isEnvTruthy(process.env.OPENC_CODE_USE_ANTHROPIC)) return 'anthropic';
	return 'ollama';
};

/**
 * True if using the Anthropic API (api.anthropic.com).
 * Enable via OPENC_CODE_USE_ANTHROPIC=1.
 */
export const isAnthropicProvider = (): boolean => {
	return getAPIProvider() === 'anthropic';
};

/**
 * True if using Ollama Cloud / local Ollama (the default provider).
 */
export const isOllamaProvider = (): boolean => {
	return getAPIProvider() === 'ollama';
};
