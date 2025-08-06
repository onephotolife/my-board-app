#!/bin/bash

# DMARC段階的導入管理スクリプト
# blankinai.com用にカスタマイズ

set -e

# 設定
DOMAIN="blankinai.com"
DKIM_SELECTOR="rs20250806"
REPORT_EMAIL="dmarc-reports@${DOMAIN}"
FORENSIC_EMAIL="dmarc-forensics@${DOMAIN}"

# 色付け
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 現在の日付
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# 使用方法
usage() {
    cat << EOF
使用方法: $0 [コマンド] [オプション]

コマンド:
    status      - 現在のDMARC設定を確認
    check       - SPF/DKIM/DMARCの総合チェック
    phase1      - Phase 1 (監視モード) を設定
    phase2      - Phase 2 (部分隔離10%) を設定
    phase3      - Phase 3 (隔離50%) を設定
    phase4      - Phase 4 (完全隔離) を設定
    phase5      - Phase 5 (拒否) を設定
    rollback    - 緊急時に監視モードに戻す
    report      - 最新のレポート分析を表示
    monitor     - リアルタイム監視を開始

オプション:
    -d DOMAIN   - ドメイン指定（デフォルト: blankinai.com）
    -s SELECTOR - DKIMセレクタ指定（デフォルト: rs20250806）
    -h          - このヘルプを表示

例:
    $0 status
    $0 phase1
    $0 check -d example.com
EOF
    exit 0
}

# 関数: 現在のDMARC設定を確認
check_current_dmarc() {
    echo -e "${BLUE}現在のDMARC設定を確認中...${NC}"
    
    current=$(dig +short _dmarc.${DOMAIN} TXT | tr -d '"')
    
    if [ -z "$current" ]; then
        echo -e "${RED}DMARCレコードが設定されていません${NC}"
        return 1
    else
        echo -e "${GREEN}現在の設定:${NC}"
        echo "$current"
        
        # ポリシーレベルを解析
        if [[ $current == *"p=reject"* ]]; then
            echo -e "${GREEN}現在のフェーズ: Phase 5 (拒否)${NC}"
        elif [[ $current == *"p=quarantine"* ]]; then
            if [[ $current == *"pct=100"* ]]; then
                echo -e "${YELLOW}現在のフェーズ: Phase 4 (完全隔離)${NC}"
            elif [[ $current == *"pct=50"* ]]; then
                echo -e "${YELLOW}現在のフェーズ: Phase 3 (隔離50%)${NC}"
            else
                echo -e "${YELLOW}現在のフェーズ: Phase 2 (部分隔離)${NC}"
            fi
        else
            echo -e "${CYAN}現在のフェーズ: Phase 1 (監視モード)${NC}"
        fi
    fi
    echo ""
}

