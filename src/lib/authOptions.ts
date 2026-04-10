import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getAdminPasswordHash } from "@/lib/db";
import { getOrCreateUser, getUserByEmail } from "@/lib/userDb";
import { sendWelcomePendingEmail } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) return null;
        if (credentials.email !== adminEmail) return null;

        const dbHash = await getAdminPasswordHash();
        let passwordMatch = false;
        if (dbHash) {
          passwordMatch = await bcrypt.compare(credentials.password, dbHash);
        } else if (adminPassword.startsWith("$2")) {
          passwordMatch = await bcrypt.compare(credentials.password, adminPassword);
        } else {
          // Plain text env password — compare securely via bcrypt timing-safe check
          const envHash = await bcrypt.hash(adminPassword, 10);
          passwordMatch = await bcrypt.compare(credentials.password, envHash);
        }

        if (passwordMatch) {
          return { id: "admin", name: "Admin", email: adminEmail };
        }
        return null;
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      // Credentials provider (admin) — always allowed
      if (account?.provider === "credentials") return true;

      // Google provider — create/get user in DB
      if (account?.provider === "google" && user.email) {
        const isAdmin = user.email === process.env.ADMIN_EMAIL;
        if (isAdmin) return true;

        const dbUser = await getOrCreateUser(
          user.email,
          user.name ?? user.email,
          user.image ?? null,
          account.providerAccountId
        );

        // New user (just created) → send welcome email
        if (dbUser.status === "pending" && !dbUser.google_id) {
          await sendWelcomePendingEmail(user.email, user.name ?? user.email);
        }

        // Rejected users cannot sign in
        if (dbUser.status === "rejected") {
          return `/login?error=rejected`;
        }

        return true;
      }
      return false;
    },

    async jwt({ token, account, user }) {
      const adminEmail = process.env.ADMIN_EMAIL;

      // On initial sign-in, set token fields
      if (account) {
        if (account.provider === "credentials" || token.email === adminEmail) {
          token.isAdmin = true;
          token.status = "approved";
          token.dbUserId = undefined;
        } else if (account.provider === "google" && token.email) {
          const dbUser = await getUserByEmail(token.email as string);
          token.isAdmin = false;
          token.status = dbUser?.status ?? "pending";
          token.dbUserId = dbUser?.id;
        }
      }

      // Refresh status on every request (so admin changes take effect)
      if (!token.isAdmin && token.email) {
        const dbUser = await getUserByEmail(token.email as string);
        token.status = dbUser?.status ?? "pending";
        token.dbUserId = dbUser?.id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.status = (token.status as "pending" | "approved" | "rejected") ?? "pending";
        session.user.dbUserId = token.dbUserId as number | undefined;
      }
      return session;
    },
  },
};
