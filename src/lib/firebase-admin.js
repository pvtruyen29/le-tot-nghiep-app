// src/lib/firebase-admin.js
import admin from 'firebase-admin';

let db, storage, serviceAccount;

try {
  if (!admin.apps.length) {
    const base64ServiceAccount = process.env.FIREBASE_ADMIN_CONFIG_BASE64;
    if (!base64ServiceAccount) {
      throw new Error('Biến môi trường FIREBASE_ADMIN_CONFIG_BASE64 không được thiết lập.');
    }
    const serviceAccountJson = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.firebasestorage.com` // Hoặc .firebasestorage.app tùy dự án
    });
  }
  db = admin.firestore();
  storage = admin.storage();
} catch (error) {
  console.error('CRITICAL: Firebase admin initialization error:', error);
}

export { db, storage, serviceAccount };
