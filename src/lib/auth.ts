import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";

const loginLimiter = createRateLimiter(60 * 1000, 5);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const emailKey = credentials.email.toLowerCase();
        if (loginLimiter.isLimited(emailKey)) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email: emailKey },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        if (user.isFirstLogin) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isFirstLogin: false },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isFirstLogin: user.isFirstLogin,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

        if (dbUser?.isFirstLogin) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isFirstLogin: false },
          });
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isFirstLogin = (user as { isFirstLogin?: boolean }).isFirstLogin ?? true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isFirstLogin = token.isFirstLogin as boolean;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
