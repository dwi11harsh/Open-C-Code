/** 2D geometry types used throughout the layout and rendering pipeline. */

export type Point = { x: number; y: number };
export type Rectangle = { x: number; y: number; width: number; height: number };

export const unionRect = (a: Rectangle, b: Rectangle): Rectangle => {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);
	return {
		x,
		y,
		width: Math.max(a.x + a.width, b.x + b.width) - x,
		height: Math.max(a.y + a.height, b.y + b.height) - y,
	};
};
