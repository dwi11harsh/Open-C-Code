import { describe, expect, it } from 'bun:test';
import { hasBinaryExtension, isBinaryContent } from './files.js';

describe('hasBinaryExtension', () => {
	it('detects binary extensions', () => {
		expect(hasBinaryExtension('photo.png')).toBe(true);
		expect(hasBinaryExtension('archive.zip')).toBe(true);
		expect(hasBinaryExtension('/path/to/font.woff2')).toBe(true);
	});

	it('does not flag text files', () => {
		expect(hasBinaryExtension('code.ts')).toBe(false);
		expect(hasBinaryExtension('README.md')).toBe(false);
		expect(hasBinaryExtension('config.json')).toBe(false);
	});
});

describe('isBinaryContent', () => {
	it('detects null bytes as binary', () => {
		const buf = Buffer.from([0x48, 0x65, 0x00, 0x6c]);
		expect(isBinaryContent(buf)).toBe(true);
	});

	it('treats normal text as non-binary', () => {
		const buf = Buffer.from('Hello, world!\nLine 2\n');
		expect(isBinaryContent(buf)).toBe(false);
	});
});
