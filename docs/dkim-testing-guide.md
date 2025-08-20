# DKIM設定テスト完全ガイド

## 概要
DKIM設定が正しく機能しているかを確認するための包括的なテスト手順です。

## テストフェーズ

### Phase 1: DNS設定の確認

#### 1.1 DNSレコードの反映確認
```bash
# 作成済みのスクリプトを使用
./scripts/check-dkim-dns.sh yourdomain.com mail

# または手動で確認
dig mail._domainkey.yourdomain.com TXT
dig mail._domainkey.yourdomain.com CNAME
```

**確認ポイント：**
- ✅ DKIMレコードが存在する
- ✅ `v=DKIM1`で始まる
- ✅ 公開鍵（`p=`パラメータ）が含まれる
- ✅ TTLに応じた伝播時間を待つ（通常1-48時間）

#### 1.2 オンラインDNSチェッカー
以下のツールで独立した確認：

1. **MXToolbox DKIM Check**
   - URL: https://mxtoolbox.com/dkim.aspx
   - ドメインとセレクタを入力
   - 公開鍵の有効性を確認

2. **DMARC Analyzer**
   - URL: https://www.dmarcanalyzer.com/dkim-check/
   - セレクタとドメインを入力
   - DKIMレコードの構文チェック

3. **Google Admin Toolbox**
   - URL: https://toolbox.googleapps.com/apps/checkmx/
   - ドメイン全体の設定を確認

### Phase 2: メール送信テスト

#### 2.1 テスト用メールアドレス

**自動検証サービス（推奨）:**

1. **Mail-Tester (最も詳細)**
   - URL: https://www.mail-tester.com/
   - 手順：
     1. サイトにアクセスし、一時的なメールアドレスを取得
     2. そのアドレスにテストメールを送信
     3. 「Then check your score」をクリック
   - 確認項目：
     - DKIM署名の有無
     - SPF認証結果
     - DMARC準拠性
     - スパムスコア

2. **DKIM Validator**
   - URL: https://dkimvalidator.com/
   - 専用アドレスにメール送信
   - DKIM署名の詳細な検証結果

3. **Port25 Authentication Checker**
   - メール送信先: check-auth@verifier.port25.com
   - 自動返信でDKIM/SPF/DMARC結果を受信

**主要メールプロバイダでのテスト:**

```markdown
Gmail: youraccount@gmail.com
Yahoo: youraccount@yahoo.com
Outlook: youraccount@outlook.com
```

#### 2.2 テストメールの送信方法

**SendGrid経由の場合:**
```bash
# SendGrid APIでテスト送信
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "test@mail-tester.com"}]
    }],
    "from": {"email": "test@yourdomain.com"},
    "subject": "DKIM Test Email",
    "content": [{
      "type": "text/plain",
      "value": "This is a test email to verify DKIM signature."
    }]
  }'
```

**Postfix経由の場合:**
```bash
# コマンドラインからテスト送信
echo "DKIM signature test" | mail -s "DKIM Test" test@mail-tester.com
```

### Phase 3: DKIM署名の検証

#### 3.1 メールヘッダーの確認

**Gmailでの確認手順:**
1. 送信したテストメールを開く
2. 右上の３点メニュー → 「メッセージのソースを表示」
3. 以下を確認：

**成功時のヘッダー例:**
```
Authentication-Results: mx.google.com;
       dkim=pass header.i=@yourdomain.com header.s=mail header.b=AbCdEfGh;
       spf=pass (google.com: domain of test@yourdomain.com designates xx.xx.xx.xx as permitted sender);
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=yourdomain.com
```

**DKIM署名ヘッダー:**
```
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=yourdomain.com; s=mail;
        h=from:to:subject:date:message-id;
        bh=abcdef1234567890...;
        b=ABCDEF1234567890...
```

#### 3.2 署名の要素確認

