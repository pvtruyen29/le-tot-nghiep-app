// src/components/RegistrationModal.js
import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ... (Hàm getCroppedImg không đổi) ...

export default function RegistrationModal({ event, onClose }) {
  // ... (Khai báo state không đổi) ...

  const onSelectFile = (e) => { /* ... không đổi ... */ };
  const onImageLoad = (e) => { /* ... không đổi ... */ };

  // =========================================================================
  // HÀM NÀY ĐƯỢC KÍCH HOẠT KHI NHẤN NÚT "CẮT VÀ KIỂM TRA"
  // =========================================================================
  const handleCropAndValidate = async () => {
    setIsLoading(true); setMessage("Đang kiểm tra..."); setIsInfoValid(false);
    
    // ... (Kiểm tra MSSV và email không đổi) ...

    const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop, `${mssv.trim()}.jpg`);
    finalCroppedFile = croppedImageFile;
    if (croppedFileUrl) { URL.revokeObjectURL(croppedFileUrl); }
    setCroppedFileUrl(URL.createObjectURL(croppedImageFile));
    
    // TẠO FORM VÀ GỬI ẢNH ĐẾN API KIỂM TRA
    const formData = new FormData();
    formData.append('photo', croppedImageFile);

    try {
      // GỌI API KIỂM TRA ẢNH NGAY LẬP TỨC
      const response = await fetch('/api/validate-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      // Hiển thị kết quả kiểm tra cho người dùng
      setMessage(result.message);
      if (response.ok) {
        setIsInfoValid(true); // Đánh dấu là hợp lệ để có thể nhấn nút Xác nhận
      }
    } catch (error) {
        setMessage('Lỗi kết nối đến server kiểm tra ảnh.');
    } finally {
        setIsLoading(false);
    }
  };

  // =========================================================================
  // HÀM NÀY ĐƯỢC KÍCH HOẠT KHI NHẤN NÚT "XÁC NHẬN ĐĂNG KÝ" CUỐI CÙNG
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isInfoValid) {
        setMessage("Thông tin chưa hợp lệ. Vui lòng nhấn 'Cắt và Kiểm tra' trước."); return;
    }
    setIsLoading(true); setMessage("");

    // Lấy thông tin đã hợp lệ và gửi đến API register
    const fileToUpload = finalCroppedFile || await (await fetch(croppedFileUrl)).blob();
    const formData = new FormData();
    formData.append("mssv", mssv);
    formData.append("photo", fileToUpload, `${mssv.trim()}.jpg`);
    formData.append("eventId", event.id);

    try {
      // GỌI API ĐĂNG KÝ CUỐI CÙNG (KHÔNG KIỂM TRA LẠI ẢNH)
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
    // ... (Phần JSX không đổi, các nút đã được gán đúng hàm) ...
    <button type="button" className="btn-crop-main" onClick={handleCropAndValidate} disabled={isLoading}>Cắt và Kiểm tra</button>
    // ...
    <button type="submit" className="register-btn" disabled={isLoading || !isInfoValid}>{isLoading ? 'Đang xử lý...' : 'Xác nhận Đăng ký / Cập nhật'}</button>
  );
}
