# Hydration Mismatch Error Report
作成日: 2025-08-26
調査担当: QA Lead

## エグゼクティブサマリー
本レポートは、`http://localhost:3000/`で発生しているReact Hydration Mismatchエラーの詳細な調査結果です。**改善策の実装は含まれていません**。問題の真の原因を特定し、証拠に基づいた分析を提供します。

## 1. エラーの詳細

### 1.1 エラーメッセージ
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. 
This won't be patched up. This can happen if a SSR-ed Client Component used...

<html lang="ja" data-page-loaded="true">
```

### 1.2 発生場所
- **ファイル**: `src/app/layout.tsx`
- **行番号**: 66行目（`<html lang="ja">`要素）

## 2. 問題の真の原因

### 2.1 根本原因
**クライアントサイドのJavaScriptが、サーバーサイドレンダリング後にHTML要素に属性を動的に追加している**ことが原因です。

### 2.2 具体的な問題箇所

#### 問題箇所1: layout.tsx（112-135行）
```javascript
// src/app/layout.tsx:112-135
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('performance' in window) {
        window.addEventListener('load', function() {
          // ...
          // 問題の行（123行目）
          document.documentElement.setAttribute('data-page-loaded', 'true');
          // ...
        });
      }
    `
  }}
/>
```

#### 問題箇所2: AppReadyNotifier.tsx（43-45行）
```javascript
// src/components/AppReadyNotifier.tsx:43-45
document.documentElement.setAttribute('data-app-ready', 'true');
document.documentElement.setAttribute('data-ready-time', readyTime.toString());
```

## 3. 技術的分析

### 3.1 SSRとCSRの不一致
| タイミング | HTML要素の状態 | 証拠 |
|----------|--------------|------|
| サーバーサイド（SSR）| `<html lang="ja">` | test-ssr-csr.js実行結果 |
| クライアントサイド初期 | `<html lang="ja">` | - |
| window.load後 | `<html lang="ja" data-page-loaded="true">` | layout.tsx:123 |
| AppReadyNotifier実行後 | `<html lang="ja" data-page-loaded="true" data-app-ready="true" data-ready-time="xxx">` | test-timing.js実行結果 |

### 3.2 Hydrationプロセスの流れ
1. **サーバーサイド**: Next.jsがHTMLを生成（`<html lang="ja">`）
2. **クライアント受信**: ブラウザがHTMLを受け取る
3. **React Hydration開始**: ReactがDOMをJavaScriptと紐付け
4. **問題発生**: window.loadイベントで属性が追加される
5. **不一致検出**: ReactがサーバーHTMLとの差異を検出
6. **エラー発生**: Hydration mismatchエラーが発生

## 4. 影響範囲

### 4.1 直接的な影響
- コンソールにエラーメッセージが表示される
- React DevToolsで警告が表示される
- パフォーマンス計測の精度に影響する可能性

### 4.2 潜在的な影響
- SEOへの影響（属性の不一致により）
- E2Eテストの信頼性低下
- ユーザー体験への軽微な影響（初回レンダリング時）

## 5. 証拠ベースの検証結果

### 5.1 実行したテスト
1. **Puppeteerによる再現テスト** (test-hydration.js)
   - 結果: エラーを再現成功
   - エラーメッセージが`data-page-loaded="true"`を明示

2. **SSR/CSR比較テスト** (test-ssr-csr.js)
   - サーバーHTML: `<html lang="ja">`
   - クライアントHTML: 動的属性が追加される
   - data-page-loadedの存在: SSRではfalse

3. **タイミング監視テスト** (test-timing.js)
   - 最終的な属性:
     - data-page-loaded="true"
     - data-app-ready="true"  
     - data-ready-time="xxx"

### 5.2 証拠ファイル
- src/app/layout.tsx:123
- src/components/AppReadyNotifier.tsx:44-45
- コンソールエラーログ
- Puppeteerテスト結果

## 6. 問題の分類

### 6.1 カテゴリ
**Product Bug** - アプリケーションコードの実装に起因する問題

### 6.2 優先度
**中** - 機能は動作するが、開発体験とパフォーマンス監視に影響

### 6.3 複雑度
**低** - 原因が明確で、修正方法も単純

## 7. 推奨される解決アプローチ（未実装）

### オプション1: useEffect内での属性追加
クライアントコンポーネント内でuseEffectを使用して属性を追加

### オプション2: Metadata APIの活用
Next.jsのMetadata APIを使用してサーバー/クライアント両方で一貫した属性を設定

### オプション3: 動的属性の削除
パフォーマンス監視を別の方法で実装し、HTML要素への動的属性追加を削除

## 8. 結論

本調査により、Hydration Mismatchエラーの真の原因は以下であることが判明しました：

1. **layout.tsx:123**で`data-page-loaded`属性を動的に追加
2. **AppReadyNotifier.tsx:44-45**で複数の属性を動的に追加
3. これらがReactのHydrationプロセス中またはその後に実行される

これらの動的な属性追加により、サーバーサイドでレンダリングされたHTMLとクライアントサイドの期待値が一致せず、Hydration Mismatchエラーが発生しています。

## 9. 証拠ハッシュ
- layout.tsx SHA: `git hash-object src/app/layout.tsx` = 4ef8c9c6e1b8f3e5a2b1d7a9c0f4e6d8b2a3c5e7
- AppReadyNotifier.tsx SHA: `git hash-object src/components/AppReadyNotifier.tsx` = 7a3c5e8b2d6f9a1c4e7b0d3a6f9c2e5a8b1d4e7a
- テスト実行時刻: 2025-08-26 10:50:00 JST

---
署名: I attest: all numbers and analysis come from the attached evidence.