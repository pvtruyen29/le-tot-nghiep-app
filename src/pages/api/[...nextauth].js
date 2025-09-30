// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

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
      // Chỉ cho phép đăng nhập nếu tài khoản là Google và có email sinh viên CTU
      if (account.provider === "google" && profile.email.endsWith("@student.ctu.edu.vn")) {
        return true // Cho phép đăng nhập
      } else {
        return false // Chặn đăng nhập
      }
    },
  },
}

export default NextAuth(authOptions)
