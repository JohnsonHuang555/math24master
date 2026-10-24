import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/env';

// 三個服務都在本機獨立的 port 上啟動，不會跟 npm run dev（:3000 / :3001）衝突：
// Firestore Emulator → Socket.IO server → Next.js（build 後 start）
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E.appUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    // 瀏覽器預設 en-US 會被導向 /en；既有測試以 zh-TW 文字定位，英文版另有 i18n.spec.ts
    locale: 'zh-TW',
  },
  webServer: [
    {
      command: `npx firebase emulators:start --only firestore --project ${E2E.firebaseProjectId}`,
      url: `http://${E2E.firestoreHost}`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'npx tsx server/index.ts',
      url: `${E2E.socketUrl}/socket.io/?EIO=4&transport=polling`,
      env: {
        PORT: String(E2E.socketPort),
        ALLOWED_ORIGINS: E2E.appUrl,
      },
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: `npx next build && npx next start -p ${E2E.appPort}`,
      url: E2E.appUrl,
      env: {
        E2E_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_SOCKET_URL: E2E.socketUrl,
        AUTH_SECRET: E2E.authSecret,
        AUTH_TRUST_HOST: 'true',
        FIRESTORE_EMULATOR_HOST: E2E.firestoreHost,
        FIREBASE_PROJECT_ID: E2E.firebaseProjectId,
      },
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
