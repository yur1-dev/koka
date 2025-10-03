import { type NextRequest } from "next/server";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import bcrypt from "bcrypt"; // Or your hashing library

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        // FIX: Use credentials.email (string) instead of 0
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }, // Was probably { email: 0 }
        });

        if (!user || !user.hashedPassword) {
          throw new Error("User not found or no password set");
        }

        // FIX: Use user.hashedPassword (string) instead of 0
        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        ); // Was probably bcrypt.compare(..., 0)

        if (!isValid) {
          throw new Error("Invalid password");
        }

        // Return user object for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
        };
      },
    }),
    // Add other providers like Google if needed
  ],
  pages: {
    signIn: "/app/login",
    // Other pages...
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Other config...
});

export { handler as GET, handler as POST };
