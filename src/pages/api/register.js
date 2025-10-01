// src/pages/api/register.js
import { IncomingForm } from 'formidable';
import { db, storage } from '../../lib/firebase-admin';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    console.log("\n--- [REGISTER API] BẮT ĐẦU YÊU CẦU MỚI ---");

    try {
        // --- BƯỚC 1: XÁC THỰC NGƯỜI DÙNG ---
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user?.email) {
            console.error("[REGISTER API] Lỗi: Yêu cầu bị từ chối do chưa xác thực.");
            return res.status(401).json({ message: 'Chưa xác thực.' });
        }
        console.log(`[REGISTER API] Bước 1/5: Xác thực thành công cho email: ${session.user.email}`);

        // --- BƯỚC 2: PHÂN TÍCH FORM DATA ---
        const form = new IncomingForm();
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("[REGISTER API] Lỗi: Không thể phân tích form data.", err);
                return res.status(500).json({ message: '[Lỗi Form] Không thể đọc dữ liệu.' });
            }

            const mssv = fields.mssv?.[0]?.trim().toUpperCase();
            const eventId = fields.eventId?.[0];
            const photo = files.photo?.[0];
            console.log(`[REGISTER API] Bước 2/5: Đã phân tích form. EventID: "${eventId}", MSSV: "${mssv}"`);

            if (!mssv || !eventId || !photo) {
                console.error("[REGISTER API] Lỗi: Thiếu thông tin trong form.", { mssv, eventId, photo: !!photo });
                return res.status(400).json({ message: '[Lỗi Thiếu thông tin].' });
            }
            
            // --- BƯỚC 3: KIỂM TRA SINH VIÊN ĐỦ ĐIỀU KIỆN ---
            console.log(`[REGISTER API] Bước 3/5: Bắt đầu kiểm tra sinh viên đủ điều kiện...`);
            console.log(`[REGISTER API]   - Đường dẫn: events/${eventId}/eligibleStudents/${mssv}`);
            const studentRef = db.collection('events').doc(eventId).collection('eligibleStudents').doc(mssv);
            const studentDoc = await studentRef.get();

            if (!studentDoc.exists) {
                console.error(`[REGISTER API] Lỗi: Không tìm thấy sinh viên tại đường dẫn trên.`);
                return res.status(404).json({ message: `MSSV "${mssv}" không có trong danh sách đủ điều kiện.` });
            }
            const studentData = studentDoc.data();
            console.log(`[REGISTER API]   - Đã tìm thấy sinh viên hợp lệ.`);

            // --- BƯỚC 4: KIỂM TRA ĐĂNG KÝ CŨ & TẢI ẢNH LÊN ---
            console.log(`[REGISTER API] Bước 4/5: Bắt đầu xử lý ảnh và kiểm tra đăng ký cũ...`);
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();

            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;
            console.log(`[REGISTER API]   - Tải ảnh lên thành công. URL: ${photoURL}`);

            // --- BƯỚC 5: XỬ LÝ ĐĂNG KÝ MỚI HOẶC CẬP NHẬT ---
            if (registrationDoc.exists) {
                console.log(`[REGISTER API] Bước 5/5: Phát hiện đăng ký cũ. Bắt đầu CẬP NHẬT ảnh.`);
                await registrationRef.update({ photoURL, updatedAt: new Date() });
                console.log(`[REGISTER API]   - Cập nhật ảnh thành công.`);
                res.status(200).json({ message: 'Cập nhật ảnh thành công!' });
            } else {
                console.log(`[REGISTER API] Bước 5/5: Không có đăng ký cũ. Bắt đầu TẠO MỚI.`);
                const registrationData = { ...studentData, eventId, mssv, photoURL, registeredAt: new Date() };
                await registrationRef.set(registrationData);

                const eventRef = db.collection('events').doc(eventId);
                await db.runTransaction(async (t) => {
                    const eventDoc = await t.get(eventRef);
                    if (!eventDoc.exists) { throw "Sự kiện không tồn tại!"; }
                    const newCount = (eventDoc.data().registeredCount || 0) + 1;
                    t.update(eventRef, { registeredCount: newCount });
                });
                console.log(`[REGISTER API]   - Tạo mới đăng ký và cập nhật số lượng thành công.`);
                res.status(200).json({ message: 'Đăng ký thành công!' });
            }
        });
    } catch (error) {
        console.error('[REGISTER API] LỖI NGHIÊM TRỌNG TRONG KHỐI TRY-CATCH:', error);
        res.status(500).json({ message: '[Lỗi Server] Có lỗi không xác định xảy ra.' });
    }
}
