// src/components/RegistrationModal.js
import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width, crop.height);
  return new Promise((resolve) => {
    canvas.toBlob(blob => {
      if (!blob) { console.error('Canvas is empty'); return; }
      resolve(new File([blob], fileName, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

export default function RegistrationModal({ event, onClose }) {
  const { data: session } = useSession();
  const [mssv, setMssv] = useState("");
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedFileUrl, setCroppedFileUrl] = useState('');
  let finalCroppedFile = null;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isInfoValid, setIsInfoValid] = useState(false);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); setCroppedFileUrl(''); setIsInfoValid(false); setMessage('');
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 3 / 4, width, height), width, height);
    setCrop(newCrop);
  };

  const handleCropAndValidate = async () => {
    setIsLoading(true); setMessage("Đang kiểm tra..."); setIsInfoValid(false);
    if (!mssv.trim() || !completedCrop || !imgRef.current) {
      setMessage('Vui lòng nhập MSSV và chọn vùng ảnh.'); setIsLoading(false); return;
    }
    if (!session?.user?.email) {
      setMessage("[Lỗi] Không thể xác thực email."); setIsLoading(false); return;
    }
    const usernameFromEmail = session.user.email.split('@')[0];
    if (!usernameFromEmail.toUpperCase().includes(mssv.toUpperCase())) {
      setMessage(`[Lỗi] Email bạn đang dùng không khớp với MSSV "${mssv}".`); setIsLoading(false); return;
    }

    const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop, `${mssv.trim()}.jpg`);
    finalCroppedFile = croppedImageFile;
    if (croppedFileUrl) { URL.revokeObjectURL(croppedFileUrl); }
    setCroppedFileUrl(URL.createObjectURL(croppedImageFile));
    
    const formData = new FormData();
    formData.append('photo', croppedImageFile);

    try {
      const response = await fetch('/api/validate-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setMessage(result.message);
      if (response.ok) {
        setIsInfoValid(true);
      }
    } catch (error) {
        setMessage('Lỗi kết nối đến server kiểm tra ảnh.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isInfoValid) {
        setMessage("Thông tin chưa hợp lệ. Vui lòng nhấn 'Cắt và Kiểm tra' trước."); return;
    }
    setIsLoading(true); setMessage("");
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
            <div className="modal-grid-register">
                <div className="modal-col-left">
                    <div className="form-group"><label>Bước 1: Nhập Mã số sinh viên</label><input type="text" value={mssv} onChange={(e) => setMssv(e.target.value.toUpperCase())} placeholder="Ví dụ: B1234567" required /></div>
                    <div className="form-group"><label>Bước 2: Chọn ảnh chân dung</label><input type="file" accept="image/*" onChange={onSelectFile} /></div>
                    <div className="photo-guidelines"><p><strong>Lưu ý quan trọng về ảnh:</strong></p><ul><li><strong>Bố cục:</strong> Ảnh rõ nét, chính diện, chỉ có một người.</li><li><strong>Trang phục:</strong> Lịch sự, khuyến khích mặc lễ phục.</li><li><strong>Phông nền:</strong> Nền trơn hoặc ảnh xóa phông.</li></ul></div>
                </div>
                <div className="modal-col-right">
                    {imgSrc ? (
                        <div className="crop-container-fixed">
                            <label>Bước 3: Điều chỉnh và Kiểm tra</label>
                            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={3 / 4}><img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Vùng cắt ảnh"/></ReactCrop>
                            <button type="button" className="btn-crop-main" onClick={handleCropAndValidate} disabled={isLoading}>Cắt và Kiểm tra</button>
                        </div>
                    ) : (<div className="placeholder-image"><p>Vùng xem trước và cắt ảnh sẽ hiện ở đây.</p></div>)}
                    {croppedFileUrl && (<div className="preview-container"><p>Xem trước ảnh đã cắt:</p><div className="preview-frame" style={{ aspectRatio: '3 / 4' }}><img src={croppedFileUrl} alt="Ảnh đã cắt" /></div></div>)}
                </div>
            </div>
            {message && <p className="message message-fullwidth">{message}</p>}
            <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>Đóng</button>
                <button type="submit" className="register-btn" disabled={isLoading || !isInfoValid}>{isLoading ? 'Đang xử lý...' : 'Xác nhận Đăng ký / Cập nhật'}</button>
            </div>
        </form>
      </div>
    </div>
  );
}
