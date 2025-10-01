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
            console.error("[CẢNH BÁO] Lỗi nghiêm trọng khi xử lý form data:", err);
            return res.status(500).json({ message: 'Lỗi khi xử lý form.' });
        }

        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];
        console.log(`[LOG] Dữ liệu nhận được từ form: eventId="${eventId}", mssv="${rawMssv}"`);

        if (!rawMssv || !eventId || !photo) {
            console.error("[CẢNH BÁO] Yêu cầu bị từ chối: Thiếu thông tin cần thiết.");
            return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
        }

        const mssv = rawMssv.trim().toUpperCase();
        
        try {
            console.log(`[LOG] Bắt đầu kiểm tra sinh viên. Đang tìm kiếm document ID: "${eventId}_${mssv}"`);
            
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 console.error(`[CẢNH BÁO] Email không khớp MSSV. Email: ${loggedInEmail}, MSSV: ${mssv}`);
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}).` });
            }
            console.log(`[LOG] Email đã khớp với MSSV.`);

            const eligibleStudentRef = db.collection('eligibleStudents').doc(`${eventId}_${mssv}`);
            const studentDoc = await eligibleStudentRef.get();

            if (!studentDoc.exists) {
                console.error(`[CẢNH BÁO] Không tìm thấy sinh viên với document ID: "${eventId}_${mssv}"`);
                return res.status(404).json({ message: `MSSV "${mssv}" không có trong danh sách đủ điều kiện của sự kiện này.` });
            }
            console.log(`[LOG] Đã tìm thấy sinh viên trong danh sách.`);

            // ... các bước còn lại giữ nguyên ...
            const studentData = studentDoc.data();
            if (studentData.email && studentData.email !== loggedInEmail) {
                return res.status(403).json({ message: `Bạn không có quyền đăng ký cho MSSV này. Vui lòng đăng nhập đúng tài khoản email (${studentData.email}) đã được cung cấp.` });
            }

            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: 'Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

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
            console.error('[CẢNH BÁO] Lỗi không xác định trong khối try-catch:', error);
            res.status(500).json({ message: 'Lỗi từ server, vui lòng thử lại.' });
        }
    });
}
