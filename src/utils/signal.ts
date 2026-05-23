/**
 *  lightweight "publish-subscribe" (pub/sub) utility
 *  Simple "something changed" notifications without tracking value and history
 *  use when subscribers need "something happened", now "what is the value"
 *
 * Usage:
 *      const changed = createSignal<[string]>()
 *      const unsub = changed.subscribe((name) => console.log(name))
 *      changed.emit('settings')
 *      unsub()
 */

export type Signal<Args extends unknown[] = []> = {
	subscribe: (listener: (...args: Args) => void) => () => void;
	emit: (...args: Args) => void;
	clear: () => void;
};

export const createSignal = <Args extends unknown[] = []>(): Signal<Args> => {
	const listeners = new Set<(...args: Args) => void>();
	return {
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		emit(...args) {
			for (const listener of listeners) listener(...args);
		},

		clear() {
			listeners.clear();
		},
	};
};
