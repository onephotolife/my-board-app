#!/bin/bash

# DMARC Phase 1 統合検証スクリプト
# blankinai.com用の包括的な確認ツール

set -e

# 設定
DOMAIN="blankinai.com"
DKIM_SELECTOR="rs20250806"
REPORT_EMAIL="dmarc-reports@${DOMAIN}"
FORENSIC_EMAIL="dmarc-forensics@${DOMAIN}"
LOG_FILE="dmarc-verification-$(date +%Y%m%d-%H%M%S).log"

# 色付け
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# プログレスバー関数
show_progress() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((width * current / total))
    
    printf "\r["
    printf "%${filled}s" | tr ' ' '='
    printf "%$((width - filled))s" | tr ' ' ' '
    printf "] %d%%" $percentage
}

# ログ関数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        SUCCESS)
            echo -e "${GREEN}[✓]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        WARNING)
            echo -e "${YELLOW}[⚠]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        ERROR)
            echo -e "${RED}[✗]${NC} $message" | tee -a "$LOG_FILE"
            ;;
    esac
    
    echo "[$timestamp] $level: $message" >> "$LOG_FILE"
}

# ヘッダー表示
print_header() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          DMARC Phase 1 統合検証ツール                      ║${NC}"
    echo -e "${CYAN}║          Domain: ${YELLOW}$DOMAIN${CYAN}                        ║${NC}"
    echo -e "${CYAN}║          DKIM Selector: ${YELLOW}$DKIM_SELECTOR${CYAN}                     ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${MAGENTA}実行時刻: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${MAGENTA}ログファイル: $LOG_FILE${NC}"
    echo ""
}

