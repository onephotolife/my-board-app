#!/bin/bash

# ============================================================
# メール認証機能 完全自動テストスクリプト
# ============================================================
# このスクリプトは以下を自動実行します:
# 1. 環境チェック
# 2. テストユーザー作成
# 3. 包括的テスト実行
# 4. 結果レポート生成
# ============================================================

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${BOLD}========================================${NC}"
}

# スクリプトのディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# 結果ファイル
RESULT_FILE="$PROJECT_ROOT/test-results-$(date +%Y%m%d-%H%M%S).txt"

# エラーハンドラー
handle_error() {
    log_error "テストが失敗しました: $1"
    echo "エラー詳細は $RESULT_FILE を確認してください"
    exit 1
}

# 環境チェック
check_environment() {
    log_section "🔍 環境チェック"
    
    # Node.jsチェック
    if ! command -v node &> /dev/null; then
        log_error "Node.jsがインストールされていません"
        exit 1
    fi
    NODE_VERSION=$(node -v)
    log_info "Node.js バージョン: $NODE_VERSION"
    
    # MongoDBチェック
    if pgrep -x mongod > /dev/null; then
        log_success "MongoDB が起動しています"
    else
        log_warning "MongoDBが起動していない可能性があります"
        log_info "MongoDBを起動してください: mongod"
    fi
    
    # サーバーチェック
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
        log_success "開発サーバーが起動しています"
    else
        log_error "開発サーバーが起動していません"
        log_info "別のターミナルで以下を実行してください:"
        echo "  cd $PROJECT_ROOT && npm run dev"
        exit 1
    fi
    
    # 必要なファイルの存在確認
    local required_files=(
        "$SCRIPT_DIR/create-test-user-for-verification.js"
        "$SCRIPT_DIR/test-email-verification-complete.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "$(basename $file) が存在します"
        else
            log_error "$file が見つかりません"
            exit 1
        fi
    done
}

# パッケージのインストール確認
check_packages() {
    log_section "📦 パッケージ確認"
    
    cd "$PROJECT_ROOT"
    
    # node-fetchがない場合はインストール
    if ! npm list node-fetch &> /dev/null; then
        log_warning "node-fetch がインストールされていません"
        log_info "node-fetch をインストールしています..."
        npm install node-fetch
        log_success "node-fetch をインストールしました"
    else
        log_success "必要なパッケージはインストール済みです"
    fi
}

# テストユーザー作成
create_test_users() {
    log_section "👤 テストユーザー作成"
    
    log_info "テストユーザーを作成しています..."
    
    cd "$PROJECT_ROOT"
    node "$SCRIPT_DIR/create-test-user-for-verification.js" >> "$RESULT_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "テストユーザーの作成が完了しました"
        
        # 作成されたユーザー情報を表示
        echo ""
        echo "作成されたテストユーザー:"
        echo "  - test-valid@example.com (正常な認証フロー用)"
        echo "  - test-expired@example.com (期限切れトークン用)"
        echo "  - test-verified@example.com (既に認証済み用)"
        echo "  - test-resend@example.com (再送信テスト用)"
    else
        handle_error "テストユーザーの作成に失敗しました"
    fi
}

# 包括的テスト実行
run_comprehensive_tests() {
    log_section "🧪 包括的テスト実行"
    
    log_info "全テストケースを実行しています..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    # テストを実行してリアルタイム出力と結果保存
    node "$SCRIPT_DIR/test-email-verification-complete.js" 2>&1 | tee -a "$RESULT_FILE"
    TEST_EXIT_CODE=${PIPESTATUS[0]}
    
    echo ""
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_success "すべてのテストが成功しました！ 🎉"
        return 0
    else
        log_warning "一部のテストが失敗しました"
        return 1
    fi
}

# UIテスト情報
show_ui_test_info() {
    log_section "🖥️  UIテスト手順"
    
    echo "ブラウザで以下のURLにアクセスしてUIをテストできます:"
    echo ""
    echo "1. 正常な認証フロー:"
    echo "   データベースから最新のトークンを取得してアクセス"
    echo ""
    echo "2. 無効なトークン:"
    echo "   ${CYAN}http://localhost:3000/auth/verify?token=invalid-token${NC}"
    echo ""
    echo "3. トークンなし:"
    echo "   ${CYAN}http://localhost:3000/auth/verify${NC}"
    echo ""
    echo "4. メール再送信ページ（作成済みの場合）:"
    echo "   ${CYAN}http://localhost:3000/auth/resend${NC}"
}

# 結果サマリー
show_summary() {
    log_section "📊 テスト結果サマリー"
    
    echo "テスト結果は以下のファイルに保存されています:"
    echo "  ${CYAN}$RESULT_FILE${NC}"
    echo ""
    
    # 結果ファイルから統計を抽出
    if grep -q "すべてのテストが成功しました" "$RESULT_FILE"; then
        echo -e "${GREEN}✅ 全テスト成功${NC}"
        echo ""
        echo "メール認証機能は完璧に動作しています！"
    else
        echo -e "${YELLOW}⚠️ 一部のテストが失敗しました${NC}"
        echo ""
        echo "詳細は結果ファイルを確認してください:"
        echo "  cat $RESULT_FILE | less"
    fi
}

# クリーンアップオプション
cleanup() {
    log_section "🧹 クリーンアップ"
    
    read -p "テストユーザーを削除しますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "テストユーザーを削除しています..."
        # MongoDBから直接削除
        mongo board-app --eval "
            db.users.deleteMany({
                email: {
                    \$in: [
                        'test-valid@example.com',
                        'test-expired@example.com',
                        'test-verified@example.com',
                        'test-resend@example.com',
                        'ratelimit-test@example.com'
                    ]
                }
            });
            print('テストユーザーを削除しました');
        " > /dev/null 2>&1
        log_success "クリーンアップ完了"
    fi
}

# メイン実行
main() {
    clear
    echo -e "${BOLD}${CYAN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║     メール認証機能 完全自動テストスクリプト          ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # タイムスタンプ
    echo "実行日時: $(date '+%Y年%m月%d日 %H:%M:%S')"
    echo "結果ファイル: $RESULT_FILE"
    echo ""
    
    # 各ステップを実行
    check_environment
    check_packages
    create_test_users
    
    # テスト実行前に少し待機
    log_info "3秒後にテストを開始します..."
    sleep 3
    
    # テスト実行
    if run_comprehensive_tests; then
        TEST_SUCCESS=true
    else
        TEST_SUCCESS=false
    fi
    
    # UI テスト情報表示
    show_ui_test_info
    
    # サマリー表示
    show_summary
    
    # クリーンアップ確認
    echo ""
    cleanup
    
    # 最終メッセージ
    echo ""
    if [ "$TEST_SUCCESS" = true ]; then
        echo -e "${GREEN}${BOLD}✨ テスト完了！メール認証機能は正常に動作しています ✨${NC}"
        exit 0
    else
        echo -e "${YELLOW}${BOLD}⚠️ テスト完了。一部の項目で改善が必要です ⚠️${NC}"
        exit 1
    fi
}

# トラップ設定（Ctrl+Cで終了時）
trap 'echo -e "\n${YELLOW}テストが中断されました${NC}"; exit 1' INT

# メイン実行
main