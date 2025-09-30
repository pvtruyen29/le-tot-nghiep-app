// src/components/Barcode.js
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const Barcode = ({ value, width = 2, height = 100 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128', // Định dạng barcode
          width: width,
          height: height,
          displayValue: true, // Hiển thị mã số sinh viên bên dưới
          fontSize: 18,
          margin: 10,
        });
      } catch (e) {
        console.error('Lỗi tạo barcode:', e);
      }
    }
  }, [value, width, height]); // Chạy lại mỗi khi giá trị thay đổi

  if (!value) return null;

  return <svg ref={svgRef}></svg>;
};

export default Barcode;
