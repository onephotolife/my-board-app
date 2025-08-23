// NextAuth type extensions

declare module "next-auth" {
  interface User {
    id: string;
    emailVerified?: boolean;
    role?: string;
    createdAt?: string;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      emailVerified?: boolean;
      role?: string;
      createdAt?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    emailVerified?: boolean;
    role?: string;
    createdAt?: string;
  }
}