/**
 * 2D geometry primitives for the Ink layout engine.
 *
 * Describes positions, sizes, rectangles, and edge insets (padding, margin,
 * border). Used throughout the renderer to track where elements sit on screen
 * and how much space they occupy.
 *
 * All coordinates are in terminal cells: columns for x, rows for y.
 * This file has NO internal imports — it is a true leaf module.
 */

// ── Primitive types ───────────────────────────────────────────────────────────

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rectangle = Point & Size;

/** Edge insets — used for padding, margin, and border widths. */
export type Edges = {
	top: number;
	right: number;
	bottom: number;
	left: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

/** Zero edges — avoids allocating new objects for the common case. */
export const ZERO_EDGES: Edges = { top: 0, right: 0, bottom: 0, left: 0 };

// ── Constructors ──────────────────────────────────────────────────────────────

/**
 * Create an Edges value using CSS shorthand notation.
 *
 * @example
 *   edges(4)          // all sides = 4
 *   edges(2, 4)       // vertical=2, horizontal=4
 *   edges(1, 2, 3, 4) // top=1, right=2, bottom=3, left=4
 */
export const edges = (a: number, b?: number, c?: number, d?: number): Edges => {
	if (b === undefined) return { top: a, right: a, bottom: a, left: a };
	if (c === undefined) return { top: a, right: b, bottom: a, left: b };
	return { top: a, right: b, bottom: c, left: d! };
};

// ── Arithmetic ────────────────────────────────────────────────────────────────

/** Add two Edges sets component-wise. */
export const addEdges = (a: Edges, b: Edges): Edges => ({
	top: a.top + b.top,
	right: a.right + b.right,
	bottom: a.bottom + b.bottom,
	left: a.left + b.left,
});

// ── Resolvers ─────────────────────────────────────────────────────────────────

/** Fill missing edge fields with 0. Useful for normalising partial style objects. */
export const resolveEdges = (partial?: Partial<Edges>): Edges => ({
	top: partial?.top ?? 0,
	right: partial?.right ?? 0,
	bottom: partial?.bottom ?? 0,
	left: partial?.left ?? 0,
});

// ── Rectangle operations ──────────────────────────────────────────────────────

/**
 * Returns the smallest rectangle that contains both a and b.
 * Useful when computing the dirty region that needs to be repainted.
 */
export const unionRect = (a: Rectangle, b: Rectangle): Rectangle => {
	const minX = Math.min(a.x, b.x);
	const minY = Math.min(a.y, b.y);
	const maxX = Math.max(a.x + a.width, b.x + b.width);
	const maxY = Math.max(a.y + a.height, b.y + b.height);
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

/**
 * Clamp a rectangle so it stays within [0, size.width) × [0, size.height).
 * Used to clip absolute-positioned overlays to the terminal viewport so they
 * don't try to write outside the visible area.
 */
export const clampRect = (rect: Rectangle, size: Size): Rectangle => {
	const minX = Math.max(0, rect.x);
	const minY = Math.max(0, rect.y);
	const maxX = Math.min(size.width - 1, rect.x + rect.width - 1);
	const maxY = Math.min(size.height - 1, rect.y + rect.height - 1);
	return {
		x: minX,
		y: minY,
		width: Math.max(0, maxX - minX + 1),
		height: Math.max(0, maxY - minY + 1),
	};
};

// ── Point utilities ───────────────────────────────────────────────────────────

/**
 * Returns true if point is inside [0, size.width) × [0, size.height).
 * Used by hit-testing (mouse click → which element was clicked).
 */
export const withinBounds = (size: Size, point: Point): boolean =>
	point.x >= 0 &&
	point.y >= 0 &&
	point.x < size.width &&
	point.y < size.height;

// ── Numeric utilities ─────────────────────────────────────────────────────────

/**
 * Clamp a number between optional lower and upper bounds.
 *
 * @example
 *   clamp(15, 0, 10) // → 10
 *   clamp(-1, 0)     // → 0
 *   clamp(5)         // → 5 (no bounds)
 */
export const clamp = (value: number, min?: number, max?: number): number => {
	if (min !== undefined && value < min) return min;
	if (max !== undefined && value > max) return max;
	return value;
};
