<script lang="ts">
  let { itemCount = 8, columns = 4 } = $props();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-{columns} gap-6">
  {#each Array(itemCount) as _, i}
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse">
      <!-- Imagem skeleton -->
      <div class="aspect-square bg-gray-200"></div>
      
      <!-- Conteúdo skeleton -->
      <div class="p-4 space-y-3">
        <!-- Nome do produto -->
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        
        <!-- Preço -->
        <div class="flex items-center gap-2">
          <div class="h-5 bg-gray-200 rounded w-16"></div>
          <div class="h-4 bg-gray-200 rounded w-12"></div>
        </div>
        
        <!-- Rating -->
        <div class="flex items-center gap-1">
          {#each Array(5) as _}
            <div class="w-4 h-4 bg-gray-200 rounded"></div>
          {/each}
        </div>
        
        <!-- Botão -->
        <div class="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  {/each}
</div>

<style>
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
  
  .animate-pulse {
    animation: shimmer 1.5s ease-in-out infinite;
    background: linear-gradient(90deg, 
      #f0f0f0 25%, 
      #e0e0e0 50%, 
      #f0f0f0 75%
    );
    background-size: 200px 100%;
  }
</style>
