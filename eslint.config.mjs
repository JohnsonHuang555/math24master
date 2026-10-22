import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-plugin-prettier';

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'warn',
      // eslint-config-next 16 帶入的 react-hooks v7 新規則，既有程式碼尚未重構，暫時降為 warning（#91）
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
    },
    settings: {
      tailwindcss: {
        callees: ['cn'],
        config: 'tailwind.config.ts',
      },
    },
  },
  {
    ignores: ['.next/**', 'dist/**', 'coverage/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
