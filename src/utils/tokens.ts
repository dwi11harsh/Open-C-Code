/**
 * Token counting and estimation utilities.
 *
 * The agent loop needs token counts to decide when to trigger compaction.
 * Exact counts come from the API's `usage` field in each response.
 * Estimates (for threshold checks before an API call) use ~4 chars/token.
 */

import type { AssistantMessage, Message } from 'src/types/message.js';

/** Average characters per token. Used for rough estimation. */
const CHARS_PER_TOKEN = 4;

/**
 * Rough token count estimate from a string.
 * Good enough for threshold comparisons; not for billing.
 *
 * @example estimateTokensFromText("Hello world") → ~3
 */
export const estimateTokensFromText = (text: string): number => {
	return Math.ceil(text.length / CHARS_PER_TOKEN);
};

/**
 * Rough token count estimate for an array of messages.
 * Serializes content to JSON and applies chars/token ratio.
 * Accurate enough for compaction threshold comparisons.
 */
export const estimateTokensFromMessages = (messages: Message[]): number => {
	let total = 0;
	for (const msg of messages) {
		if (msg.type === 'user') {
			const content = msg.message.content;
			if (typeof content === 'string') {
				total += estimateTokensFromText(content);
			} else {
				total += estimateTokensFromText(JSON.stringify(content));
			}
		} else {
			total += estimateTokensFromText(JSON.stringify(msg.message.content));
		}
	}
	return total;
};

/**
 * Extract the token usage from an AssistantMessage, or null if none.
 * Usage is only present on real (non-synthetic) API responses.
 */
export const getTokenUsageFromMessage = (
	msg: Message,
): AssistantMessage['message']['usage'] | null => {
	if (msg.type !== 'assistant') return null;
	if (msg.isSynthetic) return null;
	return msg.message.usage;
};

/**
 * Get the total token count from the LAST assistant message that has usage data.
 * This is the context window size at the time of that API call —
 * the most accurate measure of how full the context window is.
 */
export function getLastKnownTokenCount(messages: Message[]): number {
	for (let i = messages.length - 1; i >= 0; i--) {
		const usage = getTokenUsageFromMessage(messages[i]);
		if (usage) {
			return (
				usage.input_tokens +
				(usage.cache_creation_input_tokens ?? 0) +
				(usage.cache_read_input_tokens ?? 0) +
				usage.output_tokens
			);
		}
	}
	return 0;
}

/**
 * Sum input + output tokens across all messages.
 * Used by the /cost command and session stats.
 */
export const sumTokenUsage = (
	messages: Message[],
): {
	input: number;
	output: number;
	cacheCreation: number;
	cacheRead: number;
} => {
	let input = 0,
		output = 0,
		cacheCreation = 0,
		cacheRead = 0;
	for (const msg of messages) {
		const usage = getTokenUsageFromMessage(msg);
		if (usage) {
			input += usage.input_tokens;
			output += usage.output_tokens;
			cacheCreation += usage.cache_creation_input_tokens ?? 0;
			cacheRead += usage.cache_read_input_tokens ?? 0;
		}
	}
	return { input, output, cacheCreation, cacheRead };
};
