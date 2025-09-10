import 'next-auth'; // 使わない実体importを避ける（no-unused-vars対策）
declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      email?: string;
      name?: string;
      emailVerified?: boolean;
    };
  }
}
export {}; // このファイルをモジュール扱いにしてスコープを分離
