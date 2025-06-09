<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/toast';
  
  // Types
  interface PageBuilderPage {
    id: string;
    title: string;
    template: string;
    isPublished: boolean;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
  }
  
  interface PageTemplate {
    id: string;
    name: string;
    displayName: string;
    description: string;
    isSystem: boolean;
  }
  
  // State - sempre inicializar como array vazio
  let pages = $state<PageBuilderPage[]>([]);
  let templates = $state<PageTemplate[]>([]);
  let loading = $state(true);
  let selectedPages = $state<string[]>([]);
  let bulkAction = $state('');
  
  // Estados do dialog de confirmação
  let showConfirmDialog = $state(false);
  let confirmDialogConfig = $state({
    title: '',
    message: '',
    variant: 'danger' as 'danger' | 'warning' | 'info',
    onConfirm: () => {}
  });
  
  // Filters - usando localStorage como a página de produtos
  let searchTerm = $state('');
  let selectedTemplate = $state('all');
  let selectedStatus = $state('all');
  let showFilters = $state(true);
  let showStats = $state(true);
  
  // Pagination
  let currentPage = $state(1);
  let totalPages = $state(1);
  let totalItems = $state(0);
  const itemsPerPage = 20;
  
  // Stats
  let stats = $state({
    total: 0,
    published: 0,
    draft: 0,
    templates: 0
  });
  
  // Flag para controlar quando pode executar effects
  let initialLoadDone = $state(false);
  
  // Debounced search - só executar após carga inicial
  let searchTimeout: NodeJS.Timeout;
  $effect(() => {
    if (initialLoadDone && searchTerm !== '') {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadPages();
      }, 500);
    }
  });
  
  // Watch filters - só executar após carga inicial
  $effect(() => {
    if (initialLoadDone && ((selectedTemplate && selectedTemplate !== 'all') || (selectedStatus && selectedStatus !== 'all'))) {
      currentPage = 1;
      loadPages();
    }
  });
  
  // localStorage persistence - mesmo padrão da página de produtos
  onMount(async () => {
    try {
      showFilters = localStorage.getItem('pagebuilder_show_filters') !== 'false';
      showStats = localStorage.getItem('pagebuilder_show_stats') !== 'false';
      
      // Carregar dados iniciais
      await loadPages();
      initialLoadDone = true; // Habilitar effects após primeira carga
      
      await loadTemplates();
      
      // Adicionar funções globais para os botões de ação
      (window as any).handlePageEdit = (id: string) => handleEdit({ id } as any);
      (window as any).handlePagePreview = (id: string) => handlePreview({ id } as any);
      (window as any).handlePageDelete = (id: string, title: string) => handleDelete({ id, title } as any);
    } catch (error) {
      console.error('❌ [PAGE BUILDER] Erro no onMount:', error);
      initialLoadDone = true; // Habilitar effects mesmo com erro
    }
  });
  
  $effect(() => {
    localStorage.setItem('pagebuilder_show_filters', showFilters.toString());
    localStorage.setItem('pagebuilder_show_stats', showStats.toString());
  });
  
  async function loadPages(): Promise<void> {
    try {
      loading = true;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        template: selectedTemplate === 'all' ? '' : selectedTemplate,
        status: selectedStatus === 'all' ? '' : selectedStatus
      });
      
      const response = await fetch(`/api/pages?${params}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Garantir que pages é sempre um array
        pages = Array.isArray(result.data.pages) ? result.data.pages : [];
        
        // Converter strings para números se necessário
        const apiStats = result.data.stats || {};
        stats = { 
          total: Number(apiStats.total) || 0, 
          published: Number(apiStats.published) || 0, 
          draft: Number(apiStats.draft) || 0, 
          templates: 0 
        };
        totalItems = result.data.pagination?.total || 0;
        totalPages = result.data.pagination?.totalPages || 1;
      } else {
        // Se não houver sucesso, garantir array vazio
        pages = [];
        console.warn('🚨 [PAGE BUILDER] API não retornou dados válidos');
      }
    } catch (error) {
      console.error('❌ [PAGE BUILDER] Erro ao carregar páginas:', error);
      pages = []; // Garantir array vazio em caso de erro
      toast.error('Erro ao carregar páginas');
    } finally {
      loading = false;
    }
  }
  
  async function loadTemplates() {
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();
      
      if (result.success) {
        templates = result.data || [];
        stats.templates = templates.length;
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  }
  
  // Actions - mesmo padrão da página de produtos
  function handleEdit(page: PageBuilderPage) {
    goto(`/paginas/builder/${page.id}`);
  }
  
  function handlePreview(page: PageBuilderPage) {
    window.open(`/preview/${page.id}`, '_blank');
  }
  
  function handleDuplicate(page: PageBuilderPage) {
    goto(`/paginas/builder/novo?template=${page.id}`);
  }
  
  async function handleDelete(page: PageBuilderPage) {
    confirmDialogConfig = {
      title: 'Excluir página',
      message: `Tem certeza que deseja excluir a página "${page.title}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/pages', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: page.id })
          });
          
          if (response.ok) {
            toast.success('Página excluída com sucesso');
            loadPages();
          } else {
            toast.error('Erro ao excluir página');
          }
        } catch (error) {
          toast.error('Erro ao excluir página');
        }
      }
    };
    showConfirmDialog = true;
  }
  
  async function handleBulkDelete() {
    if (selectedPages.length === 0) return;
    
    confirmDialogConfig = {
      title: 'Excluir páginas',
      message: `Tem certeza que deseja excluir ${selectedPages.length} página(s) selecionada(s)?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const promises = selectedPages.map(id => 
            fetch('/api/pages', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
            })
          );
          
          await Promise.all(promises);
          toast.success(`${selectedPages.length} página(s) excluída(s) com sucesso`);
          selectedPages = [];
          loadPages();
        } catch (error) {
          toast.error('Erro ao excluir páginas');
        }
      }
    };
    showConfirmDialog = true;
  }
  
  // Colunas da tabela - com ações inline
  const columns = [
    { key: 'title', label: 'Título', sortable: true },
    { 
      key: 'template', 
      label: 'Template', 
      sortable: true,
      render: (value: string) => `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${value}</span>`
    },
    { 
      key: 'isPublished', 
      label: 'Status', 
      sortable: true,
      render: (value: boolean) => {
        const status = value ? 'Publicada' : 'Rascunho';
        const bgColor = value ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}">${status}</span>`;
      }
    },
    { 
      key: 'updatedAt', 
      label: 'Atualizado', 
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    { 
      key: 'id', 
      label: 'Ações', 
      sortable: false,
      render: (value: string, row: any) => `
        <div class="flex items-center gap-1">
          <button onclick="window.handlePageEdit('${row.id}')" class="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
            ✏️
          </button>
          <button onclick="window.handlePagePreview('${row.id}')" class="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Visualizar">
            👁️
          </button>
          <button onclick="window.handlePageDelete('${row.id}', '${row.title.replace(/'/g, "\\\'")}')" class="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Excluir">
            🗑️
          </button>
        </div>
      `
    }
  ];

  // Actions para cada linha
  function getActions(page: PageBuilderPage) {
    return [
      {
        label: 'Editar',
        icon: 'edit',
        onclick: () => handleEdit(page),
        variant: 'ghost' as const
      },
      {
        label: 'Visualizar',
        icon: 'eye',
        onclick: () => handlePreview(page),
        variant: 'ghost' as const
      },
      {
        label: 'Duplicar',
        icon: 'copy',
        onclick: () => handleDuplicate(page),
        variant: 'ghost' as const
      },
      {
        label: 'Excluir',
        icon: 'trash',
        onclick: () => handleDelete(page),
        variant: 'danger' as const
      }
    ];
  }
  
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
  
  function clearFilters() {
    searchTerm = '';
    selectedTemplate = 'all';
    selectedStatus = 'all';
  }
  
  function getActiveFiltersCount() {
    let count = 0;
    if (searchTerm) count++;
    if (selectedTemplate !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    return count;
  }
</script>

<!-- Mesma estrutura da página de produtos -->
<AdminPageTemplate title="Page Builder" subtitle="Crie páginas profissionais com arrastar e soltar">
  <svelte:fragment slot="actions">
    <Button 
      onclick={() => goto('/paginas/builder/novo')}
      style="background-color: #00BFB3; border-color: #00BFB3; color: white;"
      class="hover:bg-opacity-90"
    >
      <ModernIcon name="plus" class="w-4 h-4 mr-2" />
      Nova Página
    </Button>
  </svelte:fragment>

  <!-- Cards de Estatísticas - igual à página de produtos -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <div class="p-4 border-b border-gray-200">
      <button 
        onclick={() => showStats = !showStats}
        class="flex items-center justify-between w-full text-left"
      >
        <h3 class="text-lg font-semibold text-gray-900">Estatísticas</h3>
        <ModernIcon 
          name={showStats ? "chevron-up" : "chevron-down"} 
          class="w-5 h-5 text-gray-500"
        />
      </button>
    </div>
    
    {#if showStats}
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 rounded-lg">
                <ModernIcon name="file-text" class="w-6 h-6 text-blue-600" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Total de Páginas</p>
                <p class="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-green-50 rounded-lg p-4">
            <div class="flex items-center">
              <div class="p-2 bg-green-100 rounded-lg">
                <ModernIcon name="check-circle" class="w-6 h-6 text-green-600" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Publicadas</p>
                <p class="text-2xl font-bold text-gray-900">{stats.published}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-yellow-50 rounded-lg p-4">
            <div class="flex items-center">
              <div class="p-2 bg-yellow-100 rounded-lg">
                <ModernIcon name="edit" class="w-6 h-6 text-yellow-600" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Rascunhos</p>
                <p class="text-2xl font-bold text-gray-900">{stats.draft}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-purple-50 rounded-lg p-4">
            <div class="flex items-center">
              <div class="p-2 bg-purple-100 rounded-lg">
                <ModernIcon name="layout" class="w-6 h-6 text-purple-600" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Templates</p>
                <p class="text-2xl font-bold text-gray-900">{stats.templates}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Filtros - igual à página de produtos -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <div class="p-4 border-b border-gray-200">
      <button 
        onclick={() => showFilters = !showFilters}
        class="flex items-center justify-between w-full text-left"
      >
        <div class="flex items-center">
          <h3 class="text-lg font-semibold text-gray-900">Filtros</h3>
          {#if getActiveFiltersCount() > 0}
            <span class="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {getActiveFiltersCount()} ativo(s)
            </span>
          {/if}
        </div>
        <ModernIcon 
          name={showFilters ? "chevron-up" : "chevron-down"} 
          class="w-5 h-5 text-gray-500"
        />
      </button>
    </div>
    
    {#if showFilters}
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input 
              type="text" 
              id="search"
              bind:value={searchTerm}
              placeholder="Digite para buscar..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="template" class="block text-sm font-medium text-gray-700 mb-1">Template</label>
            <select 
              id="template"
              bind:value={selectedTemplate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Templates</option>
              {#each templates as template}
                <option value={template.name}>{template.displayName}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <label for="status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              id="status"
              bind:value={selectedStatus}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="published">Publicadas</option>
              <option value="draft">Rascunhos</option>
            </select>
          </div>
        </div>
        
        {#if getActiveFiltersCount() > 0}
          <div class="mt-4">
            <Button 
              onclick={clearFilters}
              variant="outline"
              size="sm"
              class="text-gray-600"
            >
              <ModernIcon name="x" class="w-4 h-4 mr-1" />
              Limpar Filtros
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- DataTable - simplificado para funcionar -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    {#if selectedPages.length > 0}
      <div class="p-4 border-b border-gray-200 bg-blue-50">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">
            {selectedPages.length} item(s) selecionado(s)
          </span>
          <Button 
            onclick={handleBulkDelete}
            variant="outline" 
            size="sm"
            class="text-red-600 border-red-200 hover:bg-red-50"
          >
            <ModernIcon name="trash" class="w-4 h-4 mr-1" />
            Excluir Selecionados
          </Button>
        </div>
      </div>
    {/if}
    
    <DataTable 
      {loading}
      data={Array.isArray(pages) ? pages : []}
      {columns}
      bind:selectedIds={selectedPages}
      page={currentPage}
      pageSize={itemsPerPage}
      {totalItems}
      onPageChange={(page) => currentPage = page}
      selectable={true}
    />
  </div>
</AdminPageTemplate>

<!-- Dialog de Confirmação -->
<ConfirmDialog
  show={showConfirmDialog}
  title={confirmDialogConfig.title}
  message={confirmDialogConfig.message}
  variant={confirmDialogConfig.variant}
  confirmText="Excluir"
  cancelText="Cancelar"
  onConfirm={confirmDialogConfig.onConfirm}
  onCancel={() => showConfirmDialog = false}
/> 