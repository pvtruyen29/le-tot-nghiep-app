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

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.email) {
        return res.status(401).json({ message: '[Lỗi Xác thực] Chưa đăng nhập.' });
    }
    const loggedInEmail = session.user.email;

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ message: '[Lỗi Form] Không thể đọc dữ liệu gửi lên.' });
        }

        const rawMssv = fields.mssv?.[0];
        const eventId = fields.eventId?.[0];
        const photo = files.photo?.[0];

        if (!rawMssv || !eventId || !photo) {
            return res.status(400).json({ message: '[Lỗi Thiếu thông tin] Vui lòng cung cấp đầy đủ MSSV, EventID và ảnh.' });
        }

        const mssv = rawMssv.trim().toUpperCase();
        
        try {
            const usernameFromEmail = loggedInEmail.split('@')[0];
            if (!usernameFromEmail.toUpperCase().includes(mssv)) {
                 return res.status(403).json({ message: `[Lỗi Quyền] Email bạn đang dùng (${loggedInEmail}) không khớp với MSSV (${mssv}).` });
            }

            const eligibleStudentsRef = db.collection('eligibleStudents');
            const snapshot = await eligibleStudentsRef
                .where('eventId', '==', eventId)
                .where('mssv', '==', mssv)
                .limit(1)
                .get();

            if (snapshot.empty) {
                console.error(`[API Lỗi] Truy vấn kết hợp eventId="${eventId}" và mssv="${mssv}" không trả về kết quả.`);
                
                // --- KHỐI GỠ LỖI NÂNG CAO ---
                console.log(`[GỠ LỖI] Bắt đầu truy vấn chỉ với MSSV="${mssv}" để kiểm tra chéo...`);
                const debugSnapshot = await eligibleStudentsRef.where('mssv', '==', mssv).get();
                if (!debugSnapshot.empty) {
                    const foundDocs = debugSnapshot.docs.map(doc => doc.data());
                    console.error(`[GỠ LỖI] ĐÃ TÌM THẤY MSSV! Nhưng có sự không khớp dữ liệu.`);
                    console.error(`[GỠ LỖI] Event ID bạn gửi lên là: "${eventId}"`);
                    console.error(`[GỠ LỖI] Event ID được tìm thấy trong CSDL của sinh viên này là: "${foundDocs[0].eventId}"`);
                    console.error(`[GỠ LỖI] => KẾT LUẬN: Event ID không khớp! Vui lòng kiểm tra lại quá trình upload file CSV.`);
                } else {
                    console.error(`[GỠ LỖI] Thất bại! Không tìm thấy bất kỳ sinh viên nào có MSSV="${mssv}" trong toàn bộ collection.`);
                }
                // --- KẾT THÚC KHỐI GỠ LỖI ---

                return res.status(404).json({ message: `[Lỗi Dữ liệu] MSSV "${mssv}" không có trong danh sách đủ điều kiện của sự kiện này.` });
            }

            // ... Các bước xử lý còn lại giữ nguyên ...
            const studentDoc = snapshot.docs[0];
            const studentData = studentDoc.data();
            const registrationRef = db.collection('registrations').doc(studentDoc.id);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: '[Lỗi Trùng lặp] Bạn đã đăng ký sự kiện này rồi.' });
            }

            const bucket = storage.bucket();
            const destination = `registrations/${eventId}/${mssv}.jpg`;
            await bucket.upload(photo.filepath, { destination });
            
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (eventDoc.exists) {
                const currentCount = eventDoc.data().registeredCount || 0;
                await eventRef.update({ registeredCount: currentCount + 1 });
            }
            
            const photoURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;
            const registrationData = { ...studentData, eventId, photoURL, registeredAt: new Date() };
            await registrationRef.set(registrationData);

            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('[API Lỗi Nghiêm trọng]', error);
            res.status(500).json({ message: '[Lỗi Server] Có lỗi xảy ra ở phía máy chủ, vui lòng thử lại sau.' });
        }
    });
}
