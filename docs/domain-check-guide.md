# ドメイン可用性チェックガイド

## 概要

このガイドでは、ドメイン名の可用性を確認する方法を説明します。
2つのスクリプトを用意しました：

1. **check-domain.sh** - Bashスクリプト（Whois/DNS）
2. **check-domain-api.js** - Node.jsスクリプト（RDAP API）

## スクリプトの使い方

### 1. Bashスクリプト版

```bash
# 実行権限を付与（初回のみ）
chmod +x scripts/check-domain.sh

# 実行
./scripts/check-domain.sh
```

**特徴**：
- whoisコマンドを使用
- DNSルックアップ（nslookup/dig）
- HTTPアクセスチェック（curl）

**必要なツール**：
```bash
# macOS
brew install whois
brew install dnsutils  # nslookup用
```

### 2. Node.js API版

```bash
# 実行権限を付与（初回のみ）
chmod +x scripts/check-domain-api.js

# 実行
node scripts/check-domain-api.js
# または
./scripts/check-domain-api.js
```

**特徴**：
- RDAP（Registration Data Access Protocol）使用
- 外部ツール不要
- より新しい標準プロトコル

## チェック項目

両スクリプトとも以下を確認：

### 1. DNS解決チェック
- ドメインがDNSで解決できるか
- IPアドレスが割り当てられているか

### 2. 登録状況チェック
- **Bashスクリプト**: Whoisデータベース
- **Node.js**: RDAP API

### 3. Webサイト稼働チェック
- HTTP/HTTPSでアクセス可能か
- 実際にWebサイトが動いているか

## 結果の見方

### ✅ 取得可能
```
🎉 このドメインは取得可能と思われます！
```
- DNS記録なし
- Whois/RDAPで未登録
- Webサイトなし

### ❌ 登録済み
```
❌ このドメインは既に登録されています
```
- Whois/RDAPで登録確認
- 他の人が既に所有

### ⚠️ 要確認
```
⚠️ 一部確認できない項目があります
```
- 一部のチェックが失敗
- レジストラで直接確認推奨

## より正確な確認方法

### 1. レジストラで直接検索

**日本のレジストラ**：
- [お名前.com](https://www.onamae.com/)
- [ムームードメイン](https://muumuu-domain.com/)
- [バリュードメイン](https://www.value-domain.com/)

**海外のレジストラ**：
- [Namecheap](https://www.namecheap.com/)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- [Google Domains](https://domains.google/)

### 2. Whois Webサービス

- [JPRS Whois](https://whois.jprs.jp/) - .jpドメイン専用
- [ICANN Lookup](https://lookup.icann.org/) - gTLD用
- [Who.is](https://who.is/) - 汎用

## API/プログラムでの確認

### 1. RDAP (推奨)
```javascript
// .comドメイン
https://rdap.verisign.com/com/v1/domain/example.com

// .jpドメイン
https://rdap.jprs.jp/rdap/domain/example.jp
```

### 2. DNS解決
```javascript
const dns = require('dns').promises;
const addresses = await dns.resolve4('example.com');
```

### 3. 有料API
- [Namecheap API](https://www.namecheap.com/support/api/)
- [GoDaddy API](https://developer.godaddy.com/)
- [DomainTools API](https://www.domaintools.com/products/api-integration/)

## 注意事項

### 1. レート制限
- Whois/RDAPには利用制限あり
- 連続チェックは1秒以上間隔を空ける

### 2. 精度
- 100%の精度は保証されない
- 最終確認は必ずレジストラで

### 3. プレミアムドメイン
- 利用可能でも高額な場合あり
- レジストラで価格確認必須

### 4. 商標確認
- [特許情報プラットフォーム](https://www.j-platpat.inpit.go.jp/)
- [USPTO](https://www.uspto.gov/trademarks)

## トラブルシューティング

### whoisコマンドが見つからない
```bash
# macOS
brew install whois

# Ubuntu/Debian
sudo apt-get install whois

# CentOS/RHEL
sudo yum install whois
```

### RDAPがタイムアウトする
- ファイアウォール設定確認
- プロキシ環境の場合は設定必要

### 文字化けする
```bash
# 文字コード設定
export LANG=ja_JP.UTF-8
```

## まとめ

1. **クイックチェック**: スクリプトで概要把握
2. **詳細確認**: レジストラで正確な情報
3. **早めの取得**: 良いドメインは早い者勝ち！

ドメイン取得は、ブランディングの第一歩です。
慎重に選んで、素晴らしいサービスを作りましょう！