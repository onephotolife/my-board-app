/**
 * 完全なfetchモック実装
 * Response interfaceの全メソッドを実装
 */

class MockHeaders implements Headers {
  private headers: Map<string, string> = new Map();

  append(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  delete(name: string): void {
    this.headers.delete(name.toLowerCase());
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  forEach(callbackfn: (value: string, key: string, parent: Headers) => void): void {
    this.headers.forEach((value, key) => callbackfn(value, key, this));
  }

  *[Symbol.iterator](): IterableIterator<[string, string]> {
    yield* this.headers.entries();
  }

  *entries(): IterableIterator<[string, string]> {
    yield* this.headers.entries();
  }

  *keys(): IterableIterator<string> {
    yield* this.headers.keys();
  }

  *values(): IterableIterator<string> {
    yield* this.headers.values();
  }
}

class MockResponse implements Response {
  readonly body: ReadableStream<Uint8Array> | null = null;
  readonly bodyUsed: boolean = false;
  readonly headers: Headers;
  readonly ok: boolean;
  readonly redirected: boolean = false;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType = 'basic';
  readonly url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _body: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(body: any, init: ResponseInit = {}) {
    this._body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new MockHeaders();
    this.url = '';

    // デフォルトヘッダー設定
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          this.headers.set(key, value);
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          this.headers.set(key, value);
        });
      } else {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key, value as string);
        });
      }
    }

    // Content-Type設定
    if (!this.headers.has('content-type')) {
      this.headers.set('content-type', 'application/json');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async json(): Promise<any> {
    return Promise.resolve(this._body);
  }

  async text(): Promise<string> {
    if (typeof this._body === 'string') {
      return Promise.resolve(this._body);
    }
    return Promise.resolve(JSON.stringify(this._body));
  }

  async blob(): Promise<Blob> {
    const text = await this.text();
    return Promise.resolve(new Blob([text], { type: 'application/json' }));
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const text = await this.text();
    const encoder = new TextEncoder();
    return Promise.resolve(encoder.encode(text).buffer);
  }

  async formData(): Promise<FormData> {
    return Promise.reject(new Error('FormData not implemented in mock'));
  }

  clone(): Response {
    return new MockResponse(this._body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    });
  }
}

/**
 * グローバルfetchモック
 */
export const mockFetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
  // 通知API
  if (url.includes('/api/notifications')) {
    if (options?.method === 'POST') {
      // 既読処理
      return Promise.resolve(new MockResponse({
        success: true,
        data: {
          unreadCount: 0,
          updatedIds: []
        }
      }));
    } else {
      // 通知取得
      return Promise.resolve(new MockResponse({
        success: true,
        data: {
          notifications: [
            {
              _id: 'test-notification-1',
              type: 'like',
              message: 'テストユーザーがあなたの投稿にいいねしました',
              actor: {
                id: 'test-actor-1',
                name: 'テストユーザー',
                avatar: null
              },
              isRead: false,
              createdAt: new Date().toISOString()
            }
          ],
          unreadCount: 1,
          pagination: {
            hasMore: false,
            total: 1
          }
        }
      }));
    }
  }

  // セッションAPI
  if (url.includes('/api/auth/session')) {
    return Promise.resolve(new MockResponse({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      },
      expires: new Date(Date.now() + 86400000).toISOString()
    }));
  }

  // デフォルトレスポンス
  return Promise.resolve(new MockResponse({
    error: 'Not Found'
  }, {
    status: 404,
    statusText: 'Not Found'
  }));
});

// グローバルfetchを置換
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = mockFetch as any;

export default mockFetch;
export { MockResponse };