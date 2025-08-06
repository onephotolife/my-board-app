#!/bin/bash

# DKIM DNS設定確認スクリプト
# 使用方法: ./check-dkim-dns.sh example.com [selector]

set -e

# 色付け用の変数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -lt 1 ]; then
    echo "使用方法: $0 <domain> [selector]"
    echo "例: $0 example.com mail"
    exit 1
fi

DOMAIN=$1
SELECTOR=${2:-mail}  # デフォルトセレクタは 'mail'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DKIM DNS設定確認ツール${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "ドメイン: ${GREEN}$DOMAIN${NC}"
echo -e "セレクタ: ${GREEN}$SELECTOR${NC}"
echo ""

# 関数: DNS問い合わせと結果表示
check_dns_record() {
    local record_name=$1
    local record_type=$2
    local description=$3
    
    echo -e "${YELLOW}▶ $description${NC}"
    echo "  クエリ: $record_name ($record_type)"
    
    result=$(dig +short $record_name $record_type 2>/dev/null | head -n 1)
    
    if [ -z "$result" ]; then
        echo -e "  ${RED}✗ レコードが見つかりません${NC}"
        return 1
    else
        echo -e "  ${GREEN}✓ 見つかりました:${NC}"
        echo "    $result"
        
        # TXTレコードの場合、DKIM形式を検証
        if [ "$record_type" = "TXT" ] && [[ $result == *"v=DKIM1"* ]]; then
            echo -e "  ${GREEN}✓ 有効なDKIMレコードです${NC}"
            
            # キーの詳細を解析
            if [[ $result == *"k=rsa"* ]]; then
                echo "    アルゴリズム: RSA"
            fi
            
            if [[ $result == *"t=y"* ]]; then
                echo -e "    ${YELLOW}⚠ テストモード有効${NC}"
            fi
            
            # 公開鍵の長さを推定（base64文字数から）
            key_part=$(echo "$result" | grep -oP 'p=\K[^;"]+' | tr -d ' ')
            if [ ! -z "$key_part" ]; then
                key_length=$((${#key_part} * 6 / 8))
                echo "    推定キー長: 約 $key_length ビット"
            fi
        fi
        
        return 0
    fi
}

echo -e "${BLUE}1. DKIM公開鍵の確認${NC}"
echo "----------------------------------------"
check_dns_record "${SELECTOR}._domainkey.${DOMAIN}" "TXT" "DKIMレコード (TXT)"
echo ""

# CNAMEレコードもチェック（SendGrid等の外部サービス利用時）
check_dns_record "${SELECTOR}._domainkey.${DOMAIN}" "CNAME" "DKIMレコード (CNAME)"
echo ""

echo -e "${BLUE}2. SPFレコードの確認${NC}"
echo "----------------------------------------"
spf_result=$(dig +short ${DOMAIN} TXT | grep "v=spf1" | head -n 1)
if [ ! -z "$spf_result" ]; then
    echo -e "${GREEN}✓ SPFレコード見つかりました:${NC}"
    echo "  $spf_result"
    
    # さくらインターネットのSPFが含まれているか確認
    if [[ $spf_result == *"_spf.sakura.ne.jp"* ]]; then
        echo -e "  ${GREEN}✓ さくらインターネットのSPF設定済み${NC}"
    fi
    
    # 外部サービスのSPFチェック
    if [[ $spf_result == *"sendgrid.net"* ]]; then
        echo -e "  ${GREEN}✓ SendGridのSPF設定済み${NC}"
    fi
else
    echo -e "${RED}✗ SPFレコードが見つかりません${NC}"
fi
echo ""

echo -e "${BLUE}3. DMARCレコードの確認${NC}"
echo "----------------------------------------"
dmarc_result=$(dig +short _dmarc.${DOMAIN} TXT | head -n 1)
if [ ! -z "$dmarc_result" ]; then
    echo -e "${GREEN}✓ DMARCレコード見つかりました:${NC}"
    echo "  $dmarc_result"
    
    # DMARCポリシーの解析
    if [[ $dmarc_result == *"p=none"* ]]; then
        echo -e "  ${YELLOW}⚠ ポリシー: none (監視のみ)${NC}"
    elif [[ $dmarc_result == *"p=quarantine"* ]]; then
        echo -e "  ${YELLOW}⚠ ポリシー: quarantine (隔離)${NC}"
    elif [[ $dmarc_result == *"p=reject"* ]]; then
        echo -e "  ${GREEN}✓ ポリシー: reject (拒否)${NC}"
    fi
    
    # レポート送信先
    if [[ $dmarc_result == *"rua="* ]]; then
        rua=$(echo "$dmarc_result" | grep -oP 'rua=mailto:\K[^;]+')
        echo "  集約レポート送信先: $rua"
    fi
else
    echo -e "${RED}✗ DMARCレコードが見つかりません${NC}"
    echo -e "${YELLOW}  推奨: _dmarc.${DOMAIN} TXT \"v=DMARC1; p=none; rua=mailto:dmarc@${DOMAIN}\"${NC}"
fi
echo ""

echo -e "${BLUE}4. メールサーバー（MX）レコードの確認${NC}"
echo "----------------------------------------"
mx_records=$(dig +short ${DOMAIN} MX | sort -n)
if [ ! -z "$mx_records" ]; then
    echo -e "${GREEN}✓ MXレコード見つかりました:${NC}"
    echo "$mx_records" | while read -r mx; do
        echo "  $mx"
        
        # さくらインターネットのMXサーバーか確認
        if [[ $mx == *"sakura.ne.jp"* ]]; then
            echo -e "    ${GREEN}→ さくらインターネットのメールサーバー${NC}"
        fi
    done
else
    echo -e "${RED}✗ MXレコードが見つかりません${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}診断サマリー${NC}"
echo -e "${BLUE}========================================${NC}"

# 総合診断
dkim_ok=false
spf_ok=false
dmarc_ok=false

if dig +short ${SELECTOR}._domainkey.${DOMAIN} TXT | grep -q "v=DKIM1" || \
   dig +short ${SELECTOR}._domainkey.${DOMAIN} CNAME | grep -q .; then
    dkim_ok=true
fi

if [ ! -z "$spf_result" ]; then
    spf_ok=true
fi

if [ ! -z "$dmarc_result" ]; then
    dmarc_ok=true
fi

echo ""
if $dkim_ok; then
    echo -e "DKIM:  ${GREEN}✓ 設定済み${NC}"
else
    echo -e "DKIM:  ${RED}✗ 未設定${NC}"
fi

if $spf_ok; then
    echo -e "SPF:   ${GREEN}✓ 設定済み${NC}"
else
    echo -e "SPF:   ${RED}✗ 未設定${NC}"
fi

if $dmarc_ok; then
    echo -e "DMARC: ${GREEN}✓ 設定済み${NC}"
else
    echo -e "DMARC: ${YELLOW}△ 未設定（推奨）${NC}"
fi

echo ""
if $dkim_ok && $spf_ok; then
    echo -e "${GREEN}メール認証の基本設定は完了しています！${NC}"
    if ! $dmarc_ok; then
        echo -e "${YELLOW}DMARCの設定を追加することを推奨します。${NC}"
    fi
else
    echo -e "${RED}メール認証設定が不完全です。${NC}"
    echo "上記のガイドに従って設定を完了してください。"
fi

echo ""
echo -e "${BLUE}外部検証ツール:${NC}"
echo "• MXToolbox: https://mxtoolbox.com/dkim.aspx"
echo "• DMARC Analyzer: https://www.dmarcanalyzer.com/dkim-check/"
echo "• Mail Tester: https://www.mail-tester.com/"