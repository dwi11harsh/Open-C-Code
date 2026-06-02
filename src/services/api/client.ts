/**
 * API client factory.
 *
 * Returns an Anthropic SDK client configured for the current provider.
 * We use the Anthropic SDK for all providers because Ollama Cloud exposes
 * an Anthropic-compatible API — we just override the baseURL.
 *
 * Provider detection is done by getAPIProvider() — set env vars to switch:
 *
 *   (default)                                  → Ollama Cloud (OLLAMA_BASE_URL)
 *   OPENC_CODE_USE_ANTHROPIC=1                 → api.anthropic.com
 *   OPENC_CODE_USE_BEDROCK=1                   → AWS Bedrock
 *   OPENC_CODE_USE_VERTEX=1                    → Google Vertex AI
 *
 * OLLAMA_API_KEY is used for Ollama Cloud (the default).
 * ANTHROPIC_API_KEY is used for Anthropic.
 *
 * The returned client is NOT cached — callers can cache it themselves if
 * they want to reuse it. We don't cache here because options (apiKey,
 * maxRetries) may differ per call site.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSessionId } from 'src/bootstrap/state';
import { logForDebugging } from 'src/utils/debug';
import { getAPIProvider } from 'src/utils/model/providers';

export type ClientOptions = {
	/**
	 * Override the API key. If omitted, reads from the environment:
	 *   ollama     → OLLAMA_API_KEY
	 *   anthropic  → ANTHROPIC_API_KEY
	 */
	apiKey?: string;
	/** Number of automatic retries on transient errors. Default: 2. */
	maxRetries?: number;
	/** Request timeout in milliseconds. Default: 600000 (10 minutes). */
	timeoutMs?: number;
	/** Optional AbortSignal for cancellation. */
	signal?: AbortSignal;
};

/**
 * Create an Anthropic SDK client for the current provider.
 *
 * Usage:
 *   const client = createAPIClient();
 *   const stream = await client.beta.messages.stream({ ... });
 */
export const createAPIClient = async (
	options: ClientOptions = {},
): Promise<Anthropic> => {
	const provider = getAPIProvider();
	const maxRetries = options.maxRetries ?? 2;
	const timeoutMs =
		options.timeoutMs ?? parseInt(process.env.API_TIMEOUT_MS ?? '600000', 10);

	const defaultHeaders: Record<string, string> = {
		'x-app': 'cli',
		'User-Agent': `openc-code/0.0.1`,
		'X-OpenC-Code-Session-Id': getSessionId(),
	};

	logForDebugging(`[client] Creating ${provider} client`);

	const baseConfig: ConstructorParameters<typeof Anthropic>[0] = {
		maxRetries,
		timeout: timeoutMs,
		defaultHeaders,
		dangerouslyAllowBrowser: true,
	};

	if (provider === 'ollama') {
		// Default provider — Ollama Cloud
		const baseURL = process.env.OLLAMA_BASE_URL;
		if (!baseURL)
			throw new Error(
				'OLLAMA_BASE_URL must be set (e.g. https://api.ollama.ai/v1). This is the default provider.',
			);
		const apiKey = options.apiKey ?? process.env.OLLAMA_API_KEY ?? 'ollama';

		return new Anthropic({
			...baseConfig,
			apiKey: 'ollama', // placeholder — SDK requires a value
			baseURL,
			defaultHeaders: {
				...baseConfig.defaultHeaders,
				Authorization: `Bearer ${apiKey}`,
			},
		});
	}

	if (provider === 'anthropic') {
		// Opt-in: api.anthropic.com (OPENC_CODE_USE_ANTHROPIC=1)
		const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error(
				'ANTHROPIC_API_KEY environment variable is required when using the Anthropic provider. ' +
					'Set it in your .env file or export it in your shell.',
			);
		}

		return new Anthropic({
			...baseConfig,
			apiKey,
		});
	}

	if (provider === 'bedrock') {
		// Dynamic import — @anthropic-ai/bedrock-sdk is optional
		const { AnthropicBedrock } = await import(
			'@anthropic-ai/bedrock-sdk'
		).catch(() => {
			throw new Error(
				'AWS Bedrock requires @anthropic-ai/bedrock-sdk. Run: bun add @anthropic-ai/bedrock-sdk',
			);
		});
		const { apiKey: _apiKey, ...bedrockConfig } = baseConfig;
		return new AnthropicBedrock({
			...bedrockConfig,
			awsRegion:
				process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
		}) as unknown as Anthropic;
	}

	if (provider === 'vertex') {
		throw new Error(
			'Vertex AI support is not yet implemented in this rebuild. Set OPENC_CODE_USE_BEDROCK=1 for Bedrock or use the default Ollama Cloud provider.',
		);
	}

	// Fallback — should not reach here, but treat as Ollama Cloud
	throw new Error(
		`Unknown provider "${provider}". Set OLLAMA_BASE_URL for default Ollama Cloud, ` +
			`or OPENC_CODE_USE_ANTHROPIC=1 for Anthropic.`,
	);
};

/** Cached client for the current session. Reset on provider change. */
let _cachedClient: Anthropic | null = null;
let _cachedProvider: string | null = null;

/**
 * Get (or create) a cached API client for the current session.
 * Use this in the agent loop — avoids creating a new client per request.
 * Use createAPIClient() directly when you need custom options.
 */
export const getAPIClient = async (): Promise<Anthropic> => {
	const provider = getAPIProvider();
	if (_cachedClient && _cachedProvider === provider) {
		return _cachedClient;
	}
	_cachedClient = await createAPIClient();
	_cachedProvider = provider;
	return _cachedClient;
};

/** Reset the cached client. Call after changing provider env vars (tests only). */
export const resetAPIClient = (): void => {
	_cachedClient = null;
	_cachedProvider = null;
};
