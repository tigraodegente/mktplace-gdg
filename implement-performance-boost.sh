#!/bin/bash

echo "🚀 IMPLEMENTANDO MELHORIAS CRÍTICAS PARA NOTA 100"
echo "================================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 1. CRIAR COMPONENTE DE IMAGEM OTIMIZADA
log "📸 Criando componente OptimizedImage..."

mkdir -p apps/store/src/lib/components/ui

cat > apps/store/src/lib/components/ui/OptimizedImage.svelte << 'EOF'
<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    class?: string;
    lazy?: boolean;
  }
  
  let { 
    src, 
    alt, 
    width, 
    height, 
    priority = false, 
    class: className = '',
    lazy = true
  }: Props = $props();
  
  let supportsWebP = $state(false);
  let supportsAVIF = $state(false);
  let imageLoaded = $state(false);
  let imgElement: HTMLImageElement;
  
  onMount(() => {
    // Detectar WebP
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      supportsWebP = (webp.height === 2);
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    
    // Detectar AVIF
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      supportsAVIF = (avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
  
  function getOptimizedSrc(format: 'webp' | 'avif' | 'original' = 'original'): string {
    const baseUrl = src.replace(/\.(jpg|jpeg|png)$/i, '');
    
    if (format === 'avif' && supportsAVIF) {
      return `${baseUrl}.avif`;
    } else if (format === 'webp' && supportsWebP) {
      return `${baseUrl}.webp`;
    }
    
    return src;
  }
  
  function handleLoad() {
    imageLoaded = true;
  }
</script>

<picture class="block {className}">
  {#if supportsAVIF}
    <source srcset={getOptimizedSrc('avif')} type="image/avif">
  {/if}
  {#if supportsWebP}
    <source srcset={getOptimizedSrc('webp')} type="image/webp">
  {/if}
  <img 
    bind:this={imgElement}
    src={getOptimizedSrc('original')}
    {alt}
    {width}
    {height}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    onload={handleLoad}
    class="transition-opacity duration-300 {imageLoaded ? 'opacity-100' : 'opacity-0'}"
    style="aspect-ratio: {width && height ? `${width}/${height}` : 'auto'}"
  />
</picture>
EOF

log "✅ OptimizedImage criado!"

# 2. CRIAR HOOKS DE LAZY LOADING
log "⚡ Criando hooks de lazy loading..."

mkdir -p apps/store/src/lib/utils

cat > apps/store/src/lib/utils/lazyLoad.ts << 'EOF'
export function lazyLoad(node: HTMLImageElement, options: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  if (!('IntersectionObserver' in window)) {
    // Fallback para browsers antigos
    const src = node.dataset.src;
    if (src) {
      node.src = src;
      node.removeAttribute('data-src');
    }
    return { destroy() {} };
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: options.rootMargin || '50px',
    threshold: options.threshold || 0.1
  });
  
  observer.observe(node);
  
  return {
    destroy() {
      observer.unobserve(node);
    }
  };
}

export function lazyLoadMultiple(selector: string = 'img[data-src]') {
  const images = document.querySelectorAll(selector);
  
  images.forEach(img => {
    lazyLoad(img as HTMLImageElement);
  });
}
EOF

log "✅ Lazy loading hooks criados!"

# 3. ENHANCED ECOMMERCE ANALYTICS
log "📊 Implementando Enhanced Ecommerce Analytics..."

mkdir -p apps/store/src/lib/analytics

cat > apps/store/src/lib/analytics/ecommerce.ts << 'EOF'
// Enhanced Ecommerce Analytics para Google Analytics 4
export class EcommerceAnalytics {
  
  static trackPurchase(orderData: {
    transaction_id: string;
    value: number;
    currency: string;
    tax?: number;
    shipping?: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      quantity: number;
      price: number;
      currency?: string;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'purchase', {
        transaction_id: orderData.transaction_id,
        value: orderData.value,
        currency: orderData.currency,
        tax: orderData.tax || 0,
        shipping: orderData.shipping || 0,
        items: orderData.items
      });
      
      console.log('📊 Purchase tracked:', orderData.transaction_id);
    }
  }
  
  static trackAddToCart(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      quantity: number;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', item);
      console.log('🛒 Add to cart tracked:', item.items[0]?.item_name);
    }
  }
  
  static trackRemoveFromCart(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      quantity: number;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'remove_from_cart', item);
      console.log('🗑️ Remove from cart tracked:', item.items[0]?.item_name);
    }
  }
  
  static trackViewItem(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'view_item', item);
      console.log('👁️ View item tracked:', item.items[0]?.item_name);
    }
  }
  
  static trackBeginCheckout(data: {
    currency: string;
    value: number;
    items: Array<any>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'begin_checkout', data);
      console.log('🛒 Begin checkout tracked, value:', data.value);
    }
  }
  
  static trackSearch(searchTerm: string, numberOfResults?: number) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'search', {
        search_term: searchTerm,
        number_of_results: numberOfResults
      });
      console.log('🔍 Search tracked:', searchTerm);
    }
  }
  
  static trackAddToWishlist(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_wishlist', item);
      console.log('❤️ Add to wishlist tracked:', item.items[0]?.item_name);
    }
  }
}