# セクション1: DNS設定確認
check_dns_configuration() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}1. DNS設定確認${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local total_checks=6
    local current_check=0
    
    # DMARCレコード確認
    current_check=$((current_check + 1))
    show_progress $current_check $total_checks
    echo -n " DMARCレコード確認中..."
    
    dmarc_record=$(dig +short _dmarc.${DOMAIN} TXT 2>/dev/null | tr -d '"')
    
    if [[ $dmarc_record == *"v=DMARC1"* ]]; then
        echo ""
        log_message SUCCESS "DMARCレコードが見つかりました"
        echo "  $dmarc_record" | tee -a "$LOG_FILE"
        
        # ポリシー確認
        if [[ $dmarc_record == *"p=none"* ]]; then
            log_message SUCCESS "ポリシー: 監視モード (p=none)"
        elif [[ $dmarc_record == *"p=quarantine"* ]]; then
            log_message WARNING "ポリシー: 隔離 (p=quarantine)"
        elif [[ $dmarc_record == *"p=reject"* ]]; then
            log_message WARNING "ポリシー: 拒否 (p=reject)"
        fi
        
        # レポート設定確認
        if [[ $dmarc_record == *"rua=mailto:"* ]]; then
            log_message SUCCESS "集約レポート設定: あり"
        else
            log_message WARNING "集約レポート設定: なし"
        fi
        
        if [[ $dmarc_record == *"ruf=mailto:"* ]]; then
            log_message SUCCESS "フォレンジックレポート設定: あり"
        else
            log_message WARNING "フォレンジックレポート設定: なし"
        fi
    else
        echo ""
        log_message ERROR "DMARCレコードが見つかりません"
    fi
    
    # SPFレコード確認
    current_check=$((current_check + 1))
    show_progress $current_check $total_checks
    echo -n " SPFレコード確認中..."
    
    spf_record=$(dig +short ${DOMAIN} TXT | grep "v=spf1" | head -n 1)
    
    if [ ! -z "$spf_record" ]; then
        echo ""
        log_message SUCCESS "SPFレコードが見つかりました"
        echo "  $spf_record" | tee -a "$LOG_FILE"
        
        if [[ $spf_record == *"_spf.sakura.ne.jp"* ]]; then
            log_message SUCCESS "さくらインターネットのSPF設定: あり"
        fi
    else
        echo ""
        log_message ERROR "SPFレコードが見つかりません"
    fi
    
    # DKIMレコード確認
    current_check=$((current_check + 1))
    show_progress $current_check $total_checks
    echo -n " DKIMレコード確認中..."
    
    dkim_txt=$(dig +short ${DKIM_SELECTOR}._domainkey.${DOMAIN} TXT 2>/dev/null | tr -d '"')
    dkim_cname=$(dig +short ${DKIM_SELECTOR}._domainkey.${DOMAIN} CNAME 2>/dev/null)
    
    if [[ $dkim_txt == *"v=DKIM1"* ]]; then
        echo ""
        log_message SUCCESS "DKIM TXTレコードが見つかりました"
        
        # 鍵長推定
        if [[ $dkim_txt == *"p="* ]]; then
            key_part=$(echo "$dkim_txt" | grep -oP 'p=\K[^;]+' | tr -d ' ')
            key_bits=$((${#key_part} * 6))
            log_message INFO "推定鍵長: 約 $key_bits ビット"
        fi
    elif [ ! -z "$dkim_cname" ]; then
        echo ""
        log_message SUCCESS "DKIM CNAMEレコードが見つかりました"
        echo "  $dkim_cname" | tee -a "$LOG_FILE"
    else
        echo ""
        log_message ERROR "DKIMレコードが見つかりません"
    fi
    
    # MXレコード確認
    current_check=$((current_check + 1))
    show_progress $current_check $total_checks
    echo -n " MXレコード確認中..."
    
    mx_records=$(dig +short ${DOMAIN} MX)
    
    if [ ! -z "$mx_records" ]; then
        echo ""
        log_message SUCCESS "MXレコードが見つかりました"
        echo "$mx_records" | while read mx; do
            echo "  $mx" | tee -a "$LOG_FILE"
        done
    else
        echo ""
        log_message ERROR "MXレコードが見つかりません"
    fi
    
    # DNS伝播確認（複数リゾルバ）
    current_check=$((current_check + 1))
    show_progress $current_check $total_checks
    echo -n " DNS伝播確認中..."
    echo ""
    
    resolvers=("8.8.8.8" "1.1.1.1" "208.67.222.222")
    resolver_names=("Google" "Cloudflare" "OpenDNS")
    
    for i in "${!resolvers[@]}"; do
        resolver="${resolvers[$i]}"
        name="${resolver_names[$i]}"
        
        result=$(dig @${resolver} _dmarc.${DOMAIN} TXT +short 2>/dev/null)
        if [[ $result == *"v=DMARC1"* ]]; then
            log_message SUCCESS "DNS伝播確認 ($name): OK"
        else
            log_message WARNING "DNS伝播確認 ($name): 未確認"
        fi
    done
    
    # TTL確認
    current_check=$((current_check + 1))
    show_progress $current_check $total_checks
    echo -n " TTL確認中..."
    
    ttl=$(dig _dmarc.${DOMAIN} TXT +noall +answer | awk '{print $2}')
    echo ""
    log_message INFO "DMARCレコードTTL: ${ttl}秒"
    
    echo ""
}

# セクション2: オンライン検証
online_verification() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}2. オンライン検証ツール${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    log_message INFO "以下のツールで手動確認を推奨:"
    echo ""
    
    echo -e "${CYAN}1. MXToolbox DMARC Check${NC}"
    echo "   URL: https://mxtoolbox.com/SuperTool.aspx?action=dmarc%3a${DOMAIN}"
    echo ""
    
    echo -e "${CYAN}2. DMARC Analyzer${NC}"
    echo "   URL: https://www.dmarcanalyzer.com/dmarc/dmarc-record-check/"
    echo "   入力: ${DOMAIN}"
    echo ""
    
    echo -e "${CYAN}3. Dmarcian Inspector${NC}"
    echo "   URL: https://dmarcian.com/dmarc-inspector/"
    echo "   入力: ${DOMAIN}"
    echo ""
    
    echo -e "${CYAN}4. Google Admin Toolbox${NC}"
    echo "   URL: https://toolbox.googleapps.com/apps/checkmx/"
    echo "   入力: ${DOMAIN}"
    echo ""
}

# セクション3: メール送信テスト
email_test_instructions() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}3. メール送信テスト${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    log_message INFO "以下のサービスにテストメールを送信してください:"
    echo ""
    
    echo -e "${CYAN}推奨テストサービス:${NC}"
    echo ""
    
    echo "1. ${GREEN}Mail-Tester${NC} (最も詳細)"
    echo "   → https://www.mail-tester.com/"
    echo "   → 一時アドレスを取得してテスト送信"
    echo ""
    
    echo "2. ${GREEN}Port25 Verifier${NC} (自動返信)"
    echo "   → 送信先: check-auth@verifier.port25.com"
    echo "   → 結果が自動返信される"
    echo ""
    
    echo "3. ${GREEN}DKIM Validator${NC}"
    echo "   → https://dkimvalidator.com/"
    echo "   → DKIM専門の検証"
    echo ""
    
    # テストメール送信オプション
    echo -n "テストメールを送信しますか？ (y/n): "
    read -r send_test
    
    if [ "$send_test" = "y" ]; then
        echo -n "送信先メールアドレスを入力: "
        read -r test_email
        
        if [ ! -z "$test_email" ]; then
            test_id="DMARC-TEST-$(date +%s)"
            echo "DMARC Phase 1 Verification Test" | \
                mail -s "Test $test_id from ${DOMAIN}" "$test_email" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                log_message SUCCESS "テストメール送信完了: $test_email"
                log_message INFO "Test ID: $test_id"
            else
                log_message ERROR "テストメール送信失敗"
            fi
        fi
    fi
    echo ""
}

# セクション4: レポート受信確認
report_check() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}4. レポート受信確認${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    log_message INFO "DMARCレポートは通常24-48時間後に届きます"
    echo ""
    
    echo -e "${YELLOW}期待されるレポート送信元:${NC}"
    echo "• Google: noreply-dmarc-support@google.com"
    echo "• Yahoo: dmarc_support@yahoo.com"
    echo "• Microsoft: dmarcreport@microsoft.com"
    echo "• Amazon: dmarcreports@amazon.com"
    echo ""
    
    echo -e "${YELLOW}レポート確認方法:${NC}"
    echo "1. ${REPORT_EMAIL} のメールボックスを確認"
    echo "2. スパムフォルダも確認"
    echo "3. 圧縮ファイル（.xml.gz）として届く"
    echo ""
    
    # レポートディレクトリ作成
    if [ ! -d "dmarc-reports" ]; then
        mkdir -p dmarc-reports
        log_message INFO "レポート保存ディレクトリを作成: dmarc-reports/"
    fi
    
    echo -e "${CYAN}レポート分析コマンド:${NC}"
    echo "python3 scripts/dmarc-report-analyzer.py dmarc-reports/*.xml"
    echo ""
}

