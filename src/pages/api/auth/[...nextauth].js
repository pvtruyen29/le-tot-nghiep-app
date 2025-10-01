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
      // Chỉ kiểm tra khi đăng nhập bằng Google và có thông tin email
      if (account.provider === "google" && profile.email) {
        
        // Tách phần tên miền từ email (ví dụ: "student.ctu.edu.vn")
        const emailDomain = profile.email.split('@')[1];

        // LOGIC "THOÁNG": Cho phép đăng nhập nếu tên miền là "ctu.edu.vn" 
        // HOẶC kết thúc bằng ".ctu.edu.vn"
        if (emailDomain === "ctu.edu.vn" || emailDomain.endsWith(".ctu.edu.vn")) {
          return true; // Cho phép đăng nhập
        } else {
          // Nếu không phải email của CTU, chuyển hướng về trang lỗi
          return '/auth-error?error=InvalidDomain';
        }
      }
      // Chặn các trường hợp đăng nhập khác
      return false;
    },
  },
};

export default NextAuth(authOptions);
