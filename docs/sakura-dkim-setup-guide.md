# さくらインターネット DKIM設定ガイド

## 概要
DKIM（DomainKeys Identified Mail）は、電子メールの送信者認証技術の一つで、メールの改ざん防止と送信者の正当性を証明します。

## さくらインターネットのDKIM対応状況

### 重要な制限事項
**さくらインターネットの共用レンタルサーバー、さくらのメールボックスでは、標準でDKIM署名機能を提供していません。**

### 利用可能なオプション

#### 1. さくらのVPS/専用サーバーを利用する場合
自前でメールサーバーを構築し、DKIM署名を実装できます。

#### 2. 外部メール配信サービスとの連携
さくらインターネットのドメインを使用しながら、DKIM対応の外部サービスを利用：
- SendGrid
- Amazon SES
- Mailgun
- Google Workspace

## 外部サービス（SendGrid）を使用したDKIM設定手順

### 前提条件
- さくらインターネットでドメイン管理
- SendGridアカウント（無料プランから利用可能）

### 設定手順

#### Step 1: SendGridでドメイン認証を開始
1. SendGridにログイン
2. Settings → Sender Authentication へ移動
3. 「Authenticate Your Domain」をクリック
4. DNS host: 「Other Host」を選択
5. ドメイン名: `example.com` を入力

#### Step 2: SendGridが生成するDNSレコードを確認
SendGridは以下のレコードを生成します：

```dns
; DKIM レコード1
s1._domainkey.example.com  CNAME  s1._domainkey.u1234567.wl.sendgrid.net

; DKIM レコード2  
s2._domainkey.example.com  CNAME  s2._domainkey.u1234567.wl.sendgrid.net

; SPFレコード（include文を追加）
example.com  TXT  "v=spf1 include:sendgrid.net include:_spf.sakura.ne.jp ~all"

; DMARC レコード（推奨）
_dmarc.example.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@example.com"
```

#### Step 3: さくらインターネットのDNS設定

1. さくらインターネットコントロールパネルにログイン
2. 「ドメイン/SSL」→ 対象ドメインの「設定」をクリック
3. 「ゾーン編集」をクリック

##### CNAMEレコードの追加
```
エントリ名: s1._domainkey
種別: CNAME
値: s1._domainkey.u1234567.wl.sendgrid.net
```

```
エントリ名: s2._domainkey
種別: CNAME  
値: s2._domainkey.u1234567.wl.sendgrid.net
```

##### TXTレコードの追加（SPF）
```
エントリ名: @
種別: TXT
値: "v=spf1 include:sendgrid.net include:_spf.sakura.ne.jp ~all"
```

##### TXTレコードの追加（DMARC）
```
エントリ名: _dmarc
種別: TXT
値: "v=DMARC1; p=none; rua=mailto:dmarc@example.com"
```

#### Step 4: DNS反映の確認
```bash
# DKIM レコードの確認
dig s1._domainkey.example.com CNAME
dig s2._domainkey.example.com CNAME

# SPF レコードの確認
dig example.com TXT

# DMARC レコードの確認
dig _dmarc.example.com TXT
```

#### Step 5: SendGridで認証を完了
1. SendGridの管理画面に戻る
2. 「Verify」ボタンをクリック
3. 全てのレコードが認証されたことを確認

## さくらのVPSでPostfixとOpenDKIMを使用する場合

### 必要なパッケージのインストール
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postfix opendkim opendkim-tools

# CentOS/AlmaLinux
sudo yum install postfix opendkim opendkim-tools
```

### DKIMキーペアの生成
```bash
# ディレクトリ作成
sudo mkdir -p /etc/opendkim/keys/example.com

# キーペア生成（2048ビットRSA）
sudo opendkim-genkey -t -s mail -d example.com \
  -D /etc/opendkim/keys/example.com/

# 権限設定
sudo chown -R opendkim:opendkim /etc/opendkim/
sudo chmod 600 /etc/opendkim/keys/example.com/mail.private
```

### OpenDKIM設定ファイル
```bash
# /etc/opendkim.conf
Domain                  example.com
KeyFile                 /etc/opendkim/keys/example.com/mail.private
Selector                mail
Socket                  inet:8891@localhost
PidFile                 /var/run/opendkim/opendkim.pid
UMask                   022
UserID                  opendkim:opendkim
SignatureAlgorithm      rsa-sha256
Canonicalization        relaxed/relaxed
Mode                    sv
SubDomains              yes
AutoRestart             yes
AutoRestartRate         10/1h
Background              yes
DNSTimeout              5
SignHeaders             From,Reply-To,Subject,Date,To,CC
```

### Postfix設定の更新
```bash
# /etc/postfix/main.cf に追加
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:127.0.0.1:8891
non_smtpd_milters = inet:127.0.0.1:8891
```

### DNSレコードの設定
生成された公開鍵をDNSに登録：

```bash
# 公開鍵の確認
cat /etc/opendkim/keys/example.com/mail.txt
```

さくらインターネットのDNS設定画面で：
```
エントリ名: mail._domainkey
種別: TXT
値: "v=DKIM1; k=rsa; t=y; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg..."
```

### サービスの起動
```bash
sudo systemctl enable opendkim
sudo systemctl start opendkim
sudo systemctl restart postfix
```

## DKIM設定の検証

### オンラインツールでの確認
1. MXToolbox DKIM Lookup: https://mxtoolbox.com/dkim.aspx
2. DMARC Analyzer: https://www.dmarcanalyzer.com/dkim-check/

### メールヘッダーでの確認
送信したメールのヘッダーに以下が含まれることを確認：
```
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
  d=example.com; s=mail; h=from:to:subject:date;
  bh=...;
  b=...;
```

## トラブルシューティング

### DNS反映待ち
- TTL値により、DNS変更が反映されるまで最大48時間かかる場合があります

### DKIM署名の失敗
- キーファイルの権限を確認
- OpenDKIMサービスのログを確認: `sudo journalctl -u opendkim`

### SPFレコードの競合
- 既存のSPFレコードがある場合は、include文を追加する形で統合

## セキュリティベストプラクティス

1. **キーローテーション**: 年に1回程度、DKIMキーを更新
2. **キー長**: 最低2048ビット、推奨4096ビット
3. **DMARCポリシー**: 段階的に厳格化（none → quarantine → reject）
4. **モニタリング**: DMARCレポートを定期的に確認

## まとめ

さくらインターネットの共用サービスではDKIM署名が直接サポートされていないため：

1. **簡単な方法**: SendGridなどの外部メール配信サービスを利用
2. **高度な方法**: VPSで独自メールサーバーを構築

メール配信量や技術要件に応じて、適切な方法を選択してください。