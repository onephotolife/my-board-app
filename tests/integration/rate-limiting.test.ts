import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiting Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    
    // レート制限設定
    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1分
      max: 10, // 最大10リクエスト
      message: { error: 'リクエスト数が多すぎます' },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use('/api/', limiter);
    app.get('/api/test', (req, res) => res.json({ success: true }));
  });

  it('制限内での正常動作', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('制限超過時の429エラー', async () => {
    // 10リクエスト送信
    for (let i = 0; i < 10; i++) {
      await request(app).get('/api/test');
    }
    
    // 11個目はブロック
    const res = await request(app).get('/api/test');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('リクエスト数が多すぎます');
  });

  it('IPごとの制限管理', async () => {
    const res1 = await request(app)
      .get('/api/test')
      .set('X-Forwarded-For', '192.168.1.1');
    
    const res2 = await request(app)
      .get('/api/test')
      .set('X-Forwarded-For', '192.168.1.2');
    
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it('認証ユーザーの制限緩和', async () => {
    const authLimiter = rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 50, // 認証ユーザーは50リクエスト
      skip: (req) => !req.headers.authorization
    });

    const authApp = express();
    authApp.use('/api/', authLimiter);
    authApp.get('/api/test', (req, res) => res.json({ success: true }));

    for (let i = 0; i < 20; i++) {
      const res = await request(authApp)
        .get('/api/test')
        .set('Authorization', 'Bearer token');
      expect(res.status).toBe(200);
    }
  });
});
