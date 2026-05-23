import { describe, expect, it } from 'bun:test';
import { createSignal } from './signal';

describe('createSignal', () => {
	it('calls subscriber on emit', () => {
		const signal = createSignal<[string]>();
		const received: string[] = [];

		signal.subscribe((val) => received.push(val));
		signal.emit('hello');
		signal.emit('harshWhoCodes');
		expect(received).toEqual(['hello', 'harshWhoCodes']);
	});

	it('unsubscribe stops further calls', () => {
		const signal = createSignal();
		let count = 0;
		const unsub = signal.subscribe(() => count++);
		signal.emit();
		unsub();
		signal.emit();
		expect(count).toBe(1);
	});

	it('clear removes all listeners', () => {
		const signal = createSignal();
		let count = 0;
		signal.subscribe(() => count++);
		signal.subscribe(() => count++);
		signal.clear();
		signal.emit();
		expect(count).toBe(0);
	});
});
