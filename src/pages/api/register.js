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

    // --- BƯỚC 1: KIỂM TRA PHIÊN ĐĂNG NHẬP CỦA NGƯỜI DÙNG ---
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

        const mssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!mssv || !eventId || !photo) {
            return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
        }

        try {
            // --- BƯỚC 2: KIỂM TRA MSSV CÓ TRÙNG VỚI EMAIL ĐÃ ĐĂNG NHẬP KHÔNG ---
            const mssvFromEmail = loggedInEmail.split('@')[0].toLowerCase();
            if (!mssvFromEmail.includes(mssv.toLowerCase())) {
                 return res.status(403).json({ message: `Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}) mà bạn muốn đăng ký.` });
            }


            // --- BƯỚC 3: KIỂM TRA SINH VIÊN TRONG DANH SÁCH ĐỦ ĐIỀU KIỆN ---
            const eligibleStudentRef = db.collection('eligibleStudents').doc(`${eventId}_${mssv}`);
            const studentDoc = await eligibleStudentRef.get();

            if (!studentDoc.exists) {
                return res.status(404).json({ message: 'MSSV không có trong danh sách đủ điều kiện tham dự sự kiện này.' });
            }
            
            // Lấy dữ liệu sinh viên để dùng sau này
            const studentData = studentDoc.data();

            // --- BƯỚC 4: KIỂM TRA XEM SINH VIÊN ĐÃ ĐĂNG KÝ CHƯA ---
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: 'Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            // --- BƯỚC 5: TẢI ẢNH LÊN VÀ LƯU THÔNG TIN ĐĂNG KÝ ---
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            const registrationData = {
                ...studentData, // Lấy thông tin từ danh sách đủ điều kiện
                eventId,
                photoURL,
                registeredAt: new Date(),
            };
            await registrationRef.set(registrationData);

            // --- BƯỚC 6: CẬP NHẬT SỐ LƯỢNG ĐÃ ĐĂNG KÝ ---
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
            }

            res.status(200).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để biết thêm chi tiết.' });

        } catch (error) {
            console.error('Registration API error:', error);
            res.status(500).json({ message: 'Lỗi từ server, vui lòng thử lại.' });
        }
    });
}
