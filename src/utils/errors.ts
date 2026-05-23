/**
 * Error classes and helpers
 */

export class OpenCError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class AbortError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'AbortError';
	}
}

export const isAbortError = (e: unknown): boolean => {
	return (
		e instanceof AbortError || (e instanceof Error && e.name === 'AbortError')
	);
};

export class ConfigParseError extends Error {
	constructor(
		message: string,
		public readonly filePath: string,
		public readonly defaultConfig: unknown,
	) {
		super(message);
		this.name = 'ConfigParseError';
	}
}

export class ShellError extends Error {
	constructor(
		public readonly stdout: string,
		public readonly stderr: string,
		public readonly code: number,
		public readonly interrupted: boolean,
	) {
		super('Shell command failed');
		this.name = 'ShellError';
	}
}

/** Normalize unknown -> Error */
export const toError = (e: unknown): Error => {
	return e instanceof Error ? e : new Error(String(e));
};

/** Extract string message from unknown error */
export const errorMessage = (e: unknown): string => {
	return e instanceof Error ? e.message : String(e);
};

/** extract errno code (ENOENT, EACCES, etc) */
export const getErrornoCode = (e: unknown): string | undefined => {
	if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string')
		return e.code;

	return undefined;
};

export const isENOENT = (e: unknown): boolean => {
	return getErrornoCode(e) === 'ENOENT';
};

export const isFsInaccessible = (e: unknown): boolean => {
	const code = getErrornoCode(e);
	return (
		code === 'ENOENT' ||
		code === 'EACCES' ||
		code === 'EPERM' ||
		code === 'ENOTDIR' ||
		code === 'ELOOP'
	);
};

/** Truncated stack trace for tool results (saves context tokens) */
export const shortErrorStack = (e: unknown, maxFrames = 5): string => {
	if (!(e instanceof Error)) return String(e);
	if (!e.stack) return e.message;

	const lines = e.stack.split('\n');
	const header = lines[0] ?? e.message;
	const frames = lines.slice(1).filter((l) => l.trim().startsWith('at '));

	if (frames.length <= maxFrames) return e.stack;

	return [header, ...frames.slice(0, maxFrames)].join('\n');
};