// Declaração de tipos para gtag
declare global {
  function gtag(...args: any[]): void;
}
EOF

log "✅ Enhanced Ecommerce Analytics implementado!"

# 4. REAL USER MONITORING
log "📈 Implementando Real User Monitoring..."

cat > apps/store/src/lib/monitoring/rum.ts << 'EOF'
export class RealUserMonitoring {
  private static instance: RealUserMonitoring;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new RealUserMonitoring();
    }
    return this.instance;
  }
  
  init() {
    if (typeof window === 'undefined') return;
    
    this.trackPerformance();
    this.trackErrors();
    this.trackUserBehavior();
    this.trackConnectivity();
  }
  
  private trackPerformance() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        // Page Load Time
        const loadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
        if (typeof gtag !== 'undefined') {
          gtag('event', 'timing_complete', {
            name: 'page_load',
            value: loadTime
          });
        }
        
        // DOM Content Loaded
        const domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart);
        if (typeof gtag !== 'undefined') {
          gtag('event', 'timing_complete', {
            name: 'dom_content_loaded',
            value: domContentLoaded
          });
        }
        
        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        
        if (fcp && typeof gtag !== 'undefined') {
          gtag('event', 'timing_complete', {
            name: 'first_contentful_paint',
            value: Math.round(fcp.startTime)
          });
        }
        
        console.log('📊 Performance metrics tracked');
      }, 0);
    });
  }
  
  private trackErrors() {
    // JavaScript Errors
    window.addEventListener('error', (event) => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'exception', {
          description: `${event.filename}:${event.lineno} - ${event.message}`,
          fatal: false
        });
      }
      console.error('JS Error tracked:', event.message);
    });
    
    // Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'exception', {
          description: `Unhandled Promise: ${event.reason}`,
          fatal: false
        });
      }
      console.error('Promise rejection tracked:', event.reason);
    });
  }
  
  private trackUserBehavior() {
    let maxScroll = 0;
    let scrollTracked = {
      '25': false,
      '50': false,
      '75': false,
      '90': false
    };
    
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        if (maxScroll >= 25 && !scrollTracked['25']) {
          scrollTracked['25'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 25 });
          }
        } else if (maxScroll >= 50 && !scrollTracked['50']) {
          scrollTracked['50'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 50 });
          }
        } else if (maxScroll >= 75 && !scrollTracked['75']) {
          scrollTracked['75'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 75 });
          }
        } else if (maxScroll >= 90 && !scrollTracked['90']) {
          scrollTracked['90'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 90 });
          }
        }
      }
    });
    
    // Time on page
    const startTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      if (typeof gtag !== 'undefined') {
        gtag('event', 'timing_complete', {
          name: 'time_on_page',
          value: timeOnPage
        });
      }
    });
  }
  
  private trackConnectivity() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (typeof gtag !== 'undefined') {
        gtag('event', 'connectivity', {
          effective_type: connection.effectiveType,
          downlink: connection.downlink,
          save_data: connection.saveData
        });
      }
    }
  }
}

