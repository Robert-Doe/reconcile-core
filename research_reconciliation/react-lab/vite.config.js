import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal Vite config for the React XSS + fallback lab.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
});
