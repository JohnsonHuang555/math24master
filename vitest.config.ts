import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // e2e/ 是 Playwright 的測試，由 npm run test:e2e 執行
    // Vitest 5 起 glob 會掃 . 開頭的資料夾（如 .next-e2e），維持 v4 的行為排除
    exclude: ['**/node_modules/**', '**/.*/**', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
