import { beforeEach, describe, expect, it } from 'bun:test';
import { getGraphemeSegmenter, resetGraphemeSegmenter } from './intl';

beforeEach(() => resetGraphemeSegmenter());

describe('getGraphemeSegmenter', () => {
	it('returns an Intl.Segmenter', () => {
		expect(getGraphemeSegmenter()).toBeInstanceOf(Intl.Segmenter);
	});

	it('returns the same instance (cached)', () => {
		expect(getGraphemeSegmenter()).toBe(getGraphemeSegmenter());
	});

	it('segments ASCII into individual characters', () => {
		const segs = [...getGraphemeSegmenter().segment('hello')];
		expect(segs).toHaveLength(5);
		expect(segs.map((s) => s.segment).join('')).toBe('hello');
	});

	it('treats ZWJ emoji as one grapheme cluster', () => {
		const family = '👨\u200d👩\u200d👧\u200d👦';
		const segs = [...getGraphemeSegmenter().segment(family)];
		expect(segs).toHaveLength(1);
	});
});
