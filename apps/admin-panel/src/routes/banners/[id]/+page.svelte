<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  // UI Components (usando apenas componentes que existem)
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';

  // Form data
  let banner = $state({
    id: '',
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    position: 'home',
    display_order: 0,
    starts_at: '',
    ends_at: '',
    is_active: true,
    countdown_text: '',
    countdown_end_time: '',
    display_duration_minutes: 60,
    auto_rotate: true
  });

  // State
  let isLoading = $state(false);
  let isSaving = $state(false);
  let error = $state('');
  let success = $state('');
  let isEditing = $state(false);

  // Computed
  const bannerId = $derived($page.params.id);
  const isNewBanner = $derived(bannerId === 'novo');

  onMount(async () => {
    if (!isNewBanner) {
      await loadBanner();
    }
  });

  async function loadBanner() {
    isLoading = true;
    error = '';

    try {
      const response = await fetch(`/api/banners?id=${bannerId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao carregar banner');
      }

      if (result.data.length === 0) {
        throw new Error('Banner não encontrado');
      }

      const bannerData = result.data[0];
      
      // Formatar datas para inputs datetime-local
      banner = {
        ...bannerData,
        starts_at: bannerData.starts_at ? new Date(bannerData.starts_at).toISOString().slice(0, 16) : '',
        ends_at: bannerData.ends_at ? new Date(bannerData.ends_at).toISOString().slice(0, 16) : '',
        countdown_end_time: bannerData.countdown_end_time ? new Date(bannerData.countdown_end_time).toISOString().slice(0, 16) : '',
        display_duration_minutes: bannerData.display_duration_minutes || 60
      };

      isEditing = true;

    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
    } finally {
      isLoading = false;
    }
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    saveBanner();
  }

  async function saveBanner() {
    isSaving = true;
    error = '';
    success = '';

    try {
      // Validações
      if (!banner.title.trim()) {
        throw new Error('Título é obrigatório');
      }
      if (!banner.image_url.trim()) {
        throw new Error('URL da imagem é obrigatória');
      }

      // Preparar dados para envio
      const dataToSend = {
        ...banner,
        starts_at: banner.starts_at || null,
        ends_at: banner.ends_at || null,
        countdown_end_time: banner.countdown_end_time || null,
        display_order: parseInt(banner.display_order.toString()) || 0,
        display_duration_minutes: parseInt(banner.display_duration_minutes.toString()) || 60
      };

      const url = isEditing ? `/api/banners?id=${banner.id}` : '/api/banners';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || result.error || 'Erro ao salvar banner');
      }

      success = result.message || `Banner ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;

      // Se for novo banner, redirecionar para edição
      if (!isEditing && result.data?.id) {
        setTimeout(() => {
          goto(`/banners/${result.data.id}`);
        }, 1500);
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
    } finally {
      isSaving = false;
    }
  }

  function handleImagePreview() {
    // Função simples para mostrar preview da imagem
    const img = new Image();
    img.src = banner.image_url;
    img.onload = () => console.log('Imagem válida');
    img.onerror = () => console.warn('URL de imagem inválida');
  }

  // Calcular fim do countdown baseado na duração
  function calculateCountdownEnd() {
    if (banner.display_duration_minutes && !banner.countdown_end_time) {
      const now = new Date();
      const endTime = new Date(now.getTime() + (banner.display_duration_minutes * 60 * 1000));
      banner.countdown_end_time = endTime.toISOString().slice(0, 16);
    }
  }
</script>

<svelte:head>
  <title>{isNewBanner ? 'Novo Banner' : `Editar Banner: ${banner.title}`} - Admin</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
  <div class="max-w-4xl mx-auto">
    
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {isNewBanner ? 'Novo Banner' : 'Editar Banner'}
          </h1>
          <p class="text-gray-600 mt-1">
            {isNewBanner ? 'Criar um novo banner para a home page' : 'Modificar configurações do banner'}
          </p>
        </div>
        
        <Button 
          variant="secondary" 
          onclick={() => goto('/banners')}
        >
          ← Voltar
        </Button>
      </div>
    </div>

    {#if isLoading}
      <div class="flex justify-center py-8">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-2 text-gray-600">Carregando banner...</p>
        </div>
      </div>
    {:else}
      
      <!-- Alerts -->
      {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      {/if}

      <!-- Form -->
      <form onsubmit={handleSubmit}>
        
        <!-- Informações Básicas -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="md:col-span-2">
              <Input
                label="Título *"
                bind:value={banner.title}
                placeholder="Ex: MEGA FLASH SALE! 50% OFF"
                required
              />
            </div>

            <div class="md:col-span-2">
              <Input
                label="Subtítulo"
                bind:value={banner.subtitle}
                placeholder="Ex: Produtos selecionados com desconto especial"
              />
            </div>

            <div class="md:col-span-2">
              <Input
                label="URL da Imagem *"
                bind:value={banner.image_url}
                placeholder="https://exemplo.com/banner.jpg"
                required
              />
              {#if banner.image_url}
                <div class="mt-2">
                  <img 
                    src={banner.image_url} 
                    alt="Preview" 
                    class="max-w-xs h-24 object-cover rounded border"
                    onerror={() => console.warn('Erro ao carregar imagem')}
                  />
                </div>
              {/if}
            </div>

            <Input
              label="Link de Destino"
              bind:value={banner.link_url}
              placeholder="/promocoes/flash-sale"
            />

            <Select
              label="Posição"
              bind:value={banner.position}
              options={[
                { value: 'home', label: 'Home Page' },
                { value: 'category', label: 'Páginas de Categoria' },
                { value: 'delivery', label: 'Entrega Rápida' }
              ]}
            />

            <Input
              type="number"
              label="Ordem de Exibição"
              bind:value={banner.display_order}
              placeholder="0"
              min="0"
            />

            <div>
              <label class="flex items-center space-x-2">
                <input type="checkbox" bind:checked={banner.is_active} class="rounded" />
                <span class="text-sm font-medium text-gray-700">Banner Ativo</span>
              </label>
            </div>

          </div>
        </div>

        <!-- Configurações de Countdown -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Configurações de Countdown</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="md:col-span-2">
              <Input
                label="Texto do Countdown"
                bind:value={banner.countdown_text}
                placeholder="⚡ OFERTA RELÂMPAGO termina em:"
              />
              <p class="text-xs text-gray-500 mt-1">
                Deixe vazio se não quiser countdown. Use emojis para mais impacto!
              </p>
            </div>

            <Input
              type="datetime-local"
              label="Data/Hora de Término"
              bind:value={banner.countdown_end_time}
            />

            <Input
              type="number"
              label="Duração de Exibição (minutos)"
              bind:value={banner.display_duration_minutes}
              placeholder="60"
              min="1"
            />

            <div class="md:col-span-2">
              <label class="flex items-center space-x-2">
                <input type="checkbox" bind:checked={banner.auto_rotate} class="rounded" />
                <span class="text-sm font-medium text-gray-700">Auto-rotação</span>
              </label>
              <p class="text-xs text-gray-500 mt-1">
                Se ativado, o banner rotacionará automaticamente após o tempo de duração
              </p>
            </div>

          </div>
        </div>

        <!-- Agendamento -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Agendamento</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Input
              type="datetime-local"
              label="Início da Exibição"
              bind:value={banner.starts_at}
            />

            <Input
              type="datetime-local"
              label="Fim da Exibição"
              bind:value={banner.ends_at}
            />

            <div class="md:col-span-2">
              <p class="text-xs text-gray-500">
                Deixe vazio para exibir imediatamente e sem data de término
              </p>
            </div>

          </div>
        </div>

        <!-- Preview -->
        {#if banner.title && banner.image_url}
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
            
            <div class="border rounded-lg p-4 bg-gray-50">
              
              <!-- Countdown Preview -->
              {#if banner.countdown_text}
                <div class="bg-black text-white p-3 rounded-t-lg text-center text-sm">
                  {banner.countdown_text} <span class="text-green-400">00:45:32</span>
                </div>
              {/if}

              <!-- Banner Preview -->
              <div class="relative {banner.countdown_text ? 'rounded-b-lg' : 'rounded-lg'} overflow-hidden">
                <img 
                  src={banner.image_url} 
                  alt={banner.title}
                  class="w-full h-48 object-cover"
                />
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <h3 class="font-bold text-lg">{banner.title}</h3>
                  {#if banner.subtitle}
                    <p class="text-sm opacity-90">{banner.subtitle}</p>
                  {/if}
                </div>
              </div>

              <!-- Info Preview -->
              <div class="mt-2 text-xs text-gray-600 space-y-1">
                <p><strong>Posição:</strong> {banner.position}</p>
                <p><strong>Duração:</strong> {banner.display_duration_minutes} minutos</p>
                <p><strong>Auto-rotação:</strong> {banner.auto_rotate ? 'Sim' : 'Não'}</p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex items-center justify-end space-x-4">
          <Button 
            type="button" 
            variant="secondary"
            onclick={() => goto('/banners')}
          >
            Cancelar
          </Button>
          
          <Button 
            type="submit" 
            loading={isSaving}
            disabled={!banner.title || !banner.image_url}
          >
            {isNewBanner ? 'Criar Banner' : 'Salvar Alterações'}
          </Button>
        </div>

      </form>

    {/if}
  </div>
</div>

<style>
  /* Estilos customizados se necessário */
</style> 