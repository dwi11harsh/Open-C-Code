export type HookEvent =
	| 'PreToolUse' // before a tool runs; hook can block it
	| 'PostToolUse' // after a tool completes
	| 'Notification' // when LLM sends a notification
	| 'Stop' // when the agent loop ends
	| 'SubagentStop'; // when a sub-agent loop ends

export type PreToolUseHookData = {
	event: 'PreToolUse';
	toolName: string;
	toolInput: Record<string, unknown>;
	sessionId: string;
};

export type PostToolUseHookData = {
	event: 'PostToolUse';
	toolName: string;
	toolInput: Record<string, unknown>;
	toolResult: unknown;
	sessionId: string;
};

export type HookData =
	| PreToolUseHookData
	| PostToolUseHookData
	| { event: 'Notification'; message: string; sessionId: string }
	| { event: 'Stop'; sessionId: string }
	| { event: 'SubagentStop'; sessionId: string };

/** Matcher config stored in settings.json */
export type HookCallbackMatcher = {
	event: HookEvent;
	toolNameFilter?: string;
	command: string;
	cwd?: string;
	timeoutMs?: number;
};
