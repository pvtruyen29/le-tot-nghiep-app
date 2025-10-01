// src/components/RegistrationModal.js
import { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';

// Hàm helper để tạo ảnh đã được cắt (giữ nguyên)
function getCroppedImg(image, crop, fileName) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  const pixelRatio = window.devicePixelRatio;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(blob => {
      if (!blob) { console.error('Canvas is empty'); return; }
      resolve(new File([blob], fileName, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Chưa có thông tin';
    return new Date(timestamp.toDate()).toLocaleString('vi-VN', {
        dateStyle: 'full',
        timeStyle: 'short'
    });
};

export default function RegistrationModal({ event, onClose }) {
  const [mssv, setMssv] = useState("");
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef(null);
  
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedFileUrl, setCroppedFileUrl] = useState('');
  let finalCroppedFile = null;

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      setCroppedFileUrl('');
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    // Tỷ lệ 3/4
    const aspect = 3 / 4; 
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
      width,
      height
    );
    setCrop(newCrop);
  };

  const handleCreateCroppedFile = async () => {
    if (!mssv.trim()) {
        setMessage('Vui lòng nhập MSSV trước khi cắt ảnh.');
        return;
    }
    if (!completedCrop || !imgRef.current) {
        setMessage('Vui lòng chọn vùng ảnh hợp lệ.');
        return;
    }
    const fileName = `${mssv.trim()}.jpg`;
    const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop, fileName);
    
    finalCroppedFile = croppedImageFile;
    if (croppedFileUrl) { URL.revokeObjectURL(croppedFileUrl); } // Giải phóng bộ nhớ
    setCroppedFileUrl(URL.createObjectURL(croppedImageFile));
    setMessage('Đã cắt ảnh thành công!');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mssv || !croppedFileUrl) {
        setMessage("Vui lòng nhập MSSV, chọn và cắt ảnh trước khi đăng ký.");
        return;
    }
    setIsLoading(true);
    setMessage("");

    const fileToUpload = finalCroppedFile || await (await fetch(croppedFileUrl)).blob();
    const formData = new FormData();
    formData.append("mssv", mssv);
    formData.append("photo", fileToUpload, `${mssv.trim()}.jpg`);
    formData.append("eventId", event.id);

    try {
      const response = await fetch("/api/register", { method: "POST", body: formData });
      const data = await response.json();
      setMessage(data.message);
      if (response.ok) { setTimeout(onClose, 3000); }
    } catch (error) {
      setMessage("Lỗi hệ thống, vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-large">
        {isLoading && <div className="loading-overlay"><div className="loader"></div></div>}
        
        <div className="modal-grid">
            {/* === CỘT TRÁI: THÔNG TIN VÀ THAO TÁC === */}
            <div className="modal-col-info">
                <h2 className="modal-title">{event.title}</h2>
                <div className="info-box">
                    <h3 className="box-title">Thông tin sự kiện</h3>
                    <div className="event-details">
                        <p><strong>Đơn vị:</strong> {event.organizer || 'Chưa cập nhật'}</p>
                        <p><strong>Địa điểm:</strong> {event.location || 'Chưa cập nhật'}</p>
                        <p><strong>Thời gian:</strong> {formatDate(event.eventTime)}</p>
                        <p><strong>Hạn ĐK:</strong> {formatDate(event.endTime)}</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="form-box">
                    <h3 className="box-title">Form Đăng ký</h3>
                    <div className="form-group">
                        <label htmlFor="mssv">1. Nhập Mã số sinh viên:</label>
                        <input type="text" id="mssv" value={mssv} onChange={(e) => setMssv(e.target.value.toUpperCase())} placeholder="Ví dụ: B1234567" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="photo">2. Chọn ảnh chân dung:</label>
                        <input type="file" id="photo" accept="image/*" onChange={onSelectFile} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>Đóng</button>
                        <button type="submit" className="register-btn" disabled={isLoading || !croppedFileUrl}>
                            {isLoading ? 'Đang xử lý...' : '4. Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>

            {/* === CỘT PHẢI: HIỂN THỊ HÌNH ẢNH === */}
            <div className="modal-col-action">
                {imgSrc ? (
                    <div className="crop-container">
                        <label>3. Điều chỉnh và cắt ảnh (tỷ lệ 3x4):</label>
                        <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={3 / 4}>
                            <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Vùng cắt ảnh"/>
                        </ReactCrop>
                        <button type="button" className="btn-crop" onClick={handleCreateCroppedFile}>
                            Cắt ảnh
                        </button>
                    </div>
                ) : (
                    <div className="placeholder-image">Vui lòng chọn ảnh để bắt đầu</div>
                )}
                
                {croppedFileUrl && (
                    <div className="preview-container">
                        <p>Xem trước ảnh đã cắt:</p>
                        <div className="preview-frame" style={{ aspectRatio: '3 / 4' }}>
                            <img src={croppedFileUrl} alt="Ảnh đã cắt" />
                        </div>
                    </div>
                )}
                
                {message && <p className="message message-right">{message}</p>}
            </div>
        </div>
      </div>
    </div>
  );
}
