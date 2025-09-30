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
      // Kiểm tra nếu đăng nhập bằng Google và có email
      if (account.provider === "google" && profile.email) {
        // Chỉ cho phép nếu email kết thúc bằng @student.ctu.edu.vn
        if (profile.email.endsWith("@student.ctu.edu.vn")) {
          return true; // Cho phép đăng nhập
        } else {
          // Nếu không đúng đuôi email, chặn đăng nhập
          // Bạn có thể chuyển hướng về trang lỗi
          // return '/unauthorized' 
          return false; // Chặn đăng nhập
        }
      }
      return false; // Chặn các trường hợp khác
    },
  },
};

export default NextAuth(authOptions);
