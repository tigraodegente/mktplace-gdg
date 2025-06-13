<script lang="ts">
	import { onMount } from 'svelte';
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	interface HistoryChange {
		old: string;
		new: string;
		label: string;
	}
	
	interface HistoryEntry {
		id: string;
		product_id: string;
		user_name: string;
		user_email: string;
		action: string;
		changes: Record<string, HistoryChange> | string;
		summary: string;
		created_at: string;
	}
	
	let { productId = '' } = $props();
	
	let loading = $state(false);
	let history = $state([]);
	
	// Carregar histórico
	async function loadHistory(): Promise<void> {
		if (!productId) {
			console.error('❌ ProductId não fornecido');
			return;
		}
		
		console.log(`🔍 Carregando histórico para produto: ${productId}`);
		loading = true;
		try {
			const url = `/api/products/${productId}/history?page=1&limit=20`;
			console.log(`🌐 Fazendo requisição para: ${url}`);
			
			const response = await fetch(url);
			console.log(`📡 Resposta HTTP: ${response.status} ${response.statusText}`);
			
			const result = await response.json();
			console.log(`📦 Resultado completo:`, result);
			
			if (result.success) {
				// Processar dados e parsear changes se necessário
				history = result.data.map((entry: any) => {
					let parsedChanges: Record<string, HistoryChange> = {};
					
					// Se changes é string, parsear para objeto
					if (typeof entry.changes === 'string') {
						try {
							parsedChanges = JSON.parse(entry.changes);
						} catch (e) {
							console.warn('⚠️ Erro ao parsear changes:', e);
							parsedChanges = {};
						}
					} else if (entry.changes && typeof entry.changes === 'object') {
						parsedChanges = entry.changes;
					}
					
					return {
						...entry,
						changes: parsedChanges
					} as HistoryEntry;
				});
				
				console.log(`✅ Histórico processado: ${history.length} registros`);
				console.log('📋 Primeiro registro:', history[0]);
			} else {
				console.error('❌ Erro na resposta:', result.error);
				history = [];
			}
		} catch (error) {
			console.error('❌ Erro ao carregar histórico:', error);
			history = [];
		} finally {
			loading = false;
		}
	}
	
	// Formatar data
	function formatDate(dateString: string): string {
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
	function getActionIcon(action: string): string {
		switch (action) {
			case 'created': return 'Plus';
			case 'updated': return 'Edit';
			case 'deleted': return 'Trash';
			case 'published': return 'Eye';
			case 'unpublished': return 'EyeOff';
			default: return 'Clock';
		}
	}
	
	// Obter cor da ação
	function getActionColor(action: string): string {
		switch (action) {
			case 'created': return 'text-[#00BFB3] bg-[#00BFB3]/10 border-[#00BFB3]/20';
			case 'updated': return 'text-[#00BFB3] bg-[#00BFB3]/10 border-[#00BFB3]/20';
			case 'deleted': return 'text-red-600 bg-red-50 border-red-200';
			case 'published': return 'text-[#00BFB3] bg-[#00BFB3]/10 border-[#00BFB3]/20';
			case 'unpublished': return 'text-gray-600 bg-gray-50 border-gray-200';
			default: return 'text-[#00BFB3] bg-[#00BFB3]/10 border-[#00BFB3]/20';
		}
	}
	
	// Carregar ao montar componente
	onMount(() => {
		if (productId) {
			loadHistory();
		}
	});
</script>

<!-- Seção do Histórico -->
<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
	<!-- Header da Seção -->
	<div class="flex items-center gap-3 p-4 border-b border-gray-200">
		<div class="w-8 h-8 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
			<ModernIcon name="Clock" size="sm" />
		</div>
		<div>
			<h3 class="text-base font-semibold text-gray-900">Histórico de Alterações</h3>
			<p class="text-sm text-gray-500">Acompanhe todas as mudanças feitas no produto</p>
		</div>
		<div class="ml-auto">
					<button
			onclick={loadHistory}
			disabled={loading}
			class="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
			title="Recarregar histórico"
		>
			<ModernIcon name="RotateCcw" size="sm" />
		</button>
		</div>
	</div>
	
	<!-- Conteúdo -->
	<div class="p-4">
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<div class="flex items-center gap-3">
					<div class="w-6 h-6 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
					<span class="text-gray-600">Carregando histórico...</span>
				</div>
			</div>
		{:else if history.length === 0}
			<div class="flex flex-col items-center justify-center py-8">
				<div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
					<ModernIcon name="Clock" size="md" />
				</div>
				<h4 class="text-base font-medium text-gray-900 mb-1">Nenhum histórico encontrado</h4>
				<p class="text-sm text-gray-500 text-center">
					Este produto ainda não possui histórico de alterações.
				</p>
			</div>
		{:else}
			<!-- Timeline -->
			<div class="space-y-4">
				{#each history as entry, index}
					<div class="flex gap-3">
						<!-- Timeline Icon -->
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-lg border-2 flex items-center justify-center {getActionColor(entry.action)}">
								<ModernIcon name={getActionIcon(entry.action)} size="xs" />
							</div>
							{#if index < history.length - 1}
								<div class="w-px h-4 bg-gray-200 mt-2"></div>
							{/if}
						</div>
						
						<!-- Content -->
						<div class="flex-1 min-w-0">
							<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
								<!-- Header -->
								<div class="flex items-start justify-between mb-2">
									<span class="text-sm font-medium text-gray-900">
										{entry.summary || 'Alteração no produto'}
									</span>
									<span class="text-xs text-gray-500 whitespace-nowrap ml-2">
										{formatDate(entry.created_at)}
									</span>
								</div>
								
								<!-- User Info -->
								<div class="flex items-center gap-2">
									<div class="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
										<ModernIcon name="User" size="xs" />
									</div>
									<div class="text-xs text-gray-600">
										<span class="font-medium">
											{#if entry.user_name && entry.user_name !== 'Sistema'}
												{entry.user_name}
											{:else}
												Sistema
											{/if}
										</span>
										{#if entry.user_email && entry.user_email !== 'system@marketplace.com'}
											<span class="text-gray-500 ml-1">({entry.user_email})</span>
										{/if}
									</div>
								</div>
								
								<!-- Action Details -->
								{#if entry.changes && typeof entry.changes === 'object' && Object.keys(entry.changes).length > 0}
									<div class="mt-2 pt-2 border-t border-gray-200">
										<div class="text-xs text-gray-500">
											<span class="font-medium">Campos alterados:</span>
											{Object.values(entry.changes as Record<string, HistoryChange>).map((change: HistoryChange) => change.label).join(', ')}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
			
			<!-- Footer com informações -->
			<div class="mt-4 pt-4 border-t border-gray-200">
				<div class="flex items-center justify-between text-xs text-gray-500">
					<span>Exibindo {history.length} alterações mais recentes</span>
					<button
						onclick={loadHistory}
						class="text-[#00BFB3] hover:text-[#00A89D] font-medium"
					>
						Atualizar
					</button>
				</div>
			</div>
		{/if}
	</div>
</div> 