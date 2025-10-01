// src/pages/api/register.js
import { IncomingForm } from 'formidable';
import { storage, db } from '../../lib/firebase-admin';
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth/[...nextauth]"

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // --- BƯỚC 1: XÁC THỰC NGƯỜI DÙNG ---
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.email) {
        return res.status(401).json({ message: '[Lỗi Xác thực] Chưa đăng nhập. Vui lòng đăng nhập lại.' });
    }
    const loggedInEmail = session.user.email;

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("[API Lỗi] Không thể xử lý form data:", err);
            return res.status(500).json({ message: '[Lỗi Form] Không thể đọc dữ liệu gửi lên.' });
        }

        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!rawMssv || !eventId || !photo) {
            return res.status(400).json({ message: '[Lỗi Thiếu thông tin] Vui lòng cung cấp đầy đủ MSSV, EventID và ảnh.' });
        }

        const mssv = rawMssv.trim().toUpperCase();
        
        try {
            // --- BƯỚC 2: KIỂM TRA EMAIL HỢP LỆ VỚI MSSV ---
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}) mà bạn muốn đăng ký.` });
            }

            // --- BƯỚC 3: TÁCH RIÊNG ĐIỀU KIỆN KIỂM TRA ---

            // 3.1: Kiểm tra xem SỰ KIỆN có tồn tại không?
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (!eventDoc.exists) {
                console.error(`[API Lỗi] Không tìm thấy sự kiện với EventID: "${eventId}"`);
                return res.status(404).json({ message: `[Lỗi Dữ liệu] Sự kiện bạn đang đăng ký không tồn tại hoặc đã bị xóa.` });
            }

            // 3.2: Kiểm tra xem MSSV có trong danh sách của sự kiện đó không?
            const eligibleStudentsRef = db.collection('eligibleStudents');
            const snapshot = await eligibleStudentsRef
                .where('eventId', '==', eventId)
                .where('mssv', '==', mssv)
                .limit(1)
                .get();

            if (snapshot.empty) {
                console.error(`[API Lỗi] Không tìm thấy sinh viên có mssv="${mssv}" cho eventId="${eventId}"`);
                return res.status(404).json({ message: `[Lỗi Dữ liệu] MSSV "${mssv}" không có trong danh sách đủ điều kiện của sự kiện này.` });
            }

            const studentDoc = snapshot.docs[0];
            const studentData = studentDoc.data();
            
            // --- BƯỚC 4: KIỂM TRA TRÙNG LẶP ĐĂNG KÝ ---
            const registrationRef = db.collection('registrations').doc(studentDoc.id);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: '[Lỗi Trùng lặp] Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            // --- BƯỚC 5: LƯU ẢNH VÀ HOÀN TẤT ĐĂNG KÝ ---
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            const registrationData = { ...studentData, eventId, photoURL, registeredAt: new Date() };
            await registrationRef.set(registrationData);

            // Cập nhật số lượng
            const currentCount = eventDoc.data().registeredCount || 0;
            await eventRef.update({ registeredCount: currentCount + 1 });

            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('[API Lỗi Nghiêm trọng]', error);
            res.status(500).json({ message: '[Lỗi Server] Có lỗi xảy ra ở phía máy chủ, vui lòng thử lại sau.' });
        }
    });
}
