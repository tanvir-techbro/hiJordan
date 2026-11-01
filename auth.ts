import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyPassword } from "@/lib/password";
import { getUserByEmail, getUserById, upsertGoogleUser } from "@/lib/queries";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { prompt: "select_account" } },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        if (!user?.password_hash) return null;
        if (!(await verifyPassword(password, user.password_hash))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nickname ?? user.google_name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (
        account?.provider === "google" &&
        account.providerAccountId &&
        user?.email
      ) {
        const dbUser = await upsertGoogleUser({
          googleSub: account.providerAccountId,
          email: user.email,
          name: user.name ?? null,
        });
        token.uid = dbUser.id;
        token.username = dbUser.username;
        token.nickname = dbUser.nickname;
        token.name = dbUser.nickname ?? dbUser.google_name ?? token.name;
        token.email = dbUser.email;
        return token;
      }

      if (account?.provider === "credentials" && user?.id) {
        token.uid = user.id;
      }

      if (typeof token.uid === "string") {
        try {
          const dbUser = await getUserById(token.uid);
          if (dbUser) {
            token.username = dbUser.username;
            token.nickname = dbUser.nickname;
            token.name = dbUser.nickname ?? dbUser.google_name ?? token.name;
            token.email = dbUser.email;
          } else {
            token.uid = undefined;
          }
        } catch (error) {
          console.error("Could not refresh the signed-in user", error);
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.uid === "string") {
        session.user.id = token.uid;
        session.user.username =
          typeof token.username === "string" ? token.username : null;
        session.user.nickname =
          typeof token.nickname === "string" ? token.nickname : null;
        session.user.name = session.user.nickname ?? session.user.name;
      }
      return session;
    },
  },
});
