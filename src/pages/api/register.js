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
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("\n--- BẮT ĐẦU YÊU CẦU ĐĂNG KÝ MỚI ---");
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.email) {
        console.error("[CẢNH BÁO] Yêu cầu bị từ chối: Không có session người dùng hợp lệ.");
        return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập lại.' });
    }
    const loggedInEmail = session.user.email;
    console.log(`[LOG] Người dùng đã xác thực với email: ${loggedInEmail}`);

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ message: '[Lỗi Form] Không thể đọc dữ liệu gửi lên.' });
        }

        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!rawMssv || !eventId || !photo) {
            return res.status(400).json({ message: '[Lỗi Thiếu thông tin] Vui lòng cung cấp đủ MSSV, EventID và ảnh.' });
        }

        const mssv = rawMssv.trim().toUpperCase();
        console.log(`[LOG] Dữ liệu nhận được: eventId="${eventId}", mssv="${mssv}"`);
        
        try {
            // --- LOGIC KIỂM TRA MỚI THEO CẤU TRÚC SUBCOLLECTION ---
            console.log(`[LOG] Bắt đầu kiểm tra MSSV theo cấu trúc mới...`);
            console.log(`[LOG] Đường dẫn truy vấn: events/${eventId}/eligibleStudents/${mssv}`);

            // 1. Lấy tham chiếu trực tiếp đến document sinh viên trong subcollection
            const studentRef = db.collection('events').doc(eventId).collection('eligibleStudents').doc(mssv);
            const studentDoc = await studentRef.get();

            // 2. Kiểm tra xem document sinh viên có tồn tại hay không
            if (!studentDoc.exists) {
                console.error(`[CẢNH BÁO] Không tìm thấy document "${mssv}" trong subcollection của sự kiện "${eventId}".`);
                return res.status(404).json({ message: `[Lỗi Dữ liệu] MSSV "${mssv}" không có trong danh sách đủ điều kiện của sự kiện này.` });
            }
            console.log(`[LOG] Đã tìm thấy sinh viên trong subcollection của sự kiện.`);
            
            // Lấy dữ liệu sinh viên để dùng cho các bước sau
            const studentData = studentDoc.data();

            // 3. (Tùy chọn) Kiểm tra chéo email nếu có
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}).` });
            }

            // --- CÁC BƯỚC CÒN LẠI GIỮ NGUYÊN ---
            
            // Kiểm tra trùng lặp đăng ký (trong một collection registrations riêng)
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: '[Lỗi Trùng lặp] Bạn đã đăng ký sự kiện này rồi.' });
            }

            // Tải ảnh lên và lưu thông tin
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            const registrationData = { ...studentData, eventId, mssv, photoURL, registeredAt: new Date() };
            await registrationRef.set(registrationData);

            // Cập nhật số lượng
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
            }

            console.log("--- KẾT THÚC YÊU CẦU ĐĂNG KÝ THÀNH CÔNG ---\n");
            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('[API Lỗi Nghiêm trọng]', error);
            res.status(500).json({ message: '[Lỗi Server] Có lỗi xảy ra ở phía máy chủ, vui lòng thử lại sau.' });
        }
    });
}
