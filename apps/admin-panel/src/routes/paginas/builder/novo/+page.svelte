<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/toast';
  
  // Types de blocos
  type BlockType = 'text' | 'hero' | 'features' | 'gallery' | 'testimonials' | 'contact-form' | 'cta' | 'divider';
  
  interface ContentBlock {
    id: string;
    type: BlockType;
    content: Record<string, any>;
    styling: Record<string, any>;
    order: number;
  }
  
  interface PageData {
    id?: string;
    title: string;
    slug: string;
    template: string;
    contentBlocks: ContentBlock[];
    isPublished: boolean;
  }
  
  // State
  let pageData: PageData = {
    title: '',
    slug: '',
    template: 'default',
    contentBlocks: [],
    isPublished: false
  };
  
  let selectedBlockId = $state<string | null>(null);
  let draggedBlockType = $state<BlockType | null>(null);
  let previewMode = $state<'desktop' | 'tablet' | 'mobile'>('desktop');
  let showPreview = $state(false);
  let saving = $state(false);
  
  // Definições de blocos disponíveis
  const blockTypes: Array<{
    type: BlockType;
    name: string;
    description: string;
    icon: string;
    defaultContent: Record<string, any>;
  }> = [
    {
      type: 'text',
      name: 'Texto',
      description: 'Parágrafo de texto simples',
      icon: 'type',
      defaultContent: { html: '<p>Seu texto aqui...</p>' }
    },
    {
      type: 'hero',
      name: 'Hero Section',
      description: 'Seção principal com título e call-to-action',
      icon: 'star',
      defaultContent: {
        title: 'Título Principal',
        subtitle: 'Subtítulo do seu site',
        ctaText: 'Call to Action',
        ctaLink: '#'
      }
    },
    {
      type: 'features',
      name: 'Recursos',
      description: 'Lista de recursos ou características',
      icon: 'grid',
      defaultContent: {
        title: 'Nossos Recursos',
        items: [
          { title: 'Recurso 1', description: 'Descrição do recurso 1' },
          { title: 'Recurso 2', description: 'Descrição do recurso 2' },
          { title: 'Recurso 3', description: 'Descrição do recurso 3' }
        ]
      }
    },
    {
      type: 'gallery',
      name: 'Galeria',
      description: 'Galeria de imagens',
      icon: 'image',
      defaultContent: {
        images: [],
        layout: 'grid',
        columns: 3
      }
    },
    {
      type: 'testimonials',
      name: 'Depoimentos',
      description: 'Depoimentos de clientes',
      icon: 'quote',
      defaultContent: {
        title: 'O que nossos clientes dizem',
        items: [
          { name: 'João Silva', role: 'CEO', content: 'Excelente serviço!' }
        ]
      }
    },
    {
      type: 'contact-form',
      name: 'Formulário',
      description: 'Formulário de contato',
      icon: 'mail',
      defaultContent: {
        title: 'Entre em contato',
        fields: ['name', 'email', 'message']
      }
    },
    {
      type: 'cta',
      name: 'Call to Action',
      description: 'Seção de chamada para ação',
      icon: 'arrow-right',
      defaultContent: {
        title: 'Pronto para começar?',
        description: 'Junte-se a milhares de clientes satisfeitos',
        buttonText: 'Começar Agora',
        buttonLink: '#'
      }
    },
    {
      type: 'divider',
      name: 'Divisor',
      description: 'Linha divisória entre seções',
      icon: 'minus',
      defaultContent: {
        style: 'line',
        spacing: 'medium'
      }
    }
  ];
  
  onMount(() => {
    // Verificar se é edição ou duplicação
    const templateId = $page.url.searchParams.get('template');
    if (templateId) {
      loadTemplate(templateId);
    }
    
    // Auto-gerar slug ao digitar título
    $effect(() => {
      if (pageData.title && !pageData.slug) {
        pageData.slug = generateSlug(pageData.title);
      }
    });
  });
  
  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-'); // Substitui espaços por hífens
  }
  
  async function loadTemplate(templateId: string) {
    try {
      const response = await fetch(`/api/pages/${templateId}`);
      const result = await response.json();
      
      if (result.success) {
        const template = result.data;
        pageData = {
          ...pageData,
          title: `${template.title} (cópia)`,
          slug: `${template.slug}-copia`,
          contentBlocks: template.contentBlocks || []
        };
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
    }
  }
  
  function addBlock(blockType: BlockType) {
    const blockConfig = blockTypes.find(b => b.type === blockType);
    if (!blockConfig) return;
    
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type: blockType,
      content: { ...blockConfig.defaultContent },
      styling: {},
      order: pageData.contentBlocks.length
    };
    
    pageData.contentBlocks = [...pageData.contentBlocks, newBlock];
    selectedBlockId = newBlock.id;
  }
  
  function selectBlock(blockId: string) {
    selectedBlockId = selectedBlockId === blockId ? null : blockId;
  }
  
  function deleteBlock(blockId: string) {
    pageData.contentBlocks = pageData.contentBlocks.filter(b => b.id !== blockId);
    if (selectedBlockId === blockId) {
      selectedBlockId = null;
    }
    reorderBlocks();
  }
  
  function duplicateBlock(blockId: string) {
    const block = pageData.contentBlocks.find(b => b.id === blockId);
    if (!block) return;
    
    const newBlock: ContentBlock = {
      ...block,
      id: crypto.randomUUID(),
      order: block.order + 1
    };
    
    const index = pageData.contentBlocks.findIndex(b => b.id === blockId);
    pageData.contentBlocks = [
      ...pageData.contentBlocks.slice(0, index + 1),
      newBlock,
      ...pageData.contentBlocks.slice(index + 1)
    ];
    
    reorderBlocks();
  }
  
  function moveBlock(blockId: string, direction: 'up' | 'down') {
    const index = pageData.contentBlocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pageData.contentBlocks.length) return;
    
    const blocks = [...pageData.contentBlocks];
    [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
    pageData.contentBlocks = blocks;
    reorderBlocks();
  }
  
  function reorderBlocks() {
    pageData.contentBlocks = pageData.contentBlocks.map((block, index) => ({
      ...block,
      order: index
    }));
  }
  
  async function savePage(publish = false) {
    if (!pageData.title || !pageData.slug) {
      toast.error('Título e slug são obrigatórios');
      return;
    }
    
    try {
      saving = true;
      
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pageData,
          isPublished: publish,
          content: JSON.stringify(pageData.contentBlocks) // Compatibilidade
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(publish ? 'Página publicada com sucesso!' : 'Página salva como rascunho!');
        goto('/paginas/builder');
      } else {
        toast.error(result.error || 'Erro ao salvar página');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar página');
    } finally {
      saving = false;
    }
  }
  
  function getPreviewSize() {
    return {
      desktop: 'w-full',
      tablet: 'w-[768px] mx-auto',
      mobile: 'w-[375px] mx-auto'
    }[previewMode];
  }
