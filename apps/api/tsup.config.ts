import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  clean: true,
  noExternal: ['@bizx/database', '@bizx/common-types', '@bizx/utils']
});
