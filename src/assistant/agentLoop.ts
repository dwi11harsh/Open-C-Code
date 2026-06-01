/**
 * Main agent loop.
 *
 * The loop runs until the model stops calling tools. Each iteration:
 *   1. Call the API with the current message history
 *   2. Stream the response (fire onText for live display)
 *   3. Append the AssistantMessage to history
 *   4. If there are tool_use blocks → execute each tool, append tool_result, loop
 *   5. If stop_reason === 'end_turn' with no tool calls → exit
 *
 * The structure is already correct — adding tools is additive.
 */

import { isAbortError } from 'src/services/api/errors';
import { queryModel, type ToolSchema } from 'src/services/api/query';
import type { AssistantMessage } from 'src/types/message';
import { logForDebugging } from 'src/utils/debug';
import { createUserMessage } from 'src/utils/messages';
import type { SessionMessages } from './sessionMessages';

// ── Tool executor interface ───────────────────────────────────────────────────

/**
 * A function that executes a tool call and returns the result as a string.
 * The full Tool class with this interface is built in Phase 11.
 * For now, you can pass an empty map — the loop will handle "unknown tool" gracefully.
 */
export type ToolExecutor = (
	toolName: string,
	toolInput: Record<string, unknown>,
) => Promise<string>;

// ── Loop options ──────────────────────────────────────────────────────────────

export type AgentLoopOptions = {
	/** The current session's message history (mutated in place). */
	history: SessionMessages;
	/** System prompt for this session. */
	systemPrompt: string;
	/** Tool schemas sent to the API. */
	tools?: ToolSchema[];
	/** Tool executor — called when the model requests a tool. */
	executeToolCall?: ToolExecutor;
	/** Model override. */
	model?: string;
	/** AbortSignal for Ctrl+C cancellation. */
	signal?: AbortSignal;
	/** Called with each text delta for live streaming display. */
	onText?: (text: string) => void;
	/** Called at the start of each agent loop iteration. */
	onIterationStart?: (iteration: number) => void;
	/** Called when the loop ends. */
	onComplete?: (finalMessage: AssistantMessage) => void;
	/** Called when an error occurs. */
	onError?: (error: unknown) => void;
	/** Maximum tool call iterations before stopping. Default: 10. */
	maxIterations?: number;
};

// ── The loop ──────────────────────────────────────────────────────────────────

/**
 * Run the agent loop until the model stops requesting tool calls.
 *
 * Returns the final AssistantMessage (the one with stop_reason='end_turn'
 * and no tool_use blocks).
 *
 * @example
 *   const history = new SessionMessages();
 *   history.appendUser(createUserMessage('What is 2+2?'));
 *
 *   const finalResponse = await runAgentLoop({
 *     history,
 *     systemPrompt: 'You are a helpful assistant.',
 *     onText: (t) => process.stdout.write(t),
 *   });
 *   console.log('\n✓ done');
 */
export const runAgentLoop = async (
	options: AgentLoopOptions,
): Promise<AssistantMessage> => {
	const {
		history,
		systemPrompt,
		tools = [],
		executeToolCall,
		signal,
		onText,
		onIterationStart,
		onComplete,
		onError,
		maxIterations = 10,
	} = options;

	let lastAssistantMessage: AssistantMessage | null = null;

	for (let iteration = 0; iteration < maxIterations; iteration++) {
		if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

		onIterationStart?.(iteration);
		logForDebugging(
			`[agentLoop] iteration ${iteration}, messages=${history.length}`,
		);

		let assistantMessage: AssistantMessage;

		try {
			assistantMessage = await queryModel({
				messages: history.getAll(),
				systemPrompt,
				tools,
				model: options.model,
				signal,
				onText,
				onToolUseStart: (id, name) => {
					logForDebugging(`[agentLoop] tool_use started: ${name} (${id})`);
				},
			});
		} catch (err) {
			if (isAbortError(err)) throw err; // propagate cancellation
			onError?.(err);
			throw err;
		}

		// Append the assistant's response to history
		history.appendAssistant(assistantMessage);
		lastAssistantMessage = assistantMessage;

		// Check for tool calls
		const toolUseBlocks = assistantMessage.message.content.filter(
			(b) => b.type === 'tool_use',
		) as Array<{
			type: 'tool_use';
			id: string;
			name: string;
			input: Record<string, unknown>;
		}>;

		// No tool calls — we're done
		if (toolUseBlocks.length === 0) {
			logForDebugging('[agentLoop] no tool calls, loop complete');
			onComplete?.(assistantMessage);
			return assistantMessage;
		}

		// Execute all tool calls in parallel
		logForDebugging(`[agentLoop] executing ${toolUseBlocks.length} tool(s)`);

		const toolResults = await Promise.all(
			toolUseBlocks.map(async (block) => {
				let result: string;
				try {
					if (executeToolCall) {
						result = await executeToolCall(block.name, block.input);
					} else {
						result = `Tool "${block.name}" is not available in this session.`;
					}
				} catch (toolErr) {
					logForDebugging(`[agentLoop] tool error:`, toolErr);
					result = `Error executing ${block.name}: ${toolErr instanceof Error ? toolErr.message : String(toolErr)}`;
				}

				return { id: block.id, result, isError: false };
			}),
		);

		// Append all tool results as a single user message
		// (The API requires all tool_results for a turn to be in one user message)
		const toolResultContent = toolResults.map((r) => ({
			type: 'tool_result' as const,
			tool_use_id: r.id,
			content: r.result,
			...(r.isError && { is_error: true }),
		}));

		const toolResultMessage = createUserMessage(toolResultContent, {
			isSynthetic: true,
		});
		history.appendUser(toolResultMessage);

		// Continue the loop — the model will process the tool results
	}

	// Reached maxIterations
	logForDebugging(`[agentLoop] reached maxIterations (${maxIterations})`);

	if (!lastAssistantMessage) {
		throw new Error('Agent loop ended without producing a response');
	}

	return lastAssistantMessage;
};
