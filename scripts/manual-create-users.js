// mongosh用の手動ユーザー作成スクリプト
// 実行: mongosh mongodb://localhost:27017/board-app manual-create-users.js

const users = [
  {
    _id: ObjectId('507f1f77bcf86cd799439006'),
    email: 'test6@example.com',
    password: '$2a$10$hashed_Test123!',
    name: 'テストユーザー6',
    bio: 'フォロー機能テスト用のユーザー6です',
    emailVerified: true,
    role: 'user',
    followingCount: 0,
    followersCount: 0,
    mutualFollowsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId('507f1f77bcf86cd799439007'),
    email: 'test7@example.com',
    password: '$2a$10$hashed_Test123!',
    name: 'テストユーザー7',
    bio: 'フォロー機能テスト用のユーザー7です',
    emailVerified: true,
    role: 'user',
    followingCount: 0,
    followersCount: 0,
    mutualFollowsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId('507f1f77bcf86cd799439008'),
    email: 'test8@example.com',
    password: '$2a$10$hashed_Test123!',
    name: 'テストユーザー8',
    bio: 'フォロー機能テスト用のユーザー8です',
    emailVerified: true,
    role: 'user',
    followingCount: 0,
    followersCount: 0,
    mutualFollowsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId('507f1f77bcf86cd799439009'),
    email: 'test9@example.com',
    password: '$2a$10$hashed_Test123!',
    name: 'テストユーザー9',
    bio: 'フォロー機能テスト用のユーザー9です',
    emailVerified: true,
    role: 'user',
    followingCount: 0,
    followersCount: 0,
    mutualFollowsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId('507f1f77bcf86cd799439010'),
    email: 'test10@example.com',
    password: '$2a$10$hashed_Test123!',
    name: 'テストユーザー10',
    bio: 'フォロー機能テスト用のユーザー10です',
    emailVerified: true,
    role: 'user',
    followingCount: 0,
    followersCount: 0,
    mutualFollowsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId('507f1f77bcf86cd799439011'),
    email: 'test11@example.com',
    password: '$2a$10$hashed_Test123!',
    name: 'テストユーザー11',
    bio: 'フォロー機能テスト用のユーザー11です',
    emailVerified: true,
    role: 'user',
    followingCount: 0,
    followersCount: 0,
    mutualFollowsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

print('Creating user6-11...');

try {
  const result = db.users.insertMany(users, { ordered: false });
  print(`✅ Successfully created ${result.insertedCount} users`);
  
  // 確認のためにカウント
  const totalUsers = db.users.countDocuments();
  print(`Total users in database: ${totalUsers}`);
  
  // user6の存在確認
  const user6 = db.users.findOne({_id: ObjectId('507f1f77bcf86cd799439006')});
  if (user6) {
    print(`✅ user6 verification: ${user6.name} (${user6.email})`);
  } else {
    print('❌ user6 not found');
  }
  
} catch (error) {
  print(`❌ Error: ${error.message}`);
}