# 関数: SPF/DKIM/DMARC総合チェック
comprehensive_check() {
    echo -e "${BLUE}=== メール認証総合チェック ===${NC}"
    echo "ドメイン: $DOMAIN"
    echo "DKIMセレクタ: $DKIM_SELECTOR"
    echo "実行時刻: $(date)"
    echo ""
    
    # SPFチェック
    echo -e "${CYAN}[SPF チェック]${NC}"
    spf=$(dig +short ${DOMAIN} TXT | grep "v=spf1" | head -n 1)
    if [ ! -z "$spf" ]; then
        echo -e "${GREEN}✓ SPFレコード設定済み${NC}"
        echo "  $spf"
        
        # さくらインターネットのSPF確認
        if [[ $spf == *"_spf.sakura.ne.jp"* ]]; then
            echo -e "${GREEN}  ✓ さくらインターネットSPF含む${NC}"
        else
            echo -e "${YELLOW}  ⚠ さくらインターネットSPF未設定${NC}"
        fi
    else
        echo -e "${RED}✗ SPFレコード未設定${NC}"
    fi
    echo ""
    
    # DKIMチェック
    echo -e "${CYAN}[DKIM チェック]${NC}"
    dkim_txt=$(dig +short ${DKIM_SELECTOR}._domainkey.${DOMAIN} TXT | tr -d '"')
    dkim_cname=$(dig +short ${DKIM_SELECTOR}._domainkey.${DOMAIN} CNAME)
    
    if [[ $dkim_txt == *"v=DKIM1"* ]]; then
        echo -e "${GREEN}✓ DKIM TXTレコード設定済み${NC}"
        
        # 鍵長チェック
        if [[ $dkim_txt == *"p="* ]]; then
            key_part=$(echo "$dkim_txt" | grep -oP 'p=\K[^;]+' | tr -d ' ')
            key_bits=$((${#key_part} * 6))
            echo "  推定鍵長: 約 $key_bits ビット"
        fi
    elif [ ! -z "$dkim_cname" ]; then
        echo -e "${GREEN}✓ DKIM CNAMEレコード設定済み${NC}"
        echo "  $dkim_cname"
    else
        echo -e "${RED}✗ DKIMレコード未設定${NC}"
    fi
    echo ""
    
    # DMARCチェック
    echo -e "${CYAN}[DMARC チェック]${NC}"
    check_current_dmarc
    
    # 準備状況評価
    echo -e "${BLUE}=== 準備状況評価 ===${NC}"
    ready_for_next=true
    
    if [ -z "$spf" ]; then
        echo -e "${RED}✗ SPF未設定: DMARCの前提条件を満たしていません${NC}"
        ready_for_next=false
    fi
    
    if [ -z "$dkim_txt" ] && [ -z "$dkim_cname" ]; then
        echo -e "${RED}✗ DKIM未設定: DMARCの前提条件を満たしていません${NC}"
        ready_for_next=false
    fi
    
    if $ready_for_next; then
        echo -e "${GREEN}✓ 次のDMARCフェーズへ進む準備ができています${NC}"
    else
        echo -e "${RED}✗ 基本設定を完了してからDMARCを設定してください${NC}"
    fi
    echo ""
}

# 関数: DMARC設定を更新
set_dmarc_phase() {
    local phase=$1
    local record=""
    
    case $phase in
        1)
            echo -e "${CYAN}Phase 1: 監視モードを設定${NC}"
            record="v=DMARC1; p=none; rua=mailto:${REPORT_EMAIL}; ruf=mailto:${FORENSIC_EMAIL}; sp=none; adkim=r; aspf=r; pct=100; ri=86400"
            ;;
        2)
            echo -e "${YELLOW}Phase 2: 部分隔離（10%）を設定${NC}"
            record="v=DMARC1; p=quarantine; rua=mailto:${REPORT_EMAIL}; ruf=mailto:${FORENSIC_EMAIL}; sp=none; adkim=r; aspf=r; pct=10; ri=86400"
            ;;
        3)
            echo -e "${YELLOW}Phase 3: 隔離（50%）を設定${NC}"
            record="v=DMARC1; p=quarantine; rua=mailto:${REPORT_EMAIL}; ruf=mailto:${FORENSIC_EMAIL}; sp=quarantine; adkim=r; aspf=r; pct=50; ri=86400"
            ;;
        4)
            echo -e "${YELLOW}Phase 4: 完全隔離を設定${NC}"
            record="v=DMARC1; p=quarantine; rua=mailto:${REPORT_EMAIL}; ruf=mailto:${FORENSIC_EMAIL}; sp=quarantine; adkim=s; aspf=s; pct=100; ri=86400"
            ;;
        5)
            echo -e "${RED}Phase 5: 拒否ポリシーを設定${NC}"
            record="v=DMARC1; p=reject; rua=mailto:${REPORT_EMAIL}; ruf=mailto:${FORENSIC_EMAIL}; sp=reject; adkim=s; aspf=s; pct=100; ri=86400"
            ;;
        rollback)
            echo -e "${RED}緊急ロールバック: 監視モードに戻す${NC}"
            record="v=DMARC1; p=none; rua=mailto:${REPORT_EMAIL}; sp=none"
            ;;
        *)
            echo -e "${RED}無効なフェーズ: $phase${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo "設定するDMARCレコード:"
    echo -e "${GREEN}_dmarc.${DOMAIN} TXT \"$record\"${NC}"
    echo ""
    
    # 確認
    echo -n "この設定を適用しますか？ (y/n): "
    read -r confirm
    
    if [ "$confirm" != "y" ]; then
        echo "キャンセルされました"
        exit 0
    fi
    
    # DNS更新の指示
    echo ""
    echo -e "${YELLOW}=== DNS設定手順 ===${NC}"
    echo "1. さくらインターネットのコントロールパネルにログイン"
    echo "2. ドメイン管理 → ${DOMAIN} → ゾーン編集"
    echo "3. 以下のレコードを設定:"
    echo ""
    echo "エントリ名: _dmarc"
    echo "種別: TXT"
    echo "値: \"$record\""
    echo ""
    echo "4. 設定を保存"
    echo ""
    
    # 設定後の確認コマンド
    echo -e "${CYAN}=== 設定確認コマンド ===${NC}"
    echo "# DNS伝播確認（数分～48時間かかる場合があります）"
    echo "dig _dmarc.${DOMAIN} TXT"
    echo ""
    echo "# 複数のDNSサーバーから確認"
    echo "dig @8.8.8.8 _dmarc.${DOMAIN} TXT"
    echo "dig @1.1.1.1 _dmarc.${DOMAIN} TXT"
    echo ""
    
    # フェーズ別の注意事項
    case $phase in
        1)
            echo -e "${BLUE}Phase 1の推奨期間: 1-2週間${NC}"
            echo "• レポートを収集し、正当な送信元を確認"
            echo "• SPF/DKIM設定の問題を修正"
            ;;
        2)
            echo -e "${YELLOW}Phase 2の推奨期間: 2-4週間${NC}"
            echo "• 10%のメールが隔離される可能性"
            echo "• ユーザーからの問い合わせに注意"
            ;;
        3)
            echo -e "${YELLOW}Phase 3の推奨期間: 2-4週間${NC}"
            echo "• 50%のメールが隔離される可能性"
            echo "• 誤検知の監視を強化"
            ;;
        4)
            echo -e "${YELLOW}Phase 4の推奨期間: 2-4週間${NC}"
            echo "• すべての不正メールが隔離"
            echo "• 厳格なアライメントモード"
            ;;
        5)
            echo -e "${RED}Phase 5: 最終段階${NC}"
            echo "• 不正メールは完全に拒否されます"
            echo "• ロールバック手順を準備しておくこと"
            ;;
    esac
}

