<script lang="ts">
  import type { PageData } from './$types';
  
  let { data }: { data: PageData } = $props();
  
  const { page, meta } = data;
  
  // Função simples para formatar datas
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>{meta.title} - Grão de Gente</title>
  {#if meta.description}
    <meta name="description" content={meta.description} />
  {/if}
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={`https://marketplace-gdg.com/${page.slug}`} />
  
  <!-- Open Graph -->
  <meta property="og:title" content={meta.title} />
  {#if meta.description}
    <meta property="og:description" content={meta.description} />
  {/if}
  <meta property="og:type" content="article" />
  <meta property="og:url" content={`https://marketplace-gdg.com/${page.slug}`} />
</svelte:head>

<div class="min-h-screen bg-white">
  <!-- Container principal -->
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <nav class="mb-8">
      <ol class="flex items-center space-x-2 text-sm">
        <li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
        <li><span class="text-gray-400">/</span></li>
        <li class="text-gray-900 font-medium">{page.title}</li>
      </ol>
    </nav>

    <!-- Header da página -->
    <header class="mb-8 pb-6 border-b border-gray-200">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        {page.title}
      </h1>
      
      <div class="flex items-center text-sm text-gray-600">
        <span>Última atualização: {formatDate(page.updated_at)}</span>
      </div>
    </header>

    <!-- Conteúdo da página -->
    <article class="prose prose-lg prose-gray max-w-none">
      {@html page.content}
    </article>

    <!-- Footer da página -->
    <footer class="mt-12 pt-6 border-t border-gray-200">
      <div class="text-center">
        <p class="text-sm text-gray-600">
          Esta página foi criada em {formatDate(page.created_at)}
          {#if page.updated_at !== page.created_at}
            e atualizada em {formatDate(page.updated_at)}
          {/if}
        </p>
        
        <!-- Botões de ação -->
        <div class="mt-6 flex justify-center gap-4">
          <a 
            href="/suporte" 
            class="inline-flex items-center px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Precisa de ajuda?
          </a>
          
          <a 
            href="/" 
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Voltar ao início
          </a>
        </div>
      </div>
    </footer>
  </div>
</div>

<style>
  /* Estilos para o conteúdo prose */
  :global(.prose h1) {
    @apply text-3xl font-bold text-gray-900 mb-6;
  }
  
  :global(.prose h2) {
    @apply text-2xl font-semibold text-gray-900 mb-4 mt-8;
  }
  
  :global(.prose h3) {
    @apply text-xl font-semibold text-gray-900 mb-3 mt-6;
  }
  
  :global(.prose p) {
    @apply text-gray-700 leading-relaxed mb-4;
  }
  
  :global(.prose ul) {
    @apply list-disc list-inside text-gray-700 mb-4 space-y-2;
  }
  
  :global(.prose ol) {
    @apply list-decimal list-inside text-gray-700 mb-4 space-y-2;
  }
  
  :global(.prose li) {
    @apply leading-relaxed;
  }
  
  :global(.prose a) {
    @apply text-[#00BFB3] hover:text-[#00A89D] underline transition-colors;
  }
  
  :global(.prose blockquote) {
    @apply border-l-4 border-[#00BFB3] pl-4 italic text-gray-600 my-6;
  }
  
  :global(.prose strong) {
    @apply font-semibold text-gray-900;
  }
  
  :global(.prose em) {
    @apply italic;
  }
  
  :global(.prose code) {
    @apply bg-gray-100 px-2 py-1 rounded text-sm font-mono;
  }
  
  :global(.prose pre) {
    @apply bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4;
  }
  
  :global(.prose table) {
    @apply w-full border-collapse border border-gray-300 mb-4;
  }
  
  :global(.prose th) {
    @apply border border-gray-300 px-4 py-2 bg-gray-50 font-semibold text-left;
  }
  
  :global(.prose td) {
    @apply border border-gray-300 px-4 py-2;
  }
  
  :global(.prose img) {
    @apply max-w-full h-auto rounded-lg shadow-sm my-6;
  }
  
  :global(.prose hr) {
    @apply border-gray-200 my-8;
  }
</style> 