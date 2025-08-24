import Credentials from "next-auth/providers/credentials";

import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/models/User";
export const authConfig = {
  // 本番環境用の明示的な設定
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Vercelでの動作を確実にする
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            // 認証情報が不足
            return null;
          }

          await connectDB();
          
          console.log('🔐 認証試行:', credentials.email);
          
          // まずユーザーの存在を確認
          const user = await User.findOne({ 
            email: credentials.email
          });
          
          if (user) {
            console.log('👤 ユーザー情報:', {
              email: user.email,
              emailVerified: user.emailVerified,
              hasPassword: !!user.password
            });
          }

          if (!user) {
            // ユーザーが存在しない（セキュリティのため詳細は隠す）
            return null;
          }

          // メール確認状態を厳格にチェック
          // MongoDBから最新データを再取得
          // Mongooseドキュメントを確実に取得
          const latestUser = await User.findById(user._id).exec();
          
          // オブジェクトに変換して確実にフィールドを取得
          const userObject = latestUser ? latestUser.toObject() : null;
          
          console.log('🔄 最新ユーザーデータ:', {
            emailVerified: userObject?.emailVerified,
            emailVerifiedType: typeof userObject?.emailVerified,
            hasEmailVerified: 'emailVerified' in (userObject || {}),
            allFields: Object.keys(userObject || {})
          });
          
          // メール確認は会員制掲示板の必須要件
          const skipEmailVerification = false; // 本番環境用に修正
          
          // emailVerifiedは Boolean 型であるべき（Dateの場合も考慮）
          const isEmailVerified = userObject?.emailVerified === true || 
                                  userObject?.emailVerified === 1 || // 数値の1も許容
                                  userObject?.emailVerified === '1' || // 文字列の'1'も許容
                                  userObject?.emailVerified === 'true' || // 文字列の'true'も許容
                                  (userObject?.emailVerified instanceof Date && userObject.emailVerified !== null);
          
          // undefinedまたはnullの場合は、古いユーザーとして扱う
          if (userObject?.emailVerified === undefined || userObject?.emailVerified === null) {
            console.log('⚠️ emailVerifiedが未設定のユーザー:', user.email);
            // 2024年以前のユーザーは自動的に確認済みとする
            const createdAt = userObject?.createdAt || new Date('2023-01-01');
            const isOldUser = new Date(createdAt) < new Date('2024-01-01');
            
            if (isOldUser) {
              console.log('✅ 古いユーザーとして自動承認:', user.email);
              // 古いユーザーは承認済みとして扱う
            } else if (!skipEmailVerification && !isEmailVerified) {
              console.log('⛔ メール未確認のためログイン拒否:', {
                emailVerified: userObject?.emailVerified,
                type: typeof userObject?.emailVerified
              });
              // メール未確認の場合、特別なユーザーオブジェクトを返す
              return {
                id: "email-not-verified",
                email: user.email,
                name: user.name,
                emailVerified: false
              };
            }
          } else if (!skipEmailVerification && !isEmailVerified) {
            console.log('⛔ メール未確認のためログイン拒否:', {
              emailVerified: userObject?.emailVerified,
              type: typeof userObject?.emailVerified
            });
            // メール未確認の場合、特別なユーザーオブジェクトを返す
            return {
              id: "email-not-verified",
              email: user.email,
              name: user.name,
              emailVerified: false
            };
          }

          const isPasswordValid = await latestUser?.comparePassword(credentials.password as string);
          console.log('🔑 パスワード検証:', isPasswordValid ? '✅ 成功' : '❌ 失敗');

          if (!isPasswordValid) {
            // パスワードが間違っている（セキュリティのため詳細は隠す）
            return null;
          }

          console.log('✅ 認証成功:', latestUser.email);
          return {
            id: latestUser._id.toString(),
            email: latestUser.email,
            name: latestUser.name,
            emailVerified: true // 認証が成功した時点で確認済みとして扱う
          };
        } catch (error) {
          console.error('Auth error:', error);
          // エラーはnullを返す
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    // signOutページは削除（デフォルトの動作を使用）
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, account }: any) {
      console.log('🎯 signInコールバック開始:', {
        provider: account?.provider,
        userId: user?.id,
        userEmail: user?.email,
        timestamp: new Date().toISOString()
      });
      
      // Credentialsプロバイダーの場合、カスタムエラーを処理
      if (account?.provider === 'credentials') {
        // ユーザーオブジェクトがない場合は、認証失敗
        if (!user) {
          console.log('❌ signIn: ユーザーオブジェクトなし');
          return false;
        }
        // メール未確認チェック
        if (user.id === "email-not-verified") {
          // メール未確認の場合はfalseを返す（エラーはクライアント側で処理）
          console.log('📧 メール未確認のためログイン拒否');
          return false;
        }
        
        // ログインカウントと最終ログイン日時を更新
        if (user.id && user.id !== "email-not-verified") {
          try {
            await connectDB();
            await User.findByIdAndUpdate(user.id, {
              $inc: { loginCount: 1 },
              lastLogin: new Date()
            });
            console.log('✅ ログイン統計更新完了');
          } catch (error) {
            console.error('Failed to update login stats:', error);
          }
        }
      }
      console.log('✅ signInコールバック: trueを返します');
      return true;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, account, trigger }: { token: any; user?: any; account?: any; trigger?: any }) {
      // 初回サインイン時
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
      }
      
      // セッション更新時
      if (trigger === "update") {
        // 最新のユーザー情報を取得して更新
        await connectDB();
        const latestUser = await User.findById(token.id);
        if (latestUser) {
          token.emailVerified = latestUser.emailVerified;
          token.name = latestUser.name;
          token.email = latestUser.email;
        }
      }
      
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id || token.sub,
          emailVerified: token.emailVerified as boolean
        };
        
        // セッション有効期限の計算と追加
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30日
        const expires = new Date(now + maxAge);
        session.expires = expires.toISOString();
      }
      return session;
    },
  },
  // ✅ セッション設定の明示的定義
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日間
    updateAge: 24 * 60 * 60,    // 24時間ごとに自動更新
  },
  
  // ✅ JWT設定
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日間
  },
  
  // ✅ Cookie設定（本番環境で__Secure-プレフィックスを確実に使用）
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  
  // ✅ セキュリティ設定
  useSecureCookies: process.env.NODE_ENV === "production",
  
  // ✅ デバッグ設定（問題解決のため一時的に有効化）
  debug: true,
};