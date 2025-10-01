// src/pages/api/validate-image.js
import { IncomingForm } from 'formidable';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { serviceAccount } from '../../lib/firebase-admin';

// Khởi tạo client cho Google Cloud Vision
const visionClient = new ImageAnnotatorClient({
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    },
    projectId: serviceAccount.project_id,
});

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ valid: false, message: 'Lỗi khi xử lý ảnh.' });
        }

        const photo = files.photo?.[0];
        if (!photo) {
            return res.status(400).json({ valid: false, message: 'Không nhận được file ảnh.' });
        }

        try {
            console.log(`[VISION API] Bắt đầu phân tích ảnh...`);
            const [result] = await visionClient.faceDetection(photo.filepath);
            const faces = result.faceAnnotations;
            
            if (faces.length === 1) {
                console.log(`[VISION API] Ảnh hợp lệ, tìm thấy 1 khuôn mặt.`);
                return res.status(200).json({ valid: true, message: '✅ Ảnh hợp lệ! Bạn có thể tiếp tục.' });
            }
            
            if (faces.length > 1) {
                console.log(`[VISION API] Ảnh không hợp lệ, tìm thấy ${faces.length} khuôn mặt.`);
                return res.status(400).json({ valid: false, message: '❌ Lỗi: Ảnh chứa nhiều hơn một khuôn mặt.' });
            }
            
            // faces.length === 0
            console.log(`[VISION API] Ảnh không hợp lệ, không tìm thấy khuôn mặt.`);
            return res.status(400).json({ valid: false, message: '❌ Lỗi: Không nhận diện được khuôn mặt.' });

        } catch (error) {
            console.error('[VISION API Lỗi]', error);
            res.status(500).json({ valid: false, message: 'Lỗi từ server phân tích ảnh.' });
        }
    });
}
