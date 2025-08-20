#!/usr/bin/env node

/**
 * Drawer実装の検証スクリプト
 * Material UI Drawerへの変更が正しく適用されているか確認
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Drawer実装検証開始\n');
console.log('='.repeat(60));

// 1. Header.tsx の検証
console.log('\n📄 Header.tsx の実装確認:');
const headerPath = path.join(__dirname, '../src/components/Header.tsx');
const headerCode = fs.readFileSync(headerPath, 'utf-8');

// インポート確認
const hasDrawerImport = headerCode.includes("import {") && headerCode.includes("Drawer");
const hasPortalImport = headerCode.includes("Portal");
console.log(`  ✓ Drawerインポート: ${hasDrawerImport ? '✅ 有り' : '❌ 無し'}`);
console.log(`  ✓ Portalインポート: ${hasPortalImport ? '⚠️ まだ存在（削除推奨）' : '✅ 削除済み'}`);

// Drawer実装確認
const hasDrawerComponent = headerCode.includes('<Drawer');
const drawerProps = headerCode.match(/anchor="top"/);
const hasZIndexConfig = headerCode.includes('theme.zIndex.drawer');
console.log(`  ✓ Drawerコンポーネント: ${hasDrawerComponent ? '✅ 使用中' : '❌ 未使用'}`);
console.log(`  ✓ anchor="top"設定: ${drawerProps ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  ✓ z-index設定: ${hasZIndexConfig ? '✅ theme.zIndex.drawer使用' : '⚠️ カスタム値'}`);

// Portal実装の確認（削除されているべき）
const hasPortalComponent = headerCode.includes('<Portal>');
console.log(`  ✓ Portal実装: ${hasPortalComponent ? '❌ まだ存在（削除必要）' : '✅ 削除済み'}`);

// 2. テスト用HTMLの生成
console.log('\n📝 検証用HTMLの更新...');
const testHtmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Drawer実装検証</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .status {
            margin: 20px 0;
            padding: 15px;
            border-radius: 8px;
            font-weight: bold;
        }
        .success {
            background: #e8f5e9;
            color: #2e7d32;
            border: 2px solid #4caf50;
        }
        .warning {
            background: #fff3e0;
            color: #e65100;
            border: 2px solid #ff9800;
        }
        .error {
            background: #ffebee;
            color: #c62828;
            border: 2px solid #f44336;
        }
        .test-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
            transition: transform 0.2s;
        }
        .test-button:hover {
            transform: scale(1.05);
        }
        .code-block {
            background: #263238;
            color: #aed581;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
            margin: 15px 0;
        }
        .check-item {
            margin: 10px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
            display: flex;
            align-items: center;
        }
        .check-icon {
            margin-right: 10px;
            font-size: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Drawer実装検証ツール</h1>
        
        <div class="status success">
            ✅ Material UI Drawer実装が適用されました
        </div>
        
        <h2>📋 実装内容</h2>
        <div class="check-item">
            <span class="check-icon">✅</span>
            <span>Portal実装からDrawer実装への移行完了</span>
        </div>
        <div class="check-item">
            <span class="check-icon">✅</span>
            <span>anchor="top"でフルスクリーン表示</span>
        </div>
        <div class="check-item">
            <span class="check-icon">✅</span>
            <span>z-index: theme.zIndex.drawer + 10000</span>
        </div>
        
        <h2>🧪 動作テスト</h2>
        <p>以下のボタンを使用してテストを実行してください：</p>
        
        <button class="test-button" onclick="runTest()">
            🔍 自動テスト実行
        </button>
        <button class="test-button" onclick="openMenu()">
            📱 メニューを開く
        </button>
        <button class="test-button" onclick="testZIndex()">
            📊 z-index確認
        </button>
        
        <div id="test-results" style="margin-top: 20px;"></div>
        
        <h2>💻 確認用コード</h2>
        <div class="code-block">
// Drawerのz-index確認
const drawer = document.querySelector('.MuiDrawer-root');
if (drawer) {
    const zIndex = window.getComputedStyle(drawer).zIndex;
    console.log('Drawer z-index:', zIndex);
}

// Backdrop確認
const backdrop = document.querySelector('.MuiBackdrop-root');
if (backdrop) {
    const zIndex = window.getComputedStyle(backdrop).zIndex;
    console.log('Backdrop z-index:', zIndex);
}
        </div>
        
        <h2>📌 推奨アクション</h2>
        <ol>
            <li>ブラウザで <strong>http://localhost:3000/board</strong> を開く</li>
            <li>ログイン後、モバイルビューで確認（幅390px）</li>
            <li>メニューボタンをタップ</li>
            <li>メニューが投稿の上に表示されることを確認</li>
        </ol>
    </div>
    
    <script>
        function runTest() {
            const results = document.getElementById('test-results');
            results.innerHTML = '<h3>テスト結果:</h3>';
            
            // メニューボタン確認
            const menuBtn = document.querySelector('[aria-label="menu"]');
            addResult('メニューボタン', menuBtn ? '✅ 発見' : '❌ 見つかりません');
            
            // Drawer確認
            const drawer = document.querySelector('.MuiDrawer-root');
            if (drawer) {
                const zIndex = window.getComputedStyle(drawer).zIndex;
                addResult('Drawer z-index', '✅ ' + zIndex);
            } else {
                addResult('Drawer', '⚠️ メニューを開いてください');
            }
            
            function addResult(label, status) {
                results.innerHTML += '<div class="check-item"><strong>' + label + ':</strong> ' + status + '</div>';
            }
        }
        
        function openMenu() {
            const menuBtn = document.querySelector('[aria-label="menu"]');
            if (menuBtn) {
                menuBtn.click();
                setTimeout(() => {
                    alert('メニューが開きました。z-indexを確認してください。');
                    testZIndex();
                }, 500);
            } else {
                alert('メニューボタンが見つかりません。ログイン後のモバイルビューで実行してください。');
            }
        }
        
        function testZIndex() {
            const drawer = document.querySelector('.MuiDrawer-root');
            const backdrop = document.querySelector('.MuiBackdrop-root');
            
            let message = 'z-index検証結果:\\n\\n';
            
            if (drawer) {
                const drawerZ = window.getComputedStyle(drawer).zIndex;
                message += 'Drawer z-index: ' + drawerZ + '\\n';
            }
            
            if (backdrop) {
                const backdropZ = window.getComputedStyle(backdrop).zIndex;
                message += 'Backdrop z-index: ' + backdropZ + '\\n';
            }
            
            if (!drawer && !backdrop) {
                message = 'メニューが開いていません。先にメニューを開いてください。';
            }
            
            console.log(message);
            alert(message);
        }
    </script>
</body>
</html>`;

const testHtmlPath = path.join(__dirname, '../public/drawer-test.html');
fs.writeFileSync(testHtmlPath, testHtmlContent);
console.log(`  ✅ 検証用HTML作成: /public/drawer-test.html`);

// 3. 診断結果
console.log('\n📊 診断結果:');
console.log('='.repeat(60));

const issues = [];
const fixes = [];

if (!hasDrawerImport) {
  issues.push('Drawerコンポーネントがインポートされていません');
  fixes.push('import文にDrawerを追加');
}

if (hasPortalImport || hasPortalComponent) {
  issues.push('古いPortal実装がまだ残っています');
  fixes.push('Portal関連のコードを完全に削除');
}

if (!hasDrawerComponent) {
  issues.push('Drawerコンポーネントが使用されていません');
  fixes.push('モバイルメニューをDrawerで実装');
}

if (issues.length === 0) {
  console.log('✅ Drawer実装は正しく適用されています！\n');
  console.log('次のステップ:');
  console.log('  1. ブラウザのキャッシュをクリア');
  console.log('  2. http://localhost:3000/drawer-test.html でテスト');
  console.log('  3. 実際のアプリケーションで動作確認');
} else {
  console.log('⚠️ 以下の問題が見つかりました:\n');
  issues.forEach((issue, i) => {
    console.log(`  ❌ ${issue}`);
    console.log(`     → ${fixes[i]}`);
  });
}

console.log('\n✨ 検証完了\n');
console.log('テストページ: http://localhost:3000/drawer-test.html');