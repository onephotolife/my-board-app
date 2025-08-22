# 🏗️ プロフィール機能 - 詳細設計書
## 25人天才エンジニア会議による完全実装ガイド

---

## 📌 機能概要

会員限定ページのユーザープロフィール機能として、以下を実装します：
- ユーザー情報の表示・編集
- パスワード変更
- アバター表示（頭文字ベース）
- 文字数制限付き入力フィールド

---

## 🗄️ データベース設計

### 1. User モデル拡張

```typescript
// src/lib/models/User.ts に追加

interface IUser extends Document {
  // 既存フィールド
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'moderator' | 'user';
  emailVerified: boolean;
  
  // 追加フィールド（新規）
  bio?: string;           // 自己紹介（最大200文字）
  avatar?: string;        // アバター画像URL
  location?: string;      // 居住地（オプション）
  occupation?: string;    // 職業（オプション）
  education?: string;     // 学歴（オプション）
  website?: string;       // ウェブサイト（オプション）
  
  // タイムスタンプ
  createdAt: Date;
  updatedAt: Date;
  lastProfileUpdate?: Date;
}

// スキーマ定義
const UserSchema = new Schema<IUser>({
  // ... 既存フィールド ...
  
  bio: {
    type: String,
    maxlength: [200, '自己紹介は200文字以内で入力してください'],
    default: '',
    trim: true
  },
  avatar: {
    type: String,
    default: '',
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: '有効なURLを入力してください'
    }
  },
  location: {
    type: String,
    maxlength: [100, '場所は100文字以内で入力してください'],
    trim: true
  },
  occupation: {
    type: String,
    maxlength: [100, '職業は100文字以内で入力してください'],
    trim: true
  },
  education: {
    type: String,
    maxlength: [100, '学歴は100文字以内で入力してください'],
    trim: true
  },
  website: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: '有効なURLを入力してください'
    }
  },
  lastProfileUpdate: {
    type: Date,
    default: Date.now
  }
});
```

---

## 🔌 API設計

### 1. GET /api/profile
**プロフィール情報取得**

```typescript
// レスポンス
{
  success: true,
  user: {
    id: string,
    email: string,           // 変更不可
    name: string,            // 編集可能
    bio: string,             // 編集可能
    avatar: string,          // 将来実装
    emailVerified: boolean,
    location?: string,
    occupation?: string,
    education?: string,
    website?: string,
    memberSince: Date,
    lastLogin: Date,
    totalPosts: number,
    stats: {
      posts: number,
      likes: number,
      comments: number
    }
  }
}
```

### 2. PUT /api/profile
**プロフィール更新**

```typescript
// リクエストボディ
{
  name: string,         // 必須、1-50文字
  bio?: string,        // オプション、最大200文字
  location?: string,   // オプション、最大100文字
  occupation?: string, // オプション、最大100文字
  education?: string,  // オプション、最大100文字
  website?: string     // オプション、有効なURL
}

// バリデーション
const updateProfileSchema = z.object({
  name: z.string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内で入力してください')
    .trim(),
  bio: z.string()
    .max(200, '自己紹介は200文字以内で入力してください')
    .optional(),
  location: z.string()
    .max(100, '場所は100文字以内で入力してください')
    .optional(),
  occupation: z.string()
    .max(100, '職業は100文字以内で入力してください')
    .optional(),
  education: z.string()
    .max(100, '学歴は100文字以内で入力してください')
    .optional(),
  website: z.string()
    .url('有効なURLを入力してください')
    .optional()
    .or(z.literal(''))
});
```

### 3. PUT /api/profile/password
**パスワード変更**

```typescript
// リクエストボディ
{
  currentPassword: string,  // 必須
  newPassword: string       // 必須、8文字以上、複雑性要件
}

// パスワード要件
- 最小8文字
- 大文字・小文字・数字・特殊文字を含む
- 現在のパスワードと異なる
- 過去3回のパスワードと異なる（オプション）
```

---

## 🎨 UI/UXデザイン

### 1. プロフィールページレイアウト

```
┌─────────────────────────────────────┐
│         ヘッダー（グラデーション）        │
│      [←戻る] プロフィール              │
└─────────────────────────────────────┘

┌──────────┬──────────────────────────┐
│          │                          │
│  [アバター] │   基本情報                │
│   (頭文字)  │   ┌──────────────────┐  │
│          │   │ 名前: [入力]      │  │
│  名前      │   │ 自己紹介:        │  │
│  email    │   │ [テキストエリア]   │  │
│  ✓認証済み  │   │                 │  │
│          │   │ 場所: [入力]      │  │
│  登録日    │   │ 職業: [入力]      │  │
│  投稿数    │   │ 学歴: [入力]      │  │
│          │   │ Web: [入力]       │  │
│ [編集ボタン] │   └──────────────────┘  │
│          │                          │
│          │   セキュリティ設定          │
│          │   ┌──────────────────┐  │
│          │   │ パスワード変更     │  │
│          │   │ 通知設定         │  │
│          │   └──────────────────┘  │
└──────────┴──────────────────────────┘
```

