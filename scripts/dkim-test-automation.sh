#!/bin/bash

# DKIM自動テストスクリプト
# 使用方法: ./dkim-test-automation.sh yourdomain.com [selector] [test-email]

set -e

# 色付け用の変数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 設定
DOMAIN=${1:-""}
SELECTOR=${2:-"mail"}
TEST_EMAIL=${3:-""}
REPORT_FILE="dkim-test-report-$(date +%Y%m%d-%H%M%S).txt"
TEMP_DIR="/tmp/dkim-test-$$"

# 引数チェック
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}エラー: ドメイン名を指定してください${NC}"
    echo "使用方法: $0 <domain> [selector] [test-email]"
    echo "例: $0 example.com mail test@gmail.com"
    exit 1
fi

# 一時ディレクトリ作成
mkdir -p "$TEMP_DIR"

# クリーンアップ関数
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# レポートヘッダー
{
    echo "======================================"
    echo "DKIM設定自動テストレポート"
    echo "======================================"
    echo ""
    echo "テスト実行日時: $(date)"
    echo "ドメイン: $DOMAIN"
    echo "セレクタ: $SELECTOR"
    echo ""
} | tee "$REPORT_FILE"

# 関数: テスト結果の記録
log_result() {
    local test_name=$1
    local status=$2
    local details=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: ${GREEN}成功${NC}" | tee -a "$REPORT_FILE"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $test_name: ${YELLOW}警告${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "${RED}✗${NC} $test_name: ${RED}失敗${NC}" | tee -a "$REPORT_FILE"
    fi
    
    if [ ! -z "$details" ]; then
        echo "  詳細: $details" | tee -a "$REPORT_FILE"
    fi
    echo "" | tee -a "$REPORT_FILE"
}

