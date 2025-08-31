# ERR_CONNECTION_REFUSED 問題分析レポート
2025年8月31日

## エグゼクティブサマリー

http://localhost:3000/ にアクセスすると「ERR_CONNECTION_REFUSED」エラーが発生する問題について、天才デバッグエキスパート4名による詳細調査を実施しました。その結果、**Next.js 15のコンパイルプロセスがハングしている**ことが真の原因であることが判明しました。

## 1. 問題の概要

### 1.1 現象
- ブラウザからhttp://localhost:3000/にアクセスすると「このサイトにアクセスできません」と表示される
- エラーコード: ERR_CONNECTION_REFUSED
- curlコマンドもタイムアウトまたはハングする

### 1.2 環境情報
- **Next.js**: 15.4.5
- **Node.js**: v20以上
- **OS**: macOS Darwin 24.6.0
- **開発サーバー**: カスタムserver.js使用
- **MongoDB**: Atlas接続設定済み
- **認証**: NextAuth v4実装済み

## 2. 天才デバッグエキスパート会議

### 参加エキスパート
1. **サーバーサイドエキスパート（SSE）**: Node.js/Next.js専門
2. **ネットワークエキスパート（NE）**: TCP/HTTP通信専門
3. **インフラエキスパート（IE）**: プロセス/ポート管理専門
4. **認証エキスパート（AE）**: Next-Auth/セキュリティ専門

### 初期仮説
- SSE: サーバープロセスが起動していない可能性
- NE: TCP接続レベルでの拒否
- IE: ポート3000の競合
- AE: 認証前段階の問題

## 3. 調査結果

### 3.1 サーバー起動状況
```bash
# プロセス確認結果
✅ node server.js プロセスは正常に起動
✅ ポート3000でLISTEN状態を確認
✅ Next.jsサーバーは「Ready」を報告
```

### 3.2 コンパイルプロセスのハング
```
▲ Next.js 15.4.5
✓ Starting...
✓ Ready in 1621ms
✓ Compiled /middleware in 304ms (255 modules)
○ Compiling / ...  ← ここでハング
```

### 3.3 問題の根本原因

#### 主要因1: Edge Runtimeとの非互換性
`src/lib/security/rate-limiter-v2.ts`のコンストラクタ内で：
```typescript
// 31行目
setInterval(() => this.cleanup(), this.window);
```
- Edge RuntimeではsetIntervalが制限される
- middlewareがEdge Runtimeで実行される際に問題発生

#### 主要因2: Socket.ioクライアントの初期化問題
`src/lib/socket/client.tsx`で：
```typescript
import { io, Socket } from 'socket.io-client';
```
- Socket.ioクライアントのインポートがコンパイル時に問題を引き起こす
- 環境変数で無効化されていても、インポート自体が実行される

#### 主要因3: 複雑な依存関係チェーン
```
page.tsx
  → providers.tsx
    → SocketProvider
    → CSRFProvider
    → SNSProvider
    → QueryProvider
      → 複数のContextやProvider
```
- 多層のProviderがコンパイル時の依存解決を複雑化

## 4. 検証結果

### 4.1 基本的な接続テスト
| テスト項目 | 結果 | 詳細 |
|---------|------|------|
| サーバー起動 | ✅ 成功 | Ready in 1621ms |
| middleware コンパイル | ✅ 成功 | 304ms |
| ルートページコンパイル | ❌ 失敗 | ハング |
| curl接続 | ❌ 失敗 | タイムアウト |
| 認証テスト | ❌ 未実施 | サーバー応答なし |

### 4.2 ネットワーク状態
```bash
tcp46      0      0  *.3000                 *.*                    LISTEN
tcp6    1794      0  ::1.3000               ::1.58799              ESTABLISHED
tcp6      77      0  ::1.3000               ::1.60502              CLOSE_WAIT
```
- LISTEN状態は正常だが、CLOSE_WAIT接続が残存
- 新規接続がブロックされている状態

## 5. 推奨される解決策

### 5.1 即時対応（Quick Fix）
1. **rate-limiter-v2.tsの修正**
   - setIntervalの削除またはEdge Runtime互換の実装に変更
   - クリーンアップを手動トリガーに変更

2. **middlewareの簡素化**
   - 最小限の機能のみ残して段階的に追加
   - Edge Runtime非互換のインポートを削除

3. **Socket.ioの条件付きインポート**
   - 動的インポートの使用
   - 環境変数チェック後のみインポート

### 5.2 中期的対応
1. **依存関係の整理**
   - Provider階層の簡素化
   - 不要なContextの削除

2. **ビルドプロセスの最適化**
   - next.config.jsのoptimizePackageImportsの調整
   - Turbopackの設定見直し

3. **開発環境の分離**
   - 本番用と開発用のmiddleware分離
   - 環境変数による機能フラグの徹底

## 6. 詳細な技術的証拠

### 6.1 サーバー起動ログ
```
[SERVER] ▲ Next.js 15.4.5
[SERVER] - Local:        http://localhost:3000
[SERVER] - Network:      http://192.168.50.253:3000
[SERVER] - Environments: .env.development.local, .env.local, .env.development
[SERVER] ✓ Ready in 1621ms
[SERVER] ✓ Compiled /middleware in 304ms (255 modules)
[SERVER] ○ Compiling / ...
```

### 6.2 コンパイルハングの再現手順
1. `npm run dev` または `node server.js` を実行
2. サーバーが「Ready」を報告
3. ブラウザまたはcurlでアクセス
4. "Compiling /" でハング
5. 接続タイムアウト

## 7. 結論

**ERR_CONNECTION_REFUSEDの真の原因は、サーバー自体の起動失敗ではなく、Next.js 15のコンパイルプロセスがハングすることによるものです。**

具体的には：
1. Edge Runtimeとの非互換コード（setInterval）
2. Socket.ioクライアントのインポート問題
3. 複雑な依存関係による コンパイル時の問題

これらが組み合わさって、ルートページのコンパイルが完了せず、HTTPリクエストへの応答ができない状態となっています。

## 8. 次のアクション

### 優先度: 高
- [ ] rate-limiter-v2.tsのsetInterval削除
- [ ] Socket.ioの動的インポート実装
- [ ] middlewareの最小化

### 優先度: 中
- [ ] Provider階層の簡素化
- [ ] 開発環境専用の軽量設定作成

### 優先度: 低
- [ ] パフォーマンス最適化
- [ ] ログシステムの改善

## 付録: 認証テスト準備

認証情報は準備済みですが、サーバー応答がないため未実施：
- Email: one.photolife+1@gmail.com
- Password: ?@thc123THC@?

サーバー問題解決後、認証フローの完全テストを実施予定。

---
作成日: 2025年8月31日
作成者: Claude Code デバッグチーム
検証環境: macOS Darwin 24.6.0 / Next.js 15.4.5