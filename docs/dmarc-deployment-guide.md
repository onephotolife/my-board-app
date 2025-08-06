# DMARC段階的導入ガイド - blankinai.com

## 概要
DMARCは、SPFとDKIMの認証結果を基に、なりすましメールに対するポリシーを設定する仕組みです。
blankinai.comドメインに対して、安全かつ段階的にDMARCを導入する計画です。

## 現在の環境
- **ドメイン**: blankinai.com
- **SPF**: 設定済み（さくらインターネット）
- **DKIM**: 設定済み（セレクタ: rs20250806）
- **メールサーバー**: さくらインターネット

## DMARC導入の5段階プロセス

### 📅 Phase 1: 監視モード（1-2週間）
**目的**: 現状把握とベースライン確立

#### DNS設定
```dns
_dmarc.blankinai.com TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@blankinai.com; ruf=mailto:dmarc-forensics@blankinai.com; sp=none; adkim=r; aspf=r; pct=100; ri=86400"
```

#### パラメータ説明
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `p=none` | none | メインドメインのポリシー（監視のみ） |
| `sp=none` | none | サブドメインのポリシー（監視のみ） |
| `rua` | メールアドレス | 集約レポート送信先 |
| `ruf` | メールアドレス | フォレンジックレポート送信先 |
| `adkim=r` | relaxed | DKIM アライメント（緩和モード） |
| `aspf=r` | relaxed | SPF アライメント（緩和モード） |
| `pct=100` | 100 | ポリシー適用率 |
| `ri=86400` | 86400秒 | レポート間隔（24時間） |

#### この段階での作業
1. レポート受信用メールアドレスの準備
2. DNSレコードの設定
3. レポート収集開始
4. 正当なメール送信元の確認

### 📅 Phase 2: 部分隔離テスト（2-4週間）
**目的**: 一部のメールで隔離ポリシーをテスト

#### DNS設定更新
```dns
_dmarc.blankinai.com TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@blankinai.com; ruf=mailto:dmarc-forensics@blankinai.com; sp=none; adkim=r; aspf=r; pct=10; ri=86400"
```

#### 変更点
- `p=quarantine`: 10%のメールを隔離
- `pct=10`: 適用率10%

#### モニタリング項目
- 隔離されたメールの確認
- 誤検知の有無
- ユーザーからの問い合わせ

### 📅 Phase 3: 隔離率増加（2-4週間）
**目的**: 隔離ポリシーの適用範囲拡大

#### DNS設定更新
```dns
_dmarc.blankinai.com TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@blankinai.com; ruf=mailto:dmarc-forensics@blankinai.com; sp=quarantine; adkim=r; aspf=r; pct=50; ri=86400"
```

#### 変更点
- `pct=50`: 適用率50%に増加
- `sp=quarantine`: サブドメインも隔離

### 📅 Phase 4: 完全隔離（2-4週間）
**目的**: すべての不正メールを隔離

#### DNS設定更新
```dns
_dmarc.blankinai.com TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@blankinai.com; ruf=mailto:dmarc-forensics@blankinai.com; sp=quarantine; adkim=s; aspf=s; pct=100; ri=86400"
```

#### 変更点
- `pct=100`: 適用率100%
- `adkim=s`: DKIM厳格モード
- `aspf=s`: SPF厳格モード

### 📅 Phase 5: 拒否ポリシー（最終段階）
**目的**: 不正メールを完全拒否

#### DNS設定更新
```dns
_dmarc.blankinai.com TXT "v=DMARC1; p=reject; rua=mailto:dmarc-reports@blankinai.com; ruf=mailto:dmarc-forensics@blankinai.com; sp=reject; adkim=s; aspf=s; pct=100; ri=86400"
```

#### 変更点
- `p=reject`: メインドメイン拒否
- `sp=reject`: サブドメイン拒否

## レポート管理

### レポート用メールアドレスの準備

#### 1. 専用メールアドレスの作成
```bash
# さくらインターネットのコントロールパネルで作成
dmarc-reports@blankinai.com    # 集約レポート用
dmarc-forensics@blankinai.com  # フォレンジックレポート用
```

#### 2. 外部サービスの利用（推奨）
無料/有料のDMARCレポート分析サービス：

