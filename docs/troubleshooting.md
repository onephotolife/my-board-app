# トラブルシューティングガイド

## 1. よくあるエラーと対処法

### 1.1 起動時のエラー

#### ❌ エラー: `Cannot find module 'xxx'`

**症状**:
```
Error: Cannot find module '@mui/material'
```

**原因**: 依存パッケージがインストールされていない

**解決方法**:
```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install

# 特定のパッケージのみ再インストール
npm install @mui/material
```

---

#### ❌ エラー: `Port 3000 is already in use`

**症状**:
```
⚠ Port 3000 is in use by process 12345
```

**原因**: ポート 3000 が他のプロセスで使用中

**解決方法**:
```bash
# 方法1: 使用中のプロセスを確認して停止
lsof -i :3000
kill -9 [PID]

# 方法2: 別のポートで起動
PORT=3001 npm run dev

# 方法3: すべての Next.js プロセスを停止
pkill -f "next dev"
```

---

#### ❌ エラー: `EACCES: permission denied`

**症状**:
```
Error: EACCES: permission denied, mkdir '/Users/xxx/.npm'
```

**原因**: npm の権限エラー

**解決方法**:
```bash
# npm のデフォルトディレクトリを変更
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# または sudo を使用（非推奨）
sudo npm install
```

### 1.2 MongoDB 接続エラー

#### ❌ エラー: `MongooseServerSelectionError`

**症状**:
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**原因**: MongoDB が起動していない、または接続できない

**解決方法**:
```bash
# ローカル MongoDB の場合
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB

# MongoDB Atlas の場合
# 1. IP ホワイトリストを確認（0.0.0.0/0 を追加）
# 2. ユーザー名とパスワードを確認
# 3. クラスターが起動しているか確認
```

---

#### ❌ エラー: `MongoNetworkError`

**症状**:
```
MongoNetworkError: failed to connect to server
```

**原因**: ネットワーク接続の問題

**解決方法**:
```bash
# DNS を確認
nslookup cluster0.ej6jq5c.mongodb.net

# ファイアウォール設定を確認
# MongoDB Atlas のポート 27017 が開いているか確認

# 接続文字列を確認
echo $MONGODB_URI

# 手動で接続テスト
mongosh "mongodb+srv://cluster0.ej6jq5c.mongodb.net/" --username [username]
```

---

#### ❌ エラー: `Authentication failed`

**症状**:
```
MongoServerError: Authentication failed
```

**原因**: 認証情報が間違っている

**解決方法**:
1. MongoDB Atlas でユーザー名とパスワードを確認
2. パスワードに特殊文字が含まれる場合は URL エンコード
3. `.env.local` の接続文字列を更新

```bash
# パスワードの URL エンコード例
# パスワード: p@ssw0rd!
# エンコード後: p%40ssw0rd%21

MONGODB_URI=mongodb+srv://user:p%40ssw0rd%21@cluster.mongodb.net/board-app
```

### 1.3 ビルドエラー

#### ❌ エラー: `Type error: Cannot find name 'xxx'`

**症状**:
```
Type error: Cannot find name 'Post'
```

**原因**: TypeScript の型定義エラー

**解決方法**:
```bash
# TypeScript の型チェック
npm run type-check

# tsconfig.json の確認
# "include" に必要なファイルが含まれているか確認

# 型定義ファイルの再生成
rm -rf .next
npm run build
```

---

#### ❌ エラー: `ESLint errors`

**症状**:
```
Failed to compile.
./src/app/page.tsx
Error: 'error' is defined but never used
```

**原因**: ESLint ルール違反

**解決方法**:
```bash
# ESLint エラーを確認
npm run lint

# 自動修正
npm run lint -- --fix

# 特定のルールを無効化（.eslintrc.json）
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn"
  }
}
```

### 1.4 実行時エラー

#### ❌ エラー: `Hydration failed`

**症状**:
```
Error: Hydration failed because the initial UI does not match what was rendered on the server
```

**原因**: サーバーとクライアントの HTML が一致しない

**解決方法**:
1. `useEffect` 内でのみクライアント側の処理を実行
2. `suppressHydrationWarning` を使用（一時的な対処）
3. 動的インポートを使用

```typescript
// 動的インポートの例
const DynamicComponent = dynamic(
  () => import('../components/Component'),
  { ssr: false }
);
```

---

#### ❌ エラー: `Failed to fetch`

**症状**:
```
TypeError: Failed to fetch
```

**原因**: API エンドポイントへの接続失敗

**解決方法**:
```javascript
// CORS エラーの確認
// API ルートで CORS ヘッダーを設定
export async function GET(request: Request) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ネットワークタブで確認
// Chrome DevTools > Network タブでリクエストを確認
```

## 2. デバッグ方法

### 2.1 Chrome DevTools

#### Console タブ
```javascript
// デバッグ用のログ出力
console.log('データ:', data);
console.error('エラー:', error);
console.table(posts); // テーブル形式で表示
console.time('API呼び出し'); // 処理時間計測
console.timeEnd('API呼び出し');
```

#### Network タブ
- API リクエスト/レスポンスの確認
- ステータスコードの確認
- レスポンス時間の確認
- ペイロードの確認

