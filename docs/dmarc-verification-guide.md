# DMARC Phase 1 設定確認ガイド - blankinai.com

## 概要
DMARC Phase 1（監視モード）の設定が完了した後の包括的な確認手順です。
DNS反映、レポート機能、SPF/DKIM/DMARC連携の動作を検証します。

## 確認タイムライン

| 時期 | 確認項目 | 所要時間 |
|------|----------|----------|
| 即座 | DNS設定の構文確認 | 5分 |
| 1-4時間後 | DNS伝播確認 | 10分 |
| 24時間後 | 初回レポート受信 | 15分 |
| 48時間後 | 総合動作確認 | 30分 |
| 1週間後 | 統計分析 | 1時間 |

## Phase 1: DNS設定確認（設定直後）

### 1.1 基本的なDNS確認

```bash
# DMARCレコード確認
dig _dmarc.blankinai.com TXT +short

# 期待される出力例
"v=DMARC1; p=none; rua=mailto:dmarc-reports@blankinai.com; ruf=mailto:dmarc-forensics@blankinai.com; sp=none; adkim=r; aspf=r; pct=100; ri=86400"
```

### 1.2 複数DNSサーバーからの確認

```bash
# Google DNS
dig @8.8.8.8 _dmarc.blankinai.com TXT +short

# Cloudflare DNS
dig @1.1.1.1 _dmarc.blankinai.com TXT +short

# さくらインターネットのDNS
dig @ns1.dns.ne.jp _dmarc.blankinai.com TXT +short
```

### 1.3 DMARCレコードの構文検証

```bash
# レコードを変数に保存
DMARC_RECORD=$(dig _dmarc.blankinai.com TXT +short | tr -d '"')

# 必須タグの確認
echo "$DMARC_RECORD" | grep -E "v=DMARC1"  # バージョン
echo "$DMARC_RECORD" | grep -E "p=(none|quarantine|reject)"  # ポリシー
echo "$DMARC_RECORD" | grep -E "rua=mailto:"  # 集約レポート先
```

### 1.4 SPF/DKIM同時確認

```bash
# SPF確認
dig blankinai.com TXT +short | grep "v=spf1"

# DKIM確認（セレクタ: rs20250806）
dig rs20250806._domainkey.blankinai.com TXT +short
dig rs20250806._domainkey.blankinai.com CNAME +short
```

## Phase 2: オンライン検証ツール（1-4時間後）

### 2.1 MXToolbox DMARC Check
```
URL: https://mxtoolbox.com/SuperTool.aspx?action=dmarc%3ablankinai.com
```

**確認項目：**
- ✅ DMARCレコードが見つかる
- ✅ 構文エラーがない
- ✅ ポリシーが「none」と表示
- ✅ レポート送信先が正しい

### 2.2 DMARC Analyzer
```
URL: https://www.dmarcanalyzer.com/dmarc/dmarc-record-check/
```

入力: `blankinai.com`

**確認項目：**
- ✅ Valid DMARC record
- ✅ Policy: Monitor (p=none)
- ✅ Aggregate reports: 設定済み
- ✅ Forensic reports: 設定済み

### 2.3 Dmarcian DMARC Inspector
```
URL: https://dmarcian.com/dmarc-inspector/
```

**詳細分析項目：**
- アライメントモード（relaxed/strict）
- サブドメインポリシー
- レポート間隔設定

## Phase 3: メール送信テスト（24時間後）

### 3.1 自動検証サービスへのテスト送信

#### Mail-Tester（最も詳細）
```bash
# 1. https://www.mail-tester.com/ にアクセス
# 2. 一時メールアドレスを取得（例: test-xyz123@mail-tester.com）
# 3. テストメール送信

echo "DMARC Phase 1 Test from blankinai.com" | \
  mail -s "DMARC Test $(date +%Y%m%d-%H%M%S)" \
  test-xyz123@mail-tester.com

# 4. サイトで「Then check your score」をクリック
```

**確認項目：**
- Authentication部分のスコア
- DKIM署名の有無
- SPF認証結果
- DMARC準拠性

#### Port25 Verifier
```bash
# 自動返信型チェッカー
echo "DMARC verification test" | \
  mail -s "Test" check-auth@verifier.port25.com
```

**返信メールの確認項目：**
```
Summary of Results
==================
SPF check:          pass
DomainKeys check:   neutral
DKIM check:         pass
Sender-ID check:    pass
SpamAssassin check: ham
DMARC check:        pass
```

### 3.2 主要メールプロバイダでの確認

#### Gmail
1. Gmailアカウントにテストメール送信
2. メールを開き、三点メニュー → 「メッセージのソースを表示」
3. 「元のメッセージ」セクションで以下を確認：

```
Authentication-Results: mx.google.com;
       dkim=pass header.i=@blankinai.com header.s=rs20250806;
       spf=pass (google.com: domain of test@blankinai.com designates xxx.xxx.xxx.xxx as permitted sender);
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=blankinai.com
```

**重要な確認ポイント：**
- `dmarc=pass` であること
- `p=NONE` が表示されること（監視モード）
- `header.from=blankinai.com` がドメインと一致

## Phase 4: レポート受信確認（24-48時間後）

### 4.1 レポート用メールボックスの確認