**無料サービス**
- **Postmark DMARC** (https://dmarc.postmarkapp.com/)
  - 週次レポート
  - 基本的な分析
  - 設定が簡単

- **DMARC Analyzer** (https://www.dmarcanalyzer.com/)
  - 10,000メール/月まで無料
  - 詳細な分析

**設定例（Postmark DMARC）**
```dns
_dmarc.blankinai.com TXT "v=DMARC1; p=none; rua=mailto:re+xxxxx@dmarc.postmarkapp.com,mailto:dmarc-reports@blankinai.com; sp=none; adkim=r; aspf=r"
```

### レポートの見方

#### 集約レポート（RUA）の内容
```xml
<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <report_metadata>
    <org_name>google.com</org_name>
    <email>noreply-dmarc-support@google.com</email>
    <date_range>
      <begin>1609459200</begin>
      <end>1609545600</end>
    </date_range>
  </report_metadata>
  <policy_published>
    <domain>blankinai.com</domain>
    <adkim>r</adkim>
    <aspf>r</aspf>
    <p>none</p>
    <sp>none</sp>
    <pct>100</pct>
  </policy_published>
  <record>
    <row>
      <source_ip>203.0.113.1</source_ip>
      <count>10</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
      </policy_evaluated>
    </row>
  </record>
</feedback>
```

#### 重要な確認項目
1. **source_ip**: 送信元IP（正当な送信元か確認）
2. **count**: メール数
3. **disposition**: 処理結果（none/quarantine/reject）
4. **dkim/spf**: 認証結果

## 移行チェックリスト

### Phase 1 開始前
- [ ] レポート用メールアドレス作成
- [ ] レポート分析ツールの準備
- [ ] 関係者への通知

### Phase 2 移行前
- [ ] Phase 1で2週間以上のデータ収集
- [ ] 正当な送信元のリスト作成
- [ ] SPF/DKIMの問題解決
- [ ] 認証失敗率が5%未満

### Phase 3 移行前
- [ ] Phase 2で問題なし確認
- [ ] ユーザーサポート体制準備
- [ ] 誤検知対応手順作成

### Phase 4 移行前
- [ ] Phase 3で問題なし確認
- [ ] 認証失敗率が1%未満
- [ ] 全送信元の認証設定完了

### Phase 5 移行前
- [ ] Phase 4で1ヶ月以上問題なし
- [ ] 経営層の承認
- [ ] 緊急時のロールバック手順

## トラブルシューティング

### よくある問題と対策

#### 1. 正当なメールが失敗する
**原因**: サードパーティサービスのSPF/DKIM未設定
**対策**:
```dns
# SPFにサービスを追加
blankinai.com TXT "v=spf1 include:_spf.sakura.ne.jp include:sendgrid.net ~all"
```

#### 2. メーリングリストで失敗
**原因**: メーリングリストがヘッダー書き換え
**対策**:
- アライメントモードを`relaxed`に維持
- メーリングリストのDKIM署名設定

#### 3. 転送メールで失敗
**原因**: 転送時にSPFが失敗
**対策**:
- ARC（Authenticated Received Chain）の利用検討
- 転送先でのSRS（Sender Rewriting Scheme）設定

#### 4. レポートが届かない
**原因**: レポートサイズ制限
**対策**:
- 外部レポートサービスの利用
- `ri`パラメータで頻度調整

## 緊急時のロールバック

問題発生時の即座の対応：

```bash
# 1. 一時的に監視モードに戻す
dig _dmarc.blankinai.com TXT  # 現在の設定確認

# 2. DNSを即座に更新
# さくらインターネットのコントロールパネルで：
_dmarc.blankinai.com TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@blankinai.com"

# 3. DNS伝播確認（複数地点から）
dig @8.8.8.8 _dmarc.blankinai.com TXT
dig @1.1.1.1 _dmarc.blankinai.com TXT
```

## サブドメインの考慮事項

### サブドメイン別の設定例

#### マーケティング用サブドメイン
```dns
_dmarc.marketing.blankinai.com TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@blankinai.com"
```

#### 開発/テスト用サブドメイン
```dns
_dmarc.dev.blankinai.com TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@blankinai.com"
```

## 成功指標（KPI）

### 各フェーズの目標値

| フェーズ | 期間 | DMARC準拠率 | 認証失敗率 | 誤検知率 |
|---------|------|------------|-----------|----------|
| Phase 1 | 2週間 | - | <10% | - |
| Phase 2 | 4週間 | >90% | <5% | <0.1% |
| Phase 3 | 4週間 | >95% | <3% | <0.05% |
| Phase 4 | 4週間 | >98% | <2% | <0.01% |
| Phase 5 | 継続 | >99% | <1% | 0% |

## 長期運用計画

### 月次タスク
- [ ] レポート分析
- [ ] 新規送信元の確認
- [ ] 認証失敗の調査
- [ ] ポリシー見直し

### 四半期タスク
- [ ] DKIM鍵のローテーション検討
- [ ] SPFレコードの最適化
- [ ] サブドメインポリシー見直し

### 年次タスク
- [ ] DMARC導入効果の評価
- [ ] セキュリティ監査
- [ ] BIMI（Brand Indicators for Message Identification）導入検討

## まとめ

DMARCの段階的導入により：
1. **リスク最小化**: 正当なメールへの影響を防ぐ
2. **可視性向上**: メール送信状況の把握
3. **ブランド保護**: なりすまし防止
4. **配信率向上**: ISPからの信頼性向上

推奨期間：**全体で3-6ヶ月**での完全導入を目指す