# MongoDB接続エラーの解決方法

## 問題の原因
MongoDB Atlas（クラウド版）への接続設定がされているが、接続に失敗している。

## 解決手順

### 1. 実装した修正内容

#### mongodb.ts の改善
- Global型定義を追加してTypeScriptエラーを解消
- 接続成功/失敗時のログ出力を追加
- エラーハンドリングの改善

#### route.ts の改善  
- エラーの詳細をコンソールに出力
- より具体的なエラーメッセージをレスポンスに含める

### 2. 確認事項

MongoDB Atlasの設定を確認:
1. **接続文字列の確認**
   - `.env.local`に正しいMONGODB_URIが設定されている
   - パスワードとクラスター名が正しい

2. **IPホワイトリストの確認**
   - MongoDB Atlasのダッシュボードで、Network Accessセクションを確認
   - 現在のIPアドレスがホワイトリストに追加されているか確認
   - 開発環境の場合は「0.0.0.0/0」（すべてのIPを許可）も可能

3. **データベースユーザーの確認**
   - Database Accessセクションでユーザー権限を確認
   - readWriteAnyDatabase権限があることを確認

### 3. テスト方法

```bash
# 開発サーバーを再起動
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスし、投稿の取得・作成が正常に動作することを確認。

### 4. 追加のデバッグ情報

コンソールに以下のようなログが表示されるようになります:
- 接続成功時: `MongoDB connected successfully`
- 接続失敗時: `MongoDB connection error: [エラーの詳細]`
- APIエラー時: `Error in GET /api/posts: [エラーの詳細]`

これらのログを確認して、具体的なエラー内容を特定できます。