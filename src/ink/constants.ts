/**
 * Ink internal constants.
 */

/** Target render interval in milliseconds (~12.5fps for typing, 80ms). */
export const FRAME_INTERVAL_MS = 80;

/** Maximum scroll rows to apply per frame (prevents instant jump on fast flick). */
export const SCROLL_MAX_PER_FRAME = 8;
