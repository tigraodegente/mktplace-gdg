<script lang="ts">
  import { onMount } from 'svelte';
  
  let pages = [];
  let loading = true;
  let showCreateModal = false;
  let editingPage = null;
  let activeTab = 'pages'; // 'pages' ou 'blog'
  
  // Formulário
  let form = {
    title: '',
    slug: '',
    content: '',
    meta_title: '',
    meta_description: '',
    is_published: false
  };
  
  onMount(async () => {
    await loadPages();
  });
  
  async function loadPages() {
    try {
      // TODO: Implementar API para admin buscar todas as páginas
      const response = await fetch('/api/pages?admin=true');
      const result = await response.json();
      if (result.success) {
        pages = result.data;
      }
    } catch (error) {
      console.error('Erro ao carregar páginas:', error);
    } finally {
      loading = false;
    }
  }
  
  function openCreateModal() {
    form = {
      title: '',
      slug: '',
      content: '',
      meta_title: '',
      meta_description: '',
      is_published: false
    };
    editingPage = null;
    showCreateModal = true;
  }
  
  function openCreateBlogModal() {
    form = {
      title: '',
      slug: 'blog/',
      content: '',
      meta_title: '',
      meta_description: '',
      is_published: false
    };
    editingPage = null;
    showCreateModal = true;
  }
  
  function openEditModal(page) {
    form = { ...page };
    editingPage = page;
    showCreateModal = true;
  }
  
  function closeModal() {
    showCreateModal = false;
    editingPage = null;
  }
  
  async function savePage() {
    try {
      const url = editingPage ? `/api/pages/${editingPage.id}` : '/api/pages';
      const method = editingPage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadPages();
        closeModal();
      } else {
        alert('Erro ao salvar página: ' + result.error.message);
      }
    } catch (error) {
      console.error('Erro ao salvar página:', error);
      alert('Erro ao salvar página');
    }
  }
  
  async function deletePage(page) {
    if (!confirm(`Tem certeza que deseja excluir a página "${page.title}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/pages/${page.id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadPages();
      } else {
        alert('Erro ao excluir página: ' + result.error.message);
      }
    } catch (error) {
      console.error('Erro ao excluir página:', error);
      alert('Erro ao excluir página');
    }
  }
  
  function generateSlug() {
    if (!form.title) return;
    
    form.slug = form.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hifens
      .replace(/-+/g, '-') // Remove hifens duplicados
      .trim();
  }
</script>

<svelte:head>
  <title>Gestão de Páginas - Admin</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">📄 Páginas Estáticas</h1>
      <p class="mt-1 text-sm text-gray-600">
        Gerencie as páginas de conteúdo do site
      </p>
    </div>
    
    <button 
      onclick={openCreateModal}
      class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
    >
      ➕ Nova Página
    </button>
    
    <button 
      onclick={openCreateBlogModal}
      class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors ml-2"
    >
      📝 Novo Post do Blog
    </button>
  </div>

  <!-- Lista de páginas -->
  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Carregando páginas...</p>
    </div>
  {:else if pages.length === 0}
    <div class="text-center py-12">
      <div class="text-4xl mb-4">📄</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma página encontrada</h3>
      <p class="text-gray-600 mb-4">Crie sua primeira página estática.</p>
      <button 
        onclick={openCreateModal}
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        ➕ Criar Primeira Página
      </button>
    </div>
  {:else}
    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      <ul class="divide-y divide-gray-200">
        {#each pages as page}
          <li>
            <div class="px-4 py-4 flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <h3 class="text-lg font-medium text-gray-900">
                    {page.title}
                  </h3>
                  <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {page.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    {page.is_published ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <div class="mt-1 flex items-center text-sm text-gray-500">
                  <span>/{page.slug}</span>
                  <span class="mx-2">•</span>
                  <span>Atualizado em {new Date(page.updated_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                {#if page.is_published}
                  <a 
                    href="/{page.slug}" 
                    target="_blank"
                    class="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Ver Página
                  </a>
                {/if}
                <button 
                  onclick={() => openEditModal(page)}
                  class="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  Editar
                </button>
                <button 
                  onclick={() => deletePage(page)}
                  class="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Excluir
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<!-- Modal de criar/editar -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-900">
            {editingPage ? 'Editar Página' : 'Nova Página'}
          </h2>
          <button 
            onclick={closeModal}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onsubmit={(e) => { e.preventDefault(); savePage(); }} class="space-y-6">
          <!-- Título -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input 
              type="text" 
              bind:value={form.title}
              onblur={generateSlug}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <!-- Slug -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              URL (Slug) *
            </label>
            <div class="flex">
              <span class="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                /
              </span>
              <input 
                type="text" 
                bind:value={form.slug}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          <!-- Meta Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Meta Title (SEO)
            </label>
            <input 
              type="text" 
              bind:value={form.meta_title}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Se vazio, será usado o título da página"
            />
          </div>
          
          <!-- Meta Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Meta Description (SEO)
            </label>
            <textarea 
              bind:value={form.meta_description}
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descrição para aparecer nos resultados de busca"
            ></textarea>
          </div>
          
          <!-- Conteúdo -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo (HTML) *
            </label>
            <textarea 
              bind:value={form.content}
              rows="15"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Cole aqui o conteúdo HTML da página..."
              required
            ></textarea>
            <p class="mt-1 text-xs text-gray-500">
              Você pode usar HTML completo. Use classes do Tailwind CSS para estilização.
            </p>
          </div>
          
          <!-- Publicado -->
          <div class="flex items-center">
            <input 
              type="checkbox" 
              bind:checked={form.is_published}
              id="is_published"
              class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="is_published" class="ml-2 text-sm font-medium text-gray-700">
              Publicar página (tornar visível no site)
            </label>
          </div>
          
          <!-- Botões -->
          <div class="flex justify-end space-x-3 pt-6">
            <button 
              type="button"
              onclick={closeModal}
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingPage ? 'Atualizar' : 'Criar'} Página
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if} 