</script>

<AdminPageTemplate title="Editor de Páginas" subtitle="Crie sua página com arrastar e soltar">
  <svelte:fragment slot="actions">
    <div class="flex items-center gap-2">
      <!-- Preview Mode Selector -->
      <div class="flex items-center border border-gray-300 rounded-lg bg-white">
        <button
          onclick={() => previewMode = 'desktop'}
          class="p-2 {previewMode === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'} hover:bg-gray-50 rounded-l-lg"
          title="Desktop"
        >
          <ModernIcon name="monitor" class="w-4 h-4" />
        </button>
        <button
          onclick={() => previewMode = 'tablet'}
          class="p-2 {previewMode === 'tablet' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'} hover:bg-gray-50"
          title="Tablet"
        >
          <ModernIcon name="tablet" class="w-4 h-4" />
        </button>
        <button
          onclick={() => previewMode = 'mobile'}
          class="p-2 {previewMode === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'} hover:bg-gray-50 rounded-r-lg"
          title="Mobile"
        >
          <ModernIcon name="smartphone" class="w-4 h-4" />
        </button>
      </div>
      
      <Button onclick={() => showPreview = !showPreview} variant="outline">
        <ModernIcon name="eye" class="w-4 h-4 mr-2" />
        {showPreview ? 'Fechar Preview' : 'Preview'}
      </Button>
      
      <Button onclick={() => savePage(false)} variant="outline" disabled={saving}>
        <ModernIcon name="save" class="w-4 h-4 mr-2" />
        Salvar Rascunho
      </Button>
      
      <Button 
        onclick={() => savePage(true)} 
        disabled={saving}
        style="background-color: #00BFB3; border-color: #00BFB3; color: white;"
        class="hover:bg-opacity-90"
      >
        <ModernIcon name="upload" class="w-4 h-4 mr-2" />
        Publicar
      </Button>
    </div>
  </svelte:fragment>

  <div class="flex h-screen max-h-[calc(100vh-200px)]">
    <!-- Sidebar - Configurações e Blocos -->
    <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
      <!-- Configurações da Página -->
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Configurações da Página</h3>
        
        <div class="space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              id="title"
              bind:value={pageData.title}
              placeholder="Título da página"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="slug" class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              id="slug"
              bind:value={pageData.slug}
              placeholder="url-da-pagina"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="template" class="block text-sm font-medium text-gray-700 mb-1">Template</label>
            <select
              id="template"
              bind:value={pageData.template}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">Página Padrão</option>
              <option value="landing">Landing Page</option>
              <option value="blog_post">Post de Blog</option>
              <option value="contact">Página de Contato</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Biblioteca de Blocos -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Blocos Disponíveis</h3>
          
          <div class="space-y-2">
            {#each blockTypes as blockType}
              <div
                class="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                onclick={() => addBlock(blockType.type)}
                draggable="true"
                ondragstart={() => draggedBlockType = blockType.type}
              >
                <div class="flex items-center">
                  <div class="p-2 bg-gray-100 rounded-lg mr-3">
                    <ModernIcon name={blockType.icon} class="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{blockType.name}</div>
                    <div class="text-sm text-gray-500">{blockType.description}</div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Área Principal - Editor -->
    <div class="flex-1 bg-gray-50 overflow-y-auto">
      <div class="p-6">
        <!-- Preview Area -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px] {getPreviewSize()}">
          {#if pageData.contentBlocks.length === 0}
            <!-- Estado Vazio -->
            <div class="flex flex-col items-center justify-center h-96 text-gray-500">
              <ModernIcon name="layout" class="w-16 h-16 mb-4" />
              <h3 class="text-lg font-semibold mb-2">Sua página está vazia</h3>
              <p class="text-center">Arraste blocos da sidebar ou clique neles para começar a criar sua página</p>
            </div>
          {:else}
            <!-- Render dos Blocos -->
            {#each pageData.contentBlocks.sort((a, b) => a.order - b.order) as block (block.id)}
              <div
                class="relative group border-2 border-transparent hover:border-blue-300 {selectedBlockId === block.id ? 'border-blue-500' : ''}"
                onclick={() => selectBlock(block.id)}
              >
                <!-- Block Content -->
                <div class="p-4">
                  {#if block.type === 'text'}
                    <div class="prose max-w-none">
                      {@html block.content.html || '<p>Texto vazio</p>'}
                    </div>
                  {:else if block.type === 'hero'}
                    <div class="text-center py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
                      <h1 class="text-4xl font-bold mb-4">{block.content.title || 'Título'}</h1>
                      {#if block.content.subtitle}
                        <p class="text-xl mb-8">{block.content.subtitle}</p>
                      {/if}
                      {#if block.content.ctaText}
                        <button class="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold">
                          {block.content.ctaText}
                        </button>
                      {/if}
                    </div>
                  {:else if block.type === 'features'}
                    <div class="py-8">
                      {#if block.content.title}
                        <h2 class="text-3xl font-bold text-center mb-8">{block.content.title}</h2>
                      {/if}
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {#each block.content.items || [] as item}
                          <div class="text-center p-6 bg-gray-50 rounded-lg">
                            <h3 class="text-xl font-semibold mb-2">{item.title}</h3>
                            <p class="text-gray-600">{item.description}</p>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {:else if block.type === 'cta'}
                    <div class="text-center py-16 bg-gray-900 text-white rounded-lg">
                      <h2 class="text-3xl font-bold mb-4">{block.content.title || 'Call to Action'}</h2>
                      {#if block.content.description}
                        <p class="text-xl mb-8">{block.content.description}</p>
                      {/if}
                      {#if block.content.buttonText}
                        <button class="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg">
                          {block.content.buttonText}
                        </button>
                      {/if}
                    </div>
                  {:else if block.type === 'divider'}
                    <div class="py-8 flex justify-center">
                      <div class="w-full h-px bg-gray-300"></div>
                    </div>
                  {:else}
                    <!-- Placeholder para outros tipos -->
                    <div class="p-8 bg-gray-100 rounded-lg text-center">
                      <ModernIcon name="box" class="w-8 h-8 mx-auto mb-2 text-gray-500" />
                      <p class="text-gray-600">Bloco do tipo: {block.type}</p>
                    </div>
                  {/if}
                </div>
                
                <!-- Block Controls -->
                {#if selectedBlockId === block.id}
                  <div class="absolute top-2 right-2 flex items-center space-x-1 bg-white rounded-lg shadow-lg border p-1">
                    <button
                      onclick={() => moveBlock(block.id, 'up')}
                      class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Mover para cima"
                    >
                      <ModernIcon name="chevron-up" class="w-4 h-4" />
                    </button>
                    <button
                      onclick={() => moveBlock(block.id, 'down')}
                      class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Mover para baixo"
                    >
                      <ModernIcon name="chevron-down" class="w-4 h-4" />
                    </button>
                    <button
                      onclick={() => duplicateBlock(block.id)}
                      class="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Duplicar"
                    >
                      <ModernIcon name="copy" class="w-4 h-4" />
                    </button>
                    <button
                      onclick={() => deleteBlock(block.id)}
                      class="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Excluir"
                    >
                      <ModernIcon name="trash" class="w-4 h-4" />
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>
</AdminPageTemplate> 