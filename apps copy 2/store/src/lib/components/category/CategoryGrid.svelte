<script lang="ts">
  interface Category {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    productCount?: number;
  }

  export let categories: Category[] = [];
</script>

<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
  {#each categories as category}
    <a 
      href="/categorias/{category.slug}" 
      class="group block p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
    >
      {#if category.imageUrl}
        <img 
          src={category.imageUrl} 
          alt={category.name}
          class="w-full h-24 object-cover rounded-md mb-3"
        />
      {:else}
        <div class="w-full h-24 bg-gray-100 rounded-md mb-3 flex items-center justify-center">
          <span class="text-2xl">🏷️</span>
        </div>
      {/if}
      
      <h3 class="font-medium text-gray-900 text-sm group-hover:text-cyan-600 transition-colors">
        {category.name}
      </h3>
      
      {#if category.productCount}
        <p class="text-xs text-gray-500 mt-1">
          {category.productCount} produtos
        </p>
      {/if}
    </a>
  {/each}
</div>

{#if categories.length === 0}
  <div class="text-center py-8 text-gray-500">
    Nenhuma categoria disponível
  </div>
{/if} 