### 2. 編集モード

```typescript
// 編集モード時の動作
1. 「編集」ボタンクリック
2. フィールドが編集可能に変更
3. 「保存」「キャンセル」ボタン表示
4. リアルタイム文字数カウント表示
5. バリデーションエラー即座表示
```

### 3. アバター表示ロジック

```typescript
function getAvatarDisplay(user: User): string {
  if (user.avatar) {
    return user.avatar; // 画像URL
  }
  
  // 頭文字を取得
  const initial = user.name?.[0] || user.email?.[0] || 'U';
  return initial.toUpperCase();
}

// アバター背景色（ユーザーIDベース）
function getAvatarColor(userId: string): string {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#43e97b', '#fa709a', '#fee140'
  ];
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + acc;
  }, 0);
  return colors[hash % colors.length];
}
```

---

## 🔐 セキュリティ要件

### 1. 認証・認可
- ✅ メール確認済みユーザーのみアクセス可能
- ✅ 自分のプロフィールのみ編集可能
- ✅ セッショントークン検証

### 2. 入力検証
- ✅ サーバー側バリデーション必須
- ✅ XSS対策（HTMLエスケープ）
- ✅ SQLインジェクション対策（パラメータ化クエリ）

### 3. レート制限
```typescript
// プロフィール更新: 1分間に5回まで
// パスワード変更: 1時間に3回まで
const rateLimits = {
  profileUpdate: { window: 60, max: 5 },
  passwordChange: { window: 3600, max: 3 }
};
```

---

## 🚀 実装手順

### Phase 1: 基本実装（3日間）

#### Day 1: データベース準備
```bash
1. Userモデル更新
2. マイグレーションスクリプト作成
3. 既存データの移行
```

#### Day 2: API実装
```bash
1. GET /api/profile 修正
2. PUT /api/profile 修正  
3. バリデーション実装
4. エラーハンドリング
```

#### Day 3: フロントエンド連携
```bash
1. API呼び出し実装
2. 状態管理更新
3. エラー表示実装
4. 成功メッセージ表示
```

### Phase 2: 改善実装（2日間）

#### Day 4: UX改善
```bash
1. リアルタイムバリデーション
2. 文字数カウンター
3. ローディング状態
4. 最適化（デバウンス等）
```

#### Day 5: テスト
```bash
1. 単体テスト作成
2. 統合テスト作成
3. E2Eテスト作成
4. セキュリティテスト
```

---

## 📝 実装チェックリスト

### 必須機能
- [ ] Userモデルにbioフィールド追加
- [ ] プロフィール取得API修正
- [ ] プロフィール更新API修正
- [ ] フロントエンドAPI連携
- [ ] 名前編集（50文字制限）
- [ ] 自己紹介編集（200文字制限）
- [ ] パスワード変更機能連携
- [ ] メールアドレス編集不可
- [ ] アバター頭文字表示

### 推奨機能
- [ ] 追加フィールド（場所、職業等）
- [ ] リアルタイムバリデーション
- [ ] 文字数カウンター
- [ ] プロフィール更新履歴
- [ ] アバター画像アップロード

### テスト
- [ ] 単体テスト（API）
- [ ] 統合テスト（DB連携）
- [ ] E2Eテスト（UI操作）
- [ ] セキュリティテスト
- [ ] パフォーマンステスト

---

## 🎯 成功基準

### 機能要件
- ✅ 全必須機能が動作する
- ✅ 文字数制限が正しく機能
- ✅ エラーが適切に表示される
- ✅ データが正しく永続化される

### 非機能要件
- ✅ レスポンス時間 < 500ms
- ✅ エラー率 < 1%
- ✅ セキュリティ脆弱性なし
- ✅ モバイル対応

---

## 📊 見積もり

### 工数
- **基本実装**: 3人日
- **テスト作成**: 2人日
- **レビュー・修正**: 1人日
- **合計**: 6人日

### リスク
- **高**: DBマイグレーション失敗
- **中**: 既存機能への影響
- **低**: パフォーマンス劣化

---

**設計承認**: 25人天才エンジニア会議  
**作成日**: 2025年8月22日  
**バージョン**: 1.0