# UIテスト実行ガイド

## ブラウザコンソールでのUIテスト実行手順

### 1. 準備
1. 開発サーバーが起動していることを確認
   ```bash
   npm run dev
   ```

2. ブラウザで以下のURLを開く
   ```
   http://localhost:3000/board
   ```

### 2. 開発者ツールを開く
- **Windows/Linux**: `F12` または `Ctrl + Shift + I`
- **Mac**: `Cmd + Option + I`

### 3. Consoleタブを選択

### 4. テストスクリプトを実行

以下のコマンドをコンソールに貼り付けて実行：

```javascript
// テストスクリプトファイルの読み込みと実行
fetch('/scripts/comprehensive-ui-test.js')
  .then(response => response.text())
  .then(script => eval(script))
  .catch(error => console.error('スクリプト読み込みエラー:', error));
```

または、`scripts/comprehensive-ui-test.js`の内容を直接コピー＆ペーストして実行することもできます。

### 5. テスト結果の確認

テストが完了すると、以下の情報が表示されます：

- ✅ 成功項目（緑色）
- ❌ 失敗項目（赤色）
- ⚠️ 警告項目（橙色）
- 📊 統計情報とサマリー

### 6. 詳細結果の取得

テスト完了後、以下のコマンドで詳細な結果を確認できます：

```javascript
// 詳細結果の表示
console.log(window.comprehensiveTestResults);

// JSON形式でコピー
copy(JSON.stringify(window.comprehensiveTestResults, null, 2));
```

## 期待される結果

### 未認証状態（ゲスト）
- 編集・削除ボタンがすべて無効
- 権限情報は「guest」ロール
- 読み取り専用アクセス

### 認証済み状態
- 自分の投稿：編集・削除ボタンが有効
- 他人の投稿：編集・削除ボタンが無効（Tooltipあり）
- 権限情報に適切なロールと権限リスト

## トラブルシューティング

| 問題 | 解決方法 |
|------|----------|
| スクリプトが読み込めない | ファイルパスを確認、またはコンテンツを直接貼り付け |
| テストが途中で止まる | ネットワークタブでAPIエラーを確認 |
| 結果が表示されない | `window.comprehensiveTestResults`を確認 |

## 手動確認チェックリスト

- [ ] ログインしていない状態でボタンが無効か
- [ ] ログイン後、自分の投稿の編集ボタンが有効か
- [ ] 他人の投稿にマウスオーバーするとTooltipが表示されるか
- [ ] 削除ボタンクリックで確認ダイアログが表示されるか
- [ ] API応答時間が200ms以内か