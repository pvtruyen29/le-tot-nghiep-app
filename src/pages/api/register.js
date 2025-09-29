// src/pages/api/register.js
import { IncomingForm } from 'formidable';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { db, bucket, serviceAccount } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore'; // Import FieldValue

const visionClient = new ImageAnnotatorClient({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
  projectId: serviceAccount.project_id,
});

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const mssv = data.fields.mssv[0].trim();
    const photo = data.files.photo[0];
    const eventId = data.fields.eventId[0];
    const fileName = photo.originalFilename;
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');

    if (fileNameWithoutExt !== mssv) {
      return res.status(400).json({ message: `Tên file ảnh phải là MSSV của bạn (${mssv}).` });
    }

    const eligibleStudentRef = db.collection('events').doc(eventId).collection('eligibleStudents').doc(mssv);
    const doc = await eligibleStudentRef.get();
    if (!doc.exists) {
      return res.status(403).json({ message: 'MSSV của bạn không có trong danh sách tốt nghiệp.' });
    }
    const studentInfo = doc.data();

    const [result] = await visionClient.faceDetection(photo.filepath);
    const faces = result.faceAnnotations;
    if (faces.length === 0) return res.status(400).json({ message: 'Ảnh không hợp lệ: Không tìm thấy khuôn mặt.' });
    if (faces.length > 1) return res.status(400).json({ message: 'Ảnh không hợp lệ: Chỉ được đăng ảnh một người.' });

    const destination = `portraits/${fileName}`;
    await bucket.upload(photo.filepath, { destination });
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    
    const eventRef = db.collection('events').doc(eventId);
    const registrationRef = db.collection('registrations').doc(`${eventId}_${mssv}`);

    // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu
    await db.runTransaction(async (transaction) => {
        // 1. Tạo lượt đăng ký mới
        transaction.set(registrationRef, {
            mssv, eventId, photoURL: fileUrl, registeredAt: new Date(),
            ...studentInfo,
        });

        // 2. Cập nhật số đếm đăng ký (tăng lên 1)
        transaction.update(eventRef, { 
            registeredCount: FieldValue.increment(1) 
        });
    });

    return res.status(200).json({ message: 'Đăng ký thành công! Chúc mừng bạn.' });

  } catch (error) {
    console.error('Lỗi khi đăng ký:', error.message);
    return res.status(500).json({ message: 'Lỗi từ máy chủ.' });
  }
}
