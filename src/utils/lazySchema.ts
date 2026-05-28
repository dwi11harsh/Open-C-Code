/**
 * Lazy schema factory — defers Zod schema construction until first use.
 *
 * Why?
 *   Complex Zod schemas with circular or cross-module dependencies can cause
 *   problems if constructed at module-load time. lazySchema defers construction
 *   to the first call, by which time all imports are resolved.
 *
 * Usage:
 *   export const MySchema = lazySchema(() => z.object({ name: z.string() }));
 *   // Later:
 *   const result = MySchema().safeParse(data); // constructs on first call
 *
 * Thread safety: not a concern in Node.js (single-threaded event loop).
 */
export function lazySchema<T>(factory: () => T): () => T {
	let cached: T | null = null;
	return (): T => {
		if (cached === null) {
			cached = factory();
		}
		return cached;
	};
}
