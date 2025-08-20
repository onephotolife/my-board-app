# 📱 モバイルメニューz-index 手動検証チェックリスト

## 🔧 テスト準備

### 1. 開発サーバー起動
```bash
npm run dev
```
→ http://localhost:3000 でアクセス可能

### 2. テストアカウント
- Email: test@example.com
- Password: Test123!@#

### 3. 検証スクリプトのロード
1. ブラウザで http://localhost:3000 を開く
2. 開発者ツール（F12）を開く
3. Consoleタブで以下を実行：

```javascript
// テストスクリプトをロード
const script = document.createElement('script');
script.src = '/tests/manual-validation.js';
document.head.appendChild(script);

// ロード後、以下のコマンドが使用可能：
// - zIndexTests.runAll()    : 全テスト実行
// - zIndexTests.validate()  : z-index検証のみ
```

## ✅ Phase 2.1: デスクトップブラウザ検証

### Chrome (Windows/Mac)
- [ ] トップページアクセス
- [ ] ログイン実行
- [ ] モバイルビュー切り替え（F12 → Toggle device toolbar）
- [ ] iPhone 12 Pro (390x844) 選択
- [ ] ハンバーガーメニューをクリック
- [ ] **検証項目：**
  - [ ] メニューが画面最上部から表示
  - [ ] 背景コンテンツの上に表示
  - [ ] z-index: 2147483647 確認（Console: `zIndexTests.validate()`）
  - [ ] スクロールロック動作
  - [ ] ×ボタンで閉じる
  - [ ] 背景タップで閉じる

### Safari (Mac)
- [ ] 同上の手順を実施
- [ ] Safari特有の問題がないか確認
- [ ] Responsive Design Mode使用

### Firefox
- [ ] 同上の手順を実施
- [ ] Firefox Developer Toolsで検証

### Edge
- [ ] 同上の手順を実施
- [ ] Edge DevToolsで検証

## 📱 Phase 2.2: 実機モバイル検証

### iOS (iPhone実機)
1. **準備**
   - [ ] iPhoneをPCと同じネットワークに接続
   - [ ] PCのIPアドレス確認: `ifconfig | grep inet`
   - [ ] iPhone Safariで `http://[PC-IP]:3000` アクセス

2. **テスト実施**
   - [ ] ログイン
   - [ ] ハンバーガーメニュータップ
   - [ ] **検証ポイント：**
     - [ ] メニューが全画面表示
     - [ ] 「会員専用機能」の上に表示
     - [ ] スムーズなアニメーション
     - [ ] タッチ操作の反応性
     - [ ] Safe Area対応

3. **各ページで確認**
   - [ ] トップページ: `/`
   - [ ] 掲示板ページ: `/board`
   - [ ] プロフィール: `/profile`

### Android (実機)
1. **準備**
   - [ ] Android Chrome開発者モード有効化
   - [ ] chrome://inspect でリモートデバッグ

2. **テスト実施**
   - [ ] 同上のiOSテスト項目を実施
   - [ ] Android特有の戻るボタン動作確認

## 🔍 Phase 2.3: エッジケーステスト

### 極小画面（320x568）
```javascript
// Chrome DevToolsで実行
window.resizeTo(320, 568);
// メニューテスト実施
zIndexTests.validate();
```
- [ ] レイアウト崩れなし
- [ ] メニュー正常表示

### 横向き表示
- [ ] デバイスを横向きに回転
- [ ] メニューが適切に表示
- [ ] コンテンツが隠れない

### 低速ネットワーク
- [ ] Chrome DevTools → Network → Slow 3G
- [ ] メニュー動作に遅延なし
- [ ] アニメーション維持

### 連続操作
```javascript
// 高速連続タップテスト
for(let i = 0; i < 10; i++) {
  setTimeout(() => {
    document.querySelector('[aria-label="menu"]').click();
  }, i * 100);
}
```
- [ ] エラーなし
- [ ] メモリリークなし

## 📊 Phase 2.4: パフォーマンス測定

### Lighthouse実行
1. Chrome DevTools → Lighthouse
2. Mobile設定で実行
3. 記録：
   - [ ] Performance: ___/100 (目標: ≥90)
   - [ ] Accessibility: ___/100 (目標: 100)
   - [ ] Best Practices: ___/100 (目標: 100)
   - [ ] SEO: ___/100 (目標: 100)

### メモリプロファイル
```javascript
// Consoleで実行
await zIndexTests.memory();
```
- [ ] メモリリーク: 0KB (10回操作後)
- [ ] 増加量: < 100KB

### アニメーションFPS
```javascript
// Consoleで実行
await zIndexTests.performance();
```
- [ ] 平均応答時間: < 16ms
- [ ] FPS: ≥ 60

## 🐛 Phase 2.5: 発見した問題の記録

### 問題テンプレート
```markdown
### 問題ID: BUG-001
**優先度**: P0/P1/P2/P3
**デバイス**: [デバイス名/ブラウザ]
**再現手順**:
1. 
2. 
**期待動作**: 
**実際の動作**: 
**スクリーンショット**: 
**修正案**: 
```

### 発見した問題リスト
1. [ ] 問題なし ✅
2. [ ] 問題あり → 以下に記載：

---

## 📈 最終スコア集計

### 機能テスト
- デスクトップブラウザ: ___/4 ✅
- モバイル実機: ___/2 ✅
- エッジケース: ___/4 ✅

### パフォーマンス
- Lighthouse: ___/100
- メモリ: Pass/Fail
- FPS: ___fps

### 総合判定
```
✅ PASS: すべてのテスト合格（エラー0）
❌ FAIL: 修正が必要（エラー: ___件）
```

## 🎯 サインオフ

### テスト実施者
- 名前: _______________
- 日時: _______________
- 署名: _______________

### 承認者
- QA承認: □ 承認 / □ 却下
- Dev承認: □ 承認 / □ 却下
- PM承認: □ 承認 / □ 却下

---

## 📝 補足: トラブルシューティング

### メニューが表示されない場合
1. キャッシュクリア: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)
2. シークレットモードで再テスト
3. `localStorage.clear()` 実行

### z-indexが正しくない場合
```javascript
// 手動で確認
const menu = document.querySelector('[data-mobile-menu-portal]');
console.log('z-index:', getComputedStyle(menu).zIndex);
// 期待値: "2147483647"
```

### テストスクリプトが動かない場合
```javascript
// 直接貼り付け
fetch('/tests/manual-validation.js')
  .then(r => r.text())
  .then(code => eval(code));
```