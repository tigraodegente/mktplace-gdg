<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
	import { isAuthenticated, user } from '$lib/stores/authStore';
  
	// Estados principais
  let lists: any[] = [];
  let templates: any[] = [];
	let myLists: any[] = [];
  let loading = false;
  let searchTerm = '';
  let selectedType = '';
	let mostrarMais = false;
	
	// Sistema de Tabs
	type TabType = 'create' | 'public' | 'my';
	let activeTab: TabType = 'create';
  
  // Tipos de eventos
  const eventTypes = [
    { value: '', label: 'Todos os tipos' },
		{ value: 'baby_shower', label: 'Chá de Bebê' },
		{ value: 'wedding', label: 'Casamento' },
		{ value: 'birthday', label: 'Aniversário' },
		{ value: 'anniversary', label: 'Bodas' },
		{ value: 'graduation', label: 'Formatura' },
		{ value: 'housewarming', label: 'Casa Nova' },
		{ value: 'custom', label: 'Personalizado' }
	];

	// Configuração dos tabs
	const tabs = [
		{
			id: 'create' as TabType,
			label: 'Criar Lista',
			icon: '✨',
			description: 'Crie sua lista personalizada'
		},
		{
			id: 'public' as TabType,
			label: 'Listas Públicas',
			icon: '🌟',
			description: 'Contribua para listas ativas'
		},
		{
			id: 'my' as TabType,
			label: 'Minhas Listas',
			icon: '📋',
			description: 'Gerencie suas listas',
			authRequired: true
		}
  ];

  onMount(() => {
    loadTemplates();
		if (activeTab === 'public') loadPublicLists();
		if (activeTab === 'my' && $isAuthenticated) loadMyLists();
  });

	// Carregar templates
	async function loadTemplates() {
		try {
			const response = await fetch('/api/gift-lists/templates?limit=8');
			const result = await response.json();
			
			if (result.success) {
				templates = result.data;
			}
		} catch (error) {
			console.error('Erro ao carregar templates:', error);
		}
	}

	// Carregar listas públicas
	async function loadPublicLists() {
    loading = true;
    try {
      const params = new URLSearchParams();
      params.set('public', 'true');
			params.set('limit', '12');
      
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

	// Carregar minhas listas
	async function loadMyLists() {
		if (!$isAuthenticated) return;
		
		loading = true;
		try {
			const params = new URLSearchParams();
			params.set('owner', 'true');
			params.set('limit', '12');

			const response = await fetch(`/api/gift-lists?${params}`);
      const result = await response.json();
      
      if (result.success) {
				myLists = result.data;
      }
    } catch (error) {
			console.error('Erro ao carregar minhas listas:', error);
		} finally {
			loading = false;
		}
	}

	// Trocar tab
	function changeTab(tabId: TabType) {
		const tab = tabs.find(t => t.id === tabId);
		
		// Verificar autenticação se necessário
		if (tab?.authRequired && !$isAuthenticated) {
			goto('/login?redirect=/listas-presentes');
			return;
		}
		
		activeTab = tabId;
		
		// Carregar dados do tab ativo
		if (tabId === 'public') {
			loadPublicLists();
		} else if (tabId === 'my' && $isAuthenticated) {
			loadMyLists();
    }
  }

  function handleSearch() {
		if (activeTab === 'public') {
			loadPublicLists();
		}
  }

  function handleTypeFilter(event: Event) {
    selectedType = (event.target as HTMLSelectElement).value;
		if (activeTab === 'public') {
			loadPublicLists();
		}
	}

	function toggleMostrarMais() {
		mostrarMais = !mostrarMais;
  }

  function formatEventType(type: string) {
    const found = eventTypes.find(t => t.value === type);
    return found ? found.label : type;
  }

  function formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
</script>

<svelte:head>
	<title>Listas de Presentes - Grão de Gente Marketplace</title>
	<meta name="description" content="Crie sua lista personalizada, explore templates ou contribua para listas públicas de ocasiões especiais." />
	<meta name="keywords" content="lista de presentes, chá de bebê, casamento, aniversário, presentes personalizados, grão de gente" />
</svelte:head>

<!-- Conteúdo Principal -->
<main class="py-6">
	<div class="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Header Padrão do Projeto -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6" style="font-family: 'Lato', sans-serif;">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
						</svg>
					</div>
					<div>
						<h1 class="text-2xl sm:text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">Listas de Presentes</h1>
						<p class="mt-1 text-gray-600 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">
							Crie, compartilhe e contribua para momentos especiais
						</p>
					</div>
				</div>
				
				<a 
					href="/" 
					class="text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm sm:text-base px-4 py-2 sm:px-0 sm:py-0 bg-[#00BFB3]/5 sm:bg-transparent rounded-lg sm:rounded-none"
					style="font-family: 'Lato', sans-serif;"
				>
					<span class="sm:hidden">Voltar</span>
					<span class="hidden sm:inline">← Continuar Comprando</span>
				</a>
			</div>
			
			<!-- Descrição expandível -->
			<div class="mt-6 pt-6 border-t border-gray-200">
				<div class="text-center">
					<p class="text-gray-600 text-base leading-relaxed" style="font-family: 'Lato', sans-serif;">
						Momentos especiais merecem presentes especiais! Crie sua lista personalizada para chá de bebê, 
						casamento, aniversário ou qualquer ocasião única.
					</p>
				</div>
			</div>
		</div>
		<!-- Sistema de Tabs -->
		<div class="mb-6 sm:mb-8">
			<!-- Tabs Navigation -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
				<nav class="flex space-x-4 sm:space-x-8 overflow-x-auto">
					{#each tabs as tab}
						<button
							onclick={() => changeTab(tab.id)}
							class="flex items-center gap-2 sm:gap-3 py-3 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors whitespace-nowrap touch-manipulation {
								activeTab === tab.id
									? 'border-[#00BFB3] text-[#00BFB3]'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}"
							style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
						>
							<!-- Ícones SVG ao invés de emojis -->
							{#if tab.id === 'create'}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
								</svg>
							{:else if tab.id === 'public'}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							{:else if tab.id === 'my'}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
								</svg>
							{/if}
							
							<div class="flex flex-col items-start">
								<span class="text-sm sm:text-base">{tab.label}</span>
								<span class="text-xs text-gray-400 hidden lg:block">{tab.description}</span>
							</div>
						</button>
					{/each}
				</nav>
			</div>

			<!-- Tab Content -->
			<div class="min-h-[400px]">
				<!-- Tab: Criar Lista -->
				{#if activeTab === 'create'}
					<div class="space-y-6 sm:space-y-8">
						<!-- CTA Principal -->
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
							<div class="text-center border-l-4 border-[#00BFB3] pl-4 sm:pl-6 bg-[#00BFB3]/5 rounded-r-lg py-4 sm:py-6">
								<div class="w-12 h-12 sm:w-16 sm:h-16 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg class="h-6 w-6 sm:h-8 sm:w-8 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
									</svg>
								</div>
								
								<h2 class="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4" style="font-family: 'Lato', sans-serif;">
									Crie sua Lista Personalizada
								</h2>
								
								<p class="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed px-2" style="font-family: 'Lato', sans-serif;">
									Escolha um template pronto ou comece do zero. Facilite a vida de quem quer te presentear!
								</p>
								
								<div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-sm sm:max-w-none mx-auto">
									<button 
										onclick={() => goto('/listas-presentes/criar')}
										class="inline-flex items-center justify-center px-6 py-3 bg-[#00BFB3] text-white text-sm font-semibold rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
										style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
										</svg>
										Criar Lista do Zero
									</button>
									<button 
										onclick={() => document.getElementById('templates-section')?.scrollIntoView({ behavior: 'smooth' })}
										class="inline-flex items-center justify-center px-6 py-3 bg-white text-[#00BFB3] text-sm font-semibold rounded-lg border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
										style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
										</svg>
										Usar Template
									</button>
								</div>
							</div>
						</div>

						<!-- Templates Section -->
						{#if templates.length > 0}
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6" id="templates-section">
								<div class="flex items-center gap-3 mb-4 sm:mb-6">
									<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
										<svg class="h-4 w-4 sm:h-5 sm:w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
										</svg>
									</div>
									<h3 class="text-base sm:text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
										Templates Populares
									</h3>
								</div>
								
								<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
									{#each templates as template}
										<div class="group">
											<a 
												href="/listas-presentes/criar?template={template.id}"
												class="block relative overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 touch-manipulation"
												style="-webkit-tap-highlight-color: transparent;"
											>
												<!-- Badge Template -->
												<div class="absolute top-2 left-2 z-10">
													<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#00BFB3] text-white" style="font-family: 'Lato', sans-serif;">
														Template
													</span>
												</div>
												
												<!-- Ícone -->
												<div class="aspect-square bg-gradient-to-br from-[#00BFB3]/5 to-[#00BFB3]/10 flex items-center justify-center">
													<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-full flex items-center justify-center">
														<svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
														</svg>
													</div>
												</div>
												
												<!-- Conteúdo -->
												<div class="p-3 sm:p-4">
													<h4 class="text-sm sm:text-base font-medium text-gray-900 mb-2 group-hover:text-[#00BFB3] transition-colors line-clamp-2" style="font-family: 'Lato', sans-serif;">
														{template.name}
													</h4>
													
													<div class="flex items-center justify-between text-xs text-gray-500">
														<div class="flex items-center gap-1">
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
															</svg>
															<span>{template.items_count || 0} itens</span>
														</div>
														<div class="flex items-center gap-1">
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
															</svg>
															<span>{template.usage_count || 0} usos</span>
														</div>
													</div>
												</div>
											</a>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
  {/if}

				<!-- Tab: Listas Públicas -->
				{#if activeTab === 'public'}
					<div class="space-y-4 sm:space-y-6">
						<!-- Filtros -->
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
							<div class="flex items-center gap-3 mb-4 sm:mb-6">
								<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
									<svg class="h-4 w-4 sm:h-5 sm:w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
								</div>
								<h3 class="text-base sm:text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
									Filtros de Busca
								</h3>
							</div>
							
							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								<div class="sm:col-span-2 lg:col-span-1">
									<label for="search-lists" class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
										Buscar listas:
									</label>
									<div class="relative">
										<input
											id="search-lists"
											type="text"
											bind:value={searchTerm}
											placeholder="Nome, evento ou casal..."
											class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent text-sm touch-manipulation"
											style="font-family: 'Lato', sans-serif;"
											onkeydown={(e) => e.key === 'Enter' && handleSearch()}
										/>
										<div class="absolute left-3 top-3.5">
											<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
											</svg>
										</div>
									</div>
								</div>

								<div>
									<label for="type-filter" class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
										Tipo de evento:
									</label>
									<select 
										id="type-filter"
										bind:value={selectedType}
										onchange={handleTypeFilter}
										class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent text-sm touch-manipulation"
										style="font-family: 'Lato', sans-serif;"
									>
										{#each eventTypes as type}
											<option value={type.value}>{type.label}</option>
										{/each}
									</select>
								</div>

								<div class="flex items-end">
									<button 
										onclick={handleSearch}
										class="w-full inline-flex items-center justify-center px-6 py-3 bg-[#00BFB3] text-white text-sm font-semibold rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
										style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
										<span class="hidden sm:inline">Buscar</span>
										<span class="sm:hidden">Filtrar</span>
									</button>
								</div>
							</div>
						</div>

						<!-- Listas -->
						{#if loading}
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
								<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
									<div class="inline-block animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-[#00BFB3]"></div>
								</div>
								<p class="text-sm sm:text-base text-gray-600" style="font-family: 'Lato', sans-serif;">Carregando listas...</p>
							</div>
						{:else if lists.length === 0}
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
								<div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
									<svg class="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
									</svg>
								</div>
								<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">Nenhuma lista encontrada</h3>
								<p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed" style="font-family: 'Lato', sans-serif;">
									{selectedType ? 'Nenhuma lista pública encontrada para este filtro.' : 'Seja o primeiro a criar uma lista pública!'}
								</p>
								
								<div class="flex flex-col sm:flex-row gap-3 justify-center max-w-sm sm:max-w-none mx-auto">
									{#if selectedType}
										<button 
											onclick={() => { selectedType = ''; handleSearch(); }}
											class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation"
											style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
										>
											Ver Todas as Listas
										</button>
									{/if}
									
									<button 
										onclick={() => changeTab('create')}
										class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#00BFB3] hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
										style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
										</svg>
										Criar Primeira Lista
									</button>
								</div>
							</div>
						{:else}
							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {#each lists as list}
									<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
										<a href="/listas-presentes/{list.share_token || list.id}" class="block">
											<!-- Badge Evento -->
											<div class="absolute top-3 left-3 z-10">
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#00BFB3] text-white" style="font-family: 'Lato', sans-serif;">
													<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
													</svg>
													{formatEventType(list.type)}
                      </span>
                    </div>

											<!-- Cover -->
											<div class="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
												<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
												</svg>

												<!-- Progress Overlay -->
												<div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-3 text-white">
													<div class="flex justify-between text-sm mb-1">
														<span style="font-family: 'Lato', sans-serif;">Progresso</span>
														<span class="font-medium" style="font-family: 'Lato', sans-serif;">{list.completion_percentage || 0}%</span>
													</div>
													<div class="w-full bg-white bg-opacity-30 rounded-full h-1.5">
														<div 
															class="h-1.5 rounded-full bg-white transition-all duration-300"
															style="width: {Math.min(list.completion_percentage || 0, 100)}%">
														</div>
                  </div>
                </div>
              </div>

              <!-- Conteúdo -->
											<div class="p-4">
												<h3 class="text-base font-medium text-gray-900 mb-2 hover:text-[#00BFB3] transition-colors" style="font-family: 'Lato', sans-serif;">
													{list.title}
												</h3>
												
												{#if list.event_date}
													<p class="text-sm text-gray-500 mb-3 flex items-center" style="font-family: 'Lato', sans-serif;">
														<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
														</svg>
														{formatDate(list.event_date)}
													</p>
												{/if}

												<!-- Stats -->
												<div class="grid grid-cols-3 gap-3 text-center text-sm">
													<div>
														<div class="font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">{list.total_items || 0}</div>
														<div class="text-gray-600 text-xs" style="font-family: 'Lato', sans-serif;">Itens</div>
													</div>
													<div>
														<div class="font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">{list.contribution_count || 0}</div>
														<div class="text-gray-600 text-xs" style="font-family: 'Lato', sans-serif;">Contribuições</div>
													</div>
													<div>
														<div class="font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">{list.view_count || 0}</div>
														<div class="text-gray-600 text-xs" style="font-family: 'Lato', sans-serif;">Visualizações</div>
													</div>
												</div>
											</div>
										</a>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Tab: Minhas Listas -->
				{#if activeTab === 'my'}
					<div class="space-y-6">
											{#if !$isAuthenticated}
						<!-- Not Authenticated -->
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
							<div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
								<svg class="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
							</div>
							<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">Acesso Restrito</h3>
							<p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed" style="font-family: 'Lato', sans-serif;">
								Faça login para ver suas listas de presentes.
							</p>
							<button 
								onclick={() => goto('/login?redirect=/listas-presentes')}
								class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#00BFB3] hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
								</svg>
								Fazer Login
							</button>
						</div>
					{:else if loading}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
							<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
								<div class="inline-block animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-[#00BFB3]"></div>
							</div>
							<p class="text-sm sm:text-base text-gray-600" style="font-family: 'Lato', sans-serif;">Carregando suas listas...</p>
						</div>
					{:else if myLists.length === 0}
						<!-- Empty State -->
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
							<div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
								<svg class="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
								</svg>
							</div>
							<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">Nenhuma lista criada</h3>
							<p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed" style="font-family: 'Lato', sans-serif;">
								Você ainda não criou nenhuma lista de presentes.
							</p>
							<button 
								onclick={() => changeTab('create')}
								class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#00BFB3] hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
								</svg>
								Criar Primeira Lista
							</button>
						</div>
						{:else}
							<!-- Action Bar -->
							<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
								<div class="flex justify-between items-center">
									<div class="flex items-center gap-3">
										<svg class="h-6 w-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
										</svg>
										<div>
											<h3 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
												Suas Listas
											</h3>
											<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
												{myLists.length} {myLists.length === 1 ? 'lista criada' : 'listas criadas'}
											</p>
										</div>
									</div>
									<button 
										onclick={() => changeTab('create')}
										class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00BFB3] hover:bg-[#00A89D] transition-colors"
										style="font-family: 'Lato', sans-serif;">
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
										</svg>
										Nova Lista
									</button>
								</div>
							</div>

							<!-- My Lists Grid -->
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{#each myLists as list}
									<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
										<a href="/listas-presentes/{list.share_token || list.id}/edit" class="block">
											<!-- Badges -->
											<div class="absolute top-3 left-3 z-10">
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800" style="font-family: 'Lato', sans-serif;">
													<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
													</svg>
													Minha Lista
												</span>
											</div>

											<div class="absolute top-3 right-3 z-10">
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {
													list.is_public 
														? 'bg-green-100 text-green-800' 
														: 'bg-gray-100 text-gray-800'
												}" style="font-family: 'Lato', sans-serif;">
													{list.is_public ? 'Pública' : 'Privada'}
												</span>
											</div>

											<!-- Cover -->
											<div class="relative aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
												<svg class="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
												</svg>
											</div>

											<!-- Content -->
											<div class="p-4">
												<h3 class="text-base font-medium text-gray-900 mb-2 hover:text-[#00BFB3] transition-colors" style="font-family: 'Lato', sans-serif;">
													{list.title}
												</h3>
												
												<!-- Stats -->
												<div class="grid grid-cols-2 gap-3 text-sm mb-3">
													<div class="flex items-center gap-2">
														<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
														</svg>
														<span style="font-family: 'Lato', sans-serif;">{list.total_items || 0} itens</span>
													</div>
													<div class="flex items-center gap-2">
														<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
														</svg>
														<span style="font-family: 'Lato', sans-serif;">{list.view_count || 0} visualizações</span>
													</div>
												</div>

												<!-- Progress -->
                <div class="mb-4">
													<div class="flex justify-between text-sm mb-1">
														<span class="text-gray-600" style="font-family: 'Lato', sans-serif;">Progresso</span>
														<span class="font-medium" style="font-family: 'Lato', sans-serif;">{list.completion_percentage || 0}%</span>
                  </div>
													<div class="w-full bg-gray-200 rounded-full h-2">
                    <div 
															class="h-2 rounded-full bg-[#00BFB3] transition-all duration-300"
                      style="width: {Math.min(list.completion_percentage || 0, 100)}%">
                    </div>
                  </div>
                </div>

												<!-- Actions -->
												<div class="flex gap-2">
													<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" style="font-family: 'Lato', sans-serif;">
														<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
														</svg>
														Editar
													</span>
													{#if list.is_public}
														<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" style="font-family: 'Lato', sans-serif;">
															<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
															</svg>
															Compartilhar
														</span>
                {/if}
                </div>
              </div>
										</a>
            </div>
          {/each}
        </div>
      {/if}
    </div>
				{/if}
			</div>
    </div>
</div>
</main>

<style>
	/* Line clamp para títulos longos */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	/* Melhorias responsivas mobile-first */
	@media (max-width: 640px) {
		/* Scrolling suave no mobile */
		html {
			scroll-behavior: smooth;
		}
		
		/* Reduzir padding em elementos pequenos */
		.responsive-padding {
			padding: 0.75rem !important;
		}
		
		/* Tabs com scrolling horizontal suave */
		nav {
			scrollbar-width: none;
			-ms-overflow-style: none;
		}
		
		nav::-webkit-scrollbar {
			display: none;
		}
	}
	
	/* Tablets */
	@media (min-width: 641px) and (max-width: 1024px) {
		/* Ajustes específicos para tablets */
		.tablet-padding {
			padding: 1.5rem;
		}
	}
	
	/* Remove hover effects em dispositivos touch */
	@media (hover: none) and (pointer: coarse) {
		.bg-white:hover {
			box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
		}
	}
	
	/* Melhorias de acessibilidade */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
	
	@media (prefers-contrast: high) {
		/* High contrast adjustments */
		button {
			background-color: #000 !important;
			color: #fff !important;
			border-color: #000 !important;
		}
	}
	
	/* Otimizações para dispositivos de baixa potência */
	@media (prefers-reduced-data: reduce) {
		.bg-gradient-to-br {
			background: #f9fafb !important;
		}
		
		.shadow-sm, .shadow-md {
			box-shadow: none !important;
			border: 1px solid #e5e7eb !important;
		}
	}
	
	/* Touch improvements */
	@supports (-webkit-touch-callout: none) {
		.touch-manipulation {
			-webkit-touch-callout: none;
			-webkit-user-select: none;
			user-select: none;
		}
		
		button, a {
			-webkit-tap-highlight-color: transparent;
		}
	}
	
	/* Focus improvements para navegação por teclado */
	button:focus, a:focus {
		outline: 2px solid #00BFB3;
		outline-offset: 2px;
	}
	
	/* Performance improvements */
	.transition-all {
		will-change: transform, opacity;
	}
	
	/* Preparação para dark mode futuro */
	@media (prefers-color-scheme: dark) {
		/* Será implementado futuramente */
	}
</style> 