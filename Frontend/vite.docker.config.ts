import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@/components/lib/utils",
        replacement: path.resolve(dirname, "src/utils/cn.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(dirname, "src"),
      },
    ],
  },
});
