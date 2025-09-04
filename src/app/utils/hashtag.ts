// Unicode対応ハッシュタグユーティリティ
// - 抽出: #に続く日本語・英数字・下線・結合文字・絵文字（ZWJ連結含む）
// - 正規化: NFKC + 異体字/VS除去 + ASCII小文字化 + #/空白除去 + トリム

export const HASHTAG_REGEX =
  /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;

const VARIATION_SELECTOR_REGEX = /\uFE0E|\uFE0F/gu; // 異体字セレクタ

export function normalizeTag(raw: string): string {
  if (!raw) return '';
  let s = raw.normalize('NFKC');
  s = s.replace(VARIATION_SELECTOR_REGEX, '');
  s = s.replace(/^#+/, '');
  s = s.trim();
  // ASCII小文字化（多言語はそのまま）
  s = s.replace(/[A-Z]/g, (c) => c.toLowerCase());
  // 長さ制約
  if (s.length < 1 || s.length > 64) return '';
  return s;
}

export function extractHashtags(text: string): { display: string; key: string }[] {
  if (!text) return [];
  const set = new Map<string, string>();
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const display = match[1];
    const key = normalizeTag(display);
    if (key) {
      if (!set.has(key)) set.set(key, display);
    }
  }
  return Array.from(set.entries()).map(([key, display]) => ({ key, display }));
}

export function linkifyHashtags(
  text: string,
  toHref: (tagKey: string) => string = (k) => `/tags/${encodeURIComponent(k)}`
): Array<string | { type: 'link'; text: string; href: string }> {
  if (!text) return [];
  const result: Array<string | { type: 'link'; text: string; href: string }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > lastIndex) result.push(text.slice(lastIndex, start));
    const display = match[0]; // 例: "#東京"
    const key = normalizeTag(match[1]);
    if (key) {
      result.push({ type: 'link', text: display, href: toHref(key) });
    } else {
      result.push(display);
    }
    lastIndex = end;
  }
  if (lastIndex < text.length) result.push(text.slice(lastIndex));
  return result;
}
