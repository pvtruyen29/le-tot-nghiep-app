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

    // --- BƯỚC 1: XÁC THỰC NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP ---
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.email) {
        return res.status(401).json({ message: '[Lỗi Xác thực] Chưa đăng nhập. Vui lòng đăng nhập lại.' });
    }
    const loggedInEmail = session.user.email;

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ message: '[Lỗi Form] Không thể đọc dữ liệu gửi lên.' });
        }

        // Lấy dữ liệu an toàn hơn
        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!rawMssv || !eventId || !photo) {
            return res.status(400).json({ message: '[Lỗi Thiếu thông tin] Vui lòng cung cấp đủ MSSV, EventID và ảnh.' });
        }

        const mssv = rawMssv.trim().toUpperCase();
        
        try {
            // --- BƯỚC 2: KIỂM TRA SINH VIÊN & SO KHỚP EMAIL ---
            
            // 2.1: Kiểm tra xem email đăng nhập có chứa MSSV không (Lớp bảo vệ đầu tiên)
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}) mà bạn muốn đăng ký.` });
            }

            // 2.2: Tìm sinh viên trong danh sách sự kiện
            const eligibleStudentRef = db.collection('eligibleStudents').doc(`${eventId}_${mssv}`);
            const studentDoc = await eligibleStudentRef.get();

            if (!studentDoc.exists) {
                return res.status(404).json({ message: `[Lỗi Dữ liệu] MSSV "${mssv}" không có trong danh sách đủ điều kiện của sự kiện này.` });
            }

            const studentData = studentDoc.data();
            // 2.3: So sánh email trong danh sách với email đã đăng nhập (Lớp bảo vệ thứ hai)
            if (studentData.email && studentData.email !== loggedInEmail) {
                return res.status(403).json({ message: `Bạn không có quyền đăng ký cho MSSV này. Vui lòng đăng nhập đúng tài khoản email (${studentData.email}) đã được cung cấp trong danh sách.` });
            }

            // --- BƯỚC 3: KIỂM TRA TRÙNG LẶP ĐĂNG KÝ ---
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: '[Lỗi Trùng lặp] Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            // --- BƯỚC 4: TẢI ẢNH LÊN VÀ LƯU THÔNG TIN ---
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            const registrationData = {
                ...studentData,
                eventId,
                mssv,
                photoURL,
                registeredAt: new Date(),
            };
            await registrationRef.set(registrationData);

            // --- BƯỚC 5: CẬP NHẬT SỐ LƯỢNG ---
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
            }

            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('[API Lỗi Nghiêm trọng]', error);
            res.status(500).json({ message: '[Lỗi Server] Có lỗi xảy ra ở phía máy chủ, vui lòng thử lại sau.' });
        }
    });
}
