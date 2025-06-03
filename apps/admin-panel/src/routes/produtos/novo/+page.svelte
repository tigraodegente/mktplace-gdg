<script lang="ts">
	import { goto } from '$app/navigation';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import BasicTab from '$lib/components/produtos/BasicTab.svelte';
	import MediaTab from '$lib/components/produtos/MediaTab.svelte';
	import ShippingTab from '$lib/components/produtos/ShippingTab.svelte';
	import SeoTab from '$lib/components/produtos/SeoTab.svelte';
	import AdvancedTab from '$lib/components/produtos/AdvancedTab.svelte';
	
	// Estados
	let saving = $state(false);
	let activeTab = $state('basic');
	let formData = $state<any>({
		// Informações básicas
		name: '',
		slug: '',
		sku: '',
		barcode: '',
		model: '',
		description: '',
		short_description: '',
		
		// Preços
		price: 0,
		original_price: 0,
		cost: 0,
		currency: 'BRL',
		
		// Estoque
		quantity: 0,
		stock_location: '',
		track_inventory: true,
		allow_backorder: false,
		
		// Relacionamentos
		category_id: '',
		brand_id: '',
		seller_id: '',
		
		// Status
		status: 'draft',
		is_active: false,
		featured: false,
		condition: 'new',
		
		// Dimensões e peso
		weight: 0,
		height: 0,
		width: 0,
		length: 0,
		
		// Frete
		has_free_shipping: false,
		delivery_days_min: 3,
		delivery_days_max: 7,
		seller_state: '',
		seller_city: '',
		shipping_restrictions: '',
		shipping_pac: true,
		shipping_sedex: true,
		shipping_carrier: false,
		shipping_pickup: false,
		
		// SEO
		meta_title: '',
		meta_description: '',
		meta_keywords: [],
		meta_keywords_input: '',
		og_title: '',
		og_description: '',
		og_image: '',
		canonical_url: '',
		seo_index: true,
		seo_follow: true,
		
		// Arrays
		images: [],
		tags: [],
		tags_input: '',
		
		// Avançado
		requires_shipping: true,
		is_digital: false,
		tax_class: 'standard',
		warranty_period: '',
		manufacturing_country: '',
		product_condition: 'new',
		custom_fields: {},
		related_products: [],
		upsell_products: [],
		download_files: []
	});
	
	// Tabs disponíveis
	const tabs = [
		{ id: 'basic', label: 'Informações Básicas', icon: 'Package' },
		{ id: 'media', label: 'Imagens', icon: 'image' },
		{ id: 'shipping', label: 'Frete e Entrega', icon: 'truck' },
		{ id: 'seo', label: 'SEO', icon: 'search' },
		{ id: 'advanced', label: 'Avançado', icon: 'Settings' }
	];
	
	// Salvar produto
	async function saveProduct() {
		saving = true;
		try {
			// Preparar dados para envio
			const dataToSend = {
				...formData,
				tags: formData.tags_input?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
				meta_keywords: formData.meta_keywords_input?.split(',').map((k: string) => k.trim()).filter(Boolean) || []
			};
			
			const response = await fetch('/api/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(dataToSend)
			});
			
			if (response.ok) {
				const data = await response.json();
				alert('Produto criado com sucesso!');
				goto(`/produtos/${data.data.id}`);
			} else {
				const error = await response.json();
				alert(error.message || 'Erro ao criar produto');
			}
		} catch (error) {
			console.error('Erro:', error);
			alert('Erro ao criar produto');
		} finally {
			saving = false;
		}
	}
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
							Novo Produto
						</h1>
						<p class="text-sm text-gray-600">
							Preencha as informações para criar um novo produto
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
						disabled={saving}
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="Plus" size={16} />
						{/if}
						Criar Produto
					</button>
				</div>
			</div>
		</div>
	</div>
	
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