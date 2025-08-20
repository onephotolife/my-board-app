#!/usr/bin/env node

/**
 * 権限管理システムのテストスクリプト
 * 使用方法: node scripts/test-permissions.js
 */

const chalk = require('chalk');

// チョークがない場合の代替
const colors = {
  green: (text) => `✅ ${text}`,
  red: (text) => `❌ ${text}`,
  yellow: (text) => `⚠️ ${text}`,
  blue: (text) => `ℹ️ ${text}`,
  bold: (text) => `**${text}**`
};

console.log(colors.bold('\n🧪 権限管理システム テストガイド\n'));

// テストシナリオ
const testScenarios = [
  {
    phase: 'Phase 1: 基本権限テスト',
    tests: [
      {
        name: '自分の投稿の編集',
        steps: [
          '1. User Aでログイン',
          '2. 新規投稿を作成',
          '3. 編集ボタンをクリック',
          '4. 内容を変更して保存'
        ],
        expected: [
          '編集ボタンが有効',
          '編集ダイアログが開く',
          '変更が保存される'
        ]
      },
      {
        name: '自分の投稿の削除',
        steps: [
          '1. 削除ボタンをクリック',
          '2. 確認ダイアログで削除を選択'
        ],
        expected: [
          '削除ボタンが有効',
          '投稿が削除される'
        ]
      }
    ]
  },
  {
    phase: 'Phase 2: 権限違反テスト',
    tests: [
      {
        name: '他人の投稿の編集試行',
        steps: [
          '1. User Bでログイン',
          '2. User Aの投稿を表示',
          '3. 編集ボタンの状態を確認'
        ],
        expected: [
          '編集ボタンが無効',
          'ツールチップ表示',
          'クリック不可'
        ]
      }
    ]
  },
  {
    phase: 'Phase 3: APIテスト',
    tests: [
      {
        name: 'cURLでの権限テスト',
        steps: [
          '1. ブラウザの開発者ツールでCookieを取得',
          '2. 以下のコマンドを実行'
        ],
        commands: [
          `# 他人の投稿を編集試行（403エラーが期待される）
curl -X PUT http://localhost:3000/api/posts/{POST_ID} \\
  -H "Content-Type: application/json" \\
  -H "Cookie: {YOUR_SESSION_COOKIE}" \\
  -d '{"content": "Unauthorized update"}'`,
          
          `# 未認証でアクセス（401エラーが期待される）
curl -X DELETE http://localhost:3000/api/posts/{POST_ID}`
        ]
      }
    ]
  }
];

// テストチェックリスト
const checklist = {
  'UI権限チェック': [
    '自分の投稿: 編集ボタン ✅',
    '自分の投稿: 削除ボタン ✅',
    '他人の投稿: 編集ボタン ⛔',
    '他人の投稿: 削除ボタン ⛔',
    'ツールチップメッセージ表示 ✅'
  ],
  'API権限チェック': [
    '認証なし → 401 Unauthorized',
    '権限なし → 403 Forbidden',
    '所有者 → 200 OK',
    '管理者 → 200 OK'
  ],
  'エラー表示': [
    'MUI Alertコンポーネント表示',
    '適切なエラーメッセージ',
    'エラーアイコン表示'
  ]
};

// テストシナリオの表示
console.log(colors.blue('\n📝 テストシナリオ:\n'));

testScenarios.forEach(scenario => {
  console.log(colors.bold(`\n${scenario.phase}`));
  scenario.tests.forEach(test => {
    console.log(`\n  ${colors.yellow(test.name)}`);
    console.log('  手順:');
    test.steps.forEach(step => {
      console.log(`    ${step}`);
    });
    if (test.expected) {
      console.log('  期待結果:');
      test.expected.forEach(exp => {
        console.log(`    ${colors.green(exp)}`);
      });
    }
    if (test.commands) {
      console.log('  コマンド:');
      test.commands.forEach(cmd => {
        console.log(`\n${cmd}\n`);
      });
    }
  });
});

// チェックリストの表示
console.log(colors.blue('\n✔️ チェックリスト:\n'));

Object.entries(checklist).forEach(([category, items]) => {
  console.log(colors.bold(`\n${category}:`));
  items.forEach(item => {
    console.log(`  [ ] ${item}`);
  });
});

// ブラウザでのテスト手順
console.log(colors.blue('\n🌐 ブラウザでのテスト手順:\n'));

const browserSteps = `
1. Chrome DevToolsを開く (F12)
2. Consoleタブで以下を実行:

// 現在のユーザー権限を確認
fetch('/api/user/permissions')
  .then(res => res.json())
  .then(data => console.log('Current permissions:', data));

// 投稿の権限情報を確認
document.querySelectorAll('[aria-label="edit"]').forEach(btn => {
  console.log('Edit button:', btn.disabled ? '無効' : '有効');
});

document.querySelectorAll('[aria-label="delete"]').forEach(btn => {
  console.log('Delete button:', btn.disabled ? '無効' : '有効');
});

3. Networkタブで403/401エラーを監視
`;

console.log(browserSteps);

// MongoDBでのテストユーザー作成
console.log(colors.blue('\n💾 テストユーザー作成 (MongoDB):\n'));

const mongoCommands = `
mongosh
use boardDB

// テストユーザーA作成
db.users.insertOne({
  email: "testuser-a@example.com",
  name: "Test User A",
  role: "user",
  password: "$2a$10$X/3UFeuu86LipK0yf2OJPuXmRl6NREf8e3MfP1o0bKwbwL07dPQhW", // password: testpass123
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// テストユーザーB作成
db.users.insertOne({
  email: "testuser-b@example.com",
  name: "Test User B",
  role: "user",
  password: "$2a$10$X/3UFeuu86LipK0yf2OJPuXmRl6NREf8e3MfP1o0bKwbwL07dPQhW", // password: testpass123
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 管理者ユーザー作成
db.users.insertOne({
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  password: "$2a$10$X/3UFeuu86LipK0yf2OJPuXmRl6NREf8e3MfP1o0bKwbwL07dPQhW", // password: testpass123
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 作成したユーザーを確認
db.users.find({email: {$in: ["testuser-a@example.com", "testuser-b@example.com", "admin@example.com"]}});
`;

console.log(mongoCommands);

// 実行方法
console.log(colors.bold('\n🚀 テスト実行方法:\n'));
console.log('1. 開発サーバーを起動: npm run dev');
console.log('2. MongoDBにテストユーザーを作成（上記コマンド）');
console.log('3. 各テストシナリオを手動で実行');
console.log('4. チェックリストで結果を確認');

console.log(colors.green('\n✨ テスト準備完了！\n'));