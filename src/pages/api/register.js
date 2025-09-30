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
        console.error("LỖI: Không có session đăng nhập.");
        return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập lại.' });
    }
    const loggedInEmail = session.user.email;
    console.log(`LOG: Email đã đăng nhập: ${loggedInEmail}`);

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("LỖI: Không thể xử lý form data:", err);
            return res.status(500).json({ message: 'Lỗi khi xử lý form.' });
        }

        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!rawMssv || !eventId || !photo) {
            console.error("LỖI: Thiếu thông tin đầu vào.", { mssv: rawMssv, eventId, photo: !!photo });
            return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
        }

        // Chuẩn hóa MSSV nhập vào: Xóa khoảng trắng và chuyển thành IN HOA
        const mssv = rawMssv.trim().toUpperCase();
        console.log(`LOG: MSSV gốc từ form: "${rawMssv}", MSSV đã chuẩn hóa: "${mssv}"`);
        
        try {
            // --- SỬA LỖI: KIỂM TRA EMAIL VÀ MSSV (KHÔNG PHÂN BIỆT HOA/THƯỜNG) ---
            // 1. Lấy phần tên người dùng từ email
            const usernameFromEmail = loggedInEmail.split('@')[0];
            // 2. So sánh sau khi đã chuyển cả hai thành IN HOA
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 console.error(`LỖI: Email không khớp MSSV. Tên người dùng trong email (IN HOA): ${usernameFromEmail.toUpperCase()}, MSSV (IN HOA): ${mssv}`);
                 return res.status(403).json({ message: `Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}) mà bạn muốn đăng ký.` });
            }

            // --- KIỂM TRA SINH VIÊN TRONG DANH SÁCH ---
            // Sử dụng MSSV đã được chuẩn hóa (IN HOA) để tìm kiếm
            const docIdToFind = `${eventId}_${mssv}`;
            console.log(`LOG: Đang tìm kiếm document trong Firestore với ID: "${docIdToFind}"`);

            const eligibleStudentRef = db.collection('eligibleStudents').doc(docIdToFind);
            const studentDoc = await eligibleStudentRef.get();

            if (!studentDoc.exists) {
                console.error(`LỖI: Không tìm thấy document với ID: "${docIdToFind}". Vui lòng kiểm tra lại xem MSSV trong file CSV đã được viết IN HOA chưa.`);
                return res.status(404).json({ message: 'MSSV không có trong danh sách đủ điều kiện tham dự sự kiện này.' });
            }
            
            console.log("LOG: Đã tìm thấy sinh viên trong danh sách đủ điều kiện.");
            const studentData = studentDoc.data();

            const registrationRef = db.collection('registrations').doc(docIdToFind);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: 'Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            const registrationData = { ...studentData, eventId, photoURL, registeredAt: new Date() };
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
