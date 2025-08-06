#!/bin/bash

# DMARC設定確認スクリプト

echo "==================================="
echo "DMARC設定確認スクリプト"
echo "==================================="
echo ""

DOMAIN="blankinai.com"

# 1. DMARCレコードの確認
echo "1. DMARCレコードの確認"
echo "------------------------"
dig +short TXT _dmarc.$DOMAIN
echo ""

# 2. 詳細な情報を表示
echo "2. 詳細情報"
echo "------------------------"
dig TXT _dmarc.$DOMAIN
echo ""

# 3. SPFレコードの確認（参考）
echo "3. SPFレコード（参考）"
echo "------------------------"
dig +short TXT $DOMAIN | grep "v=spf1"
echo ""

# 4. DKIMレコードの確認（参考）
echo "4. DKIMレコード（参考）"
echo "------------------------"
echo "Resend DKIM:"
dig +short TXT rs20250806._domainkey.$DOMAIN | head -c 100
echo "..."
echo ""

# 5. 設定の解析
echo "5. DMARC設定の解析"
echo "------------------------"
DMARC_RECORD=$(dig +short TXT _dmarc.$DOMAIN)
if [ -n "$DMARC_RECORD" ]; then
    echo "✅ DMARCレコードが見つかりました:"
    echo "$DMARC_RECORD" | sed 's/;/\n  /g'
else
    echo "❌ DMARCレコードが見つかりません"
    echo "   DNSの反映に時間がかかる場合があります（最大48時間）"
fi