import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-svelte': ['svelte', '@sveltejs/kit'],
          'vendor-ui': ['chart.js'],
          
          // App chunks
          'auth': ['./src/lib/stores/authStore.ts', './src/lib/services/auth.service.ts'],
          'ecommerce': [
            './src/lib/stores/cartStore.ts',
            './src/lib/stores/wishlistStore.ts'
          ],
          'analytics': [
            './src/lib/analytics/ecommerce.ts',
            './src/lib/monitoring/rum.ts'
          ]
        },
        
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.ts', '').replace('.js', '')
            : 'chunk';
          return `chunks/${facadeModuleId}-[hash].js`;
        },
        
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `styles/[name]-[hash][extname]`;
          }
          if (/woff2?|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  
  optimizeDeps: {
    include: [
      'svelte',
      '@sveltejs/kit'
    ]
  },
  
  server: {
    fs: {
      allow: ['..']
    }
  }
});
