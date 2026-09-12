import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: [
      'packages/**/tests/**/*.test.ts',
      'apps/web/tests/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src'),
      '@ith/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
      '@ith/config': path.resolve(__dirname, 'packages/config/src/index.ts'),
      '@ith/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
});
