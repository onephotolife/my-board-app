import NextAuth, { AuthOptions, Session, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";

import { connectDB } from "@/lib/db/mongodb-local";
import UserModel from "@/lib/models/User";
import { EmailNotVerifiedError, InvalidPasswordError, UserNotFoundError } from "@/lib/auth-errors";

// NextAuth v4の設定
export const authOptions: AuthOptions = {
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 [Auth v4] 認証開始:', {
          email: credentials?.email,
          hasPassword: !!credentials?.password,
          timestamp: new Date().toISOString()
        });
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ [Auth v4] 認証情報不足');
          return null;
        }

        try {
          await connectDB();
          console.log('✅ [Auth v4] DB接続成功');
          
          const user = await UserModel.findOne({ email: credentials.email });
          console.log('🔍 [Auth v4] ユーザー検索結果:', {
            found: !!user,
            email: user?.email,
            hasPassword: !!user?.password,
            emailVerified: user?.emailVerified
          });
          
          if (!user) {
            console.log('❌ [Auth v4] ユーザーが見つかりません');
            return null;
          }

          // パスワード検証
          console.log('🔑 [Auth v4] パスワード検証開始');
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          console.log('🔐 [Auth v4] パスワード検証結果:', isValidPassword);
          
          if (!isValidPassword) {
            console.log('❌ [Auth v4] パスワードが一致しません');
            return null;
          }

          console.log('✅ [Auth v4] 認証成功:', user.email);
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
            emailVerified: user.emailVerified,
            role: user.role,
          };
        } catch (error) {
          console.error('❌ [Auth v4] 認証エラー:', error);
          return null;
        }
      }
    })
  ],
  
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  
  events: {
    async signIn({ user, account }) {
      console.log('🎉 [Auth v4] signIn event:', { 
        user: user?.email, 
        account: account?.provider 
      });
    },
  },
  
  callbacks: {
    async signIn({ user, account }) {
      console.log('🔍 [signIn callback v4]:', { 
        user: user?.email, 
        emailVerified: user?.emailVerified,
        account: account?.provider 
      });
      
      // メール未確認でもセッション作成を許可
      // クライアントサイドで制御
      if (user && !user.emailVerified) {
        console.log('⚠️ [signIn callback v4] メール未確認ユーザー（セッション作成許可）');
      }
      
      return true;
    },
    
    // 🚀 41人天才会議：サーバーサイド確実リダイレクト実装
    async redirect({ url, baseUrl }) {
      console.log('🌐 [Redirect callback v4]:', { url, baseUrl });
      
      // 認証関連のURLの場合はダッシュボードにリダイレクト
      if (url.includes('/auth/signin') || url.includes('/auth/')) {
        const dashboardUrl = `${baseUrl}/dashboard`;
        console.log('🔄 [Server Redirect] auth URL detected, redirecting to:', dashboardUrl);
        return dashboardUrl;
      }
      
      // デフォルトでダッシュボードに
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        console.log('🔄 [Server Redirect] relative URL to full URL:', fullUrl);
        return fullUrl;
      }
      
      // 外部URLチェック
      if (url.startsWith(baseUrl)) {
        console.log('🔄 [Server Redirect] same origin URL:', url);
        return url;
      }
      
      // フォールバック：ダッシュボード
      const fallbackUrl = `${baseUrl}/dashboard`;
      console.log('🔄 [Server Redirect] fallback to dashboard:', fallbackUrl);
      return fallbackUrl;
    },
    
    async jwt({ token, user }: { token: JWT; user?: User }) {
      console.log('🎫 [JWT v4]:', {
        hasUser: !!user,
        hasToken: !!token,
        userId: user?.id,
        tokenId: token?.id
      });
      
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.emailVerified = user.emailVerified;
        token.role = user.role;
      }
      return token;
    },
    
    async session({ session, token }: { session: Session; token: JWT }) {
      console.log('📊 [Session v4]:', {
        hasSession: !!session,
        hasToken: !!token,
        tokenId: token?.id,
        emailVerified: token?.emailVerified
      });
      
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.emailVerified = token.emailVerified;
        session.user.role = token.role;
      }
      return session;
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 24時間ごとにセッションを更新
  },
  
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  // NextAuth v4設定
  secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
  debug: process.env.NODE_ENV === 'development',
};

// NextAuth v4 compatibility: export auth function
export async function auth() {
  const { getServerSession } = await import('next-auth/next');
  return await getServerSession(authOptions);
}

export default NextAuth(authOptions);