<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import BasicTab from '$lib/components/produtos/BasicTab.svelte';
	import MediaTab from '$lib/components/produtos/MediaTab.svelte';
	import ShippingTab from '$lib/components/produtos/ShippingTab.svelte';
	import SeoTab from '$lib/components/produtos/SeoTab.svelte';
	import AdvancedTab from '$lib/components/produtos/AdvancedTab.svelte';
	import { productService } from '$lib/services/productService';
	
	// Estados
	let loading = $state(true);
	let saving = $state(false);
	let activeTab = $state('basic');
	let formData = $state<any>({});
	let productId = $derived($page.params.id);
	
	// Tabs disponíveis
	const tabs = [
		{ id: 'basic', label: 'Informações Básicas', icon: 'Package' },
		{ id: 'media', label: 'Imagens', icon: 'image' },
		{ id: 'shipping', label: 'Frete e Entrega', icon: 'truck' },
		{ id: 'seo', label: 'SEO', icon: 'search' },
		{ id: 'advanced', label: 'Avançado', icon: 'Settings' }
	];
	
	// Carregar produto
	async function loadProduct() {
		loading = true;
		try {
			const response = await fetch(`/api/products/${productId}`);
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					formData = result.data;
					
					// Preparar campos especiais
					if (formData.tags && Array.isArray(formData.tags)) {
						formData.tags_input = formData.tags.join(', ');
					}
					if (formData.meta_keywords && Array.isArray(formData.meta_keywords)) {
						formData.meta_keywords_input = formData.meta_keywords.join(', ');
					}
					
					// Preparar imagens
					if (formData.images && Array.isArray(formData.images)) {
						formData.images = formData.images.map((img: any) => 
							typeof img === 'string' ? img : img.url
						);
					} else {
						formData.images = [];
					}
					
					// Inicializar campos booleanos
					formData.is_active = formData.is_active ?? true;
					formData.featured = formData.featured ?? false;
					formData.has_free_shipping = formData.has_free_shipping ?? false;
					formData.track_inventory = formData.track_inventory ?? true;
					formData.allow_backorder = formData.allow_backorder ?? false;
				} else {
					alert(result.error || 'Erro ao carregar produto');
					goto('/produtos');
				}
			} else {
				alert('Erro ao carregar produto');
				goto('/produtos');
			}
		} catch (error) {
			console.error('Erro:', error);
			alert('Erro ao carregar produto');
			goto('/produtos');
		} finally {
			loading = false;
		}
	}
	
	// Salvar produto
	async function saveProduct() {
		saving = true;
		try {
			// Preparar dados para envio
			const dataToSend = {
				...formData,
				// Converter strings para arrays
				tags: formData.tags_input?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
				meta_keywords: formData.meta_keywords_input?.split(',').map((k: string) => k.trim()).filter(Boolean) || [],
				// Garantir que números sejam números
				price: parseFloat(formData.price) || 0,
				original_price: formData.original_price ? parseFloat(formData.original_price) : null,
				cost: formData.cost ? parseFloat(formData.cost) : 0,
				quantity: parseInt(formData.quantity) || 0,
				weight: formData.weight ? parseFloat(formData.weight) : null,
				height: formData.height ? parseFloat(formData.height) : null,
				width: formData.width ? parseFloat(formData.width) : null,
				length: formData.length ? parseFloat(formData.length) : null,
				delivery_days_min: formData.delivery_days_min ? parseInt(formData.delivery_days_min) : null,
				delivery_days_max: formData.delivery_days_max ? parseInt(formData.delivery_days_max) : null
			};
			
			// Remover campos temporários
			delete dataToSend.tags_input;
			delete dataToSend.meta_keywords_input;
			delete dataToSend.category_name;
			delete dataToSend.brand_name;
			delete dataToSend.vendor_name;
			
			const response = await fetch(`/api/products/${productId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(dataToSend)
			});
			
			const result = await response.json();
			
			if (response.ok && result.success) {
				alert(result.message || 'Produto atualizado com sucesso!');
				await loadProduct(); // Recarregar dados
			} else {
				alert(result.error || result.message || 'Erro ao salvar produto');
			}
		} catch (error) {
			console.error('Erro:', error);
			alert('Erro ao salvar produto');
		} finally {
			saving = false;
		}
	}
	
	// Lifecycle
	onMount(() => {
		loadProduct();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						type="button"
						onclick={() => goto('/produtos')}
						class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ModernIcon name="ChevronLeft" size={20} />
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">
							{loading ? 'Carregando...' : `Editar: ${formData.name || 'Produto'}`}
						</h1>
						<p class="text-sm text-gray-600">
							{loading ? '...' : `SKU: ${formData.sku || 'N/A'}`}
						</p>
					</div>
				</div>
				
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => goto('/produtos')}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={saveProduct}
						disabled={saving || loading}
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="Save" size={16} />
						{/if}
						Salvar
					</button>
				</div>
			</div>
		</div>
	</div>
	
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<!-- Tabs -->
		<div class="bg-white border-b sticky top-0 z-10">
			<div class="max-w-[calc(100vw-100px)] mx-auto px-4">
				<div class="flex gap-6 overflow-x-auto">
					{#each tabs as tab}
						<button
							type="button"
							onclick={() => activeTab = tab.id}
							class="py-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap {
								activeTab === tab.id 
									? 'border-[#00BFB3] text-[#00BFB3]' 
									: 'border-transparent text-gray-600 hover:text-gray-900'
							}"
						>
							<ModernIcon name={tab.icon} size={16} />
							{tab.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
		
		<!-- Content -->
		<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
			{#if activeTab === 'basic'}
				<BasicTab {formData} />
			{:else if activeTab === 'media'}
				<MediaTab {formData} />
			{:else if activeTab === 'shipping'}
				<ShippingTab {formData} />
			{:else if activeTab === 'seo'}
				<SeoTab {formData} />
			{:else if activeTab === 'advanced'}
				<AdvancedTab {formData} />
			{/if}
		</div>
	{/if}
</div>

<style>
	:global(.btn) {
		@apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
	}
	
	:global(.btn-primary) {
		@apply bg-[#00BFB3] text-white hover:bg-[#00A89D];
	}
	
	:global(.btn-secondary) {
		@apply bg-gray-200 text-gray-700 hover:bg-gray-300;
	}
	
	:global(.spinner) {
		@apply border-4 border-gray-200 border-t-[#00BFB3] rounded-full animate-spin;
	}
</style> 