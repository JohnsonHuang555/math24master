import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_PROJECT_ID) {
    // E2E 測試連本機 Firestore Emulator，不需要服務帳號金鑰
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
}

// During build (no env vars), db is null — API routes are never called at build time
export const db = getApps().length
  ? getFirestore()
  : (null as unknown as ReturnType<typeof getFirestore>);
