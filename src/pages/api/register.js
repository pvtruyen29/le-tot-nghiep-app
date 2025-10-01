// src/pages/api/register.js
import { IncomingForm } from 'formidable';
import { db, storage, serviceAccount } from '../../lib/firebase-admin';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Khởi tạo client cho Google Cloud Vision
const visionClient = new ImageAnnotatorClient({
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    },
    projectId: serviceAccount.project_id,
});

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
        return res.status(401).json({ message: 'Chưa xác thực.' });
    }

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ message: '[Lỗi Form] Không thể đọc dữ liệu.' });

        const mssv = fields.mssv?.[0]?.trim().toUpperCase();
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!mssv || !eventId || !photo) {
            return res.status(400).json({ message: '[Lỗi Thiếu thông tin].' });
        }
        
        try {
            // 1. Kiểm tra sinh viên có trong danh sách đủ điều kiện không
            const studentRef = db.collection('events').doc(eventId).collection('eligibleStudents').doc(mssv);
            const studentDoc = await studentRef.get();
            if (!studentDoc.exists) {
                return res.status(404).json({ message: `MSSV "${mssv}" không có trong danh sách đủ điều kiện.` });
            }
            const studentData = studentDoc.data();

            // 2. KIỂM TRA ẢNH BẰNG GOOGLE CLOUD VISION API
            console.log(`[VISION API] Bắt đầu phân tích ảnh cho MSSV: ${mssv}`);
            const [result] = await visionClient.faceDetection(photo.filepath);
            const faces = result.faceAnnotations;
            
            if (faces.length === 0) {
                return res.status(400).json({ message: 'Ảnh không hợp lệ: Không tìm thấy khuôn mặt nào.' });
            }
            if (faces.length > 1) {
                return res.status(400).json({ message: 'Ảnh không hợp lệ: Ảnh chứa nhiều hơn một người.' });
            }
            console.log(`[VISION API] Ảnh hợp lệ, tìm thấy 1 khuôn mặt.`);

            // 3. Tải ảnh lên Storage và xử lý đăng ký/cập nhật
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();

            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            if (registrationDoc.exists) {
                // CẬP NHẬT ẢNH
                await registrationRef.update({ photoURL, updatedAt: new Date() });
                res.status(200).json({ message: 'Cập nhật ảnh thành công!' });
            } else {
                // ĐĂNG KÝ MỚI
                const registrationData = { ...studentData, eventId, mssv, photoURL, registeredAt: new Date() };
                await registrationRef.set(registrationData);

                const eventRef = db.collection('events').doc(eventId);
                await db.runTransaction(async (t) => {
                    const eventDoc = await t.get(eventRef);
                    const newCount = (eventDoc.data().registeredCount || 0) + 1;
                    t.update(eventRef, { registeredCount: newCount });
                });
                res.status(200).json({ message: 'Đăng ký thành công!' });
            }
        } catch (error) {
            console.error('[API Lỗi Nghiêm trọng]', error);
            res.status(500).json({ message: '[Lỗi Server] Có lỗi không xác định xảy ra.' });
        }
    });
}
