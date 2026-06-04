/**
 * Intl.Segmenter singleton.
 *
 * Intl.Segmenter construction is expensive (~2ms per call).
 * We cache one global instance so all Unicode graphese measurements share it.
 *
 * For terminal width measurement we only cluster boundaries,
 * not locale sematics. 'en' is a safe universal default.
 */

let _segmenter: Intl.Segmenter | null = null;

/**
 * Get the cached graphese cluster segmenter.
 * Creates it on first call, returns the cached instance thereafter.
 *
 * @example
 *      for (const {segment} of getGraphemeSegmenter().segment('hello 👨‍👩‍👧‍👦')) {
 *          console.log(segment); // 'h', 'e', 'l', 'l', 'o', ' ', '👨‍👩‍👧‍👦'
 *      }
 */
export const getGraphemeSegmenter = (): Intl.Segmenter => {
	if (!_segmenter) {
		_segmenter = new Intl.Segmenter('en', {
			granularity: 'grapheme',
		});
	}

	return _segmenter;
};

export const resetGraphemeSegmenter = (): void => {
	_segmenter = null;
};
