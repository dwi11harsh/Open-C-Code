/**
 * Startup profiling utility.
 *
 * Two modes:
 *   1. Sampled logging — records aggregate timings, used for performance analytics.
 *      Always on for a configurable % of users.
 *   2. Detailed profiling — OPENC_CODE_PROFILE_STARTUP=1 — full report with
 *      memory snapshots, written to ~/.openc/logs/startup-profile.log
 *
 * Decision is made ONCE at module load. Non-profiled users pay zero cost after
 * the initial check.
 */

import { isEnvTruthy } from './env';
import { logForDebugging } from './debug';
import { formatMs, formatTimelineLine, getPerformance } from './profilerBase';

// ── Mode decision (made once at module load, never re-evaluated) ─────────────

/**
 * Detailed mode: OPENC_CODE_PROFILE_STARTUP=1
 * Enables full report + memory snapshots.
 */
const DETAILED_PROFILING = isEnvTruthy(process.env.OPENC_CODE_PROFILE_STARTUP);

/**
 * Sampled mode: 0.5% of non-detailed users also record for analytics.
 * (We don't have analytics wired yet — this is the skeleton.)
 */
const SAMPLE_RATE = 0.005;
const SAMPLED_FOR_ANALYTICS = !DETAILED_PROFILING && Math.random() < SAMPLE_RATE;

/**
 * Are we profiling at all?
 * If false, profileCheckpoint() is a no-op — zero overhead.
 */
export const SHOULD_PROFILE = DETAILED_PROFILING || SAMPLED_FOR_ANALYTICS;

// ── Memory snapshots (only populated in detailed mode) ───────────────────────
// We store snapshots in an array that grows in the same order as perf.mark()
// calls. Using a Map keyed by name is wrong: some checkpoints fire more than
// once, and the second call would overwrite the first's snapshot.
const memorySnapshots: NodeJS.MemoryUsage[] = [];


/**
 * Record a named checkpoint.
 * In detailed mode, also captures a memory snapshot.
 *
 * Call this at the START and END of each significant initialization phase:
 *   profileCheckpoint('settings_load_start')
 *   await loadSettings()
 *   profileCheckpoint('settings_load_end')
 *
 * The name is free-form but should be unique per call site.
 * Naming convention: lowercase_snake_case, _start/_end suffix pairs.
 */
export const profileCheckpoint = (name: string): void => {
  if (!SHOULD_PROFILE) return;

  getPerformance().mark(name);

  if (DETAILED_PROFILING) {
    memorySnapshots.push(process.memoryUsage());
  }
}

// ── Record the first checkpoint immediately if profiling is on ───────────────
if (SHOULD_PROFILE) {
  profileCheckpoint('profiler_initialized');
}


/**
 * Build a formatted text report of all recorded checkpoints.
 * Returns an empty string if detailed profiling is not enabled.
 */
export const getStartupReport = (): string => {
  if (!DETAILED_PROFILING) return '';

  const perf = getPerformance();
  const marks = perf.getEntriesByType('mark');
  if (marks.length === 0) return 'No profiling checkpoints recorded.';

  const lines: string[] = [
    '='.repeat(80),
    'STARTUP PROFILING REPORT',
    '='.repeat(80),
    '',
  ];

  let prevTime = 0;
  for (const [i, mark] of marks.entries()) {
    lines.push(
      formatTimelineLine(
        mark.startTime,
        mark.startTime - prevTime,
        mark.name,
        memorySnapshots[i],
        8,
        7,
      ),
    );
    prevTime = mark.startTime;
  }

  const lastMark = marks[marks.length - 1];
  lines.push('');
  lines.push(`Total startup time: ${formatMs(lastMark?.startTime ?? 0)}ms`);
  lines.push('='.repeat(80));

  return lines.join('\n');
}

/** Guard against calling profileReport() more than once per process. */
let hasReported = false;

/**
 * Finalize the startup profile.
 * Call this once — right after the first Ink frame renders.
 * Logs to stderr if OPENC_CODE_PROFILE_STARTUP=1.
 */
export function profileReport(): void {
  if (hasReported) return;
  hasReported = true;

  const report = getStartupReport();
  if (report) {
    logForDebugging('\n' + report);
  }
}