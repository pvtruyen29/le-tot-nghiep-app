// src/pages/api/events/[eventId]/students/[studentId].js
import { db } from '../../../../../lib/firebase-admin';

export default async function handler(req, res) {
  const { eventId, studentId } = req.query;

  if (req.method === 'DELETE') {
    try {
      if (!eventId || !studentId) {
        return res.status(400).json({ message: 'Thiếu thông tin sự kiện hoặc MSSV.' });
      }
      await db.collection('events').doc(eventId).collection('eligibleStudents').doc(studentId).delete();
      return res.status(200).json({ message: 'Xóa sinh viên thành công.' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xóa sinh viên.' });
    }
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
