<script lang="ts">
  interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    originalPrice?: number;
    image?: string;
    rating?: number;
    reviews?: number;
  }

  export let products: Product[] = [];
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {#each products as product}
    <div class="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <a href="/produto/{product.slug}" class="block">
        <!-- Imagem -->
        <div class="aspect-square bg-gray-100 relative overflow-hidden">
          {#if product.image}
            <img 
              src={product.image} 
              alt={product.name}
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          {:else}
            <div class="w-full h-full flex items-center justify-center text-gray-400">
              <span class="text-4xl">📦</span>
            </div>
          {/if}
          
          <!-- Badge de desconto -->
          {#if product.originalPrice && product.originalPrice > product.price}
            {@const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}
            <div class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
              -{discount}%
            </div>
          {/if}
        </div>
        
        <!-- Conteúdo -->
        <div class="p-4">
          <h3 class="font-medium text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
            {product.name}
          </h3>
          
          <!-- Preços -->
          <div class="mb-2">
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
              
              {#if product.originalPrice && product.originalPrice > product.price}
                <span class="text-sm text-gray-500 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              {/if}
            </div>
          </div>
          
          <!-- Avaliações -->
          {#if product.rating && product.reviews}
            <div class="flex items-center gap-1 text-xs text-gray-500">
              <div class="flex">
                {#each Array(5) as _, i}
                  <span class="{i < Math.floor(product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}">★</span>
                {/each}
              </div>
              <span>({product.reviews})</span>
            </div>
          {/if}
        </div>
      </a>
    </div>
  {/each}
</div>

{#if products.length === 0}
  <div class="text-center py-12 text-gray-500">
    <p class="text-lg mb-2">Nenhum produto em destaque</p>
    <p class="text-sm">Volte em breve para conferir nossas novidades!</p>
  </div>
{/if} 