import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      '.vercel/**',
      'node_modules/**',
      'data/cache/**',
      'public/Bible_Evidence/**', // Imported static collection and its vendored map libraries.
      'scripts/**',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
