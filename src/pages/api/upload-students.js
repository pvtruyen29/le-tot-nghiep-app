// src/pages/api/upload-students.js
import { IncomingForm } from 'formidable';
import { db } from '../../lib/firebase-admin';
import csv from 'csv-parser';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ message: 'Error parsing form data' });
        }

        const eventId = fields.eventId?.[0];
        const file = files.file?.[0];

        if (!eventId || !file) {
            return res.status(400).json({ message: 'Missing eventId or file' });
        }

        const results = [];
        fs.createReadStream(file.filepath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    const batch = db.batch();
                    const collectionRef = db.collection('eligibleStudents');

                    results.forEach((row) => {
                        // Giả sử cột trong CSV của bạn là 'MSSV', 'HoTen', 'Email'
                        const mssv = row.MSSV?.trim().toUpperCase();
                        const hoTen = row.HoTen?.trim();
                        const email = row.Email?.trim();

                        if (!mssv) return; // Bỏ qua hàng trống

                        // TẠO DOCUMENT VỚI ID THEO CẤU TRÚC MỚI
                        const docId = `${eventId}_${mssv}`;
                        const docRef = collectionRef.doc(docId); 
                        
                        batch.set(docRef, {
                            mssv: mssv,
                            hoTen: hoTen || '',
                            email: email || '',
                            eventId: eventId,
                        });
                    });

                    await batch.commit();

                    const eventRef = db.collection('events').doc(eventId);
                    await eventRef.update({ eligibleCount: results.length });

                    res.status(200).json({ message: `Tải lên và xử lý thành công ${results.length} sinh viên.` });
                } catch (error) {
                    console.error('Error writing to Firestore:', error);
                    res.status(500).json({ message: 'Error writing data to database.' });
                } finally {
                    fs.unlinkSync(file.filepath); // Xóa file tạm
                }
            });
    });
}