# テスト1: DNS設定確認
echo -e "${BLUE}=== Phase 1: DNS設定確認 ===${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# DKIM TXTレコード確認
dkim_txt=$(dig +short ${SELECTOR}._domainkey.${DOMAIN} TXT 2>/dev/null | tr -d '"' | tr -d ' ')
if [[ $dkim_txt == *"v=DKIM1"* ]]; then
    log_result "DKIM TXTレコード" "PASS" "レコードが見つかりました"
    
    # 公開鍵の詳細確認
    if [[ $dkim_txt == *"k=rsa"* ]]; then
        log_result "暗号化方式" "PASS" "RSA"
    fi
    
    if [[ $dkim_txt == *"t=y"* ]]; then
        log_result "テストモード" "WARN" "テストモードが有効です"
    fi
    
    # 鍵長の推定
    key_part=$(echo "$dkim_txt" | grep -oP 'p=\K[^;]+' | tr -d ' ')
    if [ ! -z "$key_part" ]; then
        key_bits=$((${#key_part} * 6))
        if [ $key_bits -ge 2048 ]; then
            log_result "鍵長" "PASS" "約 $key_bits ビット"
        else
            log_result "鍵長" "WARN" "約 $key_bits ビット (2048ビット以上推奨)"
        fi
    fi
else
    # CNAME確認
    dkim_cname=$(dig +short ${SELECTOR}._domainkey.${DOMAIN} CNAME 2>/dev/null)
    if [ ! -z "$dkim_cname" ]; then
        log_result "DKIM CNAMEレコード" "PASS" "$dkim_cname"
    else
        log_result "DKIMレコード" "FAIL" "TXTもCNAMEも見つかりません"
    fi
fi

# SPFレコード確認
spf_record=$(dig +short ${DOMAIN} TXT | grep "v=spf1" | head -n 1)
if [ ! -z "$spf_record" ]; then
    log_result "SPFレコード" "PASS" "設定済み"
    
    # さくらインターネットのSPF確認
    if [[ $spf_record == *"_spf.sakura.ne.jp"* ]]; then
        log_result "さくらSPF" "PASS" "含まれています"
    fi
    
    # 外部サービスのSPF確認
    if [[ $spf_record == *"sendgrid.net"* ]]; then
        log_result "SendGrid SPF" "PASS" "含まれています"
    fi
else
    log_result "SPFレコード" "FAIL" "見つかりません"
fi

# DMARCレコード確認
dmarc_record=$(dig +short _dmarc.${DOMAIN} TXT | head -n 1)
if [ ! -z "$dmarc_record" ]; then
    if [[ $dmarc_record == *"p=reject"* ]]; then
        log_result "DMARCレコード" "PASS" "厳格なポリシー (reject)"
    elif [[ $dmarc_record == *"p=quarantine"* ]]; then
        log_result "DMARCレコード" "PASS" "中程度のポリシー (quarantine)"
    else
        log_result "DMARCレコード" "WARN" "監視モード (none)"
    fi
else
    log_result "DMARCレコード" "WARN" "未設定（推奨）"
fi

# テスト2: オンラインツールでの確認
echo -e "${BLUE}=== Phase 2: オンラインツール確認 ===${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# MXToolboxチェック（API利用可能な場合）
if command -v curl &> /dev/null; then
    echo "MXToolbox DKIM確認中..." | tee -a "$REPORT_FILE"
    
    # DNSクエリテスト
    mxtoolbox_result=$(curl -s "https://mxtoolbox.com/api/v1/lookup/dkim/${DOMAIN}:${SELECTOR}" 2>/dev/null || echo "")
    if [ ! -z "$mxtoolbox_result" ]; then
        log_result "MXToolbox確認" "PASS" "APIアクセス成功"
    else
        log_result "MXToolbox確認" "WARN" "手動確認が必要: https://mxtoolbox.com/dkim.aspx"
    fi
fi

# テスト3: メール送信テスト（オプション）
if [ ! -z "$TEST_EMAIL" ]; then
    echo -e "${BLUE}=== Phase 3: メール送信テスト ===${NC}" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    
    # メール送信機能の確認
    if command -v mail &> /dev/null || command -v sendmail &> /dev/null; then
        TEST_ID="DKIM-TEST-$(date +%s)"
        TEST_SUBJECT="DKIM Test [$TEST_ID]"
        TEST_BODY="This is an automated DKIM test email.\n\nTest ID: $TEST_ID\nDomain: $DOMAIN\nSelector: $SELECTOR\nTimestamp: $(date)"
        
        echo -e "$TEST_BODY" | mail -s "$TEST_SUBJECT" "$TEST_EMAIL" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            log_result "テストメール送信" "PASS" "送信先: $TEST_EMAIL"
            echo "  メールを確認してDKIM署名を検証してください" | tee -a "$REPORT_FILE"
            echo "  件名: $TEST_SUBJECT" | tee -a "$REPORT_FILE"
        else
            log_result "テストメール送信" "FAIL" "送信エラー"
        fi
    else
        log_result "メール送信" "WARN" "mailコマンドが利用できません"
    fi
fi

# テスト4: ローカルサービス確認（VPSの場合）
if [ -f /etc/opendkim.conf ]; then
    echo -e "${BLUE}=== Phase 4: ローカルサービス確認 ===${NC}" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    
    # OpenDKIMサービス状態
    if systemctl is-active opendkim &>/dev/null; then
        log_result "OpenDKIMサービス" "PASS" "稼働中"
        
        # 設定ファイルの検証
        if grep -q "Domain.*${DOMAIN}" /etc/opendkim.conf; then
            log_result "OpenDKIM設定" "PASS" "ドメイン設定確認"
        else
            log_result "OpenDKIM設定" "WARN" "ドメイン設定を確認してください"
        fi
        
        # 鍵ファイルの存在確認
        if [ -f "/etc/opendkim/keys/${DOMAIN}/${SELECTOR}.private" ]; then
            log_result "秘密鍵ファイル" "PASS" "存在確認"
        else
            log_result "秘密鍵ファイル" "WARN" "標準パスに見つかりません"
        fi
    else
        log_result "OpenDKIMサービス" "FAIL" "停止中"
    fi
    
    # Postfix連携確認
    if postconf -h smtpd_milters | grep -q "8891"; then
        log_result "Postfix連携" "PASS" "milter設定確認"
    else
        log_result "Postfix連携" "WARN" "milter設定を確認してください"
    fi
fi

# テスト5: パフォーマンステスト
echo -e "${BLUE}=== Phase 5: パフォーマンステスト ===${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# DNS応答時間
dns_start=$(date +%s%N)
dig +short ${SELECTOR}._domainkey.${DOMAIN} TXT &>/dev/null
dns_end=$(date +%s%N)
dns_time=$(( ($dns_end - $dns_start) / 1000000 ))

if [ $dns_time -lt 100 ]; then
    log_result "DNS応答時間" "PASS" "${dns_time}ms"
elif [ $dns_time -lt 500 ]; then
    log_result "DNS応答時間" "WARN" "${dns_time}ms (やや遅い)"
else
    log_result "DNS応答時間" "FAIL" "${dns_time}ms (遅い)"
fi

# サマリー生成
echo -e "${BLUE}=====================================${NC}" | tee -a "$REPORT_FILE"
echo -e "${BLUE}テストサマリー${NC}" | tee -a "$REPORT_FILE"
echo -e "${BLUE}=====================================${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# 結果カウント
pass_count=$(grep -c "✓" "$REPORT_FILE" || echo 0)
warn_count=$(grep -c "⚠" "$REPORT_FILE" || echo 0)
fail_count=$(grep -c "✗" "$REPORT_FILE" || echo 0)

{
    echo "成功: $pass_count 項目"
    echo "警告: $warn_count 項目"
    echo "失敗: $fail_count 項目"
    echo ""
} | tee -a "$REPORT_FILE"

# 総合評価
if [ $fail_count -eq 0 ]; then
    if [ $warn_count -eq 0 ]; then
        echo -e "${GREEN}総合評価: 優秀 - すべてのテストに合格しました！${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "${GREEN}総合評価: 良好 - 基本設定は完了しています${NC}" | tee -a "$REPORT_FILE"
        echo -e "${YELLOW}  警告項目の改善を検討してください${NC}" | tee -a "$REPORT_FILE"
    fi
else
    echo -e "${RED}総合評価: 要改善 - 失敗項目を修正してください${NC}" | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"

# 推奨アクション
echo -e "${CYAN}推奨される次のステップ:${NC}" | tee -a "$REPORT_FILE"

if [ $fail_count -gt 0 ]; then
    echo "1. 失敗した項目を優先的に修正" | tee -a "$REPORT_FILE"
fi

if [ -z "$TEST_EMAIL" ]; then
    echo "2. メール送信テストの実施 (--test-email オプション)" | tee -a "$REPORT_FILE"
fi

if [ -z "$dmarc_record" ]; then
    echo "3. DMARCレコードの設定" | tee -a "$REPORT_FILE"
fi

echo "4. Mail-Tester.com でのスコア確認" | tee -a "$REPORT_FILE"
echo "5. 定期的な監視の設定" | tee -a "$REPORT_FILE"

echo "" | tee -a "$REPORT_FILE"
echo "詳細なレポートは '$REPORT_FILE' に保存されました" | tee -a "$REPORT_FILE"

# 外部ツールへのリンク
echo "" | tee -a "$REPORT_FILE"
echo -e "${CYAN}追加の検証ツール:${NC}" | tee -a "$REPORT_FILE"
echo "• Mail-Tester: https://www.mail-tester.com/" | tee -a "$REPORT_FILE"
echo "• MXToolbox: https://mxtoolbox.com/dkim.aspx" | tee -a "$REPORT_FILE"
echo "• DKIM Validator: https://dkimvalidator.com/" | tee -a "$REPORT_FILE"
echo "• Port25 Checker: check-auth@verifier.port25.com" | tee -a "$REPORT_FILE"

# 終了コード
if [ $fail_count -gt 0 ]; then
    exit 1
else
    exit 0
fi