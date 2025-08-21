import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/models/User";

// シンプルで確実に動作する設定
export const simpleAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 [SimpleAuth] 認証開始:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ [SimpleAuth] 認証情報不足');
          return null;
        }

        try {
          await connectDB();
          
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            console.log('❌ [SimpleAuth] ユーザーが見つかりません');
            return null;
          }

          // パスワード検証
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValidPassword) {
            console.log('❌ [SimpleAuth] パスワードが一致しません');
            return null;
          }

          // メール確認チェックを一時的に無効化（デバッグ用）
          console.log('✅ [SimpleAuth] 認証成功:', user.email);
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
          };
        } catch (error) {
          console.error('❌ [SimpleAuth] 認証エラー:', error);
          return null;
        }
      }
    })
  ],
  
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  
  callbacks: {
    async jwt({ token, user }: any) {
      console.log('🎫 [JWT Callback]:', {
        hasUser: !!user,
        hasToken: !!token,
        userId: user?.id,
        tokenId: token?.id
      });
      
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    
    async session({ session, token }: any) {
      console.log('📊 [Session Callback]:', {
        hasSession: !!session,
        hasToken: !!token,
        tokenId: token?.id
      });
      
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name
        };
      }
      return session;
    }
  },
  
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  // 重要な設定
  secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
  debug: true,
  trustHost: true,
};