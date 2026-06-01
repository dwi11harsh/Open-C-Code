/**
 * Message types — the internal representation of every message in a conversation.
 *
 * Two layers:
 *   API layer  → MessageParam (from @anthropic-ai/sdk) — wire format, sent to the API
 *   App layer  → Message (our type below) — richer, includes metadata
 *
 * We convert between the two in src/services/api/query.ts.
 *
 * Why our own type on top of the SDK's?
 *   The SDK type only has what the API needs. We need: uuid, timestamp,
 *   which session produced it, whether it's synthetic (not from a real API call),
 *   cost metadata for the /cost command, and so on.
 */

import type {
	BetaContentBlock,
	BetaContentBlockParam,
	BetaMessageParam,
	BetaTextBlock,
	BetaToolResultBlockParam,
	BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';

// Re-export the SDK types we use throughout the codebase
export type ContentBlock = BetaContentBlock;
export type ContentBlockParam = BetaContentBlockParam;
export type ToolUseBlock = BetaToolUseBlock;
export type ToolResultBlockParam = BetaToolResultBlockParam;
export type TextBlock = BetaTextBlock;
export type MessageParam = BetaMessageParam;

// ── Internal message types ───────────────────────────────────────────────────

/**
 * A user message in our internal format.
 * `message` is what we send to the API. The rest is app-level metadata.
 */
export type UserMessage = {
	type: 'user';
	message: MessageParam & { role: 'user' };
	/** Unique ID for this message in the session (not the API's request ID). */
	uuid: string;
	/** ISO 8601 timestamp when this message was created. */
	timestamp: string;
	/**
	 * True if this message was generated synthetically (e.g. a tool_result
	 * that wraps an error, or the initial context injection). Synthetic
	 * messages are stored in history but not shown in the UI message list.
	 */
	isSynthetic?: boolean;
};

/**
 * An assistant message in our internal format.
 * `message` is the full response from the API.
 */
export type AssistantMessage = {
	type: 'assistant';
	message: {
		id: string;
		role: 'assistant';
		content: ContentBlock[];
		model: string;
		stop_reason: string | null;
		stop_sequence: string | null;
		usage: {
			input_tokens: number;
			output_tokens: number;
			cache_creation_input_tokens?: number;
			cache_read_input_tokens?: number;
		};
	};
	uuid: string;
	timestamp: string;
	/** Cost in USD for this API call. Populated after the call completes. */
	costUSD?: number;
	/** True if this is a synthetic/placeholder message. */
	isSynthetic?: boolean;
};

/**
 * The union of all message types in a session.
 * Session history is an array of these.
 */
export type Message = UserMessage | AssistantMessage;

/**
 * An error message — stored in history when an API call fails.
 * Displayed in the UI but not sent to the API.
 */
export type ErrorMessage = {
	type: 'error';
	error: {
		type: string;
		message: string;
	};
	uuid: string;
	timestamp: string;
};

/**
 * A progress/notification message — ephemeral, not stored in history.
 */
export type ProgressMessage = {
	type: 'progress';
	text: string;
	uuid: string;
	timestamp: string;
};
