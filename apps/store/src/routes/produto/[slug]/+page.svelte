<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { formatCurrency } from '$lib/utils';
  import { cartStore } from '$lib/stores/cartStore';
  import { goto } from '$app/navigation';
  import { fade, fly } from 'svelte/transition';
  import { browser } from '$app/environment';
  import type { PageData } from './$types';
  import { usePricing } from '$lib/stores/pricingStore';
  
  // Definição local do tipo Product
  interface Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    original_price?: number;
    images: string[];
    image?: string;
    category_id: string;
    category_name?: string;
    category_slug?: string;
    brand_id?: string;
    brand_name?: string;
    seller_id: string;
    seller_name?: string;
    stock: number;
    sku?: string;
    brand?: string;
    model?: string;
    weight?: number;
    is_active: boolean;
    is_featured?: boolean;
    has_free_shipping?: boolean;
    rating?: number;
    reviews_count?: number;
    sold_count?: number;
    sales_count?: number;
    discount_percentage?: number;
    delivery_days?: number;
    questions_count?: number;
    variations?: ProductVariation[];
    specifications?: Record<string, string | string[]>;
    attributes?: Record<string, string | string[]>;
    condition?: string;
    tags?: string[];
  }
  
  // Props dos dados do servidor
  let { data }: { data: PageData } = $props();
  
  // Interface para variações do produto
  interface ProductVariation {
    color?: string;
    size?: string;
    style?: string;
    price: number;
    original_price?: number;
    stock: number;
    sku: string;
    name?: string;
    is_main?: boolean;
    is_current?: boolean;
    images?: string[];
  }
  
  const { addItem } = cartStore;
  
  // Sistema de pricing dinâmico
  const pricing = usePricing();
  let pricingConfig = $state<any>(null);
  
  // Usar Product com tipo estendido
  let product = $state<Product | null>(data.product);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selectedImage = $state(0);
  let selectedColor = $state<string>('');
  let selectedSize = $state<string>('');
  let selectedStyle = $state<string>('');
  let quantity = $state(1);
  let showZoomModal = $state(false);
  let activeTab = $state<'description' | 'specs' | 'shipping' | 'reviews'>('description');
  let relatedProducts = $state<Product[]>(data.relatedProducts || []);
  let showAddedToCart = $state(false);
  let isFavorite = $state(false);
  let calculatingShipping = $state(false);
  let shippingZip = $state('');
  let shippingOptions = $state<any[]>([]);
  let validationError = $state<string>('');
  
  // Lazy loading para imagens
  let imageObserver: IntersectionObserver | null = null;
  
  // Debounced shipping calculation
  let shippingTimeout: number | null = null;
  
  // Variações disponíveis (derivadas do produto) - SIMPLIFICADAS
  let availableColors = $derived(product?.variations ? getUniqueColors(product.variations) : []);
  let availableSizes = $derived(product?.variations ? getUniqueSizes(product.variations) : []);
  let availableStyles = $derived(product?.variations ? getUniqueStyles(product.variations) : []);
  
  let currentVariation = $derived(findCurrentVariation());
  
  // Simular pessoas vendo o produto
  let viewingCount = $state(Math.floor(Math.random() * 20) + 5);
  
  // Função para obter cores únicas das variações (apenas ativas e com estoque) - OTIMIZADA
  function getUniqueColors(variations: ProductVariation[]): string[] {
    const colorSet = new Set<string>();
    
    for (const v of variations) {
      if (v.color && v.stock > 0) {
        colorSet.add(v.color);
      }
    }
    
    return Array.from(colorSet);
  }
  
  // Função para obter tamanhos únicos das variações (apenas com estoque) - OTIMIZADA
  function getUniqueSizes(variations: ProductVariation[]): string[] {
    const sizeSet = new Set<string>();
    
    for (const v of variations) {
      if (v.size && v.stock > 0) {
        sizeSet.add(v.size);
      }
    }
    
    return Array.from(sizeSet);
  }
  
  // Função para obter estilos únicos das variações (apenas com estoque) - OTIMIZADA
  function getUniqueStyles(variations: ProductVariation[]): string[] {
    const styleSet = new Set<string>();
    
    for (const v of variations) {
      if (v.style && v.stock > 0) {
        styleSet.add(v.style);
      }
    }
    
    return Array.from(styleSet);
  }
  
  // Função para encontrar variação atual baseada nas seleções - OTIMIZADA
  function findCurrentVariation(): ProductVariation | null {
    if (!product?.variations || product.variations.length === 0) return null;
    
    // Se não há seleções, retornar a primeira disponível ou null
    if (!selectedColor && !selectedSize && !selectedStyle) {
      return product.variations.find(v => v.stock > 0) || null;
    }
    
    // Buscar combinação exata
    for (const v of product.variations) {
      const colorMatch = !selectedColor || v.color === selectedColor;
      const sizeMatch = !selectedSize || v.size === selectedSize;
      const styleMatch = !selectedStyle || v.style === selectedStyle;
      
      if (colorMatch && sizeMatch && styleMatch && v.stock > 0) {
        return v;
      }
    }
    
    return null;
  }
  
  // Função otimizada para calcular frete com debounce
  function debouncedCalculateShipping() {
    if (shippingTimeout) {
      clearTimeout(shippingTimeout);
    }
    
    shippingTimeout = window.setTimeout(() => {
      calculateShipping();
    }, 800); // 800ms de delay
  }
  
  // Preload de imagens críticas
  function preloadCriticalImages() {
    if (!product?.images || product.images.length === 0) return;
    
    // Preload primeira imagem com alta prioridade
    const firstImg = new Image();
    firstImg.fetchPriority = 'high';
    firstImg.src = product.images[0];
    
    // Preload segunda imagem com prioridade média
    if (product.images[1]) {
      const secondImg = new Image();
      secondImg.fetchPriority = 'auto';
      secondImg.src = product.images[1];
    }
  }
  
  // Função otimizada para trocar de cor
  function selectColorOptimized(color: string) {
    if (!product?.variations) return;
    
    // Encontrar a variação com a cor selecionada e que tenha estoque
    const targetVariation = product.variations.find(v => 
      v.color === color && v.stock > 0
    );
    
    if (!targetVariation) return;
    
    // Prefetch da página da variação
    const slug = generateSlug(targetVariation.name || product.name, targetVariation.sku);
    
    // Preload da nova página
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/produto/${slug}`;
    document.head.appendChild(link);
    
    // Navegação otimizada
    setTimeout(() => {
      if (browser) {
        window.location.href = `/produto/${slug}`;
      }
    }, 100);
  }
  
  // Função para obter preço atual (da variação ou do produto)
  function getCurrentPrice(): number {
    return currentVariation?.price || product?.price || 0;
  }
  
  // Função para obter preço original atual
  function getCurrentOriginalPrice(): number | undefined {
    return currentVariation?.original_price || product?.original_price;
  }
  
  // Função para obter estoque atual
  function getCurrentStock(): number {
    return currentVariation?.stock || product?.stock || 0;
  }
  
  // Função para atualizar a URL com as variações selecionadas
  function updateURLWithVariations() {
    if (!browser) return;
    
    const url = new URL(window.location.href);
    
    // Atualizar parâmetros de cor, tamanho e style
    if (selectedColor) {
      url.searchParams.set('cor', selectedColor.toLowerCase());
    } else {
      url.searchParams.delete('cor');
    }
    
    if (selectedSize) {
      url.searchParams.set('tamanho', selectedSize.toLowerCase());
    } else {
      url.searchParams.delete('tamanho');
    }
    
    if (selectedStyle) {
      url.searchParams.set('estilo', selectedStyle.toLowerCase());
    } else {
      url.searchParams.delete('estilo');
    }
    
    // Atualizar a URL sem recarregar a página
    goto(url.toString(), { replaceState: true, noScroll: true });
  }
  
  // Função para carregar variações da URL
  function loadVariationsFromURL() {
    if (!product?.variations) return;
    
    const urlParams = $page.url.searchParams;
    
    const colorParam = urlParams.get('cor');
    if (colorParam && availableColors.length > 0) {
      const color = availableColors.find(c => c.toLowerCase() === colorParam.toLowerCase());
      if (color) selectedColor = color;
    }
    
    const sizeParam = urlParams.get('tamanho');
    if (sizeParam && availableSizes.length > 0) {
      const size = availableSizes.find(s => s.toLowerCase() === sizeParam.toLowerCase());
      if (size) selectedSize = size;
    }
    
    const styleParam = urlParams.get('estilo');
    if (styleParam && availableStyles.length > 0) {
      const style = availableStyles.find(s => s.toLowerCase() === styleParam.toLowerCase());
      if (style) selectedStyle = style;
    }
  }
  
  // Função para gerar slug a partir do nome
  function generateSlug(name: string, sku: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      + '-' + sku;
  }

  // Função para selecionar cor (navega para o produto da cor)
  function selectColor(color: string) {
    if (!product?.variations) return;
    
    // Encontrar a variação com a cor selecionada e que tenha estoque
    const targetVariation = product.variations.find(v => 
      v.color === color && v.stock > 0
    );
    
    if (!targetVariation) return;
    
    // Gerar slug da variação selecionada
    const slug = generateSlug(targetVariation.name || product.name, targetVariation.sku);
    const targetUrl = `/produto/${slug}`;
    
    // Forçar navegação completa - recarrega a página para garantir
    if (browser) {
      window.location.href = targetUrl;
    }
  }
  
  // Função para selecionar tamanho
  function selectSize(size: string) {
    selectedSize = size;
    validationError = ''; // Limpar erro ao selecionar
    updateURLWithVariations();
  }
  
  // Função para selecionar style
  function selectStyle(style: string) {
    selectedStyle = style;
    validationError = ''; // Limpar erro ao selecionar
    updateURLWithVariations();
  }
  
  onMount(() => {
    // Preload crítico de imagens
    preloadCriticalImages();
    
    // Configurar lazy loading de imagens otimizado
    if (browser && 'IntersectionObserver' in window) {
      imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver?.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '100px', // Aumentado para carregamento antecipado
        threshold: 0.1
      });
      
      // Observar todas as imagens com data-src após um pequeno delay
      setTimeout(() => {
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver?.observe(img);
      });
      }, 100);
    }
    
    // Atualizar contador de visualizações com variação mais realista
    const interval = setInterval(() => {
      const variation = Math.random() > 0.5 ? 1 : -1;
      viewingCount = Math.max(3, Math.min(25, viewingCount + variation));
    }, 15000); // Mais frequente para dinamismo
    
    // Carregar variações da URL
    loadVariationsFromURL();
    checkFavorite();
    
    // Carregar configurações de pricing
    pricing.getConfig().then(config => {
      if (config) {
        pricingConfig = config;
      }
    }).catch(() => {
      console.warn('Falha ao carregar configurações de pricing, usando valores padrão');
    });
    
    // Prefetch de produtos relacionados
    if (product) {
      fetchRelatedProducts(product);
    }
    
    // Performance monitoring
    if (browser && window.performance) {
      const navigationTiming = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        console.log(`⚡ Página carregada em ${navigationTiming.loadEventEnd - navigationTiming.loadEventStart}ms`);
      }
    }
    
    return () => {
      clearInterval(interval);
      imageObserver?.disconnect();
      if (shippingTimeout) clearTimeout(shippingTimeout);
    };
  });
  
  // Função removida - setupMockVariations não é mais necessária
  // As variações agora vêm diretamente do banco de dados
  
  // Verificar e buscar produtos relacionados usando categoria primária ou slug
  async function fetchRelatedProducts(product: Product) {
    try {
      // Usar categoria primária se disponível, senão usar category_name ou category_slug
      let categoryParam = '';
      
      if (product.category_id) {
        categoryParam = `category=${product.category_id}`;
      } else if (product.category_slug) {
        categoryParam = `categoria=${product.category_slug}`;
      } else if (product.category_name) {
        // Fallback: usar nome da categoria como slug
        const categorySlug = product.category_name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
        categoryParam = `categoria=${categorySlug}`;
      } else {
        // Se não há categoria, buscar produtos similares por marca ou tags
        if (product.brand_name || product.brand) {
          categoryParam = `marca=${encodeURIComponent(product.brand_name || product.brand || '')}`;
        } else if (product.tags?.length) {
          categoryParam = `tag=${encodeURIComponent(product.tags[0])}`;
        } else {
          // Último recurso: produtos em destaque
          categoryParam = 'ordenar=mais-vendidos';
        }
      }
      
      const response = await fetch(`/api/products?${categoryParam}&limit=8`);
      const data = await response.json();
      
      if (data.success && data.data?.products) {
        // Filtrar produtos diferentes do atual
        relatedProducts = data.data.products
          .filter((p: Product) => p.slug !== $page.params.slug)
          .slice(0, 4); // Limitar a 4 produtos
        
        console.log('🔗 Produtos relacionados carregados:', relatedProducts.length);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar produtos relacionados:', err);
      // Não bloquear a página se falhar
    }
  }
  
  function checkFavorite() {
    if (typeof window !== 'undefined' && product) {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      isFavorite = favorites.includes(product.id);
    }
  }
  
  function toggleFavorite() {
    if (!product) return;
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      const index = favorites.indexOf(product.id);
      if (index > -1) favorites.splice(index, 1);
    } else {
      favorites.push(product.id);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    isFavorite = !isFavorite;
  }
  
  function handleAddToCart() {
    if (!product) return false;
    
    // Limpar erros anteriores
    validationError = '';
    
    // Validações
    if (availableColors.length > 0 && !selectedColor) {
      validationError = 'Por favor, selecione uma cor';
      setTimeout(() => validationError = '', 4000); // Remove após 4 segundos
      return false;
    }
    
    if (availableSizes.length > 0 && !selectedSize) {
      validationError = 'Por favor, selecione um tamanho';
      setTimeout(() => validationError = '', 4000); // Remove após 4 segundos
      return false;
    }
    
    addItem(
      product as Product,
      product.seller_id || 'default-seller',
      product.seller_name || 'Vendedor',
      quantity,
      {
        color: selectedColor,
        size: selectedSize
      }
    );
    
    // Feedback visual melhorado
    showAddedToCart = true;
    setTimeout(() => showAddedToCart = false, 3000);
    
    return true;
  }
  
  function handleBuyNow() {
    const success = handleAddToCart();
    if (success) {
      goto('/cart');
    }
  }
  
  function calculateInstallment(price: number) {
    const installmentPrice = price / (pricingConfig?.installments_default || 12);
    return `${pricingConfig?.installments_default || 12}x de ${formatCurrency(installmentPrice)} sem juros`;
  }
  
  function getDiscountPercentage(price: number, originalPrice?: number) {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  
  async function calculateShipping() {
    if (!shippingZip || shippingZip.length < 8) return;
    
    calculatingShipping = true;
    // Simular cálculo de frete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    shippingOptions = [
      {
        name: 'Sedex',
        price: 25.90,
        days: '3-5 dias úteis'
      },
      {
        name: 'PAC',
        price: 15.90,
        days: '7-10 dias úteis'
      }
    ];
    
    if (product && product.has_free_shipping) {
      shippingOptions.unshift({
        name: 'Frete Grátis',
        price: 0,
        days: '7-10 dias úteis'
      });
    }
    
    calculatingShipping = false;
  }
  
  function shareProduct() {
    if (!product) return;
    
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Confira este produto incrível: ${product.name}`,
        url: window.location.href
      });
    } else {
      // Fallback - copiar link
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  }
  
  function formatZipCode(value: string) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  }
  
  // Função para verificar se uma combinação está disponível
  function isCombinationAvailable(color?: string, size?: string, style?: string): boolean {
    if (!product?.variations) return false;
    
    return product.variations.some((v: ProductVariation) => {
      const colorMatch = !color || v.color === color;
      const sizeMatch = !size || v.size === size;
      const styleMatch = !style || v.style === style;
      return colorMatch && sizeMatch && styleMatch && v.stock > 0;
    });
  }
  
  // Função para verificar se uma cor está disponível (tem estoque)
  function isColorAvailable(color: string): boolean {
    if (!product?.variations) return false;
    
    const variation = product.variations.find(v => v.color === color);
    return variation ? variation.stock > 0 : false;
  }
  
  // Função para verificar se uma cor está disponível para o tamanho selecionado
  function isColorAvailableForSize(color: string): boolean {
    return isCombinationAvailable(color, selectedSize || undefined, selectedStyle || undefined);
  }
  
  // Função para verificar se um tamanho está disponível para a cor selecionada
  function isSizeAvailableForColor(size: string): boolean {
    return isCombinationAvailable(selectedColor || undefined, size, selectedStyle || undefined);
  }
  
  // Função para verificar se um style está disponível para as outras seleções
  function isStyleAvailableForSelection(style: string): boolean {
    return isCombinationAvailable(selectedColor || undefined, selectedSize || undefined, style);
  }
