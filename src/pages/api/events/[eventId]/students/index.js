// src/pages/api/events/[eventId]/students/index.js
import { db } from '../../../../../lib/firebase-admin'; // SỬA LỖI: Đường dẫn chính xác

export default async function handler(req, res) {
  const { eventId } = req.query;

  // LẤY DANH SÁCH SINH VIÊN
  if (req.method === 'GET') {
    try {
      const snapshot = await db.collection('events').doc(eventId).collection('eligibleStudents').get();
      if (snapshot.empty) {
        return res.status(200).json([]);
      }
      const students = snapshot.docs.map(doc => ({ mssv: doc.id, ...doc.data() }));
      return res.status(200).json(students);
    } catch (error) {
      console.error("API Error fetching eligible students:", error);
      return res.status(500).json({ message: 'Lỗi khi lấy danh sách sinh viên.' });
    }
  }

  // THÊM MỘT SINH VIÊN MỚI
  if (req.method === 'POST') {
    try {
      const studentData = req.body;
      const mssv = studentData.mssv?.trim();
      if (!mssv) {
        return res.status(400).json({ message: 'MSSV là bắt buộc.' });
      }
      const { mssv: _, ...dataToSet } = studentData;
      await db.collection('events').doc(eventId).collection('eligibleStudents').doc(mssv).set(dataToSet);
      return res.status(201).json({ message: 'Thêm sinh viên thành công.' });
    } catch (error) {
      console.error("API Error adding eligible student:", error);
      return res.status(500).json({ message: 'Lỗi khi thêm sinh viên.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
