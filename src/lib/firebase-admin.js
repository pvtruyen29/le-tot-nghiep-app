
// src/lib/firebase-admin.js
import admin from 'firebase-admin';

// Kiểm tra xem ứng dụng đã được khởi tạo chưa
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CONFIG)),
      // Thêm URL của Storage Bucket vào đây
      storageBucket: `${JSON.parse(process.env.FIREBASE_ADMIN_CONFIG).project_id}.appspot.com`
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

// Export cả db và storage
const db = admin.firestore();
const storage = admin.storage();

export { db, storage };
