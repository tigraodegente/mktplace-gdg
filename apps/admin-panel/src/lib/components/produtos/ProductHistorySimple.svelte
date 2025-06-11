<script lang="ts">
	import { onMount } from 'svelte';
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	let { productId = '', show = $bindable(false) } = $props();
	
	let loading = false;
	let history: any[] = [];
	
	// Carregar histórico
	async function loadHistory(): Promise<void> {
		if (!productId) return;
		
		loading = true;
		try {
			const response = await fetch(`/api/products/${productId}/history?page=1&limit=20`);
			const result = await response.json();
			
			if (result.success) {
				history = result.data;
			}
		} catch (error) {
			console.error('Erro ao carregar histórico:', error);
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
			case 'deleted': return 'trash';
			case 'published': return 'Eye';
			case 'unpublished': return 'eye-off';
			default: return 'history';
		}
	}
	
	// Obter cor da ação
	function getActionColor(action: string): string {
		switch (action) {
			case 'created': return 'text-green-600 bg-green-50 border-green-200';
			case 'updated': return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'deleted': return 'text-red-600 bg-red-50 border-red-200';
			case 'published': return 'text-green-600 bg-green-50 border-green-200';
			case 'unpublished': return 'text-gray-600 bg-gray-50 border-gray-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}
	
	// Carregar quando mostrar  
	$effect(() => {
		if (show && productId) {
			loadHistory();
		}
	});
</script>

{#if show}
	<!-- Modal Overlay -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
						<ModernIcon name="history" size="md" />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-900">Histórico de Alterações</h3>
						<p class="text-sm text-gray-500">Acompanhe todas as mudanças feitas no produto</p>
					</div>
				</div>
				
				<button
					on:click={() => show = false}
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ModernIcon name="X" size="md" />
				</button>
			</div>
			
			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if loading}
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
								<!-- Timeline Icon -->
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
									<div class="bg-white border border-gray-200 rounded-lg p-4">
										<!-- Header -->
										<div class="flex items-start justify-between mb-2">
											<div class="flex items-center gap-2">
												<span class="text-sm font-medium text-gray-900">
													{entry.summary}
												</span>
											</div>
											<span class="text-xs text-gray-500 whitespace-nowrap">
												{formatDate(entry.created_at)}
											</span>
										</div>
										
										<!-- User Info -->
										<div class="flex items-center gap-2">
											<div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
												<ModernIcon name="User" size="xs" />
											</div>
											<div class="text-sm text-gray-600">
												<span class="font-medium">{entry.user_name || 'Sistema'}</span>
												{#if entry.user_email && entry.user_email !== 'system@marketplace.com'}
													<span class="text-gray-500">({entry.user_email})</span>
												{/if}
											</div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if} 