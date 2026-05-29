/**
 * Shared infrastructure for profiler modules.
 *
 * All three profilers (startupProfiler, queryProfiler, headlessProfiler) use
 * the same Node.js perf_hooks singleton and the same output line format.
 * Centralizing them here avoids duplication and keeps each profiler small.
 *
 * This file has NO internal imports — it is a true leaf module.
 */

import type { performance as PerformanceType } from 'node:perf_hooks';

/**
 * Lazy reference to the Node.js performance API.
 * Only initialized when getPerformance() is first called.
 * This avoids the module-load cost of requiring 'perf_hooks' on every startup.
 */
let _performance: typeof PerformanceType | null = null;

/**
 * Returns the Node.js process-wide performance singleton.
 * Lazy-loads perf_hooks on first call.
 *
 * Why lazy? Requiring 'perf_hooks' has a measurable startup cost (~3ms).
 * We only pay that cost when profiling is actually enabled.
 */
export const getPerformance = (): typeof PerformanceType => {
	if (!_performance) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_performance = require('node:perf_hooks')
			.performance as typeof PerformanceType;
	}
	const perf = _performance;
	if (!perf) {
		throw new Error('Failed to load performance module');
	}
	return perf;
};

/**
 * Format a millisecond value to 3 decimal places.
 * Used in all three profilers for consistent output.
 *
 * @example formatMs(12.3456) → "12.346"
 */
export const formatMs = (ms: number): string => {
	return ms.toFixed(3);
};

/**
 * Render a single timeline line in the shared profiler report format:
 *   [+ total.ms] (+ delta.ms) name [| RSS: .., Heap: ..]
 *
 * @param totalMs   - Time since profiling started (for the left column)
 * @param deltaMs   - Time since the previous checkpoint (for the middle column)
 * @param name      - Checkpoint name
 * @param memory    - Optional memory snapshot (only captured in detailed mode)
 * @param totalPad  - padStart width for the total column (startup uses 8)
 * @param deltaPad  - padStart width for the delta column (startup uses 7)
 * @param extra     - Optional suffix (token counts, etc.)
 */
export function formatTimelineLine(
	totalMs: number,
	deltaMs: number,
	name: string,
	memory: NodeJS.MemoryUsage | undefined,
	totalPad: number,
	deltaPad: number,
	extra = '',
): string {
	// Format memory as human-readable byte strings when present.
	// Only shown in OPENC_CODE_PROFILE_STARTUP=1 mode.
	const memInfo = memory
		? ` | RSS: ${formatBytes(memory.rss)}, Heap: ${formatBytes(memory.heapUsed)}`
		: '';

	return (
		`[+${formatMs(totalMs).padStart(totalPad)}ms]` +
		` (+${formatMs(deltaMs).padStart(deltaPad)}ms)` +
		` ${name}${extra}${memInfo}`
	);
}

/**
 * Format a byte count as a human-readable string.
 * @example formatBytes(1536) → "1.5 KB"
 */
function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
