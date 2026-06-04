/**
 * Process-wide Ink instance registry.
 *
 * Most processes have exactly one Ink instance.
 * Tests may have more. All instances are tracked here so global
 * accessors (useApp().exit(), etc.) can reach the active instance.
 */

// biome-ignore lint/suspicious/noExplicitAny: Ink class defined in ink.tsx (Day 8)
type InkInstance = any;

const instances = new Set<InkInstance>();

export default {
	add(instance: InkInstance): void {
		instances.add(instance);
	},
	remove(instance: InkInstance): void {
		instances.delete(instance);
	},
	get(): InkInstance | undefined {
		return instances.values().next().value;
	},
	getAll(): InkInstance[] {
		return [...instances];
	},
	clear(): void {
		instances.clear();
	},
};
