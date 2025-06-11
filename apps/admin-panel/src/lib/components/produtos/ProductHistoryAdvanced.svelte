<script lang="ts">
	import { onMount } from 'svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	interface Props {
		show: boolean;
		productId: string;
	}
	
	let { show = $bindable(), productId }: Props = $props();
	
	// Estados
	let loading = $state(true);
	let error = $state('');
	let history: any[] = $state([]);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let searchTerm = $state('');
	let filterAction = $state('');
	
	// Ações disponíveis para filtro
	const ACTIONS = [
		{ value: '', label: 'Todas as Ações' },
		{ value: 'created', label: 'Criado', color: 'cyan', icon: 'Plus' },
		{ value: 'updated', label: 'Atualizado', color: 'green', icon: 'Edit' },
		{ value: 'deleted', label: 'Deletado', color: 'red', icon: 'Trash' },
		{ value: 'published', label: 'Publicado', color: 'blue', icon: 'Eye' },
		{ value: 'unpublished', label: 'Despublicado', color: 'gray', icon: 'EyeOff' },
		{ value: 'duplicated', label: 'Duplicado', color: 'purple', icon: 'Copy' }
	];
	
	// Carregar histórico
	async function loadHistory() {
		if (!productId) return;
		
		loading = true;
		error = '';
		
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: '10',
				...(searchTerm && { search: searchTerm }),
				...(filterAction && { action: filterAction })
			});
			
			const token = localStorage.getItem('access_token');
			
			if (!token) {
				console.error('❌ Token de acesso não encontrado no localStorage');
				error = 'Token de autenticação não encontrado. Faça login novamente.';
				loading = false;
				return;
			}
			
			console.log('🔍 Carregando histórico:', {
				productId,
				url: `/api/products/${productId}/history?${params}`,
				token: token ? `${token.substring(0, 20)}...` : 'MISSING',
				page: currentPage,
				searchTerm,
				filterAction
			});
			
			const response = await fetch(`/api/products/${productId}/history?${params}`, {
				headers: {
					...(token && { 'Authorization': `Bearer ${token}` }),
					'Content-Type': 'application/json'
				}
			});
			
			console.log('📡 Response status:', response.status);
			console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
			
			const data = await response.json();
			console.log('📋 Response data:', data);
			
			if (response.ok && data.success) {
				history = data.data || [];
				totalPages = data.pagination?.totalPages || 1;
				console.log('✅ Histórico carregado:', { total: history.length, totalPages });
			} else {
				console.log('❌ Erro na resposta:', data);
				error = data.error || 'Erro ao carregar histórico';
			}
		} catch (err) {
			console.error('❌ Erro ao carregar histórico:', err);
			error = 'Erro ao carregar histórico';
		} finally {
			loading = false;
		}
	}
	
	// Formatar data
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
	
	// Obter cor da ação
	function getActionConfig(action: string) {
		return ACTIONS.find(a => a.value === action) || { 
			value: action, 
			label: action, 
			color: 'gray', 
			icon: 'Info' 
		};
	}
	
	// Renderizar alterações detalhadas
	function renderChanges(changes: any) {
		if (!changes || typeof changes !== 'object') {
			return [];
		}
		
		// Se é o formato antigo (simples)
		if (changes.name || changes.price || changes.sku) {
			return Object.entries(changes).map(([field, change]: [string, any]) => ({
				field,
				label: getFieldLabel(field),
				old: change.old,
				new: change.new,
				type: 'basic_info'
			}));
		}
		
		// Se é o formato novo (detalhado)
		return Object.entries(changes).map(([field, change]: [string, any]) => ({
			field,
			label: change.label || getFieldLabel(field),
			old: change.formatted?.old || change.old,
			new: change.formatted?.new || change.new,
			type: change.type || 'basic_info'
		}));
	}
	
	// Obter label do campo
	function getFieldLabel(field: string): string {
		const labels: Record<string, string> = {
			name: 'Nome',
			price: 'Preço',
			sku: 'SKU',
			description: 'Descrição',
			attributes: 'Atributos',
			specifications: 'Especificações',
			category_id: 'Categoria',
			brand_id: 'Marca',
			quantity: 'Estoque',
			weight: 'Peso',
			is_active: 'Status'
		};
		
		return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
	}
	
	// Obter cor do tipo de alteração
	function getTypeColor(type: string): string {
		const colors: Record<string, string> = {
			basic_info: 'blue',
			pricing: 'green',
			inventory: 'orange',
			categories: 'purple',
			attributes: 'pink',
			specifications: 'indigo',
			media: 'yellow',
			seo: 'cyan',
			shipping: 'teal',
			status: 'red'
		};
		
		return colors[type] || 'gray';
	}
	
	// Paginação
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			loadHistory();
		}
	}
	
	// Buscar
	function handleSearch() {
		currentPage = 1;
		loadHistory();
	}
	
	// Filtrar por ação
	function handleFilterChange() {
		currentPage = 1;
		loadHistory();
	}
	
	// Lifecycle
	$effect(() => {
		if (show && productId) {
			loadHistory();
		}
	});
</script>

