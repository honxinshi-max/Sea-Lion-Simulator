import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1_500,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
