/**
 * Binary file extensions and detection helpers
 */

export const BINARY_EXTENSIONS = new Set([
	// Images
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.bmp',
	'.ico',
	'.webp',
	'.tiff',
	'.svg',
	// Videos
	'.mp4',
	'.mov',
	'.avi',
	'.mkv',
	'.webm',
	// Audio
	'.mp3',
	'.wav',
	'.ogg',
	'.flac',
	'.aac',
	// Archives
	'.zip',
	'.tar',
	'.gz',
	'.bz2',
	'.7z',
	'.rar',
	// Executables
	'.exe',
	'.dll',
	'.so',
	'.dylib',
	'.bin',
	// Documents
	'.pdf',
	'.doc',
	'.docx',
	'.xls',
	'.xlsx',
	'.ppt',
	'.pptx',
	// Fonts
	'.ttf',
	'.otf',
	'.woff',
	'.woff2',
	// Bytecode
	'.pyc',
	'.class',
	'.jar',
	'.wasm',
	// Databases
	'.sqlite',
	'.sqlite3',
	'.db',
]);

export const hasBinaryExtension = (filePath: string): boolean => {
	const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
	return BINARY_EXTENSIONS.has(ext);
};

const BINARY_CHECK_SIZE = 8192;

export const isBinaryContent = (buffer: Buffer): boolean => {
	const checkSize = Math.min(buffer.length, BINARY_CHECK_SIZE);
	let nonPrintable = 0;

	for (let i = 0; i < checkSize; i++) {
		const byte = buffer[i] ?? 0;
		if (byte === 0) return true;
		if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) nonPrintable++;
	}

	return nonPrintable / checkSize > 0.1;
};
