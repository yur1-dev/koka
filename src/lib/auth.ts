// lib/auth.ts (NEW FILE: Create this to export authOptions for shared use)
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
// Import other providers as needed

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // Your credentials config
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Your auth logic
        if (credentials?.email && credentials?.password) {
          // Simulate/return user
          return {
            id: "1",
            email: credentials.email,
            customToken: "your-jwt-here",
          }; // From previous fixed version
        }
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // FIXED: Type assertion for customToken
        token.customToken = (user as any).customToken as string;
      }
      return token;
    },
    async session({ session, token }) {
      // FIXED: Type assertion
      session.customToken = token.customToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/app/login",
  },
  session: { strategy: "jwt" },
};