{#if show}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onclick={() => show = false}>
		<!-- Modal -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-4 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="bg-white border-b px-6 py-4 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<ModernIcon name="history" size="md" class="text-[#00BFB3]" />
					<div>
						<h2 class="text-xl font-bold text-gray-900">Histórico de Alterações</h2>
						<p class="text-sm text-gray-500">Todas as modificações realizadas no produto</p>
					</div>
				</div>
				
				<button 
					onclick={() => show = false}
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ModernIcon name="X" size="md" />
				</button>
			</div>
			
			<!-- Filtros -->
			<div class="bg-gray-50 border-b px-6 py-4">
				<div class="flex flex-wrap items-center gap-4">
					<!-- Busca -->
					<div class="flex-1 min-w-60">
						<div class="relative">
							<ModernIcon name="Search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								bind:value={searchTerm}
								onkeydown={(e) => e.key === 'Enter' && handleSearch()}
								placeholder="Buscar no histórico..."
								class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
							/>
						</div>
					</div>
					
					<!-- Filtro por ação -->
					<div class="min-w-48">
						<select
							bind:value={filterAction}
							onchange={handleFilterChange}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						>
							{#each ACTIONS as action}
								<option value={action.value}>{action.label}</option>
							{/each}
						</select>
					</div>
					
					<!-- Botão de busca -->
					<button
						onclick={handleSearch}
						class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors flex items-center gap-2"
					>
						<ModernIcon name="Search" size="sm" />
						Buscar
					</button>
				</div>
			</div>
			
			<!-- Content -->
			<div class="flex-1 overflow-auto">
				{#if loading}
					<div class="flex items-center justify-center py-20">
						<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
					</div>
				{:else if error}
					<div class="flex flex-col items-center justify-center py-20 text-center">
						<ModernIcon name="AlertCircle" size="lg" class="text-red-500 mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Erro ao carregar histórico</h3>
						<p class="text-gray-500 mb-6">{error}</p>
						<button
							onclick={loadHistory}
							class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
						>
							Tentar novamente
						</button>
					</div>
				{:else if history.length === 0}
					<div class="flex flex-col items-center justify-center py-20 text-center">
						<ModernIcon name="FileText" size="lg" class="text-gray-400 mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum histórico encontrado</h3>
						<p class="text-gray-500">Não há registros de alterações para este produto.</p>
					</div>
				{:else}
					<div class="space-y-4 p-6">
						{#each history as entry}
							{@const actionConfig = getActionConfig(entry.action)}
							{@const changes = renderChanges(entry.changes)}
							
							<div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
								<!-- Header da entrada -->
								<div class="flex items-start justify-between mb-4">
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 rounded-full bg-{actionConfig.color}-100 flex items-center justify-center">
											<ModernIcon name={actionConfig.icon} size="sm" class="text-{actionConfig.color}-600" />
										</div>
										<div>
											<h4 class="font-medium text-gray-900">{actionConfig.label}</h4>
											<p class="text-sm text-gray-500">
												por <span class="font-medium">{entry.user_name || 'Sistema'}</span>
												{#if entry.user_email && entry.user_email !== 'system@marketplace.com'}
													<span class="text-gray-400">({entry.user_email})</span>
												{/if}
												em {formatDate(entry.created_at)}
											</p>
										</div>
									</div>
									
									{#if entry.summary}
										<div class="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
											{entry.summary}
										</div>
									{/if}
								</div>
								
								<!-- Alterações detalhadas -->
								{#if changes.length > 0}
									<div class="space-y-3">
										<h5 class="text-sm font-medium text-gray-700 border-b pb-2">
											Alterações ({changes.length})
										</h5>
										
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											{#each changes as change}
												<div class="bg-gray-50 rounded-lg p-4">
													<div class="flex items-center justify-between mb-2">
														<span class="font-medium text-gray-900">{change.label}</span>
														<span class="text-xs px-2 py-1 bg-{getTypeColor(change.type)}-100 text-{getTypeColor(change.type)}-700 rounded-full">
															{change.type.replace('_', ' ')}
														</span>
													</div>
													
													<div class="space-y-1 text-sm">
														<div class="flex items-center gap-2">
															<span class="text-red-600 font-mono">-</span>
															<span class="text-gray-600">{change.old || 'Não definido'}</span>
														</div>
														<div class="flex items-center gap-2">
															<span class="text-green-600 font-mono">+</span>
															<span class="text-gray-900">{change.new || 'Não definido'}</span>
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Paginação -->
			{#if totalPages > 1}
				<div class="bg-white border-t px-6 py-4">
					<div class="flex items-center justify-between">
						<p class="text-sm text-gray-700">
							Página {currentPage} de {totalPages}
						</p>
						
						<div class="flex items-center gap-2">
							<button
								onclick={() => goToPage(currentPage - 1)}
								disabled={currentPage <= 1}
								class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ModernIcon name="ChevronLeft" size="sm" />
							</button>
							
							{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const start = Math.max(1, currentPage - 2);
								return start + i;
							}) as page}
								{#if page <= totalPages}
									<button
										onclick={() => goToPage(page)}
										class="px-3 py-2 border rounded-lg hover:bg-gray-50 {
											page === currentPage ? 'bg-[#00BFB3] text-white border-[#00BFB3]' : 'border-gray-300'
										}"
									>
										{page}
									</button>
								{/if}
							{/each}
							
							<button
								onclick={() => goToPage(currentPage + 1)}
								disabled={currentPage >= totalPages}
								class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ModernIcon name="ChevronRight" size="sm" />
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if} 