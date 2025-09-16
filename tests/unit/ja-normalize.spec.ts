import { buildNgrams, buildPrefixes, normalizeJa, toYomi } from '../../src/lib/search/ja-normalize';

describe('ja-normalize utilities', () => {
  test('normalizeJa performs NFKC, spacing, long sound, trimming, lowercase', () => {
    expect(normalizeJa(' ＡＢ ｰＣ ')).toBe('ab ーc');
  });

  test('toYomi converts katakana to hiragana safely', () => {
    expect(toYomi('アイウ')).toBe('あいう');
  });

  test('buildPrefixes generates incremental prefixes up to max length', () => {
    expect(buildPrefixes('やまだ', 5)).toEqual(['や', 'やま', 'やまだ']);
  });

  test('buildNgrams generates unique 2-gram and 3-gram tokens', () => {
    const grams = buildNgrams('やまだ', 2, 3);
    expect(grams).toEqual(expect.arrayContaining(['やま', 'まだ', 'やまだ']));
  });
});