```bash
# メールログ確認（さくらインターネットの場合）
# コントロールパネル → メール → メールログ

# または、メールクライアントで確認
# dmarc-reports@blankinai.com のメールボックス
```

### 4.2 期待されるレポート送信元

**主要ISPからのレポート：**
- google.com (noreply-dmarc-support@google.com)
- yahoo.com (dmarc_support@yahoo.com)
- microsoft.com (dmarcreport@microsoft.com)
- amazon.com (dmarcreports@amazon.com)

### 4.3 レポートファイルの確認

```bash
# レポートは通常XML形式で圧縮されて届く
# ファイル名例: google.com!blankinai.com!1234567890!1234567899.xml.gz

# 解凍して内容確認
gunzip report.xml.gz
cat report.xml | head -50
```

### 4.4 レポート内容の基本確認

```xml
<!-- 期待される内容 -->
<policy_published>
  <domain>blankinai.com</domain>
  <p>none</p>  <!-- 監視モード -->
  <sp>none</sp>
  <adkim>r</adkim>
  <aspf>r</aspf>
</policy_published>
```

## Phase 5: 統合動作確認スクリプト

### 5.1 自動確認スクリプトの実行

```bash
# 既存のスクリプトを使用
./scripts/dmarc-deployment-manager.sh check

# または個別確認
./scripts/dkim-test-automation.sh blankinai.com rs20250806
```

### 5.2 手動統合チェックリスト

```markdown
## DMARC Phase 1 チェックリスト

### DNS設定
- [ ] DMARCレコードが設定されている
- [ ] p=none（監視モード）になっている
- [ ] rua（集約レポート）アドレスが正しい
- [ ] ruf（フォレンジック）アドレスが正しい
- [ ] SPFレコードが存在する
- [ ] DKIMレコードが存在する（rs20250806）

### DNS伝播
- [ ] Google DNS (8.8.8.8) で確認可能
- [ ] Cloudflare DNS (1.1.1.1) で確認可能
- [ ] ローカルDNSで確認可能

### メール送信テスト
- [ ] Mail-Testerでスコア7以上
- [ ] GmailでDMARC=pass
- [ ] Port25でpass結果

### レポート機能
- [ ] 24時間以内に最初のレポート受信
- [ ] レポートが正しく解凍できる
- [ ] XMLフォーマットが正しい
```

## トラブルシューティング

### 問題1: DMARCレコードが見つからない

```bash
# TTL確認
dig _dmarc.blankinai.com TXT +noall +answer

# キャッシュクリア（Mac）
sudo dscacheutil -flushcache

# 別のリゾルバで確認
nslookup -type=TXT _dmarc.blankinai.com 8.8.8.8
```

### 問題2: レポートが届かない

**確認項目：**
1. メールアドレスのスペルミス
2. メールボックスの容量
3. スパムフォルダ
4. メールサーバーのフィルタ設定

```bash
# メールアドレスの到達性確認
dig MX blankinai.com +short
telnet [MXサーバー] 25
```

### 問題3: DMARC=failになる

**原因と対策：**
```bash
# SPFアライメント確認
# Return-PathとFromドメインの確認

# DKIMアライメント確認  
# d=タグとFromドメインの確認

# アライメントモードを緩和
# adkim=r（relaxed）、aspf=r（relaxed）
```

## 監視の自動化

### Cronジョブ設定

```bash
# 毎日9時にチェック
0 9 * * * /path/to/scripts/dmarc-deployment-manager.sh check >> /var/log/dmarc-check.log 2>&1

# 毎週月曜にレポート分析
0 10 * * 1 python3 /path/to/scripts/dmarc-report-analyzer.py /path/to/reports/*.xml
```

### アラート設定

```bash
#!/bin/bash
# dmarc-alert.sh

# DMARCレコード消失チェック
if ! dig _dmarc.blankinai.com TXT +short | grep -q "v=DMARC1"; then
    echo "警告: DMARCレコードが見つかりません" | \
      mail -s "DMARC Alert: Record Missing" admin@blankinai.com
fi
```

## 成功基準

### Phase 1完了の判定基準

✅ **必須項目（すべて満たすこと）：**
1. DMARCレコードが全DNSサーバーで確認可能
2. 24時間以内に最初のレポート受信
3. 主要ISPからDMARC=pass
4. SPF/DKIMが正常動作

✅ **推奨項目：**
1. 複数のISPからレポート受信
2. Mail-Testerで8/10以上
3. 認証失敗率10%未満

## 次のステップ

Phase 1で1-2週間のデータ収集後：

1. **レポート分析**
   ```bash
   python3 scripts/dmarc-report-analyzer.py dmarc-reports/*.xml
   ```

2. **問題の特定と修正**
   - 認証失敗の送信元を特定
   - SPF/DKIM設定の調整

3. **Phase 2への移行判断**
   - 認証成功率95%以上
   - 重大な問題なし

## まとめ

DMARC Phase 1の確認は段階的に行います：
1. **即座**: DNS設定確認
2. **数時間後**: DNS伝播確認
3. **24時間後**: テスト送信と初回レポート
4. **48時間後**: 総合評価
5. **1週間後**: データ分析と次フェーズ検討

すべての確認項目をクリアしてから、次のフェーズへ進んでください。