// src/pages/api/register.js
import { IncomingForm } from 'formidable';
import { storage, db } from '../../lib/firebase-admin';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.email) {
        return res.status(401).json({ message: '[Lỗi Xác thực] Chưa đăng nhập.' });
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
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}).` });
            }

            // --- LOGIC MỚI: TÌM KIẾM TRONG SUBCOLLECTION ---
            console.log(`LOG: Đang tìm sinh viên "${mssv}" trong subcollection của sự kiện "${eventId}"`);
            const studentRef = db.collection('events').doc(eventId).collection('eligibleStudents').doc(mssv);
            const studentDoc = await studentRef.get();

            if (!studentDoc.exists) {
                console.error(`[API Lỗi] Không tìm thấy document "${mssv}" trong subcollection của event "${eventId}"`);
                return res.status(404).json({ message: `[Lỗi Dữ liệu] MSSV "${mssv}" không có trong danh sách đủ điều kiện của sự kiện này.` });
            }

            const studentData = studentDoc.data();
            
            // --- KIỂM TRA TRÙNG LẶP ĐĂNG KÝ (Trong collection registrations riêng) ---
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: '[Lỗi Trùng lặp] Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            // --- LƯU ẢNH VÀ HOÀN TẤT ĐĂNG KÝ ---
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            const registrationData = { ...studentData, eventId, mssv, registeredAt: new Date(), photoURL };
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
            res.status(500).json({ message: '[Lỗi Server] Có lỗi xảy ra ở phía máy chủ.' });
        }
    });
}
