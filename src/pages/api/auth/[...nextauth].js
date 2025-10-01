// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ account, profile }) {
      if (account.provider === "google" && profile.email) {
        const emailDomain = profile.email.split('@')[1];
        if (emailDomain === "ctu.edu.vn" || emailDomain.endsWith(".ctu.edu.vn")) {
          return true; // Cho phép đăng nhập
        } else {
          return '/auth-error?error=InvalidDomain';
        }
      }
      return false;
    },
  },
};

export default NextAuth(authOptions);
