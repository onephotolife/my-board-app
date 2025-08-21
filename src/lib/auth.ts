import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db/mongodb-local";
import User from "@/lib/models/User";

// NextAuth v5対応の正しい設定
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
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
            return null;
          }

          // パスワード検証
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValidPassword) {
            console.log('❌ [Auth v5] パスワードが一致しません');
            return null;
          }

          // メール確認は会員制掲示板の必須要件
          if (!user.emailVerified) {
            console.log('⛔ [Auth v5] メール未確認のためログイン拒否');
            return null;
          }

          console.log('✅ [Auth v5] 認証成功:', user.email);
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
            emailVerified: user.emailVerified,
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
  
  callbacks: {
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
          emailVerified: token.emailVerified
        };
      }
      return session;
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  debug: true,
  trustHost: true,
});