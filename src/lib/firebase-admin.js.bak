// src/lib/firebase-admin.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let serviceAccount;
try {
  const base64Credentials = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!base64Credentials) throw new Error("Biến môi trường GOOGLE_CREDENTIALS_BASE64 không tồn tại.");
  
  const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  serviceAccount = JSON.parse(decodedCredentials);
} catch (error) {
  console.error("❌ Lỗi nghiêm trọng khi đọc service account key:", error.message);
}

if (serviceAccount && !getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
    console.log("✅ Firebase Admin SDK đã khởi tạo thành công.");
  } catch (error) {
    console.error("❌ Lỗi khi khởi tạo Firebase Admin SDK:", error.message);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

// Xuất thêm serviceAccount để các API khác có thể sử dụng
export { db, bucket, serviceAccount };
