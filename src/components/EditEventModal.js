// src/components/EditEventModal.js
import { useState } from 'react';

// Helper function để chuyển đổi Timestamp của Firebase thành chuỗi yyyy-MM-ddThh:mm
const toDateTimeLocal = (timestamp) => {
  if (!timestamp?.toDate) return '';
  const dt = new Date(timestamp.toDate());
  // Điều chỉnh cho múi giờ địa phương
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
};

export default function EditEventModal({ event, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: event.title || '',
    organizer: event.organizer || '',
    location: event.location || '',
    notes: event.notes || '',
    eventTime: toDateTimeLocal(event.eventTime),
    startTime: toDateTimeLocal(event.startTime),
    endTime: toDateTimeLocal(event.endTime),
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave(event.id, formData);
    setIsLoading(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Chỉnh sửa sự kiện: {event.title}</h2>
        <form onSubmit={handleSubmit}>
            <input type="text" name="title" placeholder="Tên sự kiện (*)" value={formData.title} onChange={handleChange} required />
            <input type="text" name="organizer" placeholder="Đơn vị tổ chức" value={formData.organizer} onChange={handleChange} />
            <input type="text" name="location" placeholder="Nơi tổ chức" value={formData.location} onChange={handleChange} />
            <div><label>Thời gian tổ chức:</label><input type="datetime-local" name="eventTime" value={formData.eventTime} onChange={handleChange} /></div>
            <div><label>Bắt đầu đăng ký:</label><input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} /></div>
            <div><label>Hạn chót đăng ký:</label><input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} /></div>
            <textarea name="notes" placeholder="Ghi chú, lưu ý..." value={formData.notes} onChange={handleChange}></textarea>
            <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>Hủy</button>
                <button type="submit" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
        </form>
      </div>
    </div>
  );
}
