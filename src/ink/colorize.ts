/**
 * Terminal color application.
 *
 * Maps color strings to chalk calls. Every colored node in the render
 * pipeline goes through colorize().
 *
 * CHALK LEVEL ADJUSTMENTS (run once at module load):
 *
 * VS Code boost: xterm.js has supported truecolor since 2017 but chalk's
 * supports-color doesn't recognize TERM_PROGRAM=vscode, so it reports level 2.
 * At level 2, chalk.rgb() downgrades to the nearest 6×6×6 cube — Claude's orange
 * rgb(215,119,87) becomes idx 174 rgb(215,135,135) (washed-out salmon).
 * Gated on level===2 (not <3) to respect NO_COLOR / FORCE_COLOR=0 (level 0).
 *
 * tmux clamp: tmux parses truecolor SGR into its buffer but only re-emits
 * truecolor if terminal-overrides sets Tc/RGB. Default tmux doesn't, so
 * truecolor sequences reach the outer terminal without the bg sequence →
 * terminal's buffer has bg=default → black on dark profiles. Clamping to
 * level 2 makes chalk emit 256-color which tmux passes through cleanly.
 */

import chalk from 'chalk';
import type { TextStyles } from './styles';
export type ColorType = 'foreground' | 'background';

// ── Chalk level adjustments (computed once at module load) ────────────────────

const boostChalkLevelForXtermJs = (): boolean => {
	if (process.env.TERM_PROGRAM === 'vscode' && chalk.level === 2) {
		chalk.level = 3;
		return true;
	}
	return false;
};

const clampChalkLevelForTmux = (): boolean => {
	if (process.env.CLAUDE_CODE_TMUX_TRUECOLOR) return false;
	if (process.env.TMUX && chalk.level > 2) {
		chalk.level = 2;
		return true;
	}
	return false;
};

// Order matters: boost first so tmux clamp wins if tmux is inside VS Code
export const CHALK_BOOSTED_FOR_XTERMJS = boostChalkLevelForXtermJs();
export const CHALK_CLAMPED_FOR_TMUX = clampChalkLevelForTmux();

// ── Color string parsers ──────────────────────────────────────────────────────

const RGB_REGEX = /^rgb\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)$/;
const ANSI256_REGEX = /^ansi256\(\s?(\d+)\s?\)$/;

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Apply a color to a string for terminal display.
 *
 * Accepts the same color formats as the `color` prop on Box/Text:
 *   'ansi:red', 'ansi:blueBright', etc.  — named ANSI colors
 *   '#ff8c00'                            — hex (3 or 6 digits)
 *   'rgb(255, 140, 0)'                   — RGB
 *   'ansi256(208)'                       — xterm 256-color palette
 *
 * Returns `str` unchanged if `color` is falsy or chalk level is 0.
 */
export const colorize = (
	str: string,
	color: string | undefined,
	type: ColorType,
): string => {
	if (!color || chalk.level === 0) return str;

	// Named ANSI: 'ansi:red', 'ansi:blueBright', etc.
	if (color.startsWith('ansi:')) {
		const name = color.substring(5);
		switch (name) {
			case 'black':
				return type === 'foreground' ? chalk.black(str) : chalk.bgBlack(str);
			case 'red':
				return type === 'foreground' ? chalk.red(str) : chalk.bgRed(str);
			case 'green':
				return type === 'foreground' ? chalk.green(str) : chalk.bgGreen(str);
			case 'yellow':
				return type === 'foreground' ? chalk.yellow(str) : chalk.bgYellow(str);
			case 'blue':
				return type === 'foreground' ? chalk.blue(str) : chalk.bgBlue(str);
			case 'magenta':
				return type === 'foreground'
					? chalk.magenta(str)
					: chalk.bgMagenta(str);
			case 'cyan':
				return type === 'foreground' ? chalk.cyan(str) : chalk.bgCyan(str);
			case 'white':
				return type === 'foreground' ? chalk.white(str) : chalk.bgWhite(str);
			case 'blackBright':
				return type === 'foreground'
					? chalk.blackBright(str)
					: chalk.bgBlackBright(str);
			case 'redBright':
				return type === 'foreground'
					? chalk.redBright(str)
					: chalk.bgRedBright(str);
			case 'greenBright':
				return type === 'foreground'
					? chalk.greenBright(str)
					: chalk.bgGreenBright(str);
			case 'yellowBright':
				return type === 'foreground'
					? chalk.yellowBright(str)
					: chalk.bgYellowBright(str);
			case 'blueBright':
				return type === 'foreground'
					? chalk.blueBright(str)
					: chalk.bgBlueBright(str);
			case 'magentaBright':
				return type === 'foreground'
					? chalk.magentaBright(str)
					: chalk.bgMagentaBright(str);
			case 'cyanBright':
				return type === 'foreground'
					? chalk.cyanBright(str)
					: chalk.bgCyanBright(str);
			case 'whiteBright':
				return type === 'foreground'
					? chalk.whiteBright(str)
					: chalk.bgWhiteBright(str);
			default:
				return str;
		}
	}

	// Hex: #rrggbb or #rgb
	if (color.startsWith('#')) {
		return type === 'foreground'
			? chalk.hex(color)(str)
			: chalk.bgHex(color)(str);
	}

	// ansi256(n)
	if (color.startsWith('ansi256')) {
		const m = ANSI256_REGEX.exec(color);
		if (!m) return str;
		const n = Number(m[1]);
		return type === 'foreground'
			? chalk.ansi256(n)(str)
			: chalk.bgAnsi256(n)(str);
	}

	// rgb(r, g, b)
	if (color.startsWith('rgb')) {
		const m = RGB_REGEX.exec(color);
		if (!m) return str;
		return type === 'foreground'
			? chalk.rgb(Number(m[1]), Number(m[2]), Number(m[3]))(str)
			: chalk.bgRgb(Number(m[1]), Number(m[2]), Number(m[3]))(str);
	}

	return str;
};

/**
 * Apply TextStyles to a string using chalk.
 * Applies modifiers in innermost-to-outermost order so background wraps everything.
 */
export const applyTextStyles = (text: string, styles: TextStyles): string => {
	let result = text;
	if (styles.inverse) result = chalk.inverse(result);
	if (styles.strikethrough) result = chalk.strikethrough(result);
	if (styles.underline) result = chalk.underline(result);
	if (styles.italic) result = chalk.italic(result);
	if (styles.bold) result = chalk.bold(result);
	if (styles.dim) result = chalk.dim(result);
	if (styles.color) result = colorize(result, styles.color, 'foreground');
	if (styles.backgroundColor)
		result = colorize(result, styles.backgroundColor, 'background');
	return result;
};
