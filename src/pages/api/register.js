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

    console.log("API /api/register: Bắt đầu xử lý yêu cầu đăng ký.");

    // --- BƯỚC 1: KIỂM TRA PHIÊN ĐĂNG NHẬP ---
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.email) {
        console.error("API Error: Không tìm thấy session hoặc email người dùng.");
        return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập lại.' });
    }
    const loggedInEmail = session.user.email;
    console.log(`API Log: Người dùng đã đăng nhập với email: ${loggedInEmail}`);

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("API Error: Lỗi khi parse form data:", err);
            return res.status(500).json({ message: 'Lỗi khi xử lý form.' });
        }

        const mssv = fields.mssv?.[0]; // formidable v3 trả về mảng
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!mssv || !eventId || !photo) {
            console.error("API Error: Thiếu thông tin đầu vào.", { mssv, eventId, photo: !!photo });
            return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
        }
        console.log(`API Log: Đang xử lý đăng ký cho MSSV: ${mssv}, EventID: ${eventId}`);

        try {
            // --- BƯỚC 2: KIỂM TRA SINH VIÊN VÀ SO KHỚP EMAIL ---
            console.log("API Log: Bắt đầu kiểm tra sinh viên đủ điều kiện...");
            const eligibleStudentRef = db.collection('eligibleStudents').doc(`${eventId}_${mssv}`);
            const studentDoc = await eligibleStudentRef.get();

            if (!studentDoc.exists) {
                console.error(`API Error: MSSV ${mssv} không có trong danh sách đủ điều kiện.`);
                return res.status(404).json({ message: 'MSSV không có trong danh sách đủ điều kiện tham dự sự kiện này.' });
            }

            const studentData = studentDoc.data();
            console.log(`API Log: Đã tìm thấy sinh viên. Email trong danh sách: ${studentData.email}`);
            
            if (studentData.email !== loggedInEmail) {
                console.error(`API Error: Email không khớp! Yêu cầu: ${loggedInEmail}, CSDL: ${studentData.email}`);
                return res.status(403).json({ message: `Bạn không có quyền đăng ký cho MSSV này. Vui lòng đăng nhập đúng tài khoản email (${studentData.email}) đã được cung cấp.` });
            }
            console.log("API Log: Email hợp lệ.");

            // --- BƯỚC 3: KIỂM TRA XEM ĐÃ ĐĂNG KÝ CHƯA ---
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                console.error(`API Error: MSSV ${mssv} đã đăng ký rồi.`);
                return res.status(409).json({ message: 'Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }

            // --- BƯỚC 4: TẢI ẢNH LÊN ---
            console.log("API Log: Bắt đầu tải ảnh lên Cloud Storage...");
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;
            console.log(`API Log: Tải ảnh thành công. URL: ${photoURL}`);

            // --- BƯỚC 5: LƯU THÔNG TIN ĐĂNG KÝ ---
            const registrationData = { ...studentData, eventId, photoURL, registeredAt: new Date() };
            await registrationRef.set(registrationData);
            console.log("API Log: Đã lưu thông tin đăng ký vào Firestore.");

            // --- BƯỚC 6: CẬP NHẬT SỐ LƯỢNG ---
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
                console.log("API Log: Đã cập nhật số lượng đăng ký cho sự kiện.");
            }

            res.status(200).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để biết thêm chi tiết.' });

        } catch (error) {
            console.error('API CRITICAL ERROR:', error);
            res.status(500).json({ message: 'Lỗi nghiêm trọng từ server, vui lòng xem logs.' });
        }
    });
}
