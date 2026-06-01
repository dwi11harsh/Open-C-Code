import { describe, expect, it } from 'bun:test';
import type { ContentBlock, Message } from 'src/types/message';
import {
	estimateTokensFromMessages,
	estimateTokensFromText,
	getLastKnownTokenCount,
	sumTokenUsage,
} from './tokens';

const makeUser = (text: string): Message => {
	return {
		type: 'user',
		message: { role: 'user', content: text },
		uuid: 'u1',
		timestamp: '',
	};
};

const makeAssistant = (inputT: number, outputT: number): Message => {
	return {
		type: 'assistant',
		message: {
			id: 'a1',
			role: 'assistant',
			content: [{ type: 'text', text: 'hi' } as ContentBlock],
			model: 'test',
			stop_reason: 'end_turn',
			stop_sequence: null,
			usage: { input_tokens: inputT, output_tokens: outputT },
		},
		uuid: 'a1',
		timestamp: '',
	};
};

describe('estimateTokensFromText', () => {
	it('returns 0 for empty string', () =>
		expect(estimateTokensFromText('')).toBe(0));
	it('returns positive number for text', () =>
		expect(estimateTokensFromText('hello')).toBeGreaterThan(0));
});

describe('estimateTokensFromMessages', () => {
	it('sums estimates across messages', () => {
		const msgs = [makeUser('Hello world'), makeUser('How are you?')];
		expect(estimateTokensFromMessages(msgs)).toBeGreaterThan(0);
	});
	it('returns 0 for empty array', () =>
		expect(estimateTokensFromMessages([])).toBe(0));
});

describe('getLastKnownTokenCount', () => {
	it('returns 0 when no assistant messages', () => {
		expect(getLastKnownTokenCount([makeUser('hi')])).toBe(0);
	});
	it('returns total from last assistant with usage', () => {
		const msgs = [makeUser('hi'), makeAssistant(100, 50)];
		expect(getLastKnownTokenCount(msgs)).toBe(150);
	});
	it('picks the last one', () => {
		const msgs = [makeAssistant(10, 5), makeUser('x'), makeAssistant(200, 100)];
		expect(getLastKnownTokenCount(msgs)).toBe(300);
	});
});

describe('sumTokenUsage', () => {
	it('sums across all assistant messages', () => {
		const msgs = [makeAssistant(10, 5), makeUser('x'), makeAssistant(20, 10)];
		const sum = sumTokenUsage(msgs);
		expect(sum.input).toBe(30);
		expect(sum.output).toBe(15);
	});
});
