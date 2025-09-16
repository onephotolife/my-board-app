// ==== [API] audit & hashing utils (STRICT120) ====
import crypto from 'crypto';

import type { NextRequest } from 'next/server';

const SALT = process.env.SEARCH_LOG_SALT || '';

export function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function qHash(normalizedQ: string) {
  return sha256(normalizedQ + SALT);
}

export function ipFrom(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return '0.0.0.0';
}

export function ipHash(ip: string) {
  return sha256(ip + SALT);
}

type AuditEvent =
  | 'USER_SUGGEST'
  | 'USER_SEARCH'
  | 'USER_RECOMMENDATIONS'
  | 'USER_SEARCH_HISTORY_GET'
  | 'USER_SEARCH_HISTORY_POST'
  | 'USER_SEARCH_HISTORY_DELETE';

export function audit(event: AuditEvent, payload: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...payload });
  console.warn(line);
}
