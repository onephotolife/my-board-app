#!/bin/bash

# さくらインターネット ドメイン設定ガイドスクリプト
# 対話形式でドメイン設定をサポート

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ドメイン情報
DOMAIN=""
EMAIL=""
SERVER_IP=""

# バナー表示
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║    🌸 さくらインターネット 設定ガイド 🌸     ║"
    echo "║         ドメイン取得後の設定支援             ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ステップ1: 基本情報収集
collect_info() {
    echo -e "${BLUE}ステップ1: 基本情報の入力${NC}"
    echo ""
    
    # ドメイン名
    echo -n "取得したドメイン名（例: myboard.jp）: "
    read -r DOMAIN
    
    # メールアドレス
    echo -n "管理用メールアドレス: "
    read -r EMAIL
    
    # サーバーIP
    echo -n "サーバーのIPアドレス（Vercelの場合は 76.76.21.21）: "
    read -r SERVER_IP
    
    echo ""
    echo -e "${GREEN}✓ 基本情報を受け付けました${NC}"
}

# ステップ2: DNS設定生成
generate_dns() {
    echo ""
    echo -e "${BLUE}ステップ2: DNS設定の生成${NC}"
    echo ""
    echo "さくらインターネットの管理画面で以下を設定してください："
    echo ""
    echo -e "${YELLOW}【Aレコード】${NC}"
    echo "ホスト名: @ (または空欄)"
    echo "タイプ: A"
    echo "値: $SERVER_IP"
    echo "TTL: 3600"
    echo ""
    echo -e "${YELLOW}【CNAMEレコード】${NC}"
    echo "ホスト名: www"
    echo "タイプ: CNAME"
    echo "値: $DOMAIN"
    echo "TTL: 3600"
    echo ""
    
    # Vercel用の追加設定
    if [[ "$SERVER_IP" == "76.76.21.21" ]]; then
        echo -e "${CYAN}📌 Vercel用の追加設定${NC}"
        echo "Vercelダッシュボードでドメインを追加："
        echo "1. Vercel → Settings → Domains"
        echo "2. Add Domain → $DOMAIN"
        echo "3. www.$DOMAIN も追加"
        echo ""
    fi
    
    # DNSレコード保存
    mkdir -p dns-config
    cat > "dns-config/${DOMAIN}_dns.txt" << EOF
# DNS設定記録
# 作成日: $(date)
# ドメイン: $DOMAIN

# Aレコード
@ A $SERVER_IP

# CNAMEレコード  
www CNAME $DOMAIN

# MXレコード（メール利用時）
# @ MX 10 mail.$DOMAIN

# TXTレコード（SPF）
# @ TXT "v=spf1 include:spf.sakura.ne.jp ~all"
EOF
    
    echo -e "${GREEN}✓ DNS設定を dns-config/${DOMAIN}_dns.txt に保存しました${NC}"
}

# ステップ3: メール設定生成
generate_mail() {
    echo ""
    echo -e "${BLUE}ステップ3: メールアドレス設定${NC}"
    echo ""
    echo "推奨メールアドレス:"
    echo ""
    echo -e "${YELLOW}【基本メールアドレス】${NC}"
    echo "info@$DOMAIN      - 総合窓口"
    echo "support@$DOMAIN   - サポート用"
    echo "admin@$DOMAIN     - 管理者用"
    echo "noreply@$DOMAIN   - 送信専用"
    echo ""
    
    # メール設定保存
    cat > "dns-config/${DOMAIN}_mail.txt" << EOF
# メール設定記録
# 作成日: $(date)
# ドメイン: $DOMAIN

# 推奨メールアドレス
info@$DOMAIN
support@$DOMAIN
admin@$DOMAIN
noreply@$DOMAIN

# MXレコード設定（さくらのメール使用時）
@ MX 10 mail.$DOMAIN

# SPFレコード
@ TXT "v=spf1 include:spf.sakura.ne.jp ~all"

# メールクライアント設定
受信サーバー（IMAP）: mail.$DOMAIN
ポート: 993（SSL）
送信サーバー（SMTP）: mail.$DOMAIN
ポート: 587（STARTTLS）
EOF
    
    echo -e "${GREEN}✓ メール設定を dns-config/${DOMAIN}_mail.txt に保存しました${NC}"
}

# ステップ4: SSL設定ガイド
generate_ssl() {
    echo ""
    echo -e "${BLUE}ステップ4: SSL証明書の設定${NC}"
    echo ""
    
    echo "SSL証明書の選択:"
    echo "1) Let's Encrypt（無料・自動更新）"
    echo "2) さくらのSSL（有料・サポート付き）"
    echo -n "選択 (1-2): "
    read -r SSL_CHOICE
    
    case $SSL_CHOICE in
        1)
            echo ""
            echo -e "${YELLOW}【Let's Encrypt設定手順】${NC}"
            echo "1. さくらのコントロールパネルにログイン"
            echo "2. ドメイン/SSL → SSL証明書"
            echo "3. 無料SSL証明書 → Let's Encrypt"
            echo "4. 利用するをクリック"
            echo ""
            echo -e "${CYAN}自動更新の確認を忘れずに！${NC}"
            ;;
        2)
            echo ""
            echo -e "${YELLOW}【さくらのSSL設定手順】${NC}"
            echo "1. SSL証明書の種類を選択"
            echo "   - ドメイン認証（DV）: 年額990円〜"
            echo "   - 企業認証（OV）: 年額49,500円〜"
            echo "2. CSRの生成"
            echo "3. 承認メールの確認（admin@$DOMAIN）"
            echo "4. 証明書のインストール"
            ;;
    esac
    
    # SSL設定保存
    cat > "dns-config/${DOMAIN}_ssl.txt" << EOF
