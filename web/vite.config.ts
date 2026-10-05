import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  build: { target: 'es2022' },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DATA_UPDATED__: JSON.stringify(pkg.dataUpdated),
  },
});