# 関数: レポート分析
analyze_reports() {
    echo -e "${BLUE}=== DMARCレポート分析 ===${NC}"
    
    # レポートディレクトリの確認
    REPORT_DIR="./dmarc-reports"
    if [ ! -d "$REPORT_DIR" ]; then
        echo -e "${YELLOW}レポートディレクトリが見つかりません${NC}"
        echo "レポートファイルを $REPORT_DIR に配置してください"
        mkdir -p "$REPORT_DIR"
        exit 1
    fi
    
    # レポートファイルの検索
    report_files=$(find "$REPORT_DIR" -type f \( -name "*.xml" -o -name "*.gz" -o -name "*.zip" \) 2>/dev/null)
    
    if [ -z "$report_files" ]; then
        echo -e "${YELLOW}レポートファイルが見つかりません${NC}"
        echo "$REPORT_DIR にDMARCレポートファイルを配置してください"
        exit 1
    fi
    
    # Python分析ツールの実行
    if [ -f "./scripts/dmarc-report-analyzer.py" ]; then
        echo "レポートを分析中..."
        python3 ./scripts/dmarc-report-analyzer.py $report_files
    else
        echo -e "${RED}分析ツールが見つかりません${NC}"
        echo "scripts/dmarc-report-analyzer.py が必要です"
    fi
}

# 関数: リアルタイム監視
monitor_dmarc() {
    echo -e "${BLUE}=== DMARCリアルタイム監視 ===${NC}"
    echo "5分ごとにDNS設定をチェックします（Ctrl+Cで終了）"
    echo ""
    
    while true; do
        clear
        echo -e "${CYAN}監視時刻: $(date)${NC}"
        echo "=" * 60
        
        # DNS設定チェック
        echo -e "${YELLOW}DMARC:${NC}"
        dig +short _dmarc.${DOMAIN} TXT | tr -d '"'
        echo ""
        
        echo -e "${YELLOW}SPF:${NC}"
        dig +short ${DOMAIN} TXT | grep "v=spf1"
        echo ""
        
        echo -e "${YELLOW}DKIM (${DKIM_SELECTOR}):${NC}"
        dig +short ${DKIM_SELECTOR}._domainkey.${DOMAIN} TXT | head -n 1
        echo ""
        
        # MXレコード
        echo -e "${YELLOW}MX:${NC}"
        dig +short ${DOMAIN} MX
        echo ""
        
        echo "次回更新: 5分後"
        sleep 300
    done
}

# メイン処理
case "${1:-}" in
    status)
        check_current_dmarc
        ;;
    check)
        comprehensive_check
        ;;
    phase1)
        set_dmarc_phase 1
        ;;
    phase2)
        set_dmarc_phase 2
        ;;
    phase3)
        set_dmarc_phase 3
        ;;
    phase4)
        set_dmarc_phase 4
        ;;
    phase5)
        set_dmarc_phase 5
        ;;
    rollback)
        set_dmarc_phase rollback
        ;;
    report)
        analyze_reports
        ;;
    monitor)
        monitor_dmarc
        ;;
    -h|--help|help)
        usage
        ;;
    *)
        echo -e "${RED}無効なコマンド: ${1:-}${NC}"
        echo ""
        usage
        ;;
esac