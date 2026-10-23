import type { BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { E2E } from '../env';

// Auth.js 在 http 下的 session cookie 名稱，同時也是 JWE 加密用的 salt
const SESSION_COOKIE = 'authjs.session-token';

export type TestUser = {
  id: string;
  name: string;
  email: string;
  image: string;
};

export function createTestUser(): TestUser {
  const id = `e2e-${Date.now()}`;
  return {
    id,
    name: 'E2E 測試玩家',
    email: `${id}@example.com`,
    // Google 帳號的預設頭像，走 next/image 的 remotePatterns（lh3.googleusercontent.com）
    image: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
  };
}

/**
 * 直接寫入 Auth.js 的 session cookie，略過 Google OAuth 畫面。
 * 真實的 Google 登入會被自動化偵測擋下，所以只測「登入之後」的行為；
 * 點「用 Google 登入」本身仍需手動測試。
 */
export async function signInAs(context: BrowserContext, user: TestUser) {
  const value = await encode({
    token: {
      sub: user.id,
      name: user.name,
      email: user.email,
      picture: user.image,
    },
    secret: E2E.authSecret,
    salt: SESSION_COOKIE,
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
