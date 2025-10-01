// src/lib/firebase-admin.js
import admin from 'firebase-admin';

let db;
let storage;

try {
  if (!admin.apps.length) {
    const base64ServiceAccount = process.env.FIREBASE_ADMIN_CONFIG_BASE64;
    if (!base64ServiceAccount) {
      throw new Error('Biến môi trường FIREBASE_ADMIN_CONFIG_BASE64 không được thiết lập.');
    }
    const serviceAccountJson = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // **LOG GỠ LỖI CUỐI CÙNG**
    const bucketName = `${serviceAccount.project_id}.appspot.com`;
    console.log(`[FIREBASE-ADMIN-DEBUG] Initializing with Project ID: "${serviceAccount.project_id}"`);
    console.log(`[FIREBASE-ADMIN-DEBUG] Attempting to connect to Storage Bucket: "${bucketName}"`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName
    });
  }
  db = admin.firestore();
  storage = admin.storage();
} catch (error) {
  console.error('CRITICAL: Firebase admin initialization error:', error);
  db = null;
  storage = null;
}

export { db, storage };
