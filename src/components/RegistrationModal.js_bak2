// src/components/RegistrationModal.js
import { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- HÀM PHỤ TRỢ ---
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
        
        <form onSubmit={handleSubmit} className="form-box">
            <h2 className="modal-title" style={{textAlign: 'center'}}>{event.title}</h2>
            <p style={{textAlign: 'center', marginTop: '-1rem', marginBottom: '1.5rem'}}>Vui lòng thực hiện các bước sau để đăng ký:</p>
            
            <div className="modal-grid-register">
                {/* CỘT TRÁI */}
                <div className="modal-col-left">
                    <div className="form-group">
                        <label>Bước 1: Nhập Mã số sinh viên</label>
                        <input type="text" value={mssv} onChange={(e) => setMssv(e.target.value.toUpperCase())} placeholder="Ví dụ: B1234567" required />
                    </div>
                    <div className="form-group">
                        <label>Bước 2: Chọn ảnh chân dung</label>
                        <input type="file" accept="image/*" onChange={onSelectFile} />
                    </div>
                    <div className="photo-guidelines">
                        <p><strong>Lưu ý quan trọng về ảnh:</strong></p>
                        <ul>
                            <li><strong>Bố cục:</strong> Ảnh rõ nét, chụp từ ngang eo đến đỉnh đầu.</li>
                            <li><strong>Trang phục:</strong> Lịch sự, khuyến khích mặc lễ phục tốt nghiệp.</li>
                            <li><strong>Phông nền:</strong> Nền đơn giản (tường trắng, xám) hoặc ảnh xóa phông.</li>
                        </ul>
                    </div>
                </div>

                {/* CỘT PHẢI */}
                <div className="modal-col-right">
                    {imgSrc ? (
                        <div className="crop-container-fixed">
                            <label>Bước 3: Điều chỉnh và Cắt ảnh</label>
                            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={3 / 4}>
                                <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Vùng cắt ảnh"/>
                            </ReactCrop>
                            <button type="button" className="btn-crop-main" onClick={handleCreateCroppedFile}>
                                Cắt ảnh
                            </button>
                        </div>
                    ) : (
                        <div className="placeholder-image">
                            <p>Vùng xem trước và cắt ảnh sẽ hiện ở đây.</p>
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
                </div>
            </div>
            
            {message && <p className="message message-fullwidth">{message}</p>}

            <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>Đóng</button>
                <button type="submit" className="register-btn" disabled={isLoading || !croppedFileUrl}>
                    {isLoading ? 'Đang xử lý...' : 'Xác nhận Đăng ký'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
