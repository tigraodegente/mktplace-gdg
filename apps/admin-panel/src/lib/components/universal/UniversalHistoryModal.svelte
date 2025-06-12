<script lang="ts">
	import { onMount } from 'svelte';
	import type { FormConfig } from '$lib/config/formConfigs';
	import { universalApiService } from '$lib/services/universalApiService';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	// Props
	interface Props {
		config: FormConfig;
		entityId?: string;
		isOpen: boolean;
		onClose: () => void;
	}
	
	let { config, entityId, isOpen, onClose }: Props = $props();
	
	// Estados
	let loading = $state(true);
	let history = $state<any[]>([]);
	let error = $state<string | null>(null);
	let page = $state(1);
	let totalPages = $state(1);
	
	// Carregar histórico
	async function loadHistory() {
		if (!entityId) return;
		
		loading = true;
		error = null;
		
		try {
			const result = await universalApiService.getEntityHistory(config, entityId, page, 10);
			
			if (result.success) {
				history = result.data || [];
				totalPages = result.meta?.totalPages || 1;
			} else {
				error = result.error || 'Erro ao carregar histórico';
			}
		} catch (err) {
			error = 'Erro ao carregar histórico';
		} finally {
			loading = false;
		}
	}
	
	// Formatar data
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString('pt-BR');
	}
	
	// Formatar alterações
	function formatChanges(changes: any) {
		if (!changes) return 'Nenhuma alteração detalhada';
		
		if (typeof changes === 'string') return changes;
		
		if (typeof changes === 'object') {
			return Object.entries(changes)
				.map(([field, change]: [string, any]) => {
					if (change.from !== undefined && change.to !== undefined) {
						return `${field}: "${change.from}" → "${change.to}"`;
					}
					return `${field}: ${JSON.stringify(change)}`;
				})
				.join(', ');
		}
		
		return JSON.stringify(changes);
	}
	
	// Lifecycle
	$effect(() => {
		if (isOpen && entityId) {
			loadHistory();
		}
	});
	
	// Fechar com ESC
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900 flex items-center gap-2">
					<ModernIcon name="History" />
					Histórico de {config.title}
				</h2>
				<button
					type="button"
					onclick={onClose}
					class="text-gray-400 hover:text-gray-600 transition-colors"
				>
					<ModernIcon name="X" />
				</button>
			</div>
			
			<!-- Content -->
			<div class="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
				{#if loading}
					<!-- Loading -->
					<div class="text-center py-12">
						<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando histórico...</p>
					</div>
				{:else if error}
					<!-- Error -->
					<div class="text-center py-12">
						<div class="text-red-500 mb-4">
							<ModernIcon name="AlertCircle" size="48" />
						</div>
						<h3 class="text-lg font-medium text-gray-900 mb-2">Erro ao carregar histórico</h3>
						<p class="text-gray-600 mb-4">{error}</p>
						<button
							type="button"
							onclick={loadHistory}
							class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
						>
							Tentar novamente
						</button>
					</div>
				{:else if history.length === 0}
					<!-- Empty -->
					<div class="text-center py-12">
						<div class="text-gray-400 mb-4">
							<ModernIcon name="FileX" size="48" />
						</div>
						<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum histórico encontrado</h3>
						<p class="text-gray-600">Este {config.entityName} ainda não possui histórico de alterações.</p>
					</div>
				{:else}
					<!-- História -->
					<div class="space-y-4">
						{#each history as entry}
							<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
								<div class="flex items-start justify-between mb-3">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 bg-[#00BFB3] rounded-full flex items-center justify-center">
											<ModernIcon 
												name={entry.action === 'create' ? 'Plus' : entry.action === 'update' ? 'Edit' : 'Trash'} 
												size="16" 
												class="text-white" 
											/>
										</div>
										<div>
											<h4 class="font-medium text-gray-900">
												{entry.action === 'create' ? 'Criado' : 
												 entry.action === 'update' ? 'Atualizado' : 
												 entry.action === 'delete' ? 'Excluído' : 
												 entry.action || 'Alteração'}
											</h4>
											<p class="text-sm text-gray-600">{formatDate(entry.created_at || entry.timestamp)}</p>
										</div>
									</div>
									
									{#if entry.user_name || entry.user_email}
										<div class="text-right">
											<p class="text-sm font-medium text-gray-900">
												{entry.user_name || entry.user_email}
											</p>
											{#if entry.user_role}
												<p class="text-xs text-gray-500">{entry.user_role}</p>
											{/if}
										</div>
									{/if}
								</div>
								
								{#if entry.changes || entry.description}
									<div class="bg-white border border-gray-200 rounded p-3">
										<h5 class="text-sm font-medium text-gray-700 mb-2">Alterações:</h5>
										<p class="text-sm text-gray-600 font-mono break-all">
											{entry.description || formatChanges(entry.changes)}
										</p>
									</div>
								{/if}
								
								{#if entry.ip_address}
									<div class="mt-2 text-xs text-gray-500">
										IP: {entry.ip_address}
									</div>
								{/if}
							</div>
						{/each}
					</div>
					
					<!-- Paginação -->
					{#if totalPages > 1}
						<div class="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-gray-200">
							<button
								type="button"
								onclick={() => { page = Math.max(1, page - 1); loadHistory(); }}
								disabled={page <= 1}
								class="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
							>
								<ModernIcon name="ChevronLeft" size="16" />
							</button>
							
							<span class="text-sm text-gray-600">
								Página {page} de {totalPages}
							</span>
							
							<button
								type="button"
								onclick={() => { page = Math.min(totalPages, page + 1); loadHistory(); }}
								disabled={page >= totalPages}
								class="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
							>
								<ModernIcon name="ChevronRight" size="16" />
							</button>
						</div>
					{/if}
				{/if}
			</div>
			
			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
				<button
					type="button"
					onclick={onClose}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Fechar
				</button>
			</div>
		</div>
	</div>
{/if} 