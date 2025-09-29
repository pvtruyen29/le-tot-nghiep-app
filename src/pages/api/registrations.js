// src/pages/api/registrations.js
import { db } from '../../lib/firebase-admin';
import JSZip from 'jszip';
import https from 'https';

export default async function handler(req, res) {
  const { eventId, action } = req.query;

  if (!eventId) {
    return res.status(400).json({ message: 'Thiếu Event ID.' });
  }

  try {
    const registrationsRef = db.collection('registrations').where('eventId', '==', eventId);
    const snapshot = await registrationsRef.get();
    
    if (snapshot.empty) {
      return res.status(200).json([]); // Trả về mảng rỗng nếu không có ai đăng ký
    }

    const registrations = snapshot.docs.map(doc => doc.data());

    // --- Xử lý theo yêu cầu ---
    if (action === 'download_zip') {
      const zip = new JSZip();

      // Hàm tải một file ảnh từ URL
      const fetchImage = (url) => new Promise((resolve, reject) => {
        https.get(url, (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        });
      });

      // Tải tất cả ảnh và thêm vào file zip
      await Promise.all(registrations.map(async (reg) => {
        try {
          const imageBuffer = await fetchImage(reg.photoURL);
          const fileName = `${reg.mssv}.jpg`; // Hoặc lấy từ photoURL
          zip.file(`portraits/${fileName}`, imageBuffer);
        } catch (error) {
          console.error(`Không thể tải ảnh cho MSSV: ${reg.mssv}`, error);
        }
      }));

      // Gửi file zip về cho client
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="photos_${eventId}.zip"`);
      res.status(200).send(zipBuffer);

    } else {
      // Mặc định: Trả về danh sách đăng ký dạng JSON
      res.status(200).json(registrations);
    }

  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu đăng ký:", error.message);
    res.status(500).json({ message: 'Lỗi từ máy chủ.' });
  }
}