# セクション5: 総合評価
comprehensive_assessment() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}5. 総合評価${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local pass_count=0
    local fail_count=0
    local warn_count=0
    
    # ログファイルから統計取得
    if [ -f "$LOG_FILE" ]; then
        pass_count=$(grep -c "\[✓\]" "$LOG_FILE" || echo 0)
        fail_count=$(grep -c "\[✗\]" "$LOG_FILE" || echo 0)
        warn_count=$(grep -c "\[⚠\]" "$LOG_FILE" || echo 0)
    fi
    
    echo -e "${GREEN}成功項目: $pass_count${NC}"
    echo -e "${YELLOW}警告項目: $warn_count${NC}"
    echo -e "${RED}失敗項目: $fail_count${NC}"
    echo ""
    
    # 準備状況判定
    if [ $fail_count -eq 0 ]; then
        if [ $warn_count -eq 0 ]; then
            echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║     ✅ DMARC Phase 1 設定は完璧です！                  ║${NC}"
            echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
        else
            echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
            echo -e "${YELLOW}║     ⚠️  DMARC Phase 1 設定は良好です                    ║${NC}"
            echo -e "${YELLOW}║     警告項目の改善を検討してください                    ║${NC}"
            echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
        fi
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║     ❌ 設定に問題があります                            ║${NC}"
        echo -e "${RED}║     失敗項目を修正してください                          ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    fi
    echo ""
}

# セクション6: 次のステップ
next_steps() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}6. 次のステップ${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${CYAN}今後のタスク:${NC}"
    echo ""
    echo "□ 24時間後: 初回レポート確認"
    echo "□ 48時間後: レポート分析開始"
    echo "□ 1週間後: 統計データ評価"
    echo "□ 2週間後: Phase 2への移行検討"
    echo ""
    
    echo -e "${CYAN}定期監視コマンド:${NC}"
    echo "• 状態確認: ./scripts/dmarc-deployment-manager.sh status"
    echo "• 総合チェック: ./scripts/dmarc-deployment-manager.sh check"
    echo "• レポート分析: python3 scripts/dmarc-report-analyzer.py"
    echo "• リアルタイム監視: ./scripts/dmarc-deployment-manager.sh monitor"
    echo ""
    
    echo -e "${CYAN}Phase 2移行条件:${NC}"
    echo "✓ 認証成功率 95%以上"
    echo "✓ 2週間以上の安定運用"
    echo "✓ 重大な問題なし"
    echo ""
}

# メイン処理
main() {
    print_header
    
    # 各セクション実行
    check_dns_configuration
    online_verification
    email_test_instructions
    report_check
    comprehensive_assessment
    next_steps
    
    # ログファイル保存
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}検証完了${NC}"
    echo -e "${MAGENTA}詳細ログ: $LOG_FILE${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 実行
main