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

    // --- BƯỚC 1: KIỂM TRA PHIÊN ĐĂNG NHẬP CỦA NGƯỜI DÙNG ---
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
            console.error("[CẢNH BÁO] Yêu cầu bị từ chối: Thiếu thông tin cần thiết.", { mssv: rawMssv, eventId, photo: !!photo });
            return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
        }

        const mssv = rawMssv.trim().toUpperCase();
        
        try {
            // --- BƯỚC 2: KIỂM TRA SINH VIÊN VÀ SO KHỚP EMAIL ---
            console.log(`[LOG] Bắt đầu kiểm tra sinh viên. Đang tìm kiếm document ID: "${eventId}_${mssv}"`);
            
            // 2.1: KIỂM TRA EMAIL CÓ CHỨA MSSV KHÔNG (Bổ sung theo yêu cầu)
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 console.error(`[CẢNH BÁO] Email không khớp MSSV. Email: ${loggedInEmail}, MSSV: ${mssv}`);
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}) mà bạn muốn đăng ký.` });
            }
            console.log(`[LOG] Email đã khớp với MSSV.`);

            // 2.2: Tìm sinh viên trong danh sách sự kiện
            const eligibleStudentRef = db.collection('eligibleStudents').doc(`${eventId}_${mssv}`);
            const studentDoc = await eligibleStudentRef.get();

            if (!studentDoc.exists) {
                console.error(`[CẢNH BÁO] Không tìm thấy sinh viên với document ID: "${eventId}_${mssv}"`);
                return res.status(404).json({ message: `MSSV "${mssv}" không có trong danh sách đủ điều kiện của sự kiện này.` });
            }
            console.log(`[LOG] Đã tìm thấy sinh viên trong danh sách.`);

            const studentData = studentDoc.data();
            // 2.3: So sánh email trong danh sách với email đã đăng nhập
            if (studentData.email && studentData.email !== loggedInEmail) {
                console.error(`[CẢNH BÁO] Email đăng nhập không khớp email trong CSDL. Yêu cầu: ${loggedInEmail}, CSDL: ${studentData.email}`);
                return res.status(403).json({ message: `Bạn không có quyền đăng ký cho MSSV này. Vui lòng đăng nhập đúng tài khoản email (${studentData.email}) đã được cung cấp.` });
            }
            console.log(`[LOG] Email đăng nhập đã khớp với email trong CSDL.`);

            // --- BƯỚC 3: KIỂM TRA XEM SINH VIÊN ĐÃ ĐĂNG KÝ CHƯA ---
            console.log(`[LOG] Bắt đầu kiểm tra trùng lặp đăng ký.`);
            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                console.warn(`[CẢNH BÁO] Sinh viên "${mssv}" đã đăng ký sự kiện này rồi.`);
                return res.status(409).json({ message: 'Bạn đã đăng ký tham dự sự kiện này rồi.' });
            }
            console.log(`[LOG] Sinh viên chưa từng đăng ký.`);

            // --- BƯỚC 4: TẢI ẢNH LÊN VÀ LƯU THÔNG TIN ĐĂNG KÝ ---
            console.log(`[LOG] Bắt đầu tải ảnh lên Cloud Storage.`);
            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;
            console.log(`[LOG] Tải ảnh thành công. URL: ${photoURL}`);

            const registrationData = { ...studentData, eventId, mssv, photoURL, registeredAt: new Date() };
            await registrationRef.set(registrationData);
            console.log(`[LOG] Đã lưu thông tin đăng ký vào collection 'registrations'.`);

            // --- BƯỚC 5: CẬP NHẬT SỐ LƯỢNG ĐÃ ĐĂNG KÝ ---
            console.log(`[LOG] Bắt đầu cập nhật số lượng đăng ký cho sự kiện.`);
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
                console.log(`[LOG] Cập nhật thành công. Số lượng mới: ${currentCount + 1}`);
            } else {
                console.warn(`[CẢNH BÁO] Không tìm thấy sự kiện "${eventId}" để cập nhật số lượng.`);
            }

            console.log("--- KẾT THÚC YÊU CẦU ĐĂNG KÝ THÀNH CÔNG ---\n");
            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('[CẢNH BÁO] Lỗi không xác định trong khối try-catch:', error);
            res.status(500).json({ message: 'Lỗi từ server, vui lòng thử lại.' });
        }
    });
}
