'use client';

type Mark = 'suggest:fetch' | 'search:fetch';

const ENABLE =
  String(process.env.NEXT_PUBLIC_UX_METRICS_ENABLE || process.env.UX_METRICS_ENABLE || '1') === '1';
const BEACON = process.env.NEXT_PUBLIC_UX_METRICS_BEACON || process.env.UX_METRICS_BEACON || '';

export function mark(name: Mark) {
  if (!ENABLE || typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return;
  }
  performance.mark(name);
}

export function measure(name: Mark) {
  if (!ENABLE || typeof performance === 'undefined' || typeof performance.measure !== 'function') {
    return null;
  }
  try {
    const entry = performance.measure(`${name}:dur`, { start: name });
    return entry.duration;
  } catch {
    return null;
  }
}

export function report(data: Record<string, unknown>) {
  if (!ENABLE) {
    return;
  }

  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const canBeacon = typeof navigator.sendBeacon === 'function' && BEACON;

  if (!canBeacon) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.table(data);
    }
    return;
  }

  try {
    const payload = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon(BEACON, payload);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ux/metrics] beacon failed', error);
      // eslint-disable-next-line no-console
      console.table(data);
    }
  }
}
