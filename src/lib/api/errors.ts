// ==== [API] errors & responses (STRICT120) ====
import crypto from 'crypto';

import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SUGGEST_ERROR'
  | 'SEARCH_ERROR'
  | 'RECOMMEND_ERROR'
  | 'HISTORY_GET_ERROR'
  | 'HISTORY_POST_ERROR'
  | 'HISTORY_DELETE_ERROR'
  | 'INTERNAL_ERROR';

export function nanoIdLike(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function errorJson(
  message: string,
  status: number,
  code: ApiErrorCode,
  errorId?: string,
  extraHeaders?: Record<string, string>
) {
  return new NextResponse(
    JSON.stringify({ ok: false, error: { message, code, errorId: errorId || nanoIdLike() } }),
    {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        ...(extraHeaders || {}),
      },
    }
  );
}

export function okJson<T>(data: T, status = 200, extraHeaders?: Record<string, string>) {
  return new NextResponse(JSON.stringify({ ok: true, ...(data as unknown as object) }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  });
}
