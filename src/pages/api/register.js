// src/pages/api/register.js
import { IncomingForm } from 'formidable';
import { storage, db } from '../../lib/firebase-admin';
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth/[...nextauth]" // Dòng import này là chính xác

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

    if (!session) {
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
            const eligibleStudentRef = db.collection('eligibleStudents').doc(`${eventId}_${mssv}`);
            const studentDoc = await eligibleStudentRef.get();

            if (!studentDoc.exists) {
                return res.status(404).json({ message: 'MSSV không có trong danh sách đủ điều kiện.' });
            }

            const studentData = studentDoc.data();
            if (studentData.email !== loggedInEmail) {
                return res.status(403).json({ message: `Bạn không có quyền đăng ký cho MSSV này. Vui lòng dùng đúng email: ${studentData.email}` });
            }

            const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);
            const registrationDoc = await registrationRef.get();
            if (registrationDoc.exists) {
                return res.status(409).json({ message: 'Bạn đã đăng ký sự kiện này rồi.' });
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

            res.status(200).json({ message: 'Đăng ký thành công!' });

        } catch (error) {
            console.error('Registration API error:', error);
            res.status(500).json({ message: 'Lỗi từ server, vui lòng thử lại.' });
        }
    });
}
