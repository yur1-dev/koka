// import NextAuth from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import prisma from "@/lib/db";
// import bcrypt from "bcrypt"; // Ensure installed

// export const { handlers, auth, signIn, signOut } = NextAuth({
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) {
//           throw new Error("Missing credentials");
//         }

//         try {
//           const user = await prisma.user.findUnique({
//             where: { email: credentials.email },
//           });

//           if (!user || !user.password) {
//             throw new Error("No user found");
//           }

//           const isValid = await bcrypt.compare(
//             credentials.password,
//             user.password
//           );

//           if (isValid) {
//             return {
//               id: user.id,
//               email: user.email,
//               name: user.name,
//             };
//           }

//           throw new Error("Invalid password");
//         } catch (error) {
//           console.error("Auth error:", error);
//           throw new Error("Authentication failed");
//         }
//       },
//     }),
//   ],
//   session: { strategy: "jwt" },
//   secret: process.env.NEXTAUTH_SECRET,
//   pages: {
//     signIn: "/app/login",
//     error: "/app/auth/error", // Custom error page if needed
//   },
//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.id = user.id;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       if (token) {
//         session.user.id = token.id as string;
//       }
//       return session;
//     },
//   },
// });

// export { handlers as GET, handlers as POST };