# SSL設定記録
# 作成日: $(date)
# ドメイン: $DOMAIN

# 選択したSSL: $([ "$SSL_CHOICE" == "1" ] && echo "Let's Encrypt" || echo "さくらのSSL")

# HTTPSリダイレクト設定（.htaccess）
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# セキュリティヘッダー
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
EOF
    
    echo -e "${GREEN}✓ SSL設定を dns-config/${DOMAIN}_ssl.txt に保存しました${NC}"
}

# ステップ5: 監視設定
generate_monitoring() {
    echo ""
    echo -e "${BLUE}ステップ5: 監視とバックアップ${NC}"
    echo ""
    
    echo -e "${YELLOW}【推奨監視項目】${NC}"
    echo "1. ドメイン有効期限（90日前、60日前、30日前）"
    echo "2. SSL証明書有効期限（30日前、14日前、7日前）"
    echo "3. DNS応答監視（5分ごと）"
    echo "4. HTTPS接続監視（5分ごと）"
    echo ""
    
    # 監視スクリプト生成
    cat > "dns-config/${DOMAIN}_monitor.sh" << 'EOF'
#!/bin/bash
# ドメイン監視スクリプト

DOMAIN="$1"
EMAIL="$2"

# SSL証明書の有効期限チェック
check_ssl() {
    echo "SSL証明書の有効期限確認中..."
    echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | \
    openssl x509 -noout -dates | grep notAfter
}

# DNS解決チェック
check_dns() {
    echo "DNS解決確認中..."
    dig +short "$DOMAIN"
}

# HTTPS接続チェック
check_https() {
    echo "HTTPS接続確認中..."
    curl -Is "https://$DOMAIN" | head -n 1
}

# 実行
echo "=== ドメイン監視: $DOMAIN ==="
echo "実行時刻: $(date)"
echo ""
check_ssl
echo ""
check_dns
echo ""
check_https
EOF
    
    chmod +x "dns-config/${DOMAIN}_monitor.sh"
    echo -e "${GREEN}✓ 監視スクリプトを dns-config/${DOMAIN}_monitor.sh に作成しました${NC}"
}

# ステップ6: チェックリスト表示
show_checklist() {
    echo ""
    echo -e "${BLUE}ステップ6: 最終チェックリスト${NC}"
    echo ""
    echo -e "${YELLOW}【即日実施】${NC}"
    echo "□ さくらインターネット管理画面でDNS設定"
    echo "□ Whois情報公開代行の確認"
    echo "□ 2要素認証の有効化"
    echo "□ DNS伝播の確認（nslookup $DOMAIN）"
    echo ""
    echo -e "${YELLOW}【1週間以内】${NC}"
    echo "□ SSL証明書の設定"
    echo "□ メールアドレスの作成"
    echo "□ SPFレコードの設定"
    echo "□ 自動更新の設定確認"
    echo ""
    echo -e "${YELLOW}【1ヶ月以内】${NC}"
    echo "□ バックアップ計画の実施"
    echo "□ 監視システムの導入"
    echo "□ ドキュメントの整備"
    echo "□ 緊急時対応計画の策定"
}

# サマリー表示
show_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           ✨ 設定完了サマリー ✨             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo "ドメイン: $DOMAIN"
    echo "管理者: $EMAIL"
    echo "サーバーIP: $SERVER_IP"
    echo ""
    echo "生成されたファイル:"
    echo "  - dns-config/${DOMAIN}_dns.txt"
    echo "  - dns-config/${DOMAIN}_mail.txt"
    echo "  - dns-config/${DOMAIN}_ssl.txt"
    echo "  - dns-config/${DOMAIN}_monitor.sh"
    echo ""
    echo -e "${CYAN}次のコマンドで監視を実行できます:${NC}"
    echo "./dns-config/${DOMAIN}_monitor.sh $DOMAIN $EMAIL"
    echo ""
    echo -e "${YELLOW}さくらインターネット管理画面:${NC}"
    echo "https://secure.sakura.ad.jp/menu/"
}

# メイン処理
main() {
    show_banner
    collect_info
    generate_dns
    generate_mail
    generate_ssl
    generate_monitoring
    show_checklist
    show_summary
    
    echo ""
    echo -e "${GREEN}すべての設定ガイドが完了しました！${NC}"
    echo -e "${YELLOW}設定ファイルは dns-config/ ディレクトリに保存されています。${NC}"
}

# 実行
main