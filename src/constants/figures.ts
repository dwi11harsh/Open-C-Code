/**
 * Unicode glyphs used throughout the UI.
 * Centralized here to adjust per-platform.
 */

const IS_MACOS = process.platform === 'darwin';

export const BLACK_CIRCLE = IS_MACOS ? '⏺' : '●';

export const BULLET_OPERATOR = '∙';
export const UP_ARROW = '↑';
export const DOWN_ARROW = '↓';
export const LIGHTNING_BOLT = '↯';
export const EFFORT_LOW = '○';
export const EFFORT_MEDIUM = '◐';
export const EFFORT_HIGH = '●';
export const PLAY_ICON = '▶';
export const PAUSE_ICON = '⏸';
export const BLOCKQUOTE_BAR = '▎';
