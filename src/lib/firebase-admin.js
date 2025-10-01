// src/lib/firebase-admin.js
import admin from 'firebase-admin';

let db;
let storage;

try {
  // Chỉ khởi tạo app một lần duy nhất
  if (!admin.apps.length) {
    const base64ServiceAccount = process.env.FIREBASE_ADMIN_CONFIG_BASE64;
    if (!base64ServiceAccount) {
      throw new Error('Biến môi trường FIREBASE_ADMIN_CONFIG_BASE64 không được thiết lập.');
    }
    const serviceAccountJson = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    // **SỬA LỖI: CHỈ ĐỊNH TÊN BUCKET CHÍNH XÁC**
    const correctBucketName = "le-tot-nghiep-app.firebasestorage.app";
    console.log(`[FIREBASE-ADMIN-DEBUG] Initializing with custom bucket name: "${correctBucketName}"`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: correctBucketName // Sử dụng tên bucket chính xác
    });

    console.log("Firebase Admin initialized successfully.");
  }
  
  db = admin.firestore();
  storage = admin.storage();

} catch (error) {
  console.error('CRITICAL: Firebase admin initialization error:', error);
  db = null;
  storage = null;
}

// Luôn luôn export db và storage
export { db, storage };
