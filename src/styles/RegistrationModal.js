// src/components/RegistrationModal.js
import { useState, useRef } from 'react';
// Đã loại bỏ hoàn toàn các import liên quan đến next-auth
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- CÁC HÀM PHỤ TRỢ ---

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
    0, 0,
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


// --- COMPONENT CHÍNH ---

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
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 3 / 4, width, height),
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
    if (croppedFileUrl) { URL.revokeObjectURL(croppedFileUrl); }
    setCroppedFileUrl(URL.createObjectURL(croppedImageFile));
    setMessage('Đã cắt ảnh thành công! Bạn có thể nhấn Xác nhận.');
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
            <div className="modal-col-info">
                <h2 className="modal-title">{event.title}</h2>
                <div className="info-box">
                    <h3 className="box-title">Thông tin chi tiết</h3>
                    <div className="event-details">
                        <p><strong>Đơn vị:</strong> {event.organizer || 'Chưa cập nhật'}</p>
                        <p><strong>Địa điểm:</strong> {event.location || 'Chưa cập nhật'}</p>
                        <p><strong>Thời gian:</strong> {formatDate(event.eventTime)}</p>
                        <p><strong>Hạn ĐK:</strong> {formatDate(event.endTime)}</p>
                        {event.notes && <p className="notes"><strong>Lưu ý:</strong> {event.notes}</p>}
                    </div>
                </div>
            </div>

            <div className="modal-col-action">
                <form onSubmit={handleSubmit} className="form-box">
                    <h3 className="box-title">Form Đăng ký</h3>
                    <p style={{textAlign: 'center', marginTop: '-1rem', marginBottom: '1.5rem'}}>Vui lòng điền thông tin đăng ký:</p>
                    
                    <div className="form-group">
                        <label htmlFor="mssv">1. Nhập Mã số sinh viên:</label>
                        <input type="text" id="mssv" value={mssv} onChange={(e) => setMssv(e.target.value.toUpperCase())} placeholder="Ví dụ: B1234567" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="photo">2. Chọn ảnh chân dung:</label>
                        <input type="file" id="photo" accept="image/*" onChange={onSelectFile} />
                    </div>

                    <div className="photo-guidelines">
                        <p><strong>Lưu ý quan trọng:</strong> Bạn PHẢI chọn và cắt ảnh trước khi xác nhận.</p>
                        <ul>
                            <li><strong>Bố cục:</strong> Ảnh rõ nét, chụp từ ngang eo đến đỉnh đầu.</li>
                            <li><strong>Thần thái:</strong> Tư thế đứng đẹp, lịch sự, cười tươi, tự tin.</li>
                            <li><strong>Trang phục:</strong> Khuyến khích mặc lễ phục tốt nghiệp của Trường, hoặc áo sơ mi/vest (đối với nam) và áo dài (đối với nữ).</li>
                            <li><strong>Phông nền (Background):</strong> Nên chọn nền đơn giản (tường trắng, xám) hoặc ảnh xóa phông để dễ xử lý kỹ thuật.</li>
                        </ul>
                    </div>

                    {imgSrc && (
                        <div className="crop-container">
                            <label>3. Điều chỉnh và cắt ảnh (tỷ lệ 3x4):</label>
                            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={3 / 4}>
                                <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Vùng cắt ảnh"/>
                            </ReactCrop>
                            <button type="button" className="btn-crop" onClick={handleCreateCroppedFile}>
                                Cắt ảnh
                            </button>
                        </div>
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

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>Đóng</button>
                        <button type="submit" className="register-btn" disabled={isLoading || !croppedFileUrl}>
                            {isLoading ? 'Đang xử lý...' : '4. Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}
