// E2E 共用設定。demo- 開頭的 project ID 只會連 Emulator，不可能誤寫到正式 Firestore
export const E2E = {
  appPort: 3100,
  appUrl: 'http://localhost:3100',
  socketPort: 3101,
  socketUrl: 'http://localhost:3101',
  firestoreHost: '127.0.0.1:8180',
  firebaseProjectId: 'demo-math24',
  authSecret: 'e2e-only-auth-secret-not-used-in-production',
} as const;
