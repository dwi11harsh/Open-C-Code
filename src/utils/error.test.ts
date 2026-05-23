import { describe, expect, it } from 'bun:test';
import {
	AbortError,
	ConfigParseError,
	errorMessage,
	getErrnoCode,
	isAbortError,
	isENOENT,
	OpenCError,
	ShellError,
	toError,
} from './errors';

describe('error classes', () => {
	it('OpenCError sets name', () => {
		const err = new OpenCError('test');
		expect(err.name).toBe('OpenCError');
		expect(err.message).toBe('test');
	});

	it('AbortError is detected by isAbortError', () => {
		expect(isAbortError(new AbortError())).toBe(true);
		expect(isAbortError(new Error('normal'))).toBe(false);
	});

	it('ConfigParseError stores filePath', () => {
		const err = new ConfigParseError('bad json', '/path', {});
		expect(err.filePath).toBe('/path');
	});

	it('ShellError stores exit code', () => {
		const err = new ShellError('out', 'err', 127, false);
		expect(err.code).toBe(127);
	});
});

describe('error helpers', () => {
	it('toError wraps non-Error', () => {
		expect(toError('oops')).toBeInstanceOf(Error);
		const orig = new Error('x');
		expect(toError(orig)).toBe(orig);
	});

	it('errorMessage extracts message', () => {
		expect(errorMessage(new Error('hello'))).toBe('hello');
		expect(errorMessage('raw string')).toBe('raw string');
		expect(errorMessage(42)).toBe('42');
	});

	it('getErrnoCode extracts code', () => {
		const err = Object.assign(new Error(), { code: 'ENOENT' });
		expect(getErrnoCode(err)).toBe('ENOENT');
		expect(getErrnoCode(new Error())).toBeUndefined();
	});

	it('isENOENT checks for ENOENT', () => {
		const err = Object.assign(new Error(), { code: 'ENOENT' });
		expect(isENOENT(err)).toBe(true);
		expect(isENOENT(new Error())).toBe(false);
	});
});
