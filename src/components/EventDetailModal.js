// src/components/EventDetailModal.js
import React from 'react';

const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Chưa có thông tin';
    return new Date(timestamp.toDate()).toLocaleString('vi-VN', {
        dateStyle: 'full',
        timeStyle: 'short'
    });
};

export default function EventDetailModal({ event, onClose, onProceedToRegister }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2 className="modal-title">{event.title}</h2>
        <div className="info-box">
          <h3 className="box-title">Thông tin chi tiết sự kiện</h3>
          <div className="event-details">
            <p><strong>Đơn vị tổ chức:</strong> {event.organizer || 'Chưa cập nhật'}</p>
            <p><strong>Địa điểm:</strong> {event.location || 'Chưa cập nhật'}</p>
            <p><strong>Thời gian diễn ra:</strong> {formatDate(event.eventTime)}</p>
            <p><strong>Thời gian đăng ký:</strong> Từ {formatDate(event.startTime)} đến {formatDate(event.endTime)}</p>
            {event.notes && <p className="notes"><strong>Lưu ý:</strong> {event.notes}</p>}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Đóng</button>
          <button type="button" className="register-btn" onClick={onProceedToRegister}>
            Tiến hành Đăng ký
          </button>
        </div>
      </div>
    </div>
  );
}
