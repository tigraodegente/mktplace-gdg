<script lang="ts">
	import { onMount } from 'svelte';
	import ModernIcon from '../shared/ModernIcon.svelte';
	import type { ProductHistoryEntry } from '../../routes/api/products/[id]/history/+server';
	
	export let productId: string;
	export let show: boolean = false;
	
	let loading = false;
	let history: ProductHistoryEntry[] = [];
	let page = 1;
	let totalPages = 1;
	let hasMore = false;
	
	// Carregar histórico
	async function loadHistory(pageNum = 1) {
		if (!productId) return;
		
		loading = true;
		try {
			const response = await fetch(`/api/products/${productId}/history?page=${pageNum}&limit=10`);
			const result = await response.json();
			
			if (result.success) {
				if (pageNum === 1) {
					history = result.data;
				} else {
					history = [...history, ...result.data];
				}
				
				page = result.meta.page;
				totalPages = result.meta.totalPages;
				hasMore = result.meta.hasNext;
			}
		} catch (error) {
			console.error('Erro ao carregar histórico:', error);
		} finally {
			loading = false;
		}
	}
	
	// Carregar mais itens
	function loadMore() {
		if (!loading && hasMore) {
			loadHistory(page + 1);
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
	
	// Obter ícone da ação
	function getActionIcon(action: string) {
		switch (action) {
			case 'created': return 'Plus';
			case 'updated': return 'Edit';
			case 'deleted': return 'Trash2';
			case 'published': return 'Eye';
			case 'unpublished': return 'EyeOff';
			default: return 'Clock';
		}
	}
	
	// Obter cor da ação
	function getActionColor(action: string) {
		switch (action) {
			case 'created': return 'text-green-600 bg-green-50 border-green-200';
			case 'updated': return 'text-[#00BFB3] bg-[#00BFB3]/10 border-[#00BFB3]/20';
			case 'deleted': return 'text-red-600 bg-red-50 border-red-200';
			case 'published': return 'text-green-600 bg-green-50 border-green-200';
			case 'unpublished': return 'text-gray-600 bg-gray-50 border-gray-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}
	
	// Obter label da ação
	function getActionLabel(action: string) {
		switch (action) {
			case 'created': return 'Criado';
			case 'updated': return 'Atualizado';
			case 'deleted': return 'Excluído';
			case 'published': return 'Publicado';
			case 'unpublished': return 'Despublicado';
			default: return action;
		}
	}
	
	// Carregar quando mostrar
	$: if (show && productId) {
		loadHistory(1);
	}
</script>

{#if show}
	<!-- Modal Overlay -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
						<ModernIcon name="Clock" size="md" />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-900">Histórico de Alterações</h3>
						<p class="text-sm text-gray-500">Acompanhe todas as mudanças feitas no produto</p>
					</div>
				</div>
				
				<button
					onclick={() => show = false}
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ModernIcon name="X" size="md" />
				</button>
			</div>
			
			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if loading && history.length === 0}
					<div class="flex items-center justify-center py-12">
						<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
					</div>
				{:else if history.length === 0}
					<div class="flex flex-col items-center justify-center py-12">
						<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
							<ModernIcon name="Clock" size="lg" />
						</div>
						<h4 class="text-lg font-medium text-gray-900 mb-2">Nenhum histórico encontrado</h4>
						<p class="text-gray-500 text-center">
							Este produto ainda não possui histórico de alterações.
						</p>
					</div>
				{:else}
					<!-- Timeline -->
					<div class="space-y-6">
						{#each history as entry, index}
							<div class="flex gap-4">
								<!-- Timeline Line -->
								<div class="flex flex-col items-center">
									<div class="w-10 h-10 rounded-lg border-2 flex items-center justify-center {getActionColor(entry.action)}">
										<ModernIcon name={getActionIcon(entry.action)} size="sm" />
									</div>
									{#if index < history.length - 1}
										<div class="w-px h-6 bg-gray-200 mt-2"></div>
									{/if}
								</div>
								
								<!-- Content -->
								<div class="flex-1 min-w-0">
									<div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
										<!-- Header -->
										<div class="flex items-start justify-between mb-3">
											<div class="flex items-center gap-2">
												<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium {getActionColor(entry.action)}">
													{getActionLabel(entry.action)}
												</span>
												<span class="text-sm font-medium text-gray-900">
													{entry.summary}
												</span>
											</div>
											<span class="text-xs text-gray-500 whitespace-nowrap">
												{formatDate(entry.created_at)}
											</span>
										</div>
										
										<!-- User Info -->
										<div class="flex items-center gap-2 mb-3">
											<div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
												<ModernIcon name="User" size="xs" />
											</div>
											<div class="text-sm text-gray-600">
												<span class="font-medium">{entry.user_name}</span>
												{#if entry.user_email && entry.user_email !== 'system@marketplace.com'}
													<span class="text-gray-500">({entry.user_email})</span>
												{/if}
											</div>
										</div>
										
										<!-- Changes Details -->
										{#if entry.changes && Object.keys(entry.changes).length > 0}
											<div class="border-t border-gray-100 pt-3">
												<details class="group">
													<summary class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
														<ModernIcon name="ChevronRight" size="xs" class="group-open:rotate-90 transition-transform" />
														Ver detalhes das alterações ({Object.keys(entry.changes).length} campos)
													</summary>
													
													<div class="mt-3 space-y-2">
														{#each Object.entries(entry.changes) as [field, change]}
															<div class="bg-gray-50 rounded-lg p-3">
																<div class="flex items-center gap-2 mb-2">
																	<ModernIcon name="Edit" size="xs" />
																	<span class="text-sm font-medium text-gray-900">
																		{field}
																	</span>
																</div>
																
																<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
																	<div>
																		<span class="text-gray-500 text-xs uppercase tracking-wide">Antes</span>
																		<div class="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-800 font-mono text-xs">
																			{typeof change.old === 'object' ? JSON.stringify(change.old, null, 2) : change.old || '(vazio)'}
																		</div>
																	</div>
																	<div>
																		<span class="text-gray-500 text-xs uppercase tracking-wide">Depois</span>
																		<div class="mt-1 p-2 bg-green-50 border border-green-200 rounded text-green-800 font-mono text-xs">
																			{typeof change.new === 'object' ? JSON.stringify(change.new, null, 2) : change.new || '(vazio)'}
																		</div>
																	</div>
																</div>
															</div>
														{/each}
													</div>
												</details>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
					
					<!-- Load More -->
					{#if hasMore}
						<div class="flex justify-center mt-8">
							<button
								onclick={loadMore}
								disabled={loading}
								class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
							>
								{#if loading}
									<div class="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
									Carregando...
								{:else}
									<ModernIcon name="ChevronDown" size="sm" />
									Carregar mais
								{/if}
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Estilo customizado para os detalhes */
	details summary::-webkit-details-marker {
		display: none;
	}
	
	details summary {
		list-style: none;
	}
</style> 