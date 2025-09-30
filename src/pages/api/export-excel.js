// src/pages/api/export-excel.js
import { db } from '../../lib/firebase-admin';
import ExcelJS from 'exceljs';
import bwip from 'bwip-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { eventId } = req.query;
  if (!eventId) {
    return res.status(400).json({ message: 'Event ID is required.' });
  }

  try {
    // 1. Lấy danh sách sinh viên đã đăng ký từ Firestore
    const snapshot = await db.collection('registrations').where('eventId', '==', eventId).get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No registered students found for this event.' });
    }
    const students = snapshot.docs.map(doc => doc.data());

    // 2. Tạo một file Excel mới
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách Đăng ký');

    // 3. NÂNG CẤP: Thiết lập tất cả các cột cần thiết
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'MSSV', key: 'mssv', width: 15 },
      { header: 'Họ và Tên', key: 'hoTen', width: 30 },
      { header: 'Ngày Sinh', key: 'ngaySinh', width: 15 },
      { header: 'Nữ', key: 'nu', width: 5 },
      { header: 'Lớp', key: 'lop', width: 20 },
      { header: 'Ngành', key: 'nganh', width: 35 },
      { header: 'Chuyên Ngành', key: 'chuyenNganh', width: 35 },
      { header: 'Điểm TB', key: 'diemTB', width: 10 },
      { header: 'Điểm RL', key: 'diemRL', width: 10 },
      { header: 'Xếp Loại', key: 'xepLoai', width: 15 },
      { header: 'Đợt TN', key: 'dotTN', width: 15 },
      { header: 'Đơn Vị', key: 'donVi', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Link Hình ảnh', key: 'photoURL', width: 40 },
      { header: 'Barcode', key: 'barcode', width: 35 },
    ];
    worksheet.getRow(1).font = { bold: true };

    // 4. Thêm dữ liệu và barcode cho từng sinh viên
    for (const [index, student] of students.entries()) {
      // Thêm hàng dữ liệu chữ
      worksheet.addRow({
        stt: index + 1,
        mssv: student.mssv,
        hoTen: student.hoTen,
        ngaySinh: student.ngaySinh,
        nu: student.nu,
        lop: student.lop,
        nganh: student.nganh,
        chuyenNganh: student.chuyenNganh,
        diemTB: student.diemTB,
        diemRL: student.diemRL,
        xepLoai: student.xepLoai,
        dotTN: student.dotTN,
        donVi: student.donVi,
        email: student.email,
        // Thêm link ảnh và xử lý để click được
        photoURL: { text: 'Xem ảnh', hyperlink: student.photoURL },
      });
      
      // Style cho link ảnh
      const rowIndex = index + 2;
      worksheet.getCell(`O${rowIndex}`).font = { color: { argb: 'FF0000FF' }, underline: true };


      // Tạo barcode từ MSSV
      const barcodeBuffer = await bwip.toBuffer({
        bcid: 'code128',
        text: student.mssv,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });
      
      // Thêm hình ảnh barcode vào file Excel
      const imageId = workbook.addImage({
        buffer: barcodeBuffer,
        extension: 'png',
      });
      
      // Đặt hình ảnh vào đúng ô (cột P)
      worksheet.addImage(imageId, {
        tl: { col: 15.1, row: rowIndex - 0.9 }, // Vị trí (cột P, hàng hiện tại)
        ext: { width: 220, height: 60 }
      });
      worksheet.getRow(rowIndex).height = 50;
    }
    
    // 5. Gửi file Excel về cho người dùng
    res.setHeader(
      'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition', `attachment; filename=danh_sach_dang_ky_${eventId}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.status(200).end();

  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).json({ message: 'Failed to generate Excel file.' });
  }
}
