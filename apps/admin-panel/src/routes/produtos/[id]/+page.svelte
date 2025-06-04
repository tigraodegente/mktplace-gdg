<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import EnrichmentProgress from '$lib/components/produtos/EnrichmentProgress.svelte';
	import BasicTab from '$lib/components/produtos/BasicTab.svelte';
	import AttributesSection from '$lib/components/produtos/AttributesSection.svelte';
	import MediaTab from '$lib/components/produtos/MediaTab.svelte';
	import ShippingTab from '$lib/components/produtos/ShippingTab.svelte';
	import SeoTab from '$lib/components/produtos/SeoTab.svelte';
	import AdvancedTab from '$lib/components/produtos/AdvancedTab.svelte';
	import { productService } from '$lib/services/productService';
	import { toast } from '$lib/stores/toast';
	
	// Estados
	let loading = $state(true);
	let saving = $state(false);
	let activeTab = $state('basic');
	let formData = $state<any>({});
	let productId = $derived($page.params.id);
	let showEnrichmentProgress = $state(false);
	let isEnriching = $state(false);
	
	// Tabs disponíveis
	const tabs = [
		{ id: 'basic', label: 'Informações Básicas', icon: 'Package' },
		{ id: 'attributes', label: 'Atributos e Especificações', icon: 'Settings' },
		{ id: 'media', label: 'Imagens', icon: 'image' },
		{ id: 'shipping', label: 'Frete e Entrega', icon: 'truck' },
		{ id: 'seo', label: 'SEO', icon: 'search' },
		{ id: 'advanced', label: 'Avançado', icon: 'Settings' }
	];
	
	// Enriquecer produto completo com IA
	async function enrichCompleteProduct() {
		console.log('🚀 enrichCompleteProduct CHAMADO!');
		console.log('isEnriching:', isEnriching);
		console.log('showEnrichmentProgress:', showEnrichmentProgress);
		console.log('formData.name:', formData.name);
		
		if (isEnriching) {
			console.log('❌ Já está enriquecendo, ignorando...');
			return;
		}
		
		if (!formData.name || formData.name.trim() === '') {
			console.log('❌ Nome do produto vazio');
			toast.error('Por favor, insira um nome para o produto antes de enriquecer com IA');
			return;
		}
		
		console.log('✅ Iniciando enriquecimento completo...');
		
		isEnriching = true;
		showEnrichmentProgress = true;
		
		console.log('📝 Estados atualizados:');
		console.log('isEnriching:', isEnriching);
		console.log('showEnrichmentProgress:', showEnrichmentProgress);
		
		// Toast de debug
		toast.info(`🚀 Iniciando enriquecimento para "${formData.name}"`);
		
		try {
			console.log('📡 Fazendo chamada para API...');
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					fetchCategories: true,
					fetchBrands: true,
					action: 'enrich_all'
				})
			});
			
			console.log('📡 Resposta da API:', response.status);
			
			if (!response.ok) {
				const errorData = await response.json();
				console.error('❌ Erro da API:', errorData);
				throw new Error(errorData.error || 'Erro ao enriquecer produto');
			}
			
			const result = await response.json();
			console.log('✅ Resultado da API:', result);
			
			if (result.success) {
				// Simular progresso para mostrar as etapas
				await new Promise(resolve => setTimeout(resolve, 2000));
				
				handleEnrichmentComplete(result);
			} else {
				throw new Error(result.error || 'Erro ao enriquecer produto');
			}
		} catch (error: any) {
			console.error('❌ Erro no enriquecimento:', error);
			toast.error('❌ ' + error.message);
			showEnrichmentProgress = false;
			isEnriching = false;
		}
	}
	
	// Carregar produto
	async function loadProduct() {
		loading = true;
		try {
			const response = await fetch(`/api/products/${productId}`);
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					formData = result.data;
					
					// Inicializar arrays vazios se não existirem
					formData.tags = formData.tags || [];
					formData.meta_keywords = formData.meta_keywords || [];
					formData.images = formData.images || [];
					formData.categories = formData.categories || [];
					formData.variations = formData.variations || [];
					
					// Inicializar atributos e especificações (NOVO)
					formData.attributes = formData.attributes || {};
					formData.specifications = formData.specifications || {};
					
					// Preparar campos especiais
					if (formData.tags && Array.isArray(formData.tags)) {
						formData.tags_input = formData.tags.join(', ');
					} else {
						formData.tags = [];
						formData.tags_input = '';
					}
					
					if (formData.meta_keywords && Array.isArray(formData.meta_keywords)) {
						formData.meta_keywords_input = formData.meta_keywords.join(', ');
					} else {
						formData.meta_keywords = [];
						formData.meta_keywords_input = '';
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
					toast.error(result.error || 'Erro ao carregar produto');
					goto('/produtos');
				}
			} else {
				toast.error('Erro ao carregar produto');
				goto('/produtos');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao carregar produto');
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
				toast.success(result.message || 'Produto atualizado com sucesso!');
				await loadProduct(); // Recarregar dados
			} else {
				toast.error(result.error || result.message || 'Erro ao salvar produto');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao salvar produto');
		} finally {
			saving = false;
		}
	}
	
	// Enriquecer com IA
	async function enrichWithAI(fields?: string[]) {
		if (isEnriching) return;
		
		showEnrichmentProgress = true;
		isEnriching = true;
	}
	
	// Callback quando o enriquecimento for concluído
	function handleEnrichmentComplete(result: any) {
		console.log('Enriquecimento concluído:', result);
		
		// Verificar se temos dados no resultado
		const enrichedData = result.data || result.enrichedData || result;
		
		if (enrichedData) {
			// Aplicar dados mantendo campos originais quando necessário
			
			// Atualizar apenas campos que foram melhorados
			if (enrichedData.enhanced_name) formData.name = enrichedData.enhanced_name;
			if (enrichedData.slug) formData.slug = enrichedData.slug;
			if (enrichedData.sku) formData.sku = enrichedData.sku;
			if (enrichedData.description) formData.description = enrichedData.description;
			if (enrichedData.short_description) formData.short_description = enrichedData.short_description;
			if (enrichedData.model) formData.model = enrichedData.model;
			if (enrichedData.barcode) formData.barcode = enrichedData.barcode;
			if (enrichedData.tags) {
				formData.tags = enrichedData.tags;
				formData.tags_input = enrichedData.tags.join(', ');
			}
			
			// Dados de frete
			if (enrichedData.weight) formData.weight = enrichedData.weight;
			if (enrichedData.dimensions) {
				formData.height = enrichedData.dimensions.height;
				formData.width = enrichedData.dimensions.width;
				formData.length = enrichedData.dimensions.length;
			}
			if (enrichedData.delivery_days_min) formData.delivery_days_min = enrichedData.delivery_days_min;
			if (enrichedData.delivery_days_max) formData.delivery_days_max = enrichedData.delivery_days_max;
			
			// SEO
			if (enrichedData.meta_title) formData.meta_title = enrichedData.meta_title;
			if (enrichedData.meta_description) formData.meta_description = enrichedData.meta_description;
			if (enrichedData.meta_keywords) {
				formData.meta_keywords = enrichedData.meta_keywords;
				formData.meta_keywords_input = enrichedData.meta_keywords.join(', ');
			}
			
			// Outros dados
			if (enrichedData.cost) formData.cost = enrichedData.cost;
			if (enrichedData.stock_location) formData.stock_location = enrichedData.stock_location;
			
			// ===== APLICAR ATRIBUTOS E ESPECIFICAÇÕES (NOVO) =====
			// Aplicar atributos para filtros
			if (enrichedData.suggested_attributes && typeof enrichedData.suggested_attributes === 'object') {
				console.log('🎯 Aplicando atributos sugeridos da IA:', enrichedData.suggested_attributes);
				if (!formData.attributes) formData.attributes = {};
				
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
				console.log('✅ Atributos aplicados:', formData.attributes);
			} else if (enrichedData.attributes && typeof enrichedData.attributes === 'object') {
				console.log('🎯 Aplicando atributos da IA:', enrichedData.attributes);
				if (!formData.attributes) formData.attributes = {};
				formData.attributes = {
					...formData.attributes,
					...enrichedData.attributes
				};
				console.log('✅ Atributos aplicados:', formData.attributes);
			}
			
			// Aplicar especificações técnicas
			if (enrichedData.suggested_specifications && typeof enrichedData.suggested_specifications === 'object') {
				console.log('🎯 Aplicando especificações sugeridas da IA:', enrichedData.suggested_specifications);
				if (!formData.specifications) formData.specifications = {};
				formData.specifications = {
					...formData.specifications,
					...enrichedData.suggested_specifications
				};
				console.log('✅ Especificações aplicadas:', formData.specifications);
			} else if (enrichedData.specifications && typeof enrichedData.specifications === 'object') {
				console.log('🎯 Aplicando especificações da IA:', enrichedData.specifications);
				if (!formData.specifications) formData.specifications = {};
				formData.specifications = {
					...formData.specifications,
					...enrichedData.specifications
				};
				console.log('✅ Especificações aplicadas:', formData.specifications);
			}
			
			// Aplicar sugestões de categoria e marca
			if (enrichedData.category_suggestion) {
				// Categoria principal
				if (enrichedData.category_suggestion.primary_category_id) {
					formData.category_id = enrichedData.category_suggestion.primary_category_id;
				}
				// Guardar categorias relacionadas para uso futuro
				if (enrichedData.category_suggestion.related_categories) {
					formData._related_categories = enrichedData.category_suggestion.related_categories;
				}
			}
			if (enrichedData.brand_suggestion && enrichedData.brand_suggestion.brand_id) {
				// Verificar se o brand_id é um UUID válido
				const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
				if (uuidRegex.test(enrichedData.brand_suggestion.brand_id)) {
					formData.brand_id = enrichedData.brand_suggestion.brand_id;
				} else {
					console.warn('ID de marca inválido retornado pela IA:', enrichedData.brand_suggestion.brand_id);
				}
			}
			
			// Guardar informações sobre variações para uso futuro
			if (enrichedData.has_variations) {
				formData._suggested_variations = enrichedData.suggested_variations;
			}
			
			// Forçar reatividade
			formData = { ...formData };
			
			toast.success('🚀 Produto enriquecido com IA! Revise todas as abas para ver as melhorias.');
		} else {
			console.error('Nenhum dado retornado do enriquecimento');
			toast.error('Erro: Nenhum dado foi retornado pela IA');
		}
		
		showEnrichmentProgress = false;
		isEnriching = false;
		
		// Salvar automaticamente se tiver dados
		if (enrichedData) {
			saveProduct();
		}
	}
	
	// Callback quando o enriquecimento for cancelado
	function handleEnrichmentCancel() {
		showEnrichmentProgress = false;
		isEnriching = false;
		toast.info('Enriquecimento cancelado');
	}
	
	// Lifecycle
	onMount(() => {
		loadProduct();
	});
