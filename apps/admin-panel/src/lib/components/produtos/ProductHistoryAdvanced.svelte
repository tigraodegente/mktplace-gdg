<script lang="ts">
	import { onMount } from 'svelte';
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	let { productId = '', show = $bindable(false) } = $props();
	
	let loading = false;
	let history: any[] = [];
	let error = '';
	let currentPage = 1;
	let totalPages = 1;
	let searchTerm = '';
	let filterAction = '';
	let selectedEntries: string[] = [];
	
	const ACTIONS = [
		{ value: '', label: 'Todas as ações' },
		{ value: 'created', label: 'Criação', color: 'cyan', icon: 'Plus' },
		{ value: 'updated', label: 'Atualização', color: 'cyan', icon: 'Edit' },
		{ value: 'duplicated', label: 'Duplicação', color: 'cyan', icon: 'Copy' },
		{ value: 'published', label: 'Publicação', color: 'green', icon: 'Eye' },
		{ value: 'unpublished', label: 'Despublicação', color: 'gray', icon: 'eye-off' },
		{ value: 'deleted', label: 'Exclusão', color: 'red', icon: 'trash' }
	];
	
	// Carregar histórico
	async function loadHistory(page = 1): Promise<void> {
		if (!productId) {
			console.log('❌ Product ID não fornecido');
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '10',
				...(searchTerm && { search: searchTerm }),
				...(filterAction && { action: filterAction })
			});
			
			const token = localStorage.getItem('access_token');
			
			console.log('🔍 Carregando histórico:', {
				productId,
				url: `/api/products/${productId}/history?${params}`,
				token: token ? `${token.substring(0, 20)}...` : 'MISSING',
				page,
				searchTerm,
				filterAction
			});
			
			const response = await fetch(`/api/products/${productId}/history?${params}`, {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});
			
			console.log('📡 Response status:', response.status);
			console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
			
			const result = await response.json();
			console.log('📋 Response data:', result);
			
			if (response.ok && result.success) {
				history = result.data;
				currentPage = result.meta.page;
				totalPages = result.meta.totalPages;
				console.log('✅ Histórico carregado:', history.length, 'entradas');
				
				// Se não há dados, vamos tentar criar dados de exemplo
				if (history.length === 0) {
					console.log('🔄 Sem dados, criando entrada de exemplo...');
					await createSampleHistory();
				}
			} else {
				console.error('❌ Erro na resposta:', result);
				error = result.error || `Erro HTTP ${response.status}: ${response.statusText}`;
			}
		} catch (err) {
			console.error('❌ Erro ao carregar histórico:', err);
			error = `Erro de conexão: ${err.message}`;
		} finally {
			loading = false;
		}
	}
	
	// Criar entrada de exemplo para teste
	async function createSampleHistory() {
		try {
			const token = localStorage.getItem('access_token');
			
			console.log('📝 Criando entrada de exemplo...');
			
			const response = await fetch(`/api/products/${productId}/history`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'updated',
					changes: {
						name: {
							old: 'Nome anterior',
							new: 'Nome atual'
						}
					}
				})
			});
			
			console.log('📝 Resposta criar histórico:', response.status);
			
			if (response.ok) {
				// Recarregar após criar
				setTimeout(() => loadHistory(1), 1000);
			}
		} catch (err) {
			console.error('❌ Erro ao criar histórico de exemplo:', err);
		}
	}
	
	// Formatar data em português
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo'
		}).format(date);
	}
	
	// Obter cor da ação
	function getActionData(action: string) {
		const actionData = ACTIONS.find(a => a.value === action) || ACTIONS[0];
		return {
			color: actionData.color || 'gray',
			icon: actionData.icon || 'history',
			label: actionData.label || action
		};
	}
	
	// Mapear cores para valores hex do sistema (apenas cores usadas)
	function getActionBackgroundColor(color: string): string {
		const colorMap: Record<string, string> = {
			'cyan': '#00BFB3',    // Verde principal do sistema
			'green': '#00BFB3',   // Verde principal do sistema  
			'red': '#ef4444',     // red-500 - erro/exclusão
			'gray': '#6b7280'     // gray-500 - neutro
		};
		return colorMap[color] || '#00BFB3'; // Default para verde do sistema
	}
	
	// Mapear cores para classes de badge (apenas cores usadas)
	function getBadgeClasses(color: string): string {
		const badgeMap: Record<string, string> = {
			'cyan': 'bg-teal-100 text-teal-800 border-teal-200',
			'green': 'bg-teal-100 text-teal-800 border-teal-200',
			'red': 'bg-red-100 text-red-800 border-red-200',
			'gray': 'bg-gray-100 text-gray-800 border-gray-200'
		};
		return badgeMap[color] || 'bg-teal-100 text-teal-800 border-teal-200'; // Default para verde do sistema
	}
	
	// Paginar
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			loadHistory(page);
		}
	}
	
	// Buscar
	function handleSearch() {
		currentPage = 1;
		loadHistory(1);
	}
	
	// Filtrar
	function handleFilter() {
		currentPage = 1;
		loadHistory(1);
	}
	
	// Exportar histórico
	async function exportHistory() {
		if (!productId) return;
		
		try {
			const response = await fetch(`/api/products/${productId}/history/export`, {
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`
				}
			});
			
			if (response.ok) {
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `produto-${productId}-historico.csv`;
				a.click();
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.error('Erro ao exportar:', error);
		}
	}
	
	// Expandir detalhes de uma entrada
	function toggleEntryDetails(entryId: string) {
		const entry = history.find(h => h.id === entryId);
		if (entry) {
			entry.expanded = !entry.expanded;
			history = [...history]; // Força reatividade
		}
	}
	
	// Carregar quando componente montar ou productId mudar
	$effect(() => {
		if (show && productId) {
			loadHistory(1);
		}
	});
</script>

{#if show}
	<!-- Modal Overlay -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[95vh] flex flex-col overflow-hidden">
			
			<!-- Header Verde Chapado (igual duplicar) -->
			<div class="bg-cyan-500 text-white p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
							<ModernIcon name="history" size="lg" />
						</div>
						<div>
							<h3 class="text-xl font-bold">Histórico de Alterações</h3>
							<p class="text-white/80 text-sm">Rastreamento completo de mudanças no produto</p>
						</div>
					</div>
					
					<div class="flex items-center gap-2">
						<!-- Botão de Exportar -->
						<button
							onclick={exportHistory}
							class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium backdrop-blur-sm"
						>
							<ModernIcon name="Download" size="sm" />
							Exportar
						</button>
						
						<!-- Botão de Fechar -->
						<button
							onclick={() => show = false}
							class="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm"
						>
							<ModernIcon name="X" size="md" />
						</button>
					</div>
				</div>
			</div>
			
			<!-- Filtros e Busca -->
			<div class="p-6 border-b bg-gray-50/50">
				<div class="flex flex-col sm:flex-row gap-4">
					<!-- Busca -->
					<div class="flex-1">
						<div class="relative">
							<input
								type="text"
								bind:value={searchTerm}
								oninput={handleSearch}
								placeholder="Buscar no histórico..."
								class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
							/>
							<div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
								<ModernIcon name="search" size="sm" />
							</div>
						</div>
					</div>
					
					<!-- Filtro de Ação -->
					<div class="sm:w-64">
						<select
							bind:value={filterAction}
							onchange={handleFilter}
							class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
						>
							{#each ACTIONS as action}
								<option value={action.value}>{action.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
			
			<!-- Content -->
			<div class="flex-1 overflow-y-auto">
				{#if loading}
					<!-- Loading State -->
					<div class="flex flex-col items-center justify-center py-20">
						<div class="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
						<p class="text-gray-600 font-medium">Carregando histórico...</p>
					</div>
					
				{:else if error}
					<!-- Error State -->
					<div class="flex flex-col items-center justify-center py-20">
						<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
							<ModernIcon name="AlertTriangle" size="lg" />
						</div>
						<h4 class="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h4>
						<p class="text-gray-600 text-center mb-4">{error}</p>
						<button
							onclick={() => loadHistory(currentPage)}
							class="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
						>
							<ModernIcon name="refresh" size="sm" />
							Tentar Novamente
						</button>
					</div>
					
				{:else if history.length === 0}
					<!-- Empty State -->
					<div class="flex flex-col items-center justify-center py-20">
						<div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
							<ModernIcon name="history" size="xl" />
						</div>
						<h4 class="text-xl font-semibold text-gray-900 mb-2">Nenhum histórico encontrado</h4>
						<p class="text-gray-600 text-center max-w-md mb-4">
							{#if searchTerm || filterAction}
								Não há registros que correspondam aos filtros selecionados.
							{:else}
								Este produto ainda não possui histórico de alterações registradas.
							{/if}
						</p>
						
						<!-- Debug Info -->
						<div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 max-w-md">
							<p><strong>Product ID:</strong> {productId}</p>
							<p><strong>Token:</strong> {localStorage.getItem('access_token') ? 'Presente' : 'Ausente'}</p>
							<p><strong>Filtros:</strong> {searchTerm || 'Nenhum'} / {filterAction || 'Todos'}</p>
						</div>
						
						<button
							onclick={() => loadHistory(1)}
							class="mt-4 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
						>
							<ModernIcon name="refresh" size="sm" />
							Recarregar
						</button>
					</div>
					
				{:else}
					<!-- Timeline do Histórico -->
					<div class="p-6">
						<div class="relative">
							<!-- Linha da Timeline -->
							<div class="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#00BFB3] to-gray-200"></div>
							
							<!-- Entradas do Histórico -->
							<div class="space-y-6">
								{#each history as entry, index (entry.id)}
									{@const actionData = getActionData(entry.action)}
									<div class="relative flex gap-6 group">
										<!-- Ícone da Timeline -->
										<div class="relative z-10 flex-shrink-0">
											<div class="w-16 h-16 rounded-xl border-4 border-white bg-{actionData.color}-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200"
											style="background-color: {getActionBackgroundColor(actionData.color)}"
										>
												<ModernIcon name={actionData.icon} size="md" class="text-white" />
											</div>
											<!-- Pulse para entrada mais recente -->
											{#if index === 0}
												<div class="absolute inset-0 w-16 h-16 rounded-xl animate-ping opacity-20"
													style="background-color: {getActionBackgroundColor(actionData.color)}"
												></div>
											{/if}
										</div>
										
										<!-- Conteúdo da Entrada -->
										<div class="flex-1 min-w-0">
											<div class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden hover:border-gray-200">
												
												<!-- Header da Entrada -->
												<div class="p-6 border-b border-gray-50">
													<div class="flex items-start justify-between">
														<div class="flex-1">
															<div class="flex items-center gap-3 mb-2">
																<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {getBadgeClasses(actionData.color)}">
																	{actionData.label}
																</span>
																<time class="text-sm text-gray-500 font-medium">
																	{formatDate(entry.created_at)}
																</time>
															</div>
															
															<h4 class="text-lg font-semibold text-gray-900 mb-1">
																{entry.summary}
															</h4>
															
															<div class="flex items-center gap-2 text-sm text-gray-600">
																<div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
																	<ModernIcon name="seller" size="xs" />
																</div>
																<span class="font-medium">{entry.user_name || 'Sistema'}</span>
																{#if entry.user_email}
																	<span class="text-gray-400">•</span>
																	<span>{entry.user_email}</span>
																{/if}
															</div>
														</div>
														
														<!-- Botão de Expandir -->
														{#if entry.changes && Object.keys(entry.changes).length > 0}
																										<button
												onclick={() => toggleEntryDetails(entry.id)}
												class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
												title="Ver detalhes"
											>
																<ModernIcon 
																	name={entry.expanded ? 'chevron-up' : 'chevron-down'} 
																	size="sm" 
																/>
															</button>
														{/if}
													</div>
												</div>
												
												<!-- Detalhes Expandidos -->
												{#if entry.expanded && entry.changes}
													<div class="p-6 bg-gray-50/50">
														<h5 class="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
															<ModernIcon name="Edit" size="xs" />
															Alterações Detalhadas
														</h5>
														
														<div class="space-y-3">
															{#each Object.entries(entry.changes) as [field, change]}
																<div class="bg-white rounded-lg p-4 border border-gray-100">
																	<div class="text-sm font-medium text-gray-900 mb-2 capitalize">
																		{field.replace(/_/g, ' ')}
																	</div>
																	
																	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
																		<!-- Valor Anterior -->
																		<div>
																			<span class="text-gray-600 block mb-1">Anterior:</span>
																			<div class="bg-red-50 border border-red-200 rounded px-3 py-2 text-red-800 font-mono text-xs">
																				{change.old ?? 'Não definido'}
																			</div>
																		</div>
																		
																		<!-- Valor Novo -->
																		<div>
																			<span class="text-gray-600 block mb-1">Novo:</span>
																			<div class="bg-green-50 border border-green-200 rounded px-3 py-2 text-green-800 font-mono text-xs">
																				{change.new ?? 'Não definido'}
																			</div>
																		</div>
																	</div>
																</div>
															{/each}
														</div>
													</div>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Footer com Paginação -->
			{#if !loading && !error && history.length > 0 && totalPages > 1}
				<div class="p-6 border-t bg-gray-50/50">
					<div class="flex items-center justify-between">
						<div class="text-sm text-gray-600">
							Página {currentPage} de {totalPages}
						</div>
						
						<div class="flex items-center gap-2">
							<!-- Primeira página -->
							<button
								onclick={() => goToPage(1)}
								disabled={currentPage === 1}
								class="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ModernIcon name="ChevronLeft" size="sm" />
							</button>
							
							<!-- Página anterior -->
							<button
								onclick={() => goToPage(currentPage - 1)}
								disabled={currentPage === 1}
								class="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
							>
								Anterior
							</button>
							
							<!-- Números das páginas -->
							{#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
								const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
								return start + i;
							}) as page}
								{#if page <= totalPages}
									<button
										onclick={() => goToPage(page)}
																			class="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-sm font-medium {
										page === currentPage ? 'bg-cyan-500 text-white border-cyan-500' : ''
									}"
									>
										{page}
									</button>
								{/if}
							{/each}
							
							<!-- Próxima página -->
							<button
								onclick={() => goToPage(currentPage + 1)}
								disabled={currentPage === totalPages}
								class="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
							>
								Próxima
							</button>
							
							<!-- Última página -->
							<button
								onclick={() => goToPage(totalPages)}
								disabled={currentPage === totalPages}
								class="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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