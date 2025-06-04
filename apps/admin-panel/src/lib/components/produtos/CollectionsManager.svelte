<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	interface Props {
		productId?: string;
	}
	
	let { productId = $bindable() }: Props = $props();
	
	let collections = $state<any[]>([]);
	let productCollections = $state<any[]>([]);
	let loading = $state(true);
	
	// Validar se productId é um UUID válido
	function isValidUUID(id: string | undefined | null): boolean {
		if (!id || typeof id !== 'string') return false;
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return uuidRegex.test(id);
	}
	
	async function loadData() {
		if (!isValidUUID(productId)) return;
		
		loading = true;
		try {
			const [collectionsRes] = await Promise.all([
				fetch('/api/collections')
			]);
			
			const collectionsResult = await collectionsRes.json();
			
			if (collectionsResult.success) {
				collections = collectionsResult.data || [];
				// Filtrar coleções que já contém este produto
				productCollections = collections.filter(c => 
					c.product_names && c.product_names.includes(productId)
				);
			}
		} catch (error) {
			console.error('Erro:', error);
			if (toast?.error) {
				toast.error('Erro ao carregar coleções');
			}
		} finally {
			loading = false;
		}
	}
	
	async function addToCollection(collectionId: string) {
		if (!isValidUUID(productId)) return;
		
		try {
			const response = await fetch(`/api/collections/${collectionId}/products`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_id: productId,
					position: 999 // Adicionar no final
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				if (toast?.success) {
					toast.success('Produto adicionado à coleção');
				}
				await loadData(); // Recarregar dados
			} else {
				if (toast?.error) {
					toast.error(result.message || 'Erro ao adicionar à coleção');
				}
			}
		} catch (error) {
			console.error('Erro:', error);
			if (toast?.error) {
				toast.error('Erro ao conectar com o servidor');
			}
		}
	}
	
	async function removeFromCollection(collectionId: string) {
		if (!isValidUUID(productId)) return;
		
		try {
			const response = await fetch(`/api/collections/${collectionId}/products/${productId}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (result.success) {
				if (toast?.success) {
					toast.success('Produto removido da coleção');
				}
				await loadData(); // Recarregar dados
			} else {
				if (toast?.error) {
					toast.error(result.message || 'Erro ao remover da coleção');
				}
			}
		} catch (error) {
			console.error('Erro:', error);
			if (toast?.error) {
				toast.error('Erro ao conectar com o servidor');
			}
		}
	}
	
	$effect(() => {
		if (isValidUUID(productId)) {
			loadData();
		}
	});
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h4 class="font-semibold text-gray-900 flex items-center gap-2">
			<ModernIcon name="Package" size="md" /> Coleções e Kits
		</h4>
		<a 
			href="/colecoes" 
			class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2"
		>
			<ModernIcon name="Plus" size="sm" /> Gerenciar Coleções
		</a>
	</div>
	
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
			<span class="ml-2 text-gray-600">Carregando coleções...</span>
		</div>
	{:else}
		<!-- Coleções que contém este produto -->
		{#if productCollections.length > 0}
			<div>
				<h5 class="font-medium text-gray-900 mb-3">Este produto está nas seguintes coleções:</h5>
				<div class="space-y-2">
					{#each productCollections as collection}
						<div class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
							<div>
								<h6 class="font-medium text-gray-900">{collection.name}</h6>
								<p class="text-sm text-gray-600">{collection.type === 'kit' ? 'Kit' : 'Coleção'}</p>
							</div>
							<button 
								type="button"
								onclick={() => removeFromCollection(collection.id)}
								class="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition-colors"
							>
								Remover
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- Outras coleções disponíveis -->
		{#if collections.length > productCollections.length}
			<div>
				<h5 class="font-medium text-gray-900 mb-3">Adicionar a outras coleções:</h5>
				<div class="space-y-2 max-h-60 overflow-y-auto">
					{#each collections.filter(c => !productCollections.some(pc => pc.id === c.id)) as collection}
						<div class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
							<div>
								<h6 class="font-medium text-gray-900">{collection.name}</h6>
								<p class="text-sm text-gray-500">
									{collection.type === 'kit' ? 'Kit' : 'Coleção'} • 
									{collection.product_count || 0} produtos
								</p>
							</div>
							<button 
								type="button"
								onclick={() => addToCollection(collection.id)}
								class="px-3 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg text-sm transition-colors"
							>
								Adicionar
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
		
		{#if collections.length === 0}
			<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
				<div class="text-4xl text-gray-300 mb-4">
					<ModernIcon name="Package" size="2xl" color="muted" />
				</div>
				<p class="text-gray-500">Nenhuma coleção criada</p>
				<p class="text-xs text-gray-500 mt-1">Crie coleções para agrupar produtos</p>
				<a href="/colecoes" class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#00BFB3] text-white rounded-lg text-sm transition-colors hover:bg-[#00A89D]">
					<ModernIcon name="Plus" size="sm" /> Criar Primeira Coleção
				</a>
			</div>
		{/if}
	{/if}
</div> 