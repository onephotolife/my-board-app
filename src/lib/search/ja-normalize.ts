// ==== [SEARCH] Japanese normalization utilities (STRICT120 final v3) ====
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
let wanakana: any = null;
try {
  // ネットワーク制限下では存在しない可能性を考慮

  wanakana = require('wanakana');
} catch {
  /* noop */
}

/** NFKC + スペース統一 + 長音統一 + trim + lowercase */
export function normalizeJa(s: string): string {
  return (s ?? '')
    .normalize('NFKC')
    .replace(/[ \u3000]+/g, ' ')
    .replace(/[ｰ—―−‐]/g, 'ー')
    .trim()
    .toLowerCase();
}

/** カタカナ→ひらがな（オフラインフォールバック） */
export function kataToHiraOffline(input: string): string {
  let out = '';
  for (const ch of normalizeJa(input)) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x30a1 && code <= 0x30f6) out += String.fromCodePoint(code - 0x60);
    else out += ch;
  }
  return out;
}

/** ひらがな化の安全ラッパー（wanakana があれば使用） */
export function toHiraganaSafe(s: string): string {
  const n = normalizeJa(s);
  if (wanakana?.toHiragana) {
    try {
      return wanakana.toHiragana(n);
    } catch {
      return kataToHiraOffline(n);
    }
  }
  return kataToHiraOffline(n);
}

/** 表示名→読み（ひらがな） */
export function toYomi(s: string): string {
  return toHiraganaSafe(s);
}

/** 先頭 prefix を 1..max 文字で生成（重複排除） */
export function buildPrefixes(s: string, max = 20): string[] {
  const n = normalizeJa(s);
  const lim = Math.min(max, n.length);
  const out: string[] = [];
  for (let i = 1; i <= lim; i++) out.push(n.slice(0, i));
  return Array.from(new Set(out));
}

/** n-gram（min..max、既定2..3）生成（重複排除） */
export function buildNgrams(s: string, min = 2, max = 3): string[] {
  const n = normalizeJa(s);
  const grams: string[] = [];
  for (let k = min; k <= max; k++) {
    for (let i = 0; i + k <= n.length; i++) grams.push(n.slice(i, i + k));
  }
  return Array.from(new Set(grams));
}
