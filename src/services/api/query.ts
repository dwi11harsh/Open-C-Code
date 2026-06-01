/**
 * queryModel() — the main API call function.
 *
 * This is the only function the agent loop needs from this module.
 * It handles:
 *   - Building the API request (messages, system prompt, tools, model)
 *   - Creating the streaming client
 *   - Processing the stream via processStream()
 *   - Retry logic via withRetry()
 *   - Returning a typed AssistantMessage
 *
 * Works with any configured provider (Ollama Cloud by default, or
 * Anthropic/Bedrock/Vertex when opted in via env vars).
 */

import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';
import type { Stream } from '@anthropic-ai/sdk/streaming.mjs';
import type {
	AssistantMessage,
	Message,
	MessageParam,
} from 'src/types/message';
import { logForDebugging } from 'src/utils/debug';
import { messagesForAPI } from 'src/utils/messages';
import { getMainLoopModel } from 'src/utils/model/model';
import { profileCheckpoint } from 'src/utils/startupProfiler';
import { getAPIClient } from './client';
import { withRetry } from './errors';
import { processStream } from './stream';

// ── Tool schema types ─────────────────────────────────────────────────────────

/**
 * Minimal tool definition — enough to call the API.
 * The full Tool class with execute() is built in Phase 11.
 * For now, just the schema sent to the API.
 */
export type ToolSchema = {
	name: string;
	description: string;
	input_schema: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
};

// ── Query options ─────────────────────────────────────────────────────────────

export type QueryModelOptions = {
	/** The full conversation history to send. */
	messages: Message[];
	/** System prompt string. */
	systemPrompt?: string;
	/** Available tools (sent in the API request). */
	tools?: ToolSchema[];
	/** Model override. If omitted, uses getMainLoopModel(). */
	model?: string;
	/** Max tokens to generate. Default: 8192. */
	maxTokens?: number;
	/** AbortSignal for cancellation. */
	signal?: AbortSignal;
	/** Callbacks for streaming display. */
	onText?: (text: string) => void;
	onToolUseStart?: (id: string, name: string) => void;
};

// ── The main function ─────────────────────────────────────────────────────────

/**
 * Send a conversation to the API and get a streamed response.
 *
 * @example
 *   const response = await queryModel({
 *     messages: sessionMessages,
 *     systemPrompt: 'You are a helpful assistant.',
 *     onText: (text) => process.stdout.write(text),
 *   });
 *   // response is a complete AssistantMessage
 */
export const queryModel = async (
	options: QueryModelOptions,
): Promise<AssistantMessage> => {
	const {
		messages,
		systemPrompt,
		tools = [],
		maxTokens = 8192,
		signal,
		onText,
		onToolUseStart,
	} = options;

	const model = options.model ?? getMainLoopModel();
	const apiMessages: MessageParam[] = messagesForAPI(messages);

	logForDebugging(
		`[queryModel] model=${model}, messages=${apiMessages.length}, tools=${tools.length}`,
	);
	profileCheckpoint('api_call_start');

	const response = await withRetry(
		async () => {
			const client = await getAPIClient();

			// Build the API request body
			const requestBody: Parameters<typeof client.beta.messages.stream>[0] = {
				model,
				max_tokens: maxTokens,
				messages: apiMessages as Parameters<
					typeof client.beta.messages.stream
				>[0]['messages'],
				...(systemPrompt && {
					system: systemPrompt,
				}),
				...(tools.length > 0 && {
					tools: tools.map((t) => ({
						name: t.name,
						description: t.description,
						input_schema: t.input_schema,
					})),
				}),
				// biome-ignore lint/suspicious/noExplicitAny: beta API typing
				betas: ['interleaved-thinking-2025-05-14'] as any,
			};

			logForDebugging('[queryModel] starting stream');

			const stream = client.beta.messages.stream(
				requestBody,
				signal ? { signal } : undefined,
			) as unknown as Stream<BetaRawMessageStreamEvent>;

			return processStream(stream, model, { onText, onToolUseStart });
		},
		{ maxRetries: 2, initialDelayMs: 1000 },
	);

	profileCheckpoint('api_call_end');
	logForDebugging(
		`[queryModel] done, stop_reason=${response.message.stop_reason}`,
	);

	return response;
};