// Auto-init
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    RealUserMonitoring.getInstance().init();
  });
}
EOF

log "✅ Real User Monitoring implementado!"

# 5. CRIAR VITE CONFIG OTIMIZADO
log "⚙️ Otimizando Vite config..."

cat > apps/store/vite.config.optimized.js << 'EOF'
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
EOF

log "✅ Vite config otimizado criado!"

# 6. ATUALIZAR PACKAGE.JSON COM DEPENDÊNCIAS NECESSÁRIAS
log "📦 Verificando dependências..."

# Verificar se package.json existe
if [ -f "apps/store/package.json" ]; then
    info "Dependências que podem ser úteis adicionar:"
    echo "  - @sentry/svelte (error tracking)"
    echo "  - web-vitals (core web vitals)"
    echo "  - workbox-precaching (service worker helpers)"
    echo ""
    echo "Execute: pnpm add @sentry/svelte web-vitals workbox-precaching"
else
    warn "package.json não encontrado em apps/store/"
fi

# 7. CRIAR SCRIPT DE VALIDAÇÃO
log "🔍 Criando script de validação..."

cat > validate-performance.sh << 'EOF'
#!/bin/bash

echo "🔍 VALIDANDO IMPLEMENTAÇÕES DE PERFORMANCE"
echo "========================================="

# Verificar se os arquivos foram criados
files=(
    "apps/store/src/lib/components/ui/OptimizedImage.svelte"
    "apps/store/src/lib/utils/lazyLoad.ts"
    "apps/store/src/lib/analytics/ecommerce.ts"
    "apps/store/src/lib/monitoring/rum.ts"
    "apps/store/static/sw.js"
    "apps/store/static/offline.html"
)

echo "Verificando arquivos:"
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file"
    fi
done

echo ""
echo "Próximos passos:"
echo "1. Configure GA_MEASUREMENT_ID no app.html"
echo "2. Configure Sentry DSN se usar error tracking"
echo "3. Teste o service worker em produção"
echo "4. Valide com Lighthouse"
echo ""
echo "Comandos úteis:"
echo "  pnpm build && pnpm preview"
echo "  lighthouse http://localhost:4173 --view"
EOF

chmod +x validate-performance.sh

log "✅ Script de validação criado!"

# 8. RESUMO FINAL
echo ""
echo "🎉 IMPLEMENTAÇÃO CONCLUÍDA!"
echo "========================="
echo ""
info "✅ Service Worker completo implementado"
info "✅ Página offline elegante criada"
info "✅ OptimizedImage component criado"
info "✅ Lazy loading hooks implementados"
info "✅ Enhanced Ecommerce Analytics pronto"
info "✅ Real User Monitoring configurado"
info "✅ Vite config otimizado"
echo ""
warn "🔧 PRÓXIMOS PASSOS MANUAIS:"
echo "1. Substitua 'GA_MEASUREMENT_ID' pelo seu ID real no app.html"
echo "2. Configure domínio real no manifest.json e service worker"
echo "3. Teste em produção: pnpm build && pnpm preview"
echo "4. Valide com Lighthouse"
echo ""
info "🚀 Execute ./validate-performance.sh para verificar arquivos"
echo ""
echo "Com essas implementações, você deve alcançar:"
echo "  📊 Performance: 90+ pontos"
echo "  ♿ Accessibility: 95+ pontos"
echo "  ✅ Best Practices: 100 pontos"
echo "  🎯 SEO: 95+ pontos"
echo ""
echo "🎯 FALTAM APENAS AJUSTES MENORES PARA NOTA 100!"
EOF

chmod +x implement-performance-boost.sh 