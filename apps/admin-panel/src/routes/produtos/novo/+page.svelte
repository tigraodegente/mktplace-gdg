<script lang="ts">
	import { goto } from '$app/navigation';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import BasicTab from '$lib/components/produtos/BasicTab.svelte';
	import PricingTab from '$lib/components/produtos/PricingTab.svelte';
	import AttributesSection from '$lib/components/produtos/AttributesSection.svelte';
	import VariantsTab from '$lib/components/produtos/VariantsTab.svelte';
	import InventoryTab from '$lib/components/produtos/InventoryTab.svelte';
	import MediaTab from '$lib/components/produtos/MediaTab.svelte';
	import ShippingTab from '$lib/components/produtos/ShippingTab.svelte';
	import SeoTab from '$lib/components/produtos/SeoTab.svelte';
	import AdvancedTab from '$lib/components/produtos/AdvancedTab.svelte';
	import EnrichmentProgress from '$lib/components/produtos/EnrichmentProgress.svelte';
	import { toast } from '$lib/stores/toast';
	
	// Estados
	let saving = $state(false);
	let activeTab = $state('basic');
	let enriching = $state(false);
	let showEnrichmentModal = $state(false);
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
		
		// Campos específicos para PricingTab
		cost_price: 0,
		sale_price: 0,
		regular_price: 0,
		markup_percentage: 0,
		min_price: 0,
		max_price: 0,
		
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
		
		// Atributos e Especificações (NOVO)
		attributes: {},
		specifications: {},
		
		// Variações
		has_variants: false,
		product_options: [],
		product_variants: [],
		
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
	
	// Tabs disponíveis - EXATAMENTE IGUAIS à página de edição
	const tabs = [
		{ id: 'basic', label: 'Informações Básicas', icon: 'Package' },
		{ id: 'pricing', label: 'Preços e Margens', icon: 'DollarSign' },
		{ id: 'attributes', label: 'Atributos e Especificações', icon: 'Settings' },
		{ id: 'variants', label: 'Variações', icon: 'Layers' },
		{ id: 'inventory', label: 'Estoque', icon: 'BarChart3' },
		{ id: 'media', label: 'Imagens', icon: 'Image' },
		{ id: 'shipping', label: 'Frete e Entrega', icon: 'Package' },
		{ id: 'seo', label: 'SEO', icon: 'Search' },
		{ id: 'advanced', label: 'Avançado', icon: 'Settings' }
	];
	
	// Enriquecer produto completo com IA
	async function enrichCompleteProduct() {
		console.log('🚀 NOVO PRODUTO - enrichCompleteProduct CHAMADO!');
		console.log('formData.name:', formData.name);
		console.log('enriching:', enriching);
		
		if (!formData.name || formData.name.trim() === '') {
			console.log('❌ Nome do produto vazio');
			toast.error('Por favor, insira um nome para o produto antes de enriquecer com IA');
			return;
		}
		
		// Abrir modal de progresso
		enriching = true;
		showEnrichmentModal = true;
		console.log('✅ Modal de progresso aberta');
	}
	
	// Handlers da modal de progresso
	function handleEnrichmentComplete(result: any) {
		console.log('🎉 Enriquecimento completo recebido:', result);
		
		if (result.success && result.data) {
			const enrichedData = result.data;
			console.log('📝 Aplicando dados enriquecidos...');
			
			// Aplicar dados básicos
			if (enrichedData.name) {
				formData.name = enrichedData.name;
				console.log('✅ Nome atualizado:', enrichedData.name);
			}
			if (enrichedData.slug) formData.slug = enrichedData.slug;
			if (enrichedData.sku) formData.sku = enrichedData.sku;
			if (enrichedData.description) formData.description = enrichedData.description;
			if (enrichedData.short_description) formData.short_description = enrichedData.short_description;
			if (enrichedData.model) formData.model = enrichedData.model;
			if (enrichedData.barcode) formData.barcode = enrichedData.barcode;
			
			// Tags
			if (enrichedData.tags && Array.isArray(enrichedData.tags)) {
				formData.tags = enrichedData.tags;
				formData.tags_input = enrichedData.tags.join(', ');
				console.log('✅ Tags aplicadas:', enrichedData.tags);
			}
			
			// Preços
			if (enrichedData.cost) formData.cost = enrichedData.cost;
			if (enrichedData.price) formData.price = enrichedData.price;
			
			// Dimensões e peso
			if (enrichedData.weight) formData.weight = enrichedData.weight;
			if (enrichedData.dimensions) {
				if (enrichedData.dimensions.height) formData.height = enrichedData.dimensions.height;
				if (enrichedData.dimensions.width) formData.width = enrichedData.dimensions.width;
				if (enrichedData.dimensions.length) formData.length = enrichedData.dimensions.length;
				console.log('✅ Dimensões aplicadas:', enrichedData.dimensions);
			}
			
			// Entrega
			if (enrichedData.delivery_days_min) formData.delivery_days_min = enrichedData.delivery_days_min;
			if (enrichedData.delivery_days_max) formData.delivery_days_max = enrichedData.delivery_days_max;
			if (enrichedData.has_free_shipping !== undefined) formData.has_free_shipping = enrichedData.has_free_shipping;
			
			// SEO
			if (enrichedData.meta_title) formData.meta_title = enrichedData.meta_title;
			if (enrichedData.meta_description) formData.meta_description = enrichedData.meta_description;
			if (enrichedData.meta_keywords && Array.isArray(enrichedData.meta_keywords)) {
				formData.meta_keywords = enrichedData.meta_keywords;
				formData.meta_keywords_input = enrichedData.meta_keywords.join(', ');
			}
			
			// Dados avançados
			if (enrichedData.warranty_period) formData.warranty_period = enrichedData.warranty_period;
			if (enrichedData.care_instructions) formData.care_instructions = enrichedData.care_instructions;
			if (enrichedData.manufacturing_country) formData.manufacturing_country = enrichedData.manufacturing_country;
			
			// ===== APLICAR ATRIBUTOS E ESPECIFICAÇÕES (NOVO) =====
			// Aplicar atributos para filtros
			if (enrichedData.suggested_attributes && typeof enrichedData.suggested_attributes === 'object') {
				console.log('🎯 +page: Aplicando atributos sugeridos da IA:', enrichedData.suggested_attributes);
				
				// Converter array de objetos para objeto simples se necessário
				if (Array.isArray(enrichedData.suggested_attributes)) {
					const attributesObj: Record<string, string[]> = {};
					enrichedData.suggested_attributes.forEach((attr: any) => {
						if (attr.name && attr.values) {
							attributesObj[attr.name] = Array.isArray(attr.values) ? attr.values : [attr.values];
						}
					});
					formData.attributes = {
						...formData.attributes,
						...attributesObj
					};
				} else {
					formData.attributes = {
						...formData.attributes,
						...enrichedData.suggested_attributes
					};
				}
				console.log('✅ +page: Atributos aplicados:', formData.attributes);
			} else if (enrichedData.attributes && typeof enrichedData.attributes === 'object') {
				console.log('🎯 +page: Aplicando atributos da IA:', enrichedData.attributes);
				formData.attributes = {
					...formData.attributes,
					...enrichedData.attributes
				};
				console.log('✅ +page: Atributos aplicados:', formData.attributes);
			}
			
			// Aplicar especificações técnicas
			if (enrichedData.suggested_specifications && typeof enrichedData.suggested_specifications === 'object') {
				console.log('🎯 +page: Aplicando especificações sugeridas da IA:', enrichedData.suggested_specifications);
				formData.specifications = {
					...formData.specifications,
					...enrichedData.suggested_specifications
				};
				console.log('✅ +page: Especificações aplicadas:', formData.specifications);
			} else if (enrichedData.specifications && typeof enrichedData.specifications === 'object') {
				console.log('🎯 +page: Aplicando especificações da IA:', enrichedData.specifications);
				formData.specifications = {
					...formData.specifications,
					...enrichedData.specifications
				};
				console.log('✅ +page: Especificações aplicadas:', formData.specifications);
			}
			
			// ===== APLICAR CATEGORIA E MARCA =====
			// Categoria - Verificar diferentes estruturas possíveis
			if (enrichedData.category_suggestion?.primary_category_id) {
				console.log('🎯 +page: Aplicando categoria (estrutura category_suggestion):', enrichedData.category_suggestion);
				formData.category_id = enrichedData.category_suggestion.primary_category_id;
				
				if (enrichedData.category_suggestion.related_categories) {
					const relatedIds = enrichedData.category_suggestion.related_categories.map((c: any) => c.category_id);
					formData._selected_categories = [enrichedData.category_suggestion.primary_category_id, ...relatedIds];
					formData._related_categories = enrichedData.category_suggestion.related_categories;
				} else {
					formData._selected_categories = [enrichedData.category_suggestion.primary_category_id];
				}
				console.log('✅ +page: Categoria aplicada:', formData.category_id);
			} else if (enrichedData.category_id) {
				console.log('🎯 +page: Aplicando categoria (categoria direta):', enrichedData.category_id);
				formData.category_id = enrichedData.category_id;
				console.log('✅ +page: Categoria aplicada:', formData.category_id);
			} else {
				console.log('❌ +page: Nenhuma categoria encontrada no enriquecimento completo');
				console.log('🔍 +page: Estrutura completa dos dados:', JSON.stringify(enrichedData, null, 2));
			}
			
			// Marca - Verificar diferentes estruturas possíveis
			if (enrichedData.brand_suggestion?.brand_id) {
				console.log('🎯 +page: Aplicando marca (estrutura brand_suggestion):', enrichedData.brand_suggestion);
				formData.brand_id = enrichedData.brand_suggestion.brand_id;
				console.log('✅ +page: Marca aplicada:', enrichedData.brand_suggestion.brand_id);
			} else if (enrichedData.brand_id) {
				console.log('🎯 +page: Aplicando marca (marca direta):', enrichedData.brand_id);
				formData.brand_id = enrichedData.brand_id;
				console.log('✅ +page: Marca aplicada:', enrichedData.brand_id);
			} else if (enrichedData.brand_suggestion?.brand_name) {
				console.log('⚠️ +page: Marca detectada mas não cadastrada:', enrichedData.brand_suggestion.brand_name);
				formData._suggested_brand = enrichedData.brand_suggestion.brand_name;
			} else {
				console.log('❌ +page: Nenhuma marca encontrada no enriquecimento completo');
				console.log('🔍 +page: Estrutura completa dos dados:', JSON.stringify(enrichedData, null, 2));
			}
			
			console.log('🎉 Todos os dados aplicados com sucesso!');
			console.log('📋 FormData atualizado:', formData);
			
			toast.success('🚀 Produto enriquecido com IA! Revise todas as abas antes de salvar.');
		} else {
			console.error('❌ Resposta sem sucesso:', result);
			toast.error('Erro ao enriquecer produto');
		}
		
		// Fechar modal
		showEnrichmentModal = false;
		enriching = false;
	}
	
	function handleEnrichmentCancel() {
		console.log('🛑 Enriquecimento cancelado pelo usuário');
		showEnrichmentModal = false;
		enriching = false;
		toast.info('Enriquecimento cancelado');
	}
	
	// Salvar produto
	async function saveProduct() {
		saving = true;
		try {
					// Preparar dados para envio
		const dataToSend = {
			...formData,
			tags: formData.tags_input?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
			meta_keywords: formData.meta_keywords_input?.split(',').map((k: string) => k.trim()).filter(Boolean) || [],
			// ===== MAPEAR PREÇOS DO PricingTab PARA O BANCO =====
			// PricingTab usa: cost_price, sale_price, regular_price
			// Banco espera: cost, price, original_price
			price: parseFloat(formData.sale_price || formData.price) || 0,
			original_price: formData.regular_price ? parseFloat(formData.regular_price) : null,
			cost: parseFloat(formData.cost_price || formData.cost) || 0
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
				toast.success('Produto criado com sucesso!');
				goto(`/produtos/${data.data.id}`);
			} else {
				const error = await response.json();
				toast.error(error.message || 'Erro ao criar produto');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao criar produto');
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
						<ModernIcon name="ChevronLeft" size="md" />
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
						onclick={enrichCompleteProduct}
						disabled={enriching || !formData.name}
						class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
						title="Enriquecer com IA"
					>
						{#if enriching}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							<span>Enriquecendo...</span>
						{:else}
							<ModernIcon name="robot" size="sm" />
							<span>Enriquecer com IA</span>
						{/if}
					</button>
					
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
							<ModernIcon name="Plus" size="sm" />
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
						<ModernIcon name={tab.icon} size="sm" />
						{tab.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
	
	<!-- Content -->
	<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
		{#if activeTab === 'basic'}
			<BasicTab bind:formData />
		{:else if activeTab === 'pricing'}
			<PricingTab bind:formData />
		{:else if activeTab === 'attributes'}
			<AttributesSection bind:formData />
		{:else if activeTab === 'variants'}
			<VariantsTab bind:formData />
		{:else if activeTab === 'inventory'}
			<InventoryTab bind:formData />
		{:else if activeTab === 'media'}
			<MediaTab bind:formData productId="" />
		{:else if activeTab === 'shipping'}
			<ShippingTab bind:formData />
		{:else if activeTab === 'seo'}
			<SeoTab bind:formData />
		{:else if activeTab === 'advanced'}
			<AdvancedTab bind:formData />
		{/if}
	</div>
</div>

<!-- Modal de Progresso do Enriquecimento IA -->
{#if showEnrichmentModal}
	<EnrichmentProgress 
		productData={formData}
		onComplete={handleEnrichmentComplete}
		onCancel={handleEnrichmentCancel}
	/>
{/if}

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