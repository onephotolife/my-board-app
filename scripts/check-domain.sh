#!/bin/bash

# ドメイン可用性チェックスクリプト
# 使用方法: ./scripts/check-domain.sh

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# チェックするドメインリスト
DOMAINS=(
    "myboard.jp"
    "boardhub.com"
    "postclub.com"
)

# バナー表示
show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║       🌐 Domain Availability Check 🌐     ║"
    echo "║         ドメイン可用性チェック           ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "チェック対象ドメイン: ${#DOMAINS[@]}個"
    echo ""
}

# DNSチェック
check_dns() {
    local domain=$1
    echo -e "${BLUE}[DNS] $domain をチェック中...${NC}"
    
    # nslookupを使用
    if nslookup "$domain" >/dev/null 2>&1; then
        # Aレコードの確認
        local ip=$(nslookup "$domain" 2>/dev/null | grep -A1 "Name:" | grep "Address:" | awk '{print $2}')
        if [ -n "$ip" ]; then
            echo -e "  ${RED}✗ 使用中${NC} - IP: $ip"
            return 1
        fi
    fi
    
    # digコマンドも試す（利用可能な場合）
    if command -v dig >/dev/null 2>&1; then
        local dig_result=$(dig +short "$domain" 2>/dev/null)
        if [ -n "$dig_result" ]; then
            echo -e "  ${RED}✗ 使用中${NC} - DNS記録あり"
            return 1
        fi
    fi
    
    echo -e "  ${GREEN}✓ DNS記録なし${NC}"
    return 0
}

# HTTPレスポンスチェック
check_http() {
    local domain=$1
    echo -e "${BLUE}[HTTP] $domain をチェック中...${NC}"
    
    # curlでHTTPステータスを確認
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://$domain" 2>/dev/null || echo "000")
    local https_status=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "https://$domain" 2>/dev/null || echo "000")
    
    if [ "$http_status" != "000" ] || [ "$https_status" != "000" ]; then
        echo -e "  ${RED}✗ ウェブサイト稼働中${NC} (HTTP: $http_status, HTTPS: $https_status)"
        return 1
    else
        echo -e "  ${GREEN}✓ ウェブサイトなし${NC}"
        return 0
    fi
}

# Whoisチェック（基本）
check_whois_basic() {
    local domain=$1
    echo -e "${BLUE}[WHOIS] $domain をチェック中...${NC}"
    
    # whoisコマンドが利用可能か確認
    if ! command -v whois >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠ whoisコマンドが利用できません${NC}"
        echo "  インストール方法: brew install whois"
        return 2
    fi
    
    # ドメインのTLDに応じてWhoisサーバーを選択
    local tld="${domain##*.}"
    local whois_result=""
    
    case "$tld" in
        "jp")
            whois_result=$(whois -h whois.jprs.jp "$domain" 2>/dev/null || echo "")
            if echo "$whois_result" | grep -q "No match!!"; then
                echo -e "  ${GREEN}✓ 登録可能${NC}"
                return 0
            elif echo "$whois_result" | grep -q "Domain Name:"; then
                echo -e "  ${RED}✗ 登録済み${NC}"
                return 1
            fi
            ;;
        "com"|"net")
            whois_result=$(whois "$domain" 2>/dev/null || echo "")
            if echo "$whois_result" | grep -qi "No match\|Not found\|No Data Found"; then
                echo -e "  ${GREEN}✓ 登録可能${NC}"
                return 0
            elif echo "$whois_result" | grep -qi "Domain Name:"; then
                echo -e "  ${RED}✗ 登録済み${NC}"
                return 1
            fi
            ;;
    esac
    
    echo -e "  ${YELLOW}⚠ 確認できませんでした${NC}"
    return 2
}

# 結果サマリー用
declare -A results

# メインチェック処理
check_domain() {
    local domain=$1
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📍 $domain${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local dns_available=false
    local http_available=false
    local whois_available=false
    
    # 各チェックを実行
    if check_dns "$domain"; then
        dns_available=true
    fi
    
    if check_http "$domain"; then
        http_available=true
    fi
    
    if check_whois_basic "$domain"; then
        whois_available=true
    fi
    
    # 総合判定
    echo ""
    if [ "$dns_available" = true ] && [ "$http_available" = true ] && [ "$whois_available" = true ]; then
        echo -e "${GREEN}🎉 このドメインは取得可能と思われます！${NC}"
        results["$domain"]="available"
    elif [ "$whois_available" = false ]; then
        echo -e "${RED}❌ このドメインは既に登録されています${NC}"
        results["$domain"]="registered"
    else
        echo -e "${YELLOW}⚠️  一部確認できない項目があります${NC}"
        echo "   レジストラで直接確認することをお勧めします"
        results["$domain"]="uncertain"
    fi
    echo ""
}

# レジストラでの確認方法
show_registrar_info() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔍 レジストラでの確認方法${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "より正確な確認のため、以下のレジストラで直接検索してください："
    echo ""
    echo "📌 .jpドメイン:"
    echo "   - お名前.com: https://www.onamae.com/"
    echo "   - JPDirect: https://jpdirect.jp/"
    echo ""
    echo "📌 .com/.netドメイン:"
    echo "   - Namecheap: https://www.namecheap.com/"
    echo "   - GoDaddy: https://www.godaddy.com/"
    echo "   - Google Domains: https://domains.google/"
    echo ""
}

# 結果サマリー表示
show_summary() {
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           📊 チェック結果サマリー        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    
    for domain in "${DOMAINS[@]}"; do
        case "${results[$domain]}" in
            "available")
                echo -e "  ${GREEN}✓${NC} $domain - 取得可能"
                ;;
            "registered")
                echo -e "  ${RED}✗${NC} $domain - 登録済み"
                ;;
            "uncertain")
                echo -e "  ${YELLOW}?${NC} $domain - 要確認"
                ;;
        esac
    done
    echo ""
    
    # 取得可能なドメインがある場合
    local available_count=0
    for domain in "${DOMAINS[@]}"; do
        if [ "${results[$domain]}" = "available" ]; then
            ((available_count++))
        fi
    done
    
    if [ $available_count -gt 0 ]; then
        echo -e "${GREEN}🎉 $available_count 個のドメインが取得可能です！${NC}"
        echo ""
        echo "次のステップ:"
        echo "1. レジストラで最終確認"
        echo "2. 価格比較"
        echo "3. 早めの取得（他の人に取られる前に！）"
    fi
}

# 依存関係チェック
check_dependencies() {
    local missing=()
    
    if ! command -v curl >/dev/null 2>&1; then
        missing+=("curl")
    fi
    
    if ! command -v nslookup >/dev/null 2>&1; then
        missing+=("dnsutils")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  以下のツールをインストールすることを推奨します:${NC}"
        for tool in "${missing[@]}"; do
            echo "  - $tool"
        done
        echo ""
        echo "macOSの場合: brew install ${missing[*]}"
        echo ""
    fi
}

# メイン処理
main() {
    show_banner
    check_dependencies
    
    # 各ドメインをチェック
    for domain in "${DOMAINS[@]}"; do
        check_domain "$domain"
        sleep 1  # レート制限対策
    done
    
    show_registrar_info
    show_summary
}

# 実行
main