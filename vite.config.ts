
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Google GenAI SDK usage in the browser build
      // JSON.stringify is crucial here to ensure the string is quoted in the output
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || process.env.API_KEY)
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
