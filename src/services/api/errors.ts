/**
 * API error classification and retry logic.
 *
 * API calls can fail for many reasons. This module classifies them and
 * decides what to do:
 *   - Transient (network, 529, 500) → retry with exponential backoff
 *   - Rate limit (429) → retry after delay given in response header
 *   - Auth (401, 403) → surface immediately, don't retry
 *   - User abort → don't retry, surface cleanly
 *   - Bad request (400) → surface immediately (our bug or user's)
 */

import {
	APIConnectionTimeoutError,
	APIError,
	APIUserAbortError,
} from '@anthropic-ai/sdk';
import { logForDebugging } from 'src/utils/debug.js';
import { AbortError } from 'src/utils/errors.js';

// ── Error classification ───────────────────────────────────────────────────

export const isAbortError = (err: unknown): boolean => {
	if (err instanceof APIUserAbortError) return true;
	if (err instanceof AbortError) return true;
	if (err instanceof Error && err.name === 'AbortError') return true;
	return false;
};

export const isRateLimitError = (err: unknown): boolean => {
	return err instanceof APIError && err.status === 429;
};

export const isAuthError = (err: unknown): boolean => {
	return err instanceof APIError && (err.status === 401 || err.status === 403);
};

export const isOverloadError = (err: unknown): boolean => {
	// 529 is used for "API overloaded" (Anthropic convention, also used by Ollama Cloud)
	return err instanceof APIError && err.status === 529;
};

export const isTransientError = (err: unknown): boolean => {
	if (err instanceof APIConnectionTimeoutError) return true;
	if (isOverloadError(err)) return true;
	if (err instanceof APIError && err.status >= 500) return true;
	// Network errors (no status code)
	if (err instanceof Error && err.message.toLowerCase().includes('network'))
		return true;
	return false;
};

export const isRetryableError = (err: unknown): boolean => {
	return isTransientError(err) || isRateLimitError(err);
};

/** Extract a user-friendly message from an API error. */
export const getAPIErrorMessage = (err: unknown): string => {
	if (isAbortError(err)) return 'Request cancelled.';
	if (isRateLimitError(err))
		return 'Rate limit reached. Please wait a moment and try again.';
	if (isAuthError(err)) {
		return 'Authentication failed. Check your API key in .env (ANTHROPIC_API_KEY or OLLAMA_API_KEY).';
	}
	if (isOverloadError(err)) return 'The API is overloaded. Retrying...';
	if (err instanceof APIError) return `API error ${err.status}: ${err.message}`;
	if (err instanceof Error) return err.message;
	return String(err);
};

// ── Retry with exponential backoff ────────────────────────────────────────────

export type RetryOptions = {
	/** Maximum number of retry attempts after the first failure. Default: 3. */
	maxRetries?: number;
	/** Initial delay in ms. Doubles each retry. Default: 1000. */
	initialDelayMs?: number;
	/** Maximum delay cap in ms. Default: 30000. */
	maxDelayMs?: number;
};

/**
 * Execute an async function with exponential backoff retry on transient errors.
 *
 * Throws immediately on:
 *   - Abort errors (user cancelled)
 *   - Auth errors (401, 403) — retrying won't help
 *   - Non-retryable errors
 *
 * Retries on:
 *   - Transient network errors
 *   - 429 rate limit (with Retry-After header if present)
 *   - 529 overload
 *   - 5xx server errors
 *
 * @example
 *   const result = await withRetry(() => client.messages.create({ ... }));
 */
export const withRetry = async <T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<T> => {
	const maxRetries = options.maxRetries ?? 3;
	const initialDelayMs = options.initialDelayMs ?? 1000;
	const maxDelayMs = options.maxDelayMs ?? 30000;

	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;

			// Never retry these
			if (isAbortError(err) || isAuthError(err) || !isRetryableError(err)) {
				throw err;
			}

			if (attempt === maxRetries) break;

			// Compute delay
			let delayMs: number;
			if (isRateLimitError(err) && err instanceof APIError) {
				// Use Retry-After header if present
				const retryAfter = (err.headers as Record<string, string>)?.[
					'retry-after'
				];
				delayMs = retryAfter
					? parseFloat(retryAfter) * 1000
					: initialDelayMs * 2 ** attempt;
			} else {
				delayMs = Math.min(initialDelayMs * 2 ** attempt, maxDelayMs);
			}

			// Add jitter (±20%) to spread retries from multiple clients
			const jitter = delayMs * 0.2 * (Math.random() * 2 - 1);
			delayMs = Math.round(delayMs + jitter);

			logForDebugging(
				`[retry] attempt ${attempt + 1}/${maxRetries}, error: ${getAPIErrorMessage(err)}, waiting ${delayMs}ms`,
			);

			await new Promise((r) => setTimeout(r, delayMs));
		}
	}

	throw lastError;
};
