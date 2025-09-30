// src/pages/api/registrations.js
import { db } from '../../lib/firebase-admin';
import JSZip from 'jszip';
import https from 'https';

// Hàm helper để tải file từ URL về dạng buffer
const fetchUrl = (url) => new Promise((resolve, reject) => {
    https.get(url, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
    });
});

export default async function handler(req, res) {
    const { eventId, action } = req.query;

    if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
    }

    try {
        // --- SỬA LỖI: Đảm bảo truy vấn chính xác ---
        const registrationsRef = db.collection('registrations');
        const snapshot = await registrationsRef.where('eventId', '==', eventId).get();

        if (snapshot.empty) {
            // Trả về một mảng rỗng nếu không có ai đăng ký
            return res.status(200).json([]);
        }

        const registrations = snapshot.docs.map(doc => doc.data());

        // --- XỬ LÝ TẢI FILE ZIP (NẾU CÓ YÊU CẦU) ---
        if (action === 'download_zip') {
            const zip = new JSZip();
            for (const reg of registrations) {
                if (reg.photoURL) {
                    const fileBuffer = await fetchUrl(reg.photoURL);
                    // Dùng MSSV làm tên file trong file ZIP
                    zip.file(`${reg.mssv}.jpg`, fileBuffer);
                }
            }
            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=photos_${eventId}.zip`);
            return res.status(200).send(zipBuffer);
        }

        // --- TRẢ VỀ DANH SÁCH DẠNG JSON (MẶC ĐỊNH) ---
        return res.status(200).json(registrations);

    } catch (error) {
        console.error("API registrations error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
