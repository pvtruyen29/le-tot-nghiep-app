// src/pages/api/register.js
import { IncomingForm } from 'formidable';
import { storage, db } from '../../lib/firebase-admin';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // ... (Phần code xác thực session và parse form giữ nguyên) ...
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
    console.log("\n--- BẮT ĐẦU YÊU CẦU ĐĂNG KÝ MỚI ---");
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.email) {
        return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập lại.' });
    }
    const loggedInEmail = session.user.email;
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ message: '[Lỗi Form] Không thể đọc dữ liệu.' });

        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];
        if (!rawMssv || !eventId || !photo) {
            return res.status(400).json({ message: '[Lỗi Thiếu thông tin] Vui lòng cung cấp đủ MSSV, EventID và ảnh.' });
        }
        const mssv = rawMssv.trim().toUpperCase();
        
        try {
            // ... (Phần code kiểm tra sinh viên giữ nguyên) ...
            const studentRef = db.collection('events').doc(eventId).collection('eligibleStudents').doc(mssv);
            const studentDoc = await studentRef.get();
            if (!studentDoc.exists) {
                return res.status(404).json({ message: `[Lỗi Dữ liệu] MSSV "${mssv}" không có trong danh sách của sự kiện này.` });
            }
            const studentData = studentDoc.data();
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}).` });
            }
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: '[Lỗi Trùng lặp] Bạn đã đăng ký sự kiện này rồi.' });
            }

            // --- BƯỚC 4: TẢI ẢNH LÊN (VỚI CƠ CHẾ GỠ LỖI CHI TIẾT) ---
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;

            // **KHỐI GỠ LỖI MỚI**
            try {
                console.log(`[STORAGE-DEBUG] Đang kiểm tra sự tồn tại của bucket: "${bucket.name}"...`);
                const [exists] = await bucket.exists();
                if (!exists) {
                    console.error(`[STORAGE-DEBUG-FAIL] KIỂM TRA THẤT BẠI! Bucket "${bucket.name}" không tồn tại hoặc service account không có quyền truy cập.`);
                    return res.status(500).json({ 
                        message: 'Lỗi Cấu hình Server: Không thể tìm thấy kho chứa ảnh (Storage Bucket).',
                        details: `Bucket "${bucket.name}" không tồn tại. Vui lòng kiểm tra lại Project ID trong biến môi trường và đảm bảo Service Account có role "Storage Admin".`
                    });
                }
                console.log(`[STORAGE-DEBUG-SUCCESS] Bucket "${bucket.name}" hợp lệ. Bắt đầu tải ảnh lên...`);
            } catch (checkError) {
                console.error("[STORAGE-DEBUG-CRITICAL] Lỗi nghiêm trọng khi kiểm tra bucket:", checkError);
                return res.status(500).json({
                    message: 'Lỗi Cấu hình Server: Không thể xác thực kết nối tới kho chứa ảnh.',
                    details: 'Quá trình kiểm tra bucket đã thất bại. Có thể do "chìa khóa" service account không hợp lệ hoặc sai quyền.'
                });
            }
            
            // Tiến hành tải ảnh sau khi đã kiểm tra thành công
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            // ... (Phần code lưu thông tin đăng ký và cập nhật số lượng giữ nguyên) ...
            const registrationData = { ...studentData, eventId, mssv, photoURL, registeredAt: new Date() };
            await registrationRef.set(registrationData);
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
            }
            
            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('[API Lỗi Nghiêm trọng]', error);
            res.status(500).json({ message: '[Lỗi Server] Có lỗi không xác định xảy ra.' });
        }
    });
}
