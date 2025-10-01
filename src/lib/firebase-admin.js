// src/lib/firebase-admin.js
import admin from 'firebase-admin';

// Chỉ khởi tạo app một lần duy nhất
if (!admin.apps.length) {
  try {
    // Đọc "chìa khóa" từ biến môi trường
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CONFIG);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // **DÒNG QUAN TRỌNG NHẤT: Chỉ định địa chỉ kho chứa Storage**
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

const db = admin.firestore();
const storage = admin.storage();

export { db, storage };
