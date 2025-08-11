import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
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
          const latestUser = await User.findById(user._id);
          console.log('🔄 最新ユーザーデータ:', {
            emailVerified: latestUser?.emailVerified,
            emailVerifiedType: typeof latestUser?.emailVerified
          });
          
          if (latestUser?.emailVerified !== true) {
            console.log('⛔ メール未確認のためログイン拒否');
            // メール未確認の場合、特別なユーザーオブジェクトを返す
            return {
              id: "email-not-verified",
              email: user.email,
              name: user.name,
              emailVerified: false
            };
          }

          const isPasswordValid = await latestUser.comparePassword(credentials.password as string);
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
            emailVerified: true
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
    signOut: "/auth/signin",  // ログアウト後のリダイレクト先
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, account }: any) {
      // Credentialsプロバイダーの場合、カスタムエラーを処理
      if (account?.provider === 'credentials') {
        // ユーザーオブジェクトがない場合は、認証失敗
        if (!user) {
          return false;
        }
        // メール未確認チェック
        if (user.id === "email-not-verified") {
          // メール未確認エラーとして特別なURLにリダイレクト
          return "/auth/signin?error=EmailNotVerified";
        }
      }
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
  
  // ✅ セキュリティ設定
  useSecureCookies: process.env.NODE_ENV === "production",
  
  // ✅ デバッグ設定を完全に無効化（警告を防ぐ）
  debug: false,
};