import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string | null;
      nickname: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string | null;
    nickname?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    username?: string | null;
    nickname?: string | null;
  }
}
