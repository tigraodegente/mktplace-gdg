<script lang="ts">
  import type { PageData } from './$types';
  
  let { data }: { data: PageData } = $props();
  
  const { posts, pagination } = data;
  
  // Definir meta localmente já que não vem do servidor
  const meta = {
    title: 'Blog Grão de Gente - Dicas e Novidades',
    description: 'Dicas, novidades e tendências do universo infantil para você e sua família'
  };
</script>

<svelte:head>
  <title>{meta.title}</title>
  <meta name="description" content={meta.description} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://marketplace-gdg.com/blog" />
  
  <!-- Open Graph -->
  <meta property="og:title" content={meta.title} />
  <meta property="og:description" content={meta.description} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://marketplace-gdg.com/blog" />
</svelte:head>

<div class="min-h-screen bg-white">
  <!-- Hero Section -->
  <div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white py-16">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">
          📝 Blog Grão de Gente
        </h1>
        <p class="text-xl text-white/90 max-w-2xl mx-auto">
          Dicas, novidades e tendências do universo infantil para você e sua família
        </p>
      </div>
    </div>
  </div>

  <!-- Breadcrumb -->
  <div class="max-w-7xl mx-auto px-4 py-4">
    <nav class="text-sm">
      <ol class="flex items-center space-x-2">
        <li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
        <li><span class="text-gray-400">/</span></li>
        <li class="text-gray-900 font-medium">Blog</li>
      </ol>
    </nav>
  </div>

  <!-- Conteúdo Principal -->
  <div class="max-w-7xl mx-auto px-4 pb-16">
    {#if data.error}
      <!-- Estado de erro -->
      <div class="text-center py-12">
        <div class="text-4xl mb-4">😔</div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
        <p class="text-gray-600 mb-6">{data.error}</p>
        <a 
          href="/" 
          class="inline-flex items-center px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
        >
          Voltar ao início
        </a>
      </div>
    {:else if posts.length === 0}
      <!-- Estado vazio -->
      <div class="text-center py-12">
        <div class="text-4xl mb-4">📝</div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Blog em breve!</h2>
        <p class="text-gray-600 mb-6">
          Estamos preparando conteúdos incríveis para você. Volte em breve!
        </p>
        <a 
          href="/" 
          class="inline-flex items-center px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
        >
          Explore nossos produtos
        </a>
      </div>
    {:else}
      <!-- Lista de posts -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each posts as post}
          <article class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <!-- Imagem placeholder para o post -->
            <div class="h-48 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] flex items-center justify-center">
              <div class="text-white text-4xl">📝</div>
            </div>
            
            <!-- Conteúdo do post -->
            <div class="p-6">
              <!-- Data de publicação -->
              <div class="text-sm text-gray-500 mb-2">
                {post.publishedAt}
              </div>
              
              <!-- Título -->
              <h2 class="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                <a href="/{post.slug}" class="hover:text-[#00BFB3] transition-colors">
                  {post.title}
                </a>
              </h2>
              
              <!-- Resumo -->
              <p class="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              
              <!-- Link para ler mais -->
              <a 
                href="/{post.slug}"
                class="inline-flex items-center text-[#00BFB3] hover:text-[#00A89D] font-medium text-sm transition-colors"
              >
                Ler mais
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </article>
        {/each}
      </div>

      <!-- Paginação -->
      {#if pagination.totalPages > 1}
        <div class="mt-12 flex justify-center">
          <nav class="flex items-center space-x-2">
            <!-- Página anterior -->
            {#if pagination.hasPrevious}
              <a 
                href="/blog?page={pagination.currentPage - 1}"
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Anterior
              </a>
            {/if}
            
            <!-- Números das páginas -->
            {#each Array.from({length: pagination.totalPages}, (_, i) => i + 1) as pageNum}
              {#if pageNum === pagination.currentPage}
                <span class="px-3 py-2 text-sm font-medium text-white bg-[#00BFB3] border border-[#00BFB3] rounded-md">
                  {pageNum}
                </span>
              {:else if Math.abs(pageNum - pagination.currentPage) <= 2 || pageNum === 1 || pageNum === pagination.totalPages}
                <a 
                  href="/blog?page={pageNum}"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {pageNum}
                </a>
              {:else if Math.abs(pageNum - pagination.currentPage) === 3}
                <span class="px-3 py-2 text-sm font-medium text-gray-400">...</span>
              {/if}
            {/each}
            
            <!-- Próxima página -->
            {#if pagination.hasNext}
              <a 
                href="/blog?page={pagination.currentPage + 1}"
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Próxima
              </a>
            {/if}
          </nav>
        </div>
        
        <!-- Info da paginação -->
        <div class="mt-4 text-center text-sm text-gray-600">
          Mostrando página {pagination.currentPage} de {pagination.totalPages} 
          ({pagination.totalPosts} {pagination.totalPosts === 1 ? 'post' : 'posts'} no total)
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* Classes utilitárias para truncar texto */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style> 