#### React Developer Tools
```bash
# Chrome 拡張機能をインストール
# React Developer Tools
```

### 2.2 VS Code デバッグ

`.vscode/launch.json` を作成：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    },
    {
      "name": "Next.js: attach",
      "type": "node",
      "request": "attach",
      "port": 9229
    }
  ]
}
```

### 2.3 サーバーサイドログ

```typescript
// API ルートでのログ
export async function POST(request: Request) {
  console.log('=== API呼び出し開始 ===');
  console.log('時刻:', new Date().toISOString());
  console.log('メソッド:', request.method);
  console.log('URL:', request.url);
  
  try {
    const body = await request.json();
    console.log('リクエストボディ:', body);
    
    // 処理...
    
    console.log('=== API呼び出し成功 ===');
    return Response.json({ success: true });
  } catch (error) {
    console.error('=== API呼び出しエラー ===');
    console.error(error);
    return Response.json({ success: false });
  }
}
```

### 2.4 MongoDB デバッグ

```javascript
// Mongoose デバッグモード
mongoose.set('debug', true);

// クエリログの確認
Post.find({}).explain('executionStats');

// MongoDB Compass でクエリ分析
// 1. Compass を開く
// 2. Performance タブを確認
// 3. Slow Queries を確認
```

## 3. パフォーマンス問題

### 3.1 ページ読み込みが遅い

**確認項目**:
1. Chrome DevTools > Lighthouse でパフォーマンス測定
2. Network タブで遅いリクエストを特定
3. Coverage タブで未使用コードを確認

**改善方法**:
```javascript
// 画像の最適化
import Image from 'next/image';

// 動的インポート
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
});

// React.memo でメモ化
const MemoizedComponent = React.memo(Component);
```

### 3.2 API レスポンスが遅い

**確認項目**:
```bash
# API の応答時間を測定
time curl http://localhost:3000/api/posts

# MongoDB のクエリ実行時間を確認
db.posts.find().explain("executionStats")
```

**改善方法**:
```javascript
// インデックスの追加
await Post.createIndex({ createdAt: -1 });

// ページネーション
const posts = await Post.find()
  .sort({ createdAt: -1 })
  .limit(20)
  .skip((page - 1) * 20);

// キャッシュの実装
const cached = cache.get('posts');
if (cached) return cached;
```

## 4. 環境別の問題

### 4.1 開発環境特有の問題

#### Fast Refresh が動作しない
```bash
# .next フォルダを削除
rm -rf .next
npm run dev

# Node.js のバージョンを確認
node -v  # 18.18.0 以上が必要
```

### 4.2 本番環境特有の問題

#### 環境変数が読み込まれない
```bash
# Vercel の場合
vercel env pull

# 手動で確認
echo $MONGODB_URI

# .env.production を作成
cp .env.local .env.production
```

## 5. よくある質問（FAQ）

### Q1: 投稿が保存されない

**A**: 以下を確認してください：
1. MongoDB が起動しているか
2. 環境変数 MONGODB_URI が正しく設定されているか
3. ネットワーク接続が正常か
4. コンソールにエラーが出ていないか

### Q2: 日本語が文字化けする

**A**: 
1. ファイルエンコーディングが UTF-8 か確認
2. Content-Type ヘッダーが正しいか確認
3. データベースの文字コードを確認

### Q3: CSS が適用されない

**A**:
1. Tailwind CSS の設定を確認
2. globals.css がインポートされているか確認
3. className が正しく記述されているか確認

### Q4: TypeScript エラーが大量に出る

**A**:
```bash
# TypeScript のバージョンを確認
npx tsc --version

# 型定義ファイルを再インストール
npm install --save-dev @types/react @types/node

# tsconfig.json をリセット
npx tsc --init
```

## 6. ログファイルの場所

| ログ種別 | ファイルパス | 説明 |
|---------|------------|-----|
| 開発サーバー | `logs/dev.log` | npm run dev のログ |
| ビルドログ | `logs/build.log` | npm run build のログ |
| MongoDB | `/usr/local/var/log/mongodb/mongo.log` | MongoDB のログ |
| npm | `~/.npm/_logs/` | npm のエラーログ |

## 7. 緊急時の対処

### 7.1 すべてをリセット

```bash
# プロジェクトを完全にクリーンアップ
rm -rf node_modules
rm -rf .next
rm -rf logs
rm package-lock.json
npm cache clean --force
npm install
npm run dev
```

### 7.2 データベースのリセット

```bash
# MongoDB Compass または mongosh で実行
use board-app
db.posts.deleteMany({})

# または完全にデータベースを削除
db.dropDatabase()
```

## 8. サポート情報

### 公式ドキュメント
- [Next.js](https://nextjs.org/docs)
- [MongoDB](https://docs.mongodb.com/)
- [Mongoose](https://mongoosejs.com/docs/)
- [Material-UI](https://mui.com/material-ui/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### コミュニティ
- Stack Overflow
- GitHub Issues
- Discord (Next.js, MongoDB)

### デバッグツール
- [Next.js DevTools](https://github.com/vercel/next.js/tree/canary/packages/next)
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [Postman](https://www.postman.com/)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)