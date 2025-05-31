<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { formatCurrency } from '$lib/utils';
  import { cartStore } from '$lib/stores/cartStore';
  import { goto } from '$app/navigation';
  import type { Product } from '@mktplace/shared-types';
  import { fade, fly } from 'svelte/transition';
  import { browser } from '$app/environment';
  import type { PageData } from './$types';
  
  // Props dos dados do servidor
  let { data }: { data: PageData } = $props();
  
  // Estender o tipo Product com propriedades adicionais
  interface ExtendedProduct extends Product {
    seller_name?: string;
    discount_percentage?: number;
    rating?: number;
    sales_count?: number;
    original_price?: number;
    brand?: string;
    model?: string;
    sku?: string;
    weight?: number;
    slug?: string;
    has_free_shipping?: boolean;
    delivery_days?: number;
    reviews_count?: number;
    variations?: ProductVariation[];
    sold_count?: number;
    category_name?: string;
    questions_count?: number;
  }
  
  interface ProductVariation {
    color?: string;
    size?: string;
    price: number;
    original_price?: number;
    stock: number;
    sku: string;
    images?: string[];
  }
  
  const { addItem } = cartStore;
  
  let product = $state<ExtendedProduct | null>(data.product);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selectedImage = $state(0);
  let selectedColor = $state<string>('');
  let selectedSize = $state<string>('');
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
  
  // Variações disponíveis (será preenchido com dados do produto)
  let availableColors = $state<string[]>([]);
  let availableSizes = $state<string[]>([]);
  let currentVariation = $state<ProductVariation | null>(null);
  
  // Simular pessoas vendo o produto
  let viewingCount = $state(Math.floor(Math.random() * 20) + 5);
  
  // Função para obter cores únicas das variações
  function getUniqueColors(variations: ProductVariation[]): string[] {
    const colors = variations
      .filter(v => v.color)
      .map(v => v.color!)
      .filter((color, index, self) => self.indexOf(color) === index);
    return colors;
  }
  
  // Função para obter tamanhos únicos das variações
  function getUniqueSizes(variations: ProductVariation[]): string[] {
    const sizes = variations
      .filter(v => v.size)
      .map(v => v.size!)
      .filter((size, index, self) => self.indexOf(size) === index);
    return sizes;
  }
  
  // Função para encontrar variação atual baseada nas seleções
  function findCurrentVariation(): ProductVariation | null {
    if (!product?.variations || product.variations.length === 0) return null;
    
    return product.variations.find(v => {
      const colorMatch = !selectedColor || v.color === selectedColor;
      const sizeMatch = !selectedSize || v.size === selectedSize;
      return colorMatch && sizeMatch;
    }) || null;
  }
  
  // Atualizar variação atual quando seleções mudam
  $effect(() => {
    currentVariation = findCurrentVariation();
  });
  
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
    
    // Atualizar parâmetros de cor e tamanho
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
    
    // Atualizar a URL sem recarregar a página
    goto(url.toString(), { replaceState: true, noScroll: true });
  }
  
  // Função para carregar variações da URL
  function loadVariationsFromURL() {
    const urlParams = $page.url.searchParams;
    
    const colorParam = urlParams.get('cor');
    if (colorParam) {
      const color = availableColors.find(c => c.toLowerCase() === colorParam.toLowerCase());
      if (color) selectedColor = color;
    }
    
    const sizeParam = urlParams.get('tamanho');
    if (sizeParam) {
      const size = availableSizes.find(s => s.toLowerCase() === sizeParam.toLowerCase());
      if (size) selectedSize = size;
    }
  }
  
  // Função para selecionar cor
  function selectColor(color: string) {
    selectedColor = color;
    validationError = ''; // Limpar erro ao selecionar
    updateURLWithVariations();
    
    // Se o produto tem imagens específicas por cor, mudar a imagem
    // Por exemplo, se tiver um mapeamento de cor -> índice de imagem
    const colorImageMap: Record<string, number> = {
      'Preto': 0,
      'Branco': 1,
      'Azul': 2,
      'Vermelho': 3
    };
    
    if (product && product.images && colorImageMap[color] !== undefined && product.images[colorImageMap[color]]) {
      selectedImage = colorImageMap[color];
    }
  }
  
  // Função para selecionar tamanho
  function selectSize(size: string) {
    selectedSize = size;
    validationError = ''; // Limpar erro ao selecionar
    updateURLWithVariations();
  }
  
  onMount(() => {
    // Configurar lazy loading de imagens
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
        rootMargin: '50px'
      });
      
      // Observar todas as imagens com data-src
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver?.observe(img);
      });
    }
    
    // Atualizar contador de visualizações a cada 30 segundos
    const interval = setInterval(() => {
      viewingCount = Math.floor(Math.random() * 20) + 5;
    }, 30000);
    
    // Extrair cores e tamanhos únicos das variações reais do produto
    if (product?.variations && product.variations.length > 0) {
      availableColors = getUniqueColors(product.variations);
      availableSizes = getUniqueSizes(product.variations);
    }
    
    // Carregar variações da URL
    loadVariationsFromURL();
    checkFavorite();
    
    return () => {
      clearInterval(interval);
      imageObserver?.disconnect();
    };
  });
  
  // Função removida - setupMockVariations não é mais necessária
  // As variações agora vêm diretamente do banco de dados
  
  async function fetchRelatedProducts(categoryId: string) {
    try {
      const response = await fetch(`/api/products?category=${categoryId}&limit=4`);
      const data = await response.json();
      if (data.success) {
        relatedProducts = data.data.products.filter((p: ExtendedProduct) => p.slug !== $page.params.slug);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos relacionados:', err);
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
    const installmentPrice = price / 12;
    return `12x de ${formatCurrency(installmentPrice)} sem juros`;
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
  function isCombinationAvailable(color?: string, size?: string): boolean {
    if (!product?.variations) return false;
    
    return product.variations.some(v => {
      const colorMatch = !color || v.color === color;
      const sizeMatch = !size || v.size === size;
      return colorMatch && sizeMatch && v.stock > 0;
    });
  }
  
  // Função para verificar se um tamanho está disponível para a cor selecionada
  function isSizeAvailableForColor(size: string): boolean {
    if (!selectedColor) return isCombinationAvailable(undefined, size);
    return isCombinationAvailable(selectedColor, size);
  }
  
  // Função para verificar se uma cor está disponível para o tamanho selecionado
  function isColorAvailableForSize(color: string): boolean {
    if (!selectedSize) return isCombinationAvailable(color, undefined);
    return isCombinationAvailable(color, selectedSize);
  }
</script>

<svelte:head>
  {#if product}
    <title>{product.name} - {product.category_name || 'Produtos'} | Marketplace GDG</title>
    <meta name="description" content={product.description || `Compre ${product.name} por apenas ${formatCurrency(getCurrentPrice())}. ${product.brand ? `Marca: ${product.brand}.` : ''} Entrega rápida e segura. Parcelamento em até 12x sem juros.`} />
    
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

<div class="min-h-screen bg-gray-50">
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
              class="w-full h-full object-contain cursor-zoom-in"
              onclick={() => showZoomModal = true}
            />
            {#if product.discount_percentage}
              <span class="absolute top-4 left-4 bg-[#00BFB3] text-white px-3 py-1 rounded-full text-sm font-semibold">
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
          
          <!-- Miniaturas com Lazy Loading -->
          {#if product.images && product.images.length > 1}
            <div class="grid grid-cols-4 gap-2">
              {#each product.images as image, index}
                <button
                  onclick={() => selectedImage = index}
                  class="relative aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all
                         {selectedImage === index ? 'border-[#00BFB3]' : 'border-gray-200 hover:border-gray-300'}"
                >
                  <img 
                    src={index < 2 ? image : '/placeholder.jpg'} 
                    data-src={index >= 2 ? image : undefined}
                    alt={`${product.name} - Imagem ${index + 1}`} 
                    class="w-full h-full object-contain" 
                    loading="lazy"
                  />
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
            {#if getCurrentOriginalPrice() && getCurrentOriginalPrice() > getCurrentPrice()}
              <div class="flex items-center gap-2">
                <p class="text-gray-500 line-through text-sm">{formatCurrency(getCurrentOriginalPrice() || 0)}</p>
                <span class="bg-[#00BFB3] text-white text-xs px-2 py-1 rounded-full">
                  {Math.round(((getCurrentOriginalPrice() || 0 - getCurrentPrice()) / (getCurrentOriginalPrice() || 1)) * 100)}% OFF
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
            {#if getCurrentOriginalPrice() && getCurrentOriginalPrice() > getCurrentPrice()}
              <div class="bg-[#00BFB3]/10 rounded-lg p-3 mt-3 border border-[#00BFB3]/20">
                <p class="text-sm text-gray-800 flex items-center">
                  <svg class="w-4 h-4 mr-2 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <strong>Você economiza: {formatCurrency((getCurrentOriginalPrice() || 0) - getCurrentPrice())}</strong>
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
                oninput={(e) => shippingZip = formatZipCode(e.currentTarget.value)}
                maxlength="9"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
              />
              <button
                onclick={calculateShipping}
                disabled={calculatingShipping || shippingZip.length < 8}
                class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                  {@const isAvailable = isColorAvailableForSize(color)}
                  <button
                    onclick={() => isAvailable && selectColor(color)}
                    disabled={!isAvailable}
                    class="px-4 py-2 border-2 rounded-lg transition-all
                           {selectedColor === color ? 'border-[#00BFB3] bg-[#00BFB3]/10' : 
                           validationError.includes('cor') ? 'border-red-300 hover:border-red-400' : 
                           'border-gray-200 hover:border-gray-300'}
                           {!isAvailable ? 'opacity-50 cursor-not-allowed line-through' : ''}"
                  >
                    {color}
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
          
          <!-- Aviso de Variação Indisponível -->
          {#if selectedColor && selectedSize && !currentVariation}
            <div class="bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm">
              <p class="text-gray-700 flex items-center">
                <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Esta combinação de cor e tamanho não está disponível. Por favor, selecione outra opção.
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
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="font-semibold text-gray-900 mb-2">Informações Gerais</h4>
                  <dl class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Marca</dt>
                      <dd class="font-medium">{product.brand || 'Não informado'}</dd>
                    </div>
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Modelo</dt>
                      <dd class="font-medium">{product.model || 'Não informado'}</dd>
                    </div>
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">SKU</dt>
                      <dd class="font-medium">{product.sku || product.id}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-900 mb-2">Dimensões</h4>
                  <dl class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Peso</dt>
                      <dd class="font-medium">{product.weight || 0.5} kg</dd>
                    </div>
                    <div class="flex justify-between text-sm">
                      <dt class="text-gray-600">Dimensões</dt>
                      <dd class="font-medium">20 x 15 x 10 cm</dd>
                    </div>
                  </dl>
                </div>
              </div>
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
              <a href="/produto/{(related as ExtendedProduct).slug || related.id}" class="group">
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

