<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  // Estados
  let lists: any[] = [];
  let templates: any[] = [];
  let loading = false;
  let searchTerm = '';
  let selectedType = '';
  let viewMode: 'grid' | 'list' = 'grid';
  
  // Tipos de eventos
  const eventTypes = [
    { value: '', label: 'Todos os tipos' },
    { value: 'baby_shower', label: '👶 Chá de Bebê' },
    { value: 'wedding', label: '💒 Casamento' },
    { value: 'birthday', label: '🎂 Aniversário' },
    { value: 'anniversary', label: '💍 Bodas' },
    { value: 'graduation', label: '🎓 Formatura' },
    { value: 'housewarming', label: '🏠 Casa Nova' },
    { value: 'custom', label: '🎁 Personalizado' }
  ];

  onMount(() => {
    loadLists();
    loadTemplates();
  });

  async function loadLists() {
    loading = true;
    try {
      const params = new URLSearchParams();
      params.set('public', 'true');
      params.set('limit', '20');
      
      if (selectedType) {
        params.set('type', selectedType);
      }

      const response = await fetch(`/api/gift-lists?${params}`);
      const result = await response.json();
      
      if (result.success) {
        lists = result.data;
      }
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    } finally {
      loading = false;
    }
  }

  async function loadTemplates() {
    try {
      const response = await fetch('/api/gift-lists/templates?limit=6');
      const result = await response.json();
      
      if (result.success) {
        templates = result.data;
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  }

  function handleSearch() {
    // Implementar busca
    loadLists();
  }

  function handleTypeFilter(event: Event) {
    selectedType = (event.target as HTMLSelectElement).value;
    loadLists();
  }

  function formatEventType(type: string) {
    const found = eventTypes.find(t => t.value === type);
    return found ? found.label : type;
  }

  function formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  function getProgressColor(percentage: number) {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }
</script>

<svelte:head>
  <title>Listas de Presentes - Grão de Gente</title>
  <meta name="description" content="Descubra listas de presentes especiais: chá de bebê, casamento, aniversário e muito mais. Contribua para momentos únicos!" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Hero Section -->
  <section class="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 text-white py-16">
    <div class="container mx-auto px-4 text-center">
      <h1 class="text-4xl md:text-6xl font-bold mb-6">
        🎁 Listas de Presentes
      </h1>
      <p class="text-xl md:text-2xl mb-8 opacity-90">
        Momentos especiais merecem presentes especiais
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onclick={() => goto('/listas-presentes/criar')}
          class="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors">
          ✨ Criar Minha Lista
        </button>
        <button 
          onclick={() => document.getElementById('listas-publicas')?.scrollIntoView({ behavior: 'smooth' })}
          class="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition-colors">
          👀 Ver Listas Públicas
        </button>
      </div>
    </div>
  </section>

  <!-- Templates Section -->
  {#if templates.length > 0}
    <section class="py-16">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">
          🎨 Templates Populares
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each templates as template}
            <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <div 
                class="h-32 bg-gradient-to-br from-pink-400 to-purple-500"
                style="background: linear-gradient(135deg, {template.theme_color || '#FF69B4'}, {template.theme_color || '#FF69B4'}88)">
                <div class="h-full flex items-center justify-center text-white text-4xl">
                  {formatEventType(template.type).split(' ')[0]}
                </div>
              </div>
              
              <div class="p-6">
                <h3 class="text-xl font-semibold mb-2">{template.name}</h3>
                <p class="text-gray-600 mb-4 text-sm">{template.description}</p>
                
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>📦 {template.items_count} itens</span>
                  <span>👥 {template.usage_count} usos</span>
                </div>
                
                <button 
                  onclick={() => goto(`/listas-presentes/criar?template=${template.id}`)}
                  class="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Usar Template
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Filtros e Busca -->
  <section id="listas-publicas" class="py-8 bg-white border-b">
    <div class="container mx-auto px-4">
      <div class="flex flex-col lg:flex-row gap-4 items-center">
        <!-- Busca -->
        <div class="flex-1 relative">
          <input
            type="text"
            bind:value={searchTerm}
            placeholder="Buscar por nome, evento ou casal..."
            class="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            onkeydown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>

        <!-- Filtro por tipo -->
        <select 
          bind:value={selectedType}
          onchange={handleTypeFilter}
          class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          {#each eventTypes as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>

        <!-- Modo de visualização -->
        <div class="flex bg-gray-100 rounded-lg p-1">
          <button 
            class="px-4 py-2 rounded-md transition-colors {viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}"
            onclick={() => viewMode = 'grid'}>
            ▦ Grade
          </button>
          <button 
            class="px-4 py-2 rounded-md transition-colors {viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}"
            onclick={() => viewMode = 'list'}>
            ☰ Lista
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Listas Públicas -->
  <section class="py-16">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-12">
        🌟 Listas Públicas Ativas
      </h2>

      {#if loading}
        <div class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p class="mt-4 text-gray-600">Carregando listas...</p>
        </div>
      {:else if lists.length === 0}
        <div class="text-center py-16">
          <div class="text-6xl mb-4">🎁</div>
          <h3 class="text-2xl font-semibold mb-4">Nenhuma lista encontrada</h3>
          <p class="text-gray-600 mb-8">Seja o primeiro a criar uma lista de presentes!</p>
          <button 
            onclick={() => goto('/listas-presentes/criar')}
            class="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
            ✨ Criar Primera Lista
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 {viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-6">
          {#each lists as list}
            <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                 onclick={() => goto(`/listas-presentes/${list.share_token || list.id}`)}>
              
              <!-- Cover Image ou Gradient -->
              <div class="h-48 bg-gradient-to-br from-pink-400 to-purple-500 relative"
                   style="background: {list.cover_image ? `url(${list.cover_image})` : `linear-gradient(135deg, ${list.theme_color || '#FF69B4'}, ${list.theme_color || '#FF69B4'}88)`}; background-size: cover; background-position: center;">
                
                <!-- Overlay com informações -->
                <div class="absolute inset-0 bg-black bg-opacity-30 flex items-end">
                  <div class="p-6 text-white w-full">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-2xl">{formatEventType(list.type).split(' ')[0]}</span>
                      <span class="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                        {formatEventType(list.type).split(' ').slice(1).join(' ')}
                      </span>
                    </div>
                    <h3 class="text-xl font-bold">{list.title}</h3>
                    {#if list.event_date}
                      <p class="text-sm opacity-90">📅 {formatDate(list.event_date)}</p>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- Conteúdo -->
              <div class="p-6">
                <!-- Progresso -->
                <div class="mb-4">
                  <div class="flex justify-between text-sm mb-2">
                    <span class="text-gray-600">Progresso</span>
                    <span class="font-semibold">{list.completion_percentage || 0}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      class="h-3 rounded-full transition-all duration-300 {getProgressColor(list.completion_percentage || 0)}"
                      style="width: {Math.min(list.completion_percentage || 0, 100)}%">
                    </div>
                  </div>
                </div>

                <!-- Estatísticas -->
                <div class="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div class="font-semibold text-lg">{list.total_items || 0}</div>
                    <div class="text-gray-600">Itens</div>
                  </div>
                  <div>
                    <div class="font-semibold text-lg">{list.contribution_count || 0}</div>
                    <div class="text-gray-600">Contribuições</div>
                  </div>
                  <div>
                    <div class="font-semibold text-lg">{list.view_count || 0}</div>
                    <div class="text-gray-600">Visualizações</div>
                  </div>
                </div>

                <!-- Informações do evento -->
                {#if list.description}
                  <p class="text-gray-600 text-sm mt-4 line-clamp-2">{list.description}</p>
                {/if}

                {#if list.event_location}
                  <p class="text-gray-500 text-xs mt-2">📍 {list.event_location}</p>
                {/if}

                <!-- Ação -->
                <div class="mt-6">
                  <button class="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    💝 Ver Lista & Contribuir
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- Call to Action -->
  <section class="py-16 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
    <div class="container mx-auto px-4 text-center">
      <h2 class="text-3xl font-bold mb-6">
        Pronto para criar sua lista especial?
      </h2>
      <p class="text-xl mb-8 opacity-90">
        Facilite a vida de quem quer te presentear e torne seus momentos ainda mais especiais
      </p>
      <button 
        onclick={() => goto('/listas-presentes/criar')}
        class="bg-white text-purple-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors">
        ✨ Criar Minha Lista Agora
      </button>
    </div>
  </section>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style> 