import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db/mongodb-local";
import User from "@/lib/models/User";
import { EmailNotVerifiedError, InvalidPasswordError, UserNotFoundError } from "@/lib/auth-errors";

// NextAuth v5対応の正しい設定
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 [Auth v5] 認証開始:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ [Auth v5] 認証情報不足');
          return null;
        }

        try {
          await connectDB();
          
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            console.log('❌ [Auth v5] ユーザーが見つかりません');
            throw new UserNotFoundError('ユーザーが見つかりません');
          }

          // パスワード検証
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValidPassword) {
            console.log('❌ [Auth v5] パスワードが一致しません');
            throw new InvalidPasswordError('パスワードが正しくありません');
          }

          // メール確認チェックは signIn callback で実行
          // ここでは認証情報が正しければユーザーオブジェクトを返す

          console.log('✅ [Auth v5] 認証成功:', user.email);
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
            emailVerified: user.emailVerified,
            role: user.role,
          };
        } catch (error) {
          console.error('❌ [Auth v5] 認証エラー:', error);
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
    async signIn({ user, account, profile, isNewUser }) {
      console.log('🎉 [Auth v5] signIn event:', { user: user?.email, account: account?.provider });
    },
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔍 [signIn callback]:', { 
        user: user?.email, 
        emailVerified: user?.emailVerified,
        account: account?.provider 
      });
      
      // NextAuth v5での適切なエラーハンドリング
      // メール未確認ユーザーもセッション作成を許可し、ミドルウェア/サーバーコンポーネントで制御
      if (user && !user.emailVerified) {
        console.log('⚠️ [signIn callback] メール未確認ユーザーのログイン（セッション作成許可）');
        // セッションは作成するが、後段の保護層で /auth/email-not-verified にリダイレクト
      }
      
      return true;
    },
    
    async jwt({ token, user }) {
      console.log('🎫 [JWT v5]:', {
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
    
    async session({ session, token }) {
      console.log('📊 [Session v5]:', {
        hasSession: !!session,
        hasToken: !!token,
        tokenId: token?.id,
        emailVerified: token?.emailVerified
      });
      
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          emailVerified: token.emailVerified,
          role: token.role
        };
      }
      return session;
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  // NextAuth v5必須設定
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
  debug: process.env.NODE_ENV === 'development',
  trustHost: true,
});