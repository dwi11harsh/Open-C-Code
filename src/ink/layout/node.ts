/**
 * LayoutNode — typed wrapper around a Yoga node.
 *
 * Exposes only the subset of the Yoga API we use, with proper TypeScript types.
 * Full Yoga API has ~80 methods; we use about 20 in the reconciler + renderer.
 */

// biome-ignore lint/suspicious/noExplicitAny: yoga-layout types
type YogaNodeHandle = any;

// Re-export enums used by styles.ts and dom.ts
export enum LayoutDisplay {
	Flex = 'flex',
	None = 'none',
}
export enum LayoutPositionType {
	Relative = 'relative',
	Absolute = 'absolute',
}
export enum LayoutFlexDirection {
	Row = 'row',
	Column = 'column',
	RowReverse = 'row-reverse',
	ColumnReverse = 'column-reverse',
}
export enum LayoutJustify {
	FlexStart = 'flex-start',
	Center = 'center',
	FlexEnd = 'flex-end',
	SpaceBetween = 'space-between',
	SpaceAround = 'space-around',
	SpaceEvenly = 'space-evenly',
}
export enum LayoutAlign {
	FlexStart = 'flex-start',
	Center = 'center',
	FlexEnd = 'flex-end',
	Stretch = 'stretch',
	Auto = 'auto',
}
export enum LayoutWrap {
	NoWrap = 'nowrap',
	Wrap = 'wrap',
	WrapReverse = 'wrap-reverse',
}
export enum LayoutOverflow {
	Visible = 'visible',
	Hidden = 'hidden',
	Scroll = 'scroll',
}
export enum LayoutEdge {
	Top = 'top',
	Right = 'right',
	Bottom = 'bottom',
	Left = 'left',
	All = 'all',
	Horizontal = 'horizontal',
	Vertical = 'vertical',
}
export enum LayoutGutter {
	All = 'all',
	Row = 'row',
	Column = 'column',
}
export enum LayoutMeasureMode {
	Exactly = 'exactly',
	AtMost = 'atMost',
	Undefined = 'undefined',
}

export type MeasureFunction = (
	width: number,
	widthMode: LayoutMeasureMode,
	height: number,
	heightMode: LayoutMeasureMode,
) => { width: number; height: number };

export class LayoutNode {
	constructor(public readonly _node: YogaNodeHandle) {}

	setWidth(v: number | string | undefined): void {
		if (v === undefined) {
			this._node.setWidthAuto();
			return;
		}
		if (typeof v === 'string' && v.endsWith('%')) {
			this._node.setWidthPercent(parseFloat(v));
			return;
		}
		this._node.setWidth(typeof v === 'string' ? parseFloat(v) : v);
	}
	setHeight(v: number | string | undefined): void {
		if (v === undefined) {
			this._node.setHeightAuto();
			return;
		}
		if (typeof v === 'string' && v.endsWith('%')) {
			this._node.setHeightPercent(parseFloat(v));
			return;
		}
		this._node.setHeight(typeof v === 'string' ? parseFloat(v) : v);
	}
	setMinWidth(v: number): void {
		this._node.setMinWidth(v);
	}
	setMinHeight(v: number): void {
		this._node.setMinHeight(v);
	}
	setMaxWidth(v: number): void {
		this._node.setMaxWidth(v);
	}
	setMaxHeight(v: number): void {
		this._node.setMaxHeight(v);
	}

	setFlexGrow(v: number): void {
		this._node.setFlexGrow(v);
	}
	setFlexShrink(v: number): void {
		this._node.setFlexShrink(v);
	}
	setFlexDirection(v: string): void {
		this._node.setFlexDirection(v as never);
	}
	setFlexWrap(v: string): void {
		this._node.setFlexWrap(v as never);
	}
	setJustifyContent(v: string): void {
		this._node.setJustifyContent(v as never);
	}
	setAlignItems(v: string): void {
		this._node.setAlignItems(v as never);
	}
	setAlignSelf(v: string): void {
		this._node.setAlignSelf(v as never);
	}
	setDisplay(v: string): void {
		this._node.setDisplay(v as never);
	}
	setOverflow(v: string): void {
		this._node.setOverflow(v as never);
	}
	setPositionType(v: string): void {
		this._node.setPositionType(v as never);
	}

	setPadding(edge: string, v: number): void {
		this._node.setPadding(edge as never, v);
	}
	setMargin(edge: string, v: number): void {
		this._node.setMargin(edge as never, v);
	}
	setGap(gutter: string, v: number): void {
		this._node.setGap(gutter as never, v);
	}
	setPosition(edge: string, v: number): void {
		this._node.setPosition(edge as never, v);
	}

	setMeasureFunc(fn: MeasureFunction): void {
		this._node.setMeasureFunc(fn as never);
	}
	markDirty(): void {
		this._node.markDirty();
	}

	insertChild(child: LayoutNode, index: number): void {
		this._node.insertChild(child._node, index);
	}
	removeChild(child: LayoutNode): void {
		this._node.removeChild(child._node);
	}
	getChildCount(): number {
		return this._node.getChildCount();
	}

	calculateLayout(width?: number): void {
		this._node.calculateLayout(width, undefined, 'ltr');
	}

	getComputedLeft(): number {
		return this._node.getComputedLeft();
	}
	getComputedTop(): number {
		return this._node.getComputedTop();
	}
	getComputedWidth(): number {
		return this._node.getComputedWidth();
	}
	getComputedHeight(): number {
		return this._node.getComputedHeight();
	}
	getComputedPadding(edge: string): number {
		return this._node.getComputedPadding(edge as never);
	}
	getComputedMargin(edge: string): number {
		return this._node.getComputedMargin(edge as never);
	}
	getComputedBorder(edge: string): number {
		return this._node.getComputedBorder?.(edge as never) ?? 0;
	}

	free(): void {
		this._node.free?.();
	}
}