</script>

<svelte:head>
  {#if product}
    <title>{product.name} - {product.category_name || 'Produtos'} | Marketplace GDG</title>
    <meta name="description" content={product.description || `Compre ${product.name} por apenas ${formatCurrency(getCurrentPrice())}. ${product.brand ? `Marca: ${product.brand}.` : ''} Entrega rápida e segura. Parcelamento em até ${pricingConfig?.installments_default || 12}x sem juros.`} />
    
    <!-- Canonical URL -->
    <link rel="canonical" href={`https://marketplace-gdg.com/produto/${product.slug}`} />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product" />
    <meta property="og:url" content={`https://marketplace-gdg.com/produto/${product.slug}`} />
    <meta property="og:title" content={product.name} />
    <meta property="og:description" content={product.description || `Por apenas ${formatCurrency(getCurrentPrice())}`} />
    <meta property="og:image" content={product.images?.[0] || '/placeholder.jpg'} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:price:amount" content={getCurrentPrice().toString()} />
    <meta property="og:price:currency" content="BRL" />
    <meta property="og:availability" content={getCurrentStock() > 0 ? 'instock' : 'oos'} />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content={`https://marketplace-gdg.com/produto/${product.slug}`} />
    <meta property="twitter:title" content={product.name} />
    <meta property="twitter:description" content={product.description || `Por apenas ${formatCurrency(getCurrentPrice())}`} />
    <meta property="twitter:image" content={product.images?.[0] || '/placeholder.jpg'} />
    
    <!-- Schema.org Structured Data -->
    {@html `<script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "${product.name}",
      "image": ${JSON.stringify(product.images || [])},
      "description": "${product.description || ''}",
      "sku": "${product.sku || product.id}",
      "brand": {
        "@type": "Brand",
        "name": "${product.brand || 'Marketplace GDG'}"
      },
      "offers": {
        "@type": "Offer",
        "url": "https://marketplace-gdg.com/produto/${product.slug}",
        "priceCurrency": "BRL",
        "price": "${getCurrentPrice()}",
        "priceValidUntil": "${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
        "availability": "${getCurrentStock() > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}",
        "seller": {
          "@type": "Organization",
          "name": "${product.seller_name || 'Marketplace GDG'}"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "${product.has_free_shipping ? '0' : '15.90'}",
            "currency": "BRL"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "businessDays": {
              "@type": "QuantitativeValue",
              "minValue": 3,
              "maxValue": 10
            }
          }
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "${product.rating || 4.5}",
        "reviewCount": "${product.reviews_count || 0}"
      }
    }
    </script>`}
  {:else}
    <title>Produto - Marketplace GDG</title>
    <meta name="robots" content="noindex, nofollow" />
  {/if}
</svelte:head>

<div class="min-h-screen bg-white">
  {#if loading}
    <div class="flex items-center justify-center h-96">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600">Carregando produto...</p>
      </div>
    </div>
  {:else if error || !product}
    <div class="max-w-7xl mx-auto px-4 py-16">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-600">{error || 'Produto não encontrado'}</p>
        <a href="/busca" class="mt-4 inline-block text-[#00BFB3] hover:text-[#00A89D] underline">
          Voltar para busca
        </a>
      </div>
    </div>
  {:else}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="mb-8">
        <ol class="flex items-center space-x-2 text-sm">
          <li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
          <li><span class="text-gray-400">/</span></li>
          <li><a href="/categorias" class="text-gray-500 hover:text-gray-700">Categorias</a></li>
          <li><span class="text-gray-400">/</span></li>
          <li class="text-gray-900 font-medium truncate">{product.name}</li>
        </ol>
      </nav>
      
      <!-- Produto Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        <!-- Galeria de Imagens -->
        <div class="space-y-4">
          <!-- Imagem Principal -->
          <div class="relative bg-white rounded-lg overflow-hidden aspect-square">
            <img 
              src={product.images?.[selectedImage] || '/placeholder.jpg'} 
              alt={product.name}
              fetchpriority="high"
              loading="eager"
              decoding="sync"
              class="w-full h-full object-contain cursor-zoom-in transition-opacity duration-300"
              onclick={() => showZoomModal = true}
              onload={() => {
                // Preload próxima imagem
                if (product.images && selectedImage < product.images.length - 1) {
                  const nextImg = new Image();
                  nextImg.src = product.images[selectedImage + 1];
                }
              }}
            />
            {#if product.discount_percentage}
              <span class="absolute top-4 left-4 bg-[#00BFB3] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                -{product.discount_percentage}%
              </span>
            {/if}
            <!-- Botão de Favorito -->
            <button
              onclick={toggleFavorite}
              class="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <svg class="w-6 h-6 {isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          
          <!-- Miniaturas com Lazy Loading Otimizado -->
          {#if product.images && product.images.length > 1}
            <div class="grid grid-cols-4 gap-2">
              {#each product.images as image, index}
                <button
                  onclick={() => selectedImage = index}
                  class="relative aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all duration-200
                         {selectedImage === index ? 'border-[#00BFB3] ring-2 ring-[#00BFB3]/20' : 'border-gray-200 hover:border-gray-300'}"
                >
                  <img 
                    src={index < 3 ? image : '/placeholder.jpg'} 
                    data-src={index >= 3 ? image : undefined}
                    alt={`${product.name} - Imagem ${index + 1}`} 
                    class="w-full h-full object-contain transition-opacity duration-200" 
                    loading={index < 3 ? 'eager' : 'lazy'}
                    fetchpriority={index < 2 ? 'high' : 'auto'}
                    decoding="async"
                  />
                  {#if selectedImage === index}
                    <div class="absolute inset-0 bg-[#00BFB3]/10 pointer-events-none"></div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- Informações do Produto -->
        <div class="space-y-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div class="flex items-center gap-4 text-sm">
              <div class="flex items-center">
                {#each Array(5) as _, i}
                  <svg class="w-4 h-4 {i < Math.floor(product.rating || 4) ? 'text-[#00BFB3]' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                {/each}
                <span class="ml-2 text-gray-600">({product.rating || 4.0})</span>
              </div>
              <span class="text-gray-400">|</span>
              <span class="text-gray-600">{product.sales_count || 0} vendidos</span>
              <span class="text-gray-400">|</span>
              <button onclick={shareProduct} class="text-[#00BFB3] hover:text-[#00A89D]">
                Compartilhar
              </button>
            </div>
          </div>
          
          <!-- Indicador de Urgência -->
          {#if viewingCount > 10}
            <div class="bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg p-3 text-sm">
              <p class="text-gray-800">
                <span class="inline-block w-2 h-2 bg-[#00BFB3] rounded-full animate-pulse mr-2"></span>
                <strong>{viewingCount} pessoas</strong> estão vendo este produto agora
              </p>
            </div>
          {/if}
          
          <!-- Preço -->
          <div class="bg-gray-50 rounded-lg p-4">
            {#if getCurrentOriginalPrice() !== undefined && getCurrentOriginalPrice()! > getCurrentPrice()}
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500 line-through">
                  {formatCurrency(getCurrentOriginalPrice()!)}
                </span>
                <span class="bg-red-500 text-white text-xs px-2 py-1 rounded">
                  -{getDiscountPercentage(getCurrentPrice(), getCurrentOriginalPrice())}%
                </span>
              </div>
            {/if}
            <p class="text-3xl font-bold text-gray-900">{formatCurrency(getCurrentPrice())}</p>
            <p class="text-sm text-gray-600 mt-1">{calculateInstallment(getCurrentPrice())}</p>
            {#if getCurrentPrice() < 50}
              <p class="text-xs text-[#00BFB3] mt-2 flex items-center">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Menor preço dos últimos 30 dias
              </p>
            {/if}
            {#if currentVariation}
              <p class="text-xs text-gray-500 mt-2">
                SKU: {currentVariation.sku}
              </p>
            {/if}
            
            <!-- Indicador de Economia -->
            {#if getCurrentOriginalPrice() !== undefined && getCurrentOriginalPrice()! > getCurrentPrice()}
              <div class="bg-[#00BFB3]/10 rounded-lg p-3 mt-3 border border-[#00BFB3]/20">
                <p class="text-sm text-[#00BFB3] font-medium">
                  💰 Você economiza {formatCurrency(getCurrentOriginalPrice()! - getCurrentPrice())}
                </p>
              </div>
            {/if}
          </div>
          
          <!-- Notificação de Estoque Baixo -->
          {#if getCurrentStock() <= 5 && getCurrentStock() > 0}
            <div class="bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm animate-pulse">
              <p class="text-gray-700 flex items-center">
                <svg class="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <strong>Corra!</strong> Restam apenas {getCurrentStock()} {getCurrentStock() === 1 ? 'unidade' : 'unidades'}
              </p>
            </div>
          {/if}
          
          <!-- Selo de Mais Vendido -->
          {#if product.sold_count && product.sold_count > 100}
            <div class="inline-flex items-center bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Mais vendido da categoria
            </div>
          {/if}
          
          <!-- Cálculo de Frete -->
          <div class="border rounded-lg p-4">
            <h3 class="font-medium mb-3">Calcular frete e prazo</h3>
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="00000-000"
                value={shippingZip}
                oninput={(e) => {
                  shippingZip = formatZipCode(e.currentTarget.value);
                  if (shippingZip.length === 9) {
                    debouncedCalculateShipping();
                  }
                }}
                maxlength="9"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
              />
              <button
                onclick={calculateShipping}
                disabled={calculatingShipping || shippingZip.length < 8}
                class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {calculatingShipping ? 'Calculando...' : 'Calcular'}
              </button>
            </div>
            
            {#if shippingOptions.length > 0}
              <div class="mt-3 space-y-2" transition:fade>
                {#each shippingOptions as option}
                  <div class="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>{option.name}</span>
                    <span>
                      {option.price === 0 ? 'Grátis' : formatCurrency(option.price)} - {option.days}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
          
          <!-- Opções de Variação -->
          {#if availableColors.length > 0}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Cor {#if validationError.includes('cor')}<span class="text-red-600">*</span>{/if}
              </label>
              <div class="flex gap-2 flex-wrap {validationError.includes('cor') ? 'animate-pulse' : ''}">
                {#each availableColors as color}
                  {@const isAvailable = isColorAvailable(color)}
                  {@const isCurrentColor = product?.variations?.find(v => v.color === color && v.is_current)}
                  <button
                    onclick={() => isAvailable && selectColorOptimized(color)}
                    disabled={!isAvailable}
                    class="px-4 py-2 border-2 rounded-lg transition-all
                           {isCurrentColor ? 'border-[#00BFB3] bg-[#00BFB3]/10 ring-2 ring-[#00BFB3]/20' : 
                           validationError.includes('cor') ? 'border-red-300 hover:border-red-400' : 
                           'border-gray-200 hover:border-gray-300'}
                           {!isAvailable ? 'opacity-50 cursor-not-allowed line-through' : 'hover:border-[#00BFB3]/50'}"
                  >
                    {color}
                    {#if isCurrentColor}
                      <span class="ml-1 text-xs text-[#00BFB3]">•</span>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if availableSizes.length > 0}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tamanho {#if validationError.includes('tamanho')}<span class="text-red-600">*</span>{/if}
              </label>
              <div class="flex gap-2 flex-wrap {validationError.includes('tamanho') ? 'animate-pulse' : ''}">
                {#each availableSizes as size}
                  {@const isAvailable = isSizeAvailableForColor(size)}
                  <button
                    onclick={() => isAvailable && selectSize(size)}
                    disabled={!isAvailable}
                    class="w-12 h-12 border-2 rounded-lg transition-all font-medium
                           {selectedSize === size ? 'border-[#00BFB3] bg-[#00BFB3]/10' : 
                           validationError.includes('tamanho') ? 'border-red-300 hover:border-red-400' : 
                           'border-gray-200 hover:border-gray-300'}
                           {!isAvailable ? 'opacity-50 cursor-not-allowed line-through' : ''}"
                  >
                    {size}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if availableStyles.length > 0}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tipo {#if validationError.includes('estilo')}<span class="text-red-600">*</span>{/if}
              </label>
              <div class="flex gap-2 flex-wrap {validationError.includes('estilo') ? 'animate-pulse' : ''}">
                {#each availableStyles as style}
                  {@const isAvailable = isStyleAvailableForSelection(style)}
                  <button
                    onclick={() => isAvailable && selectStyle(style)}
                    disabled={!isAvailable}
                    class="px-4 py-2 border-2 rounded-lg transition-all font-medium
                           {selectedStyle === style ? 'border-[#00BFB3] bg-[#00BFB3]/10 text-[#00BFB3]' : 
                           validationError.includes('estilo') ? 'border-red-300 hover:border-red-400' : 
                           'border-gray-200 hover:border-gray-300'}
                           {!isAvailable ? 'opacity-50 cursor-not-allowed line-through' : ''}"
                  >
                    {style}
                  </button>
                {/each}
              </div>
              {#if selectedStyle}
                <p class="text-xs text-gray-600 mt-1">
                  Tipo selecionado: <span class="font-medium">{selectedStyle}</span>
                </p>
              {/if}
            </div>
          {/if}
          
          <!-- Aviso de Variação Indisponível -->
          {#if (selectedColor || selectedSize || selectedStyle) && !currentVariation}
            <div class="bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm">
              <p class="text-gray-700 flex items-center">
                <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Esta combinação não está disponível. Por favor, selecione outras opções.
              </p>
            </div>
          {/if}
          
          <!-- Quantidade -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
            <div class="flex items-center gap-2">
              <button
                onclick={() => quantity = Math.max(1, quantity - 1)}
                class="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                -
              </button>
              <input
                type="number"
                bind:value={quantity}
                min="1"
                max={getCurrentStock()}
                class="w-20 h-10 text-center border border-gray-300 rounded-lg"
              />
              <button
                onclick={() => quantity = Math.min(getCurrentStock(), quantity + 1)}
                class="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                +
              </button>
              <span class="text-sm text-gray-500 ml-2">
                {#if getCurrentStock() < 10}
                  <span class="text-orange-600 font-medium">Apenas {getCurrentStock()} disponíveis!</span>
                {:else}
                  {getCurrentStock()} disponíveis
                {/if}
              </span>
            </div>
          </div>
          
          <!-- Mensagem de Validação -->
          {#if validationError}
            <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm animate-pulse" transition:fade>
              <p class="text-red-700 flex items-center">
                <svg class="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <strong>{validationError}</strong>
              </p>
            </div>
          {/if}
          
          <!-- Botões de Ação -->
          <div class="space-y-3">
            <button
              onclick={handleBuyNow}
              class="w-full bg-[#00BFB3] text-white py-3 px-6 rounded-lg font-semibold
                     hover:bg-[#00A89D] transition-colors relative overflow-hidden"
            >
              Comprar Agora
              {#if product.has_free_shipping}
                <span class="absolute top-0 right-0 bg-gray-800 text-xs px-2 py-1 rounded-bl flex items-center">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                  </svg>
                  Frete Grátis
                </span>
              {/if}
            </button>
            <button
              onclick={handleAddToCart}
              class="w-full bg-white text-[#00BFB3] py-3 px-6 rounded-lg font-semibold
                     border-2 border-[#00BFB3] hover:bg-[#00BFB3]/10 transition-colors"
            >
              Adicionar ao Carrinho
            </button>
          </div>
          
          <!-- Garantias e Segurança -->
          <div class="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div class="w-12 h-12 mx-auto mb-2 bg-[#00BFB3]/10 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p class="text-gray-700 font-medium">Compra Segura</p>
            </div>
            <div>
              <div class="w-12 h-12 mx-auto mb-2 bg-[#00BFB3]/10 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p class="text-gray-700 font-medium">7 dias para troca</p>
            </div>
            <div>
              <div class="w-12 h-12 mx-auto mb-2 bg-[#00BFB3]/10 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p class="text-gray-700 font-medium">Garantia de 1 ano</p>
            </div>
          </div>
          
          <!-- Informações do Vendedor -->
          <div class="border-t pt-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">
                  Vendido e entregue por <span class="font-semibold text-gray-900">{product.seller_name || 'Marketplace GDG'}</span>
                </p>
                <div class="flex items-center mt-1">
                  <div class="flex">
                    {#each Array(5) as _, i}
                      <svg class="w-3 h-3 {i < 4 ? 'text-[#00BFB3]' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    {/each}
                  </div>
                  <span class="text-xs text-gray-600 ml-1">(4.2)</span>
                </div>
              </div>
              <a href="#" class="text-sm text-[#00BFB3] hover:text-[#00A89D]">
                Ver perfil
              </a>
            </div>
          </div>
          
          <!-- Benefícios do Produto -->
          {#if product.description && product.description.length > 100}
            <div class="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 class="font-semibold text-gray-900 text-sm">Por que escolher este produto?</h3>
              <div class="space-y-2">
                <div class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-[#00BFB3] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <p class="text-sm text-gray-700">Qualidade garantida com certificação</p>
                </div>
                <div class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-[#00BFB3] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <p class="text-sm text-gray-700">Entrega rápida e segura</p>
                </div>
                <div class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-[#00BFB3] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <p class="text-sm text-gray-700">Suporte técnico especializado</p>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Tabs de Informações -->
      <div class="bg-white rounded-lg shadow-sm mb-16">
        <div class="border-b">
          <div class="flex overflow-x-auto">
            <button
              onclick={() => activeTab = 'description'}
              class="px-6 py-4 font-medium transition-colors relative whitespace-nowrap
                     {activeTab === 'description' ? 'text-[#00BFB3]' : 'text-gray-600 hover:text-gray-900'}"
            >
              Descrição
              {#if activeTab === 'description'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00BFB3]"></div>
              {/if}
            </button>
            <button
              onclick={() => activeTab = 'specs'}
              class="px-6 py-4 font-medium transition-colors relative whitespace-nowrap
                     {activeTab === 'specs' ? 'text-[#00BFB3]' : 'text-gray-600 hover:text-gray-900'}"
            >
              Especificações
              {#if activeTab === 'specs'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00BFB3]"></div>
              {/if}
            </button>
            <button
              onclick={() => activeTab = 'shipping'}
              class="px-6 py-4 font-medium transition-colors relative whitespace-nowrap
                     {activeTab === 'shipping' ? 'text-[#00BFB3]' : 'text-gray-600 hover:text-gray-900'}"
            >
              Frete e Prazo
              {#if activeTab === 'shipping'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00BFB3]"></div>
              {/if}
            </button>
            <button
              onclick={() => activeTab = 'reviews'}
              class="px-6 py-4 font-medium transition-colors relative whitespace-nowrap
                     {activeTab === 'reviews' ? 'text-[#00BFB3]' : 'text-gray-600 hover:text-gray-900'}"
            >
              Avaliações ({product.reviews_count || 0})
              {#if activeTab === 'reviews'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00BFB3]"></div>
              {/if}
            </button>
          </div>
        </div>
        
        <div class="p-6">
          {#if activeTab === 'description'}
            <div class="prose max-w-none">
              <p>{product.description || 'Sem descrição disponível.'}</p>
            </div>
          {:else if activeTab === 'specs'}
            <div class="space-y-4">
              <!-- Especificações do banco -->
              {#if product.specifications && Object.keys(product.specifications).length > 0}
                <div>
                  <h4 class="font-semibold text-gray-900 mb-4">Especificações Técnicas</h4>
                  <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each Object.entries(product.specifications) as [key, value]}
                      <div class="flex justify-between text-sm border-b border-gray-100 pb-2">
                        <dt class="text-gray-600 font-medium">{key}</dt>
                        <dd class="font-medium text-gray-900">{value}</dd>
                      </div>
                    {/each}
                  </dl>
                </div>
              {/if}
              
              <!-- Atributos do banco -->
              {#if product.attributes && Object.keys(product.attributes).length > 0}
                <div>
                  <h4 class="font-semibold text-gray-900 mb-4">Atributos do Produto</h4>
                  <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each Object.entries(product.attributes) as [key, value]}
                      <div class="flex justify-between text-sm border-b border-gray-100 pb-2">
                        <dt class="text-gray-600 font-medium">{key}</dt>
                        <dd class="font-medium text-gray-900">
                          {#if Array.isArray(value)}
                            {value.join(', ')}
                          {:else}
                            {value}
                          {/if}
                        </dd>
                      </div>
                    {/each}
                  </dl>
                </div>
              {/if}
              
              <!-- Informações básicas (sempre exibir) -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="font-semibold text-gray-900 mb-2">Informações Gerais</h4>
                  <dl class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Marca</dt>
                      <dd class="font-medium">{product.brand_name || product.brand || 'Não informado'}</dd>
                    </div>
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Modelo</dt>
                      <dd class="font-medium">{product.model || 'Não informado'}</dd>
                    </div>
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">SKU</dt>
                      <dd class="font-medium">{product.sku || product.id}</dd>
                    </div>
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Categoria</dt>
                      <dd class="font-medium">{product.category_name || 'Não informado'}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-900 mb-2">Dimensões e Peso</h4>
                  <dl class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Peso</dt>
                      <dd class="font-medium">{product.weight || 0.5} kg</dd>
                    </div>
                    {#if product.specifications?.['Dimensões do produto'] || product.specifications?.['Dimensões'] || product.specifications?.['Tamanho']}
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Dimensões</dt>
                        <dd class="font-medium">{product.specifications['Dimensões do produto'] || product.specifications['Dimensões'] || product.specifications['Tamanho']}</dd>
                      </div>
                    {/if}
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Condição</dt>
                      <dd class="font-medium">
                        {#if product.condition === 'new'}
                          Novo
                        {:else if product.condition === 'used'}
                          Usado
                        {:else if product.condition === 'refurbished'}
                          Recondicionado
                        {:else}
                          {product.condition || 'Novo'}
                        {/if}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              <!-- Mensagem quando não há especificações -->
              {#if (!product.specifications || Object.keys(product.specifications).length === 0) && (!product.attributes || Object.keys(product.attributes).length === 0)}
                <div class="text-center py-8 text-gray-500">
                  <p>Especificações técnicas não disponíveis</p>
                  <p class="text-sm">Entre em contato conosco para mais detalhes sobre este produto</p>
                </div>
              {/if}
            </div>
          {:else if activeTab === 'shipping'}
            <div class="space-y-4">
              <div class="bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg p-4">
                <p class="text-sm text-gray-800">
                  <strong>Frete Grátis</strong> para compras acima de R$ 199,00
                </p>
              </div>
              <div>
                <h4 class="font-semibold mb-2">Prazo de entrega estimado:</h4>
                <ul class="space-y-1 text-sm text-gray-600">
                  <li>• Capitais: 3-5 dias úteis</li>
                  <li>• Região metropolitana: 5-7 dias úteis</li>
                  <li>• Interior: 7-15 dias úteis</li>
                </ul>
              </div>
              <div>
                <h4 class="font-semibold mb-2">Política de devolução:</h4>
                <p class="text-sm text-gray-600">
                  Você tem 7 dias após o recebimento para solicitar a devolução do produto. 
                  O produto deve estar em perfeitas condições, com embalagem original e todos os acessórios.
                </p>
              </div>
            </div>
          {:else if activeTab === 'reviews'}
            <div class="space-y-6">
              <!-- Resumo das avaliações -->
              <div class="flex items-center gap-8">
                <div class="text-center">
                  <p class="text-4xl font-bold text-gray-900">{product.rating || 4.0}</p>
                  <div class="flex justify-center mt-1">
                    {#each Array(5) as _, i}
                      <svg class="w-5 h-5 {i < Math.floor(product.rating || 4) ? 'text-[#00BFB3]' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    {/each}
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{product.reviews_count || 0} avaliações</p>
                </div>
                <div class="flex-1 space-y-2">
                  {#each [5, 4, 3, 2, 1] as stars}
                    <div class="flex items-center gap-2">
                      <span class="text-sm w-4">{stars}</span>
                      <div class="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          class="bg-[#00BFB3] h-2 rounded-full" 
                          style="width: {stars === 5 ? '60%' : stars === 4 ? '25%' : stars === 3 ? '10%' : '5%'}"
                        ></div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
              
              <!-- Lista de avaliações -->
              <div class="border-t pt-6">
                <h4 class="font-semibold mb-4">Avaliações dos clientes</h4>
                {#if product.reviews_count && product.reviews_count > 0}
                  <div class="space-y-4">
                    <!-- Aqui você carregaria avaliações reais via API -->
                    <div class="text-center py-8 text-gray-500">
                      <p>Sistema de avaliações em desenvolvimento</p>
                      <p class="text-sm">Em breve você poderá ver avaliações detalhadas dos clientes</p>
                    </div>
                  </div>
                {:else}
                  <div class="text-center py-8 text-gray-500">
                    <p>Ainda não há avaliações para este produto</p>
                    <p class="text-sm">Seja o primeiro a avaliar!</p>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Seção de Perguntas e Respostas -->
      <div class="bg-white rounded-lg shadow-sm mb-16 p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900">Perguntas sobre o produto</h2>
          <button 
            class="text-[#00BFB3] hover:text-[#00A89D] font-medium text-sm flex items-center gap-2"
            onclick={() => alert('Funcionalidade de perguntas em desenvolvimento')}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Fazer uma pergunta
          </button>
        </div>
        
        <!-- Lista de Perguntas -->
        <div class="space-y-4">
          {#if product.questions_count && product.questions_count > 0}
            <!-- Aqui você carregaria perguntas reais via API -->
            <div class="text-center py-8 text-gray-500">
              <p>Sistema de perguntas em desenvolvimento</p>
              <p class="text-sm">Em breve você poderá ver perguntas e respostas sobre o produto</p>
            </div>
          {:else}
            <div class="text-center py-8 text-gray-500">
              <p>Ainda não há perguntas sobre este produto</p>
              <p class="text-sm">Seja o primeiro a perguntar!</p>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Produtos Frequentemente Comprados Juntos -->
      <div class="bg-gray-50 rounded-lg p-6 mb-16">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Frequentemente comprados juntos</h2>
        
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Lista de produtos -->
          <div class="flex-1 space-y-4">
            <!-- Produto principal -->
            <div class="flex items-center gap-4 bg-white p-4 rounded-lg">
              <input 
                type="checkbox" 
                checked 
                disabled 
                class="w-5 h-5 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
              />
              <img 
                src={product.images?.[0] || '/placeholder.jpg'} 
                alt={product.name}
                class="w-16 h-16 object-cover rounded"
              />
              <div class="flex-1">
                <h4 class="font-medium text-gray-900 text-sm">{product.name} (Este produto)</h4>
                <p class="text-[#00BFB3] font-bold">{formatCurrency(getCurrentPrice())}</p>
              </div>
            </div>
            
            <!-- Produtos relacionados para comprar junto -->
            {#each relatedProducts.slice(0, 2) as related}
              <div class="flex items-center gap-4 bg-white p-4 rounded-lg">
                <input 
                  type="checkbox" 
                  checked
                  class="w-5 h-5 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
                />
                <img 
                  src={related.images?.[0] || '/placeholder.jpg'} 
                  alt={related.name}
                  class="w-16 h-16 object-cover rounded"
                />
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900 text-sm line-clamp-1">{related.name}</h4>
                  <p class="text-[#00BFB3] font-bold">{formatCurrency(related.price)}</p>
                </div>
              </div>
            {/each}
          </div>
          
          <!-- Resumo e botão -->
          <div class="lg:w-80 bg-white rounded-lg p-6">
            <h3 class="font-semibold text-gray-900 mb-4">Resumo da compra</h3>
            
            <div class="space-y-2 mb-4">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">3 produtos selecionados</span>
                <span class="font-medium">{formatCurrency(getCurrentPrice() + relatedProducts.slice(0, 2).reduce((sum, p) => sum + p.price, 0))}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Desconto do combo</span>
                <span class="text-[#00BFB3] font-medium">-{formatCurrency((getCurrentPrice() + relatedProducts.slice(0, 2).reduce((sum, p) => sum + p.price, 0)) * 0.1)}</span>
              </div>
              <div class="border-t pt-2 flex justify-between">
                <span class="font-semibold">Total</span>
                <span class="text-xl font-bold text-[#00BFB3]">
                  {formatCurrency((getCurrentPrice() + relatedProducts.slice(0, 2).reduce((sum, p) => sum + p.price, 0)) * 0.9)}
                </span>
              </div>
            </div>
            
            <button class="w-full bg-[#00BFB3] text-white py-3 rounded-lg font-semibold hover:bg-[#00A89D] transition-colors">
              Adicionar combo ao carrinho
            </button>
            
            <p class="text-xs text-gray-500 text-center mt-3">
              💰 Economize 10% comprando junto!
            </p>
          </div>
        </div>
      </div>
      
      <!-- Produtos Relacionados -->
      {#if relatedProducts.length > 0}
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Produtos Relacionados</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            {#each relatedProducts as related}
              <a href="/produto/{related.slug || related.id}" class="group">
                <div class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div class="aspect-square bg-gray-50">
                    <img 
                      src={related.images?.[0] || '/placeholder.jpg'} 
                      alt={related.name}
                      class="w-full h-full object-contain"
                    />
                  </div>
                  <div class="p-4">
                    <h3 class="font-medium text-gray-900 group-hover:text-[#00BFB3] transition-colors line-clamp-2">
                      {related.name}
                    </h3>
                    <p class="text-lg font-bold text-gray-900 mt-2">{formatCurrency(related.price)}</p>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Modal de Zoom -->
{#if showZoomModal && product}
  <div 
    class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
    onclick={() => showZoomModal = false}
  >
    <img 
      src={product.images?.[selectedImage] || '/placeholder.jpg'} 
      alt={product.name}
      class="max-w-full max-h-full object-contain"
    />
    <button
      onclick={() => showZoomModal = false}
      class="absolute top-4 right-4 text-white hover:text-gray-300"
    >
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
{/if}

<!-- Notificação de Adicionado ao Carrinho -->
{#if showAddedToCart}
  <div 
    class="fixed bottom-4 right-4 bg-[#00BFB3] text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50"
    transition:fly={{ y: 50, duration: 300 }}
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
    Produto adicionado ao carrinho!
  </div>
{/if}

