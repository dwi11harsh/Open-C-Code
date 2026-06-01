/**
 * Message creation and conversion helpers.
 *
 * Two responsibilities:
 *   1. Factory functions — createUserMessage(), createAssistantMessage()
 *      Ensure every message has a uuid and timestamp.
 *   2. Normalization — messagesForAPI()
 *      Converts our internal Message[] to MessageParam[] for the API.
 */

import type {
	AssistantMessage,
	ContentBlock,
	ContentBlockParam,
	Message,
	MessageParam,
	ToolResultBlockParam,
	UserMessage,
} from 'src/types/message';
import { randomUUID } from 'src/utils/crypto';

// ── Factory functions ─────────────────────────────────────────────────────────

/**
 * Create a new UserMessage with a fresh uuid and timestamp.
 * Pass either a plain string or an array of content blocks.
 *
 * @example
 *   const msg = createUserMessage('Hello!');
 *   const msg = createUserMessage([{ type: 'text', text: 'Hello!' }]);
 */
export const createUserMessage = (
	content: string | ContentBlockParam[],
	options: { isSynthetic?: boolean } = {},
): UserMessage => {
	return {
		type: 'user',
		message: {
			role: 'user',
			content,
		},
		uuid: randomUUID(),
		timestamp: new Date().toISOString(),
		...(options.isSynthetic && { isSynthetic: true }),
	};
};

/**
 * Create a synthetic UserMessage that wraps a tool result.
 * Tool results are sent back to the model as user messages.
 */
export const createToolResultMessage = (
	toolUseId: string,
	content: string | ContentBlockParam[],
	isError = false,
): UserMessage => {
	const resultBlock: ToolResultBlockParam = {
		type: 'tool_result',
		tool_use_id: toolUseId,
		content: content as ToolResultBlockParam['content'],
		...(isError && { is_error: true }),
	};
	return createUserMessage([resultBlock], { isSynthetic: true });
};

/**
 * Build an AssistantMessage from an API response.
 * Called after a streaming response completes.
 */
export const createAssistantMessage = (
	id: string,
	content: ContentBlock[],
	model: string,
	stopReason: string | null,
	usage: AssistantMessage['message']['usage'],
	costUSD?: number,
): AssistantMessage => {
	return {
		type: 'assistant',
		message: {
			id,
			role: 'assistant',
			content,
			model,
			stop_reason: stopReason,
			stop_sequence: null,
			usage,
		},
		uuid: randomUUID(),
		timestamp: new Date().toISOString(),
		...(costUSD !== undefined && { costUSD }),
	};
};

// ── API conversion ────────────────────────────────────────────────────────────

/**
 * Convert our internal Message[] to the MessageParam[] the API expects.
 *
 * Rules:
 *   - Skip synthetic messages that were only for internal bookkeeping
 *   - UserMessage  → { role: 'user',      content: ... }
 *   - AssistantMessage → { role: 'assistant', content: ... }
 *   - tool_result blocks are included (they're synthetic but needed by the API)
 *
 * The API requires alternating user/assistant turns. Consecutive messages
 * of the same role must be merged. This function handles that automatically.
 */
export const messagesForAPI = (messages: Message[]): MessageParam[] => {
	const result: MessageParam[] = [];

	for (const msg of messages) {
		if (msg.type === 'user') {
			const content = msg.message.content;

			// Always include tool_result messages, even if synthetic —
			// the model needs them to complete its tool call loop.
			const hasToolResult =
				Array.isArray(content) &&
				content.some((b: ContentBlockParam) => b.type === 'tool_result');

			if (msg.isSynthetic && !hasToolResult) continue;

			const param: MessageParam = { role: 'user', content };
			const last = result[result.length - 1];

			// Merge consecutive user messages (API requires strict alternation)
			if (last?.role === 'user') {
				const lastContent = last.content;
				if (Array.isArray(lastContent) && Array.isArray(content)) {
					last.content = [...lastContent, ...content] as typeof lastContent;
				} else {
					// Convert string content to array before merging
					const prevBlocks =
						typeof lastContent === 'string'
							? [{ type: 'text' as const, text: lastContent }]
							: lastContent;
					const newBlocks =
						typeof content === 'string'
							? [{ type: 'text' as const, text: content }]
							: content;
					last.content = [...prevBlocks, ...newBlocks] as typeof last.content;
				}
			} else {
				result.push(param);
			}
		} else {
			// Assistant message — always include
			result.push({
				role: 'assistant',
				content: msg.message.content,
			});
		}
	}

	return result;
};

/**
 * Extract all tool_use blocks from an AssistantMessage's content.
 * Returns an empty array if there are no tool calls.
 */
export const getToolUseBlocks = (msg: AssistantMessage) => {
	return msg.message.content.filter(
		(b): b is Extract<ContentBlock, { type: 'tool_use' }> =>
			b.type === 'tool_use',
	);
};

/**
 * Extract the text content from an AssistantMessage as a single string.
 * Concatenates all text blocks.
 */
export const getTextContent = (msg: AssistantMessage): string => {
	return msg.message.content
		.filter(
			(b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text',
		)
		.map((b) => b.text)
		.join('');
};
