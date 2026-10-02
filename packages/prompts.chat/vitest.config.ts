import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist', 'node_modules', 'template'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