| 要素 | 説明 | 期待値 |
|------|------|--------|
| `v=1` | DKIMバージョン | 必須、常に1 |
| `a=rsa-sha256` | 署名アルゴリズム | RSA-SHA256推奨 |
| `c=relaxed/relaxed` | 正規化方法 | relaxed/relaxedが一般的 |
| `d=yourdomain.com` | 署名ドメイン | 送信元ドメインと一致 |
| `s=mail` | セレクタ | DNS設定と一致 |
| `h=` | 署名されたヘッダー | from,to,subject含む |
| `b=` | 署名データ | 空でないBase64文字列 |

### Phase 4: 自動化テスト

#### 4.1 継続的な監視設定

**DMARCレポートの設定:**
```dns
_dmarc.yourdomain.com TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; ruf=mailto:dmarc-forensics@yourdomain.com; pct=100"
```

**レポート内容:**
- 集約レポート（rua）: 日次統計情報
- フォレンジックレポート（ruf）: 失敗の詳細

#### 4.2 定期テストスケジュール

```bash
# Cronジョブで毎日テスト
0 9 * * * /path/to/dkim-test-automation.sh
```

## トラブルシューティング

### よくある問題と解決策

#### 問題1: DKIM署名なし
**症状:** メールヘッダーにDKIM-Signatureがない
**原因と対策:**
- OpenDKIMサービスが起動していない → `systemctl status opendkim`
- Postfixの設定ミス → milter設定を確認
- セレクタの不一致 → 設定ファイルとDNSを照合

#### 問題2: DKIM検証失敗（fail）
**症状:** `dkim=fail` または `dkim=neutral`
**原因と対策:**
- DNS伝播未完了 → 48時間待つ
- 公開鍵の不一致 → 鍵ペアを再生成
- ヘッダーの改変 → 中継サーバーの設定確認

#### 問題3: Body hash mismatch
**症状:** `body hash did not match`
**原因と対策:**
- メール本文の改変 → 中継サーバーでの変更を確認
- 改行コードの問題 → 正規化設定を`relaxed`に

#### 問題4: セレクタが見つからない
**症状:** `selector not found`
**原因と対策:**
- DNSレコード名の誤り → `selector._domainkey.domain`形式を確認
- CNAMEとTXTの競合 → どちらか一方のみ設定

## 成功基準チェックリスト

### 必須項目
- [ ] DNSにDKIMレコードが正しく設定されている
- [ ] テストメールでDKIM署名が付与される
- [ ] 主要メールプロバイダで`dkim=pass`
- [ ] SPFレコードも設定済み
- [ ] エラーログにDKIM関連のエラーなし

### 推奨項目
- [ ] DMARCポリシー設定済み
- [ ] DKIM署名のアルゴリズムがrsa-sha256
- [ ] 公開鍵が2048ビット以上
- [ ] Mail-Testerで8/10以上のスコア
- [ ] 定期的な自動テスト設定済み

## テスト結果の記録

### テストログテンプレート
```markdown
## DKIM Test Log - [日付]

### 環境
- ドメイン: 
- セレクタ: 
- メールサーバー: 
- 設定方法: 

### DNS確認
- [ ] dig確認: 
- [ ] MXToolbox: 
- [ ] 伝播時間: 

### 送信テスト
- [ ] Mail-Tester スコア: /10
- [ ] Gmail: dkim=
- [ ] Yahoo: dkim=
- [ ] Outlook: dkim=

### 問題と対策
- 

### 次回テスト予定
- 
```

## 高度なテスト

### パフォーマンステスト
```bash
# 大量メール送信時の署名処理時間
time for i in {1..100}; do
  echo "Test $i" | mail -s "Perf Test $i" test@example.com
done
```

### セキュリティテスト
```bash
# DKIMヘッダーインジェクション対策確認
# 悪意のあるヘッダーを含むメールでテスト
```

### 互換性テスト
- 異なるメールクライアント
- 各種メーリングリスト
- 転送設定での署名保持

## まとめ

DKIM設定の完全な検証には：
1. **DNS設定の確認**（Phase 1）
2. **実際のメール送信テスト**（Phase 2）
3. **署名の詳細検証**（Phase 3）
4. **継続的な監視**（Phase 4）

すべてのフェーズで問題がなければ、DKIM設定は成功です。