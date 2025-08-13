/**
 * MongoDBのbioフィールド問題を修正
 */

const mongoose = require('mongoose');

async function fixBioField() {
  try {
    // MongoDB接続
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://yoshitaka_yamagishi:d82YJQKGwdAl4xZl@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB接続成功');
    
    const db = mongoose.connection.db;
    
    // 1. 現在のスキーマ情報を確認
    const collection = db.collection('users');
    const sampleUser = await collection.findOne({ email: 'one.photolife+1@gmail.com' });
    
    console.log('\n現在のユーザーデータ:');
    console.log('Fields:', Object.keys(sampleUser || {}));
    console.log('Bio value:', sampleUser?.bio);
    
    // 2. bioフィールドがないユーザーに追加
    const updateResult = await collection.updateMany(
      { bio: { $exists: false } },
      { $set: { bio: '' } }
    );
    
    console.log('\nbioフィールド追加結果:');
    console.log('更新件数:', updateResult.modifiedCount);
    
    // 3. 確認
    const updatedUser = await collection.findOne({ email: 'one.photolife+1@gmail.com' });
    console.log('\n更新後のbio:', updatedUser?.bio !== undefined ? `"${updatedUser.bio}"` : 'undefined');
    
    // 4. テスト更新
    console.log('\nテスト更新を実行...');
    const testUpdate = await collection.updateOne(
      { email: 'one.photolife+1@gmail.com' },
      { $set: { bio: 'テスト自己紹介 - ' + new Date().toISOString() } }
    );
    
    console.log('テスト更新結果:', testUpdate.modifiedCount === 1 ? '成功' : '失敗');
    
    // 5. 最終確認
    const finalUser = await collection.findOne({ email: 'one.photolife+1@gmail.com' });
    console.log('最終的なbio:', finalUser?.bio);
    
    console.log('\n✅ 修正完了');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB接続を閉じました');
  }
}

fixBioField();