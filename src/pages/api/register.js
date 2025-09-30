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

    console.log("--- BẮT ĐẦU YÊU CẦU ĐĂNG KÝ MỚI ---");
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.email) {
        return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập lại.' });
    }
    const loggedInEmail = session.user.email;

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi khi xử lý form.' });
        }

        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!rawMssv || !eventId || !photo) {
            return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
        }

        const mssv = rawMssv.trim().toUpperCase();
        
        try {
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 return res.status(403).json({ message: `Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}) mà bạn muốn đăng ký.` });
            }

            // --- SỬA LỖI: THAY THẾ BẰNG PHƯƠNG PHÁP QUERY ---
            console.log(`LOG: Đang truy vấn sinh viên có eventId="${eventId}" và mssv="${mssv}"`);
            
            const eligibleStudentsRef = db.collection('eligibleStudents');
            const snapshot = await eligibleStudentsRef
                .where('eventId', '==', eventId)
                .where('mssv', '==', mssv)
                .limit(1)
                .get();

            if (snapshot.empty) {
                console.error(`LỖI: Không tìm thấy sinh viên nào khớp với eventId="${eventId}" và mssv="${mssv}"`);
                return res.status(404).json({ message: 'MSSV không có trong danh sách đủ điều kiện tham dự sự kiện này.' });
            }

            console.log("LOG: Đã tìm thấy sinh viên trong danh sách đủ điều kiện.");
            const studentDoc = snapshot.docs[0];
            const studentData = studentDoc.data();
            
            // Dùng Document ID thật từ kết quả tìm được để kiểm tra đăng ký
            const registrationRef = db.collection('registrations').doc(studentDoc.id);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: 'Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            const registrationData = { ...studentData, eventId, photoURL, registeredAt: new Date() };
            // Lưu đăng ký với ID chính xác đã tìm được
            await registrationRef.set(registrationData);

            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
            }

            console.log("--- KẾT THÚC YÊU CẦU ĐĂNG KÝ THÀNH CÔNG ---");
            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('LỖI NGHIÊM TRỌNG TRONG API:', error);
            res.status(500).json({ message: 'Lỗi từ server, vui lòng thử lại.' });
        }
    });
}
