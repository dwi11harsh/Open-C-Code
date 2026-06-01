import { describe, expect, it } from 'bun:test';
import type { ContentBlock } from 'src/types/message';
import {
	createAssistantMessage,
	createToolResultMessage,
	createUserMessage,
	getTextContent,
	messagesForAPI,
} from './messages';

describe('createUserMessage', () => {
	it('creates message with uuid and timestamp', () => {
		const m = createUserMessage('hello');
		expect(m.type).toBe('user');
		expect(m.uuid.length).toBeGreaterThan(0);
		expect(m.timestamp).toBeTruthy();
		expect(m.message.content).toBe('hello');
	});
	it('accepts array content', () => {
		const m = createUserMessage([{ type: 'text', text: 'hi' }]);
		expect(Array.isArray(m.message.content)).toBe(true);
	});
	it('marks synthetic when requested', () => {
		const m = createUserMessage('x', { isSynthetic: true });
		expect(m.isSynthetic).toBe(true);
	});
});

describe('createToolResultMessage', () => {
	it('creates a synthetic user message with tool_result block', () => {
		const m = createToolResultMessage('tool_123', 'result');
		expect(m.isSynthetic).toBe(true);
		const content = m.message.content as {
			type: string;
			tool_use_id: string;
		}[];
		expect(content[0]?.type).toBe('tool_result');
		expect(content[0]?.tool_use_id).toBe('tool_123');
	});
});

describe('messagesForAPI', () => {
	it('converts user and assistant messages', () => {
		const msgs = [
			createUserMessage('hello'),
			createAssistantMessage(
				'id1',
				[{ type: 'text', text: 'hi' } as ContentBlock],
				'test',
				'end_turn',
				{ input_tokens: 5, output_tokens: 3 },
			),
		];
		const params = messagesForAPI(msgs);
		expect(params).toHaveLength(2);
		expect(params[0]?.role).toBe('user');
		expect(params[1]?.role).toBe('assistant');
	});

	it('skips non-tool synthetic messages', () => {
		const m = createUserMessage('internal', { isSynthetic: true });
		expect(messagesForAPI([m])).toHaveLength(0);
	});

	it('includes synthetic tool_result messages', () => {
		const m = createToolResultMessage('id', 'result');
		expect(messagesForAPI([m])).toHaveLength(1);
	});

	it('merges consecutive user messages', () => {
		const m1 = createUserMessage([{ type: 'text', text: 'a' }]);
		const m2 = createUserMessage([{ type: 'text', text: 'b' }]);
		// Simulate both being present without an assistant turn between them
		const params = messagesForAPI([m1, m2]);
		// Should be merged into one user message
		expect(params).toHaveLength(1);
		expect(params[0]?.role).toBe('user');
	});
});

describe('getTextContent', () => {
	it('concatenates all text blocks', () => {
		const m = createAssistantMessage(
			'id',
			[
				{ type: 'text', text: 'Hello ' } as ContentBlock,
				{ type: 'text', text: 'world' } as ContentBlock,
			],
			'test',
			'end_turn',
			{ input_tokens: 5, output_tokens: 2 },
		);
		expect(getTextContent(m)).toBe('Hello world');
	});
	it('returns empty string when no text blocks', () => {
		const m = createAssistantMessage('id', [], 'test', 'end_turn', {
			input_tokens: 5,
			output_tokens: 0,
		});
		expect(getTextContent(m)).toBe('');
	});
});
