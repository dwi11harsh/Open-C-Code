// Branded Types
export type SessionId = string & { readonly __brand: 'SessionId' };
export type AgentId = string & { readonly __brand: 'AgentId' };
export type MessageId = string & { readonly __brand: 'MessageId' };
export type ToolCallId = string & { readonly __brand: 'ToolCallId' };
export type TaskId = string & { readonly __brand: 'TaskId' };

// Casting Helpers for Branded Types
export const asSessionId = (raw: string): SessionId => {
	return raw as SessionId;
};

export const asAgentId = (raw: string): AgentId => {
	return raw as AgentId;
};

export const asMessageId = (raw: string): MessageId => {
	return raw as MessageId;
};

export const asToolCallId = (raw: string): ToolCallId => {
	return raw as ToolCallId;
};

export const asTaskId = (raw: string): TaskId => {
	return raw as TaskId;
};

// Validate and brand a string as AgentId. Return null if invalid.
const AGENT_ID_PATTERN = /^a(?:.+-)?[0-9a-f]{16}$/;
export const toAgentId = (s: string): AgentId | null => {
	return AGENT_ID_PATTERN.test(s) ? (s as AgentId) : null;
};
