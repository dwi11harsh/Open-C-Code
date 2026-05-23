import { describe, expect, it } from 'bun:test';
import { asAgentId, asSessionId, toAgentId } from './ids';

describe('branded IDs', () => {
	it('should correctly cast a string to SessionId', () => {
		const id = asSessionId('test-session-123');
		expect(id as string).toBe('test-session-123');
	});

	it('should correctly cast a string to AgentId', () => {
		const id = asAgentId('test-agent-123');
		expect(id as string).toBe('test-agent-123');
	});

	it('should validate and parse valid AgentIds using toAgentId', () => {
		// a + 16 hex characters
		const validId1 = toAgentId('a0123456789abcdef');
		expect(validId1).not.toBeNull();
		expect(validId1 as string).toBe('a0123456789abcdef');

		// a + prefix- + 16 hex characters
		const validId2 = toAgentId('amyagent-0123456789abcdef');
		expect(validId2).not.toBeNull();
		expect(validId2 as string).toBe('amyagent-0123456789abcdef');

		// Invalid patterns
		expect(toAgentId('invalid-id')).toBeNull();
		expect(toAgentId('a0123456789abcde')).toBeNull(); // 15 hex chars
		expect(toAgentId('a0123456789abcdefg')).toBeNull(); // non-hex 'g'
	});
});
