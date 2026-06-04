/**
 * Style types — the CSS subset used by Box and Text components.
 *
 * These map to Yoga layout properties plus chalk text styling.
 * Components spread style props into the `style` attribute on ink-box/ink-text nodes;
 * the DOM layer reads them to configure Yoga and apply chalk.
 *
 * Color format: raw color values, not theme keys.
 * Theme resolution happens at the component layer before styles are set.
 */

// ── Color types ───────────────────────────────────────────────────────────────

export type RGBColor = `rgb(${number},${number},${number})`;
export type HexColor = `#${string}`;
export type Ansi256Color = `ansi256(${number})`;
export type AnsiColor =
	| 'ansi:black'
	| 'ansi:red'
	| 'ansi:green'
	| 'ansi:yellow'
	| 'ansi:blue'
	| 'ansi:magenta'
	| 'ansi:cyan'
	| 'ansi:white'
	| 'ansi:blackBright'
	| 'ansi:redBright'
	| 'ansi:greenBright'
	| 'ansi:yellowBright'
	| 'ansi:blueBright'
	| 'ansi:magentaBright'
	| 'ansi:cyanBright'
	| 'ansi:whiteBright';

/** Raw color value — not a theme key. */
export type Color = RGBColor | HexColor | Ansi256Color | AnsiColor;

// ── Text styles ───────────────────────────────────────────────────────────────

export type TextStyles = {
	readonly color?: Color;
	readonly backgroundColor?: Color;
	/** bold and dim are mutually exclusive in terminals. */
	readonly bold?: boolean;
	readonly dim?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly strikethrough?: boolean;
	readonly inverse?: boolean;
};

// ── Border style ──────────────────────────────────────────────────────────────

export type BorderStyle =
	| 'single'
	| 'double'
	| 'round'
	| 'singleDouble'
	| 'doubleSingle'
	| 'classic'
	| 'bold'
	| 'arrow'
	| 'none';

// ── Full style type ───────────────────────────────────────────────────────────

export type Styles = TextStyles & {
	readonly textWrap?:
		| 'wrap'
		| 'wrap-trim'
		| 'end'
		| 'middle'
		| 'truncate-end'
		| 'truncate'
		| 'truncate-middle'
		| 'truncate-start';

	readonly position?: 'absolute' | 'relative';
	readonly top?: number | `${number}%`;
	readonly bottom?: number | `${number}%`;
	readonly left?: number | `${number}%`;
	readonly right?: number | `${number}%`;

	readonly gap?: number;
	readonly rowGap?: number;
	readonly columnGap?: number;

	readonly margin?: number;
	readonly marginX?: number;
	readonly marginY?: number;
	readonly marginTop?: number;
	readonly marginBottom?: number;
	readonly marginLeft?: number;
	readonly marginRight?: number;

	readonly padding?: number;
	readonly paddingX?: number;
	readonly paddingY?: number;
	readonly paddingTop?: number;
	readonly paddingBottom?: number;
	readonly paddingLeft?: number;
	readonly paddingRight?: number;

	readonly flexGrow?: number;
	readonly flexShrink?: number;
	readonly flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
	readonly flexBasis?: number | string;
	readonly flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';

	readonly alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
	readonly alignSelf?: 'flex-start' | 'center' | 'flex-end' | 'auto';
	readonly justifyContent?:
		| 'flex-start'
		| 'flex-end'
		| 'space-between'
		| 'space-around'
		| 'space-evenly'
		| 'center';

	readonly width?: number | string;
	readonly height?: number | string;
	readonly minWidth?: number | string;
	readonly minHeight?: number | string;
	readonly maxWidth?: number | string;
	readonly maxHeight?: number | string;

	readonly overflow?: 'visible' | 'hidden' | 'scroll';
	readonly overflowX?: 'visible' | 'hidden' | 'scroll';
	readonly overflowY?: 'visible' | 'hidden' | 'scroll';

	readonly borderStyle?: BorderStyle;
	readonly borderColor?: Color;
	readonly borderTopColor?: Color;
	readonly borderRightColor?: Color;
	readonly borderBottomColor?: Color;
	readonly borderLeftColor?: Color;
	readonly borderTop?: boolean;
	readonly borderRight?: boolean;
	readonly borderBottom?: boolean;
	readonly borderLeft?: boolean;
};