</script>

<!-- Modal de Progresso do Enriquecimento IA -->
{#if showEnrichmentProgress}
	{console.log('🎭 MODAL SENDO RENDERIZADA!')}
	<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
		{console.log('🎭 DIV DA MODAL CRIADO!')}
		<EnrichmentProgress 
			productData={formData}
			onComplete={handleEnrichmentComplete}
			onCancel={handleEnrichmentCancel}
		/>
	</div>
{:else}
	{console.log('🚫 Modal NÃO sendo renderizada - showEnrichmentProgress:', showEnrichmentProgress)}
	<!-- Debug: mostrar se a modal deveria estar visível -->
	<div style="display: none;">
		Modal hidden - showEnrichmentProgress: {showEnrichmentProgress}, isEnriching: {isEnriching}
	</div>
{/if}

<div class="min-h-screen bg-gray-50">
	<!-- Header com Ações -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button onclick={() => goto('/produtos')} class="p-2 hover:bg-gray-100 rounded-lg">
						<ModernIcon name="ChevronLeft" size="md" />
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">
							{loading ? 'Carregando...' : `Editar: ${formData.name || 'Produto'}`}
						</h1>
						<p class="text-sm text-gray-500">
							{loading ? '...' : `SKU: ${formData.sku || 'N/A'}`}
						</p>
					</div>
				</div>
				
				<div class="flex items-center gap-3">
					<!-- Botão de Enriquecimento Completo com IA -->
					<button
						type="button"
						onclick={() => enrichCompleteProduct()}
						disabled={isEnriching || loading || !formData.name}
						class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
					>
						{#if isEnriching}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							Enriquecendo...
						{:else}
							<ModernIcon name="robot" size="sm" />
							Enriquecer com IA
						{/if}
					</button>
					
					<button
						type="button"
						onclick={() => goto('/produtos')}
						class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
					>
						<ModernIcon name="ChevronLeft" size="sm" />
						Cancelar
					</button>
					
					<button
						type="button"
						onclick={saveProduct}
						disabled={saving || loading}
						class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							Salvando...
						{:else}
							<ModernIcon name="save" size="sm" />
							Salvar
						{/if}
					</button>
					
					<button
						onclick={() => window.open(`/produto/${formData.slug}`, '_blank')}
						class="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
					>
						<ModernIcon name="preview" size="sm" />
						Ver na Loja
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
				<BasicTab bind:formData />
			{:else if activeTab === 'attributes'}
				<AttributesSection bind:formData />
			{:else if activeTab === 'media'}
				<MediaTab bind:formData {productId} />
			{:else if activeTab === 'shipping'}
				<ShippingTab bind:formData />
			{:else if activeTab === 'seo'}
				<SeoTab bind:formData />
			{:else if activeTab === 'advanced'}
				<AdvancedTab bind:formData />
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