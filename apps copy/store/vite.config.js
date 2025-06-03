import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  
  build: {
    target: 'esnext',
    rollupOptions: {
      external: []
    }
  },
  
  optimizeDeps: {
    include: ['postgres']
  },
  
  server: {
    fs: {
      allow: ['..']
    }
  },
  
  define: {
    global: 'globalThis'
  }
}); 