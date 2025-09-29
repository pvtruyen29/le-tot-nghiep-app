// src/pages/api/events/[eventId].js
import { db } from '../../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  // Sửa lỗi: Đọc 'eventId' từ query để khớp với tên file
  const { eventId } = req.query; 

  // --- XỬ LÝ XÓA SỰ KIỆN ---
  if (req.method === 'DELETE') {
    try {
      await db.collection('events').doc(eventId).delete();
      res.status(200).json({ message: 'Xóa sự kiện thành công.' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi khi xóa sự kiện.' });
    }
  } 
  // --- XỬ LÝ SỬA SỰ KIỆN ---
  else if (req.method === 'PUT') {
    try {
      const eventData = req.body;
      const updatedData = {
        ...eventData,
        eventTime: eventData.eventTime ? Timestamp.fromDate(new Date(eventData.eventTime)) : null,
        startTime: eventData.startTime ? Timestamp.fromDate(new Date(eventData.startTime)) : null,
        endTime: eventData.endTime ? Timestamp.fromDate(new Date(eventData.endTime)) : null,
      };
      await db.collection('events').doc(eventId).update(updatedData);
      res.status(200).json({ message: 'Cập nhật sự kiện thành công.' });
    } catch (error) {
      console.error("Lỗi khi cập nhật sự kiện:", error);
      res.status(500).json({ message: 'Lỗi khi cập nhật sự kiện.' });
    }
  } 
  else {
    res.setHeader('Allow', ['DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
