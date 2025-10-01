// src/pages/api/test-storage.js
import { storage } from '../../lib/firebase-admin';

export default async function handler(req, res) {
    console.log("\n--- [STORAGE TEST] BẮT ĐẦU BÀI KIỂM TRA KẾT NỐI ---");

    if (!storage) {
        console.error("[STORAGE TEST] Lỗi nghiêm trọng: Biến 'storage' từ firebase-admin không được khởi tạo.");
        return res.status(500).json({ 
            status: 'FAIL', 
            message: 'Firebase Admin SDK khởi tạo thất bại. Vui lòng kiểm tra log khởi động của server.' 
        });
    }

    try {
        const bucket = storage.bucket();
        console.log(`[STORAGE TEST] Đang lấy thông tin bucket mặc định. Tên bucket mong đợi: "${bucket.name}"`);

        console.log(`[STORAGE TEST] Đang thực hiện lệnh bucket.exists()...`);
        const [exists] = await bucket.exists();

        if (exists) {
            console.log(`[STORAGE TEST] THÀNH CÔNG! Bucket "${bucket.name}" tồn tại và có thể truy cập.`);
            return res.status(200).json({
                status: 'SUCCESS',
                message: `Kết nối thành công! Kho chứa (bucket) "${bucket.name}" tồn tại.`
            });
        } else {
            console.error(`[STORAGE TEST] THẤT BẠI! Lệnh bucket.exists() trả về 'false'.`);
            return res.status(404).json({
                status: 'FAIL',
                message: `Kết nối thất bại. Kho chứa "${bucket.name}" không tồn tại hoặc "chìa khóa" không có quyền xem.`,
                troubleshooting: [
                    "1. So sánh tên bucket trên với tên bucket thực tế trên Google Cloud.",
                    "2. Kiểm tra Service Account có role 'Storage Admin' trong IAM.",
                    "3. Đảm bảo biến môi trường trên Vercel đang dùng 'chìa khóa' mới nhất."
                ]
            });
        }
    } catch (error) {
        console.error("[STORAGE TEST] Lỗi nghiêm trọng trong quá trình kiểm tra:", error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Có lỗi không xác định xảy ra trong quá trình kiểm tra kết nối Storage.',
            error_details: error.message
        });
    }
}
