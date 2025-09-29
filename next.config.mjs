/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Cho phép truy cập từ địa chỉ IP trong mạng nội bộ của bạn
    allowedDevOrigins: ["http://172.31.13.100:3000"],
  },
};

export default nextConfig;
