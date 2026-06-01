/**
 * Streaming response handler.
 *
 * Processes the token-by-token stream from the API (Ollama Cloud or Anthropic) and:
 *   1. Fires `onText` callback with each text delta (for live display)
 *   2. Accumulates the full response
 *   3. Returns a completed AssistantMessage when the stream ends
 *
 * Why handle this separately from the API call?
 *   The streaming logic (accumulate deltas, assemble tool_use inputs, fire callbacks)
 *   is complex enough to deserve its own file and tests. Separating it also makes
 *   the main agent loop cleaner.
 */

import type {
	BetaContentBlock,
	BetaRawMessageStreamEvent,
	BetaUsage,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';
import type { Stream } from '@anthropic-ai/sdk/streaming.mjs';
import type { AssistantMessage, ContentBlock } from 'src/types/message.js';
import { logForDebugging } from 'src/utils/debug.js';
import { createAssistantMessage } from 'src/utils/messages.js';

export type StreamCallbacks = {
	/** Called with each text delta as it arrives. Use for live display. */
	onText?: (text: string) => void;
	/** Called when a tool_use block starts (name is known, input not yet complete). */
	onToolUseStart?: (id: string, name: string) => void;
	/** Called when the stream ends with the stop reason. */
	onDone?: (stopReason: string | null) => void;
};

/**
 * Process a streaming API response into a completed AssistantMessage.
 *
 * @param stream   - The SDK stream object from client.beta.messages.stream(...)
 * @param model    - The model name (not in the stream events, passed separately)
 * @param callbacks - Optional callbacks for live display
 * @returns The complete AssistantMessage after the stream ends
 *
 * @example
 *   const stream = await client.beta.messages.stream({ ... });
 *   const message = await processStream(stream, model, {
 *     onText: (text) => process.stdout.write(text),
 *   });
 */
export const processStream = async (
	stream: Stream<BetaRawMessageStreamEvent>,
	model: string,
	callbacks: StreamCallbacks = {},
): Promise<AssistantMessage> => {
	// Mutable accumulation state
	let messageId = '';
	let stopReason: string | null = null;
	let usage: Partial<BetaUsage> = { input_tokens: 0, output_tokens: 0 };

	// Content blocks — we build these as events arrive
	const contentBlocks: ContentBlock[] = [];

	// For each in-progress content block, we track text and tool_input separately
	type BlockState =
		| { type: 'text'; text: string }
		| { type: 'tool_use'; id: string; name: string; inputJson: string };

	const blockState = new Map<number, BlockState>();

	for await (const event of stream) {
		logForDebugging('[stream] event:', event.type);

		switch (event.type) {
			case 'message_start': {
				messageId = event.message.id;
				if (event.message.usage) {
					usage = event.message.usage as BetaUsage;
				}
				break;
			}

			case 'content_block_start': {
				const idx = event.index;
				const block = event.content_block;

				if (block.type === 'text') {
					blockState.set(idx, { type: 'text', text: '' });
				} else if (block.type === 'tool_use') {
					blockState.set(idx, {
						type: 'tool_use',
						id: block.id,
						name: block.name,
						inputJson: '',
					});
					callbacks.onToolUseStart?.(block.id, block.name);
				}
				break;
			}

			case 'content_block_delta': {
				const idx = event.index;
				const state = blockState.get(idx);
				if (!state) break;

				const delta = event.delta;

				if (delta.type === 'text_delta' && state.type === 'text') {
					state.text += delta.text;
					callbacks.onText?.(delta.text);
				} else if (
					delta.type === 'input_json_delta' &&
					state.type === 'tool_use'
				) {
					state.inputJson += delta.partial_json;
				}
				break;
			}

			case 'content_block_stop': {
				const idx = event.index;
				const state = blockState.get(idx);
				if (!state) break;

				// Finalize the content block
				if (state.type === 'text') {
					contentBlocks[idx] = {
						type: 'text',
						text: state.text,
					} as BetaContentBlock;
				} else if (state.type === 'tool_use') {
					let input: Record<string, unknown> = {};
					try {
						input = JSON.parse(state.inputJson || '{}');
					} catch {
						logForDebugging(
							`[stream] Failed to parse tool input JSON:`,
							state.inputJson,
						);
					}
					contentBlocks[idx] = {
						type: 'tool_use',
						id: state.id,
						name: state.name,
						input,
					};
				}
				break;
			}

			case 'message_delta': {
				if (event.delta.stop_reason) {
					stopReason = event.delta.stop_reason;
				}
				if (event.usage) {
					// message_delta usage contains output_tokens
					usage = {
						...usage,
						output_tokens: (event.usage as { output_tokens: number })
							.output_tokens,
					};
				}
				break;
			}

			case 'message_stop': {
				callbacks.onDone?.(stopReason);
				break;
			}
		}
	}

	// Filter out any holes in the contentBlocks array (shouldn't happen, but defensive)
	const finalContent = contentBlocks.filter(Boolean) as ContentBlock[];

	return createAssistantMessage(
		messageId || crypto.randomUUID(),
		finalContent,
		model,
		stopReason,
		{
			input_tokens: usage.input_tokens ?? 0,
			output_tokens: usage.output_tokens ?? 0,
			cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
			cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
		},
	);
};
