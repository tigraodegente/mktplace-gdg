<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import EnrichmentProgress from '$lib/components/produtos/EnrichmentProgress.svelte';
	import BasicTab from '$lib/components/produtos/BasicTab.svelte';
	import PricingTab from '$lib/components/produtos/PricingTab.svelte';
	import AttributesSection from '$lib/components/produtos/AttributesSection.svelte';
	import MediaTab from '$lib/components/produtos/MediaTab.svelte';
	import ShippingTab from '$lib/components/produtos/ShippingTab.svelte';
	import SeoTab from '$lib/components/produtos/SeoTab.svelte';
	import AdvancedTab from '$lib/components/produtos/AdvancedTab.svelte';
	import VariantsTab from '$lib/components/produtos/VariantsTab.svelte';
	import InventoryTab from '$lib/components/produtos/InventoryTab.svelte';
	import ProductHistorySimple from '$lib/components/produtos/ProductHistorySimple.svelte';
	import ProductHistoryAdvanced from '$lib/components/produtos/ProductHistoryAdvanced.svelte';
	import DuplicateModal from '$lib/components/produtos/DuplicateModal.svelte';
	import { productService } from '$lib/services/productService';
	import { toast } from '$lib/stores/toast';
	
	// Estados
	let loading = $state(true);
	let saving = $state(false);
	let duplicating = $state(false);
	let activeTab = $state('basic');
	let formData = $state<any>({});
	let originalDatabaseData = $state<any>({}); // Dados originais do banco para comparação
	let productId = $derived($page.params.id);
	let showEnrichmentProgress = $state(false);
	let isEnriching = $state(false);
	let showHistory = $state(false);
	let showDuplicateModal = $state(false);
	
	// Validação em tempo real
	let validationErrors = $state<Record<string, string>>({});
	let fieldsTouched = $state(new Set<string>());
	
	// Tabs disponíveis
	const tabs = [
		{ id: 'basic', label: 'Informações Básicas', icon: 'Package' },
		{ id: 'pricing', label: 'Preços e Margens', icon: 'DollarSign' },
		{ id: 'attributes', label: 'Atributos e Especificações', icon: 'Settings' },
		{ id: 'variants', label: 'Variações', icon: 'Layers' },
		{ id: 'inventory', label: 'Estoque', icon: 'BarChart3' },
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
					console.log('🔍 DEBUG - Dados recebidos da API:', result.data);
					console.log('🔍 DEBUG - ID do produto:', result.data.id);
					console.log('🔍 DEBUG - brand_id do produto:', result.data.brand_id);
					
					// 🎯 GUARDAR DADOS ORIGINAIS PARA COMPARAÇÃO (ANTES DE QUALQUER PROCESSAMENTO)
					originalDatabaseData = JSON.parse(JSON.stringify(result.data));
					console.log('💾 Dados originais salvos para comparação:', originalDatabaseData);
					
					formData = result.data;
					
					// Inicializar arrays vazios se não existirem
					formData.tags = formData.tags || [];
					formData.meta_keywords = formData.meta_keywords || [];
					formData.images = formData.images || [];
					formData.categories = formData.categories || [];
					formData.variations = formData.variations || [];
					
					// ✅ INICIALIZAR VARIAÇÕES CORRETAMENTE
					formData.product_options = formData.product_options || [];
					formData.product_variants = formData.product_variants || [];
					formData.has_variants = formData.has_variants || (formData.product_options.length > 0 || formData.product_variants.length > 0);
					
					// Inicializar atributos e especificações (NOVO)
					formData.attributes = formData.attributes || {};
					formData.specifications = formData.specifications || {};
					
					console.log('📦 Variações carregadas do banco:', {
						product_options: formData.product_options.length,
						product_variants: formData.product_variants.length,
						has_variants: formData.has_variants
					});
					
					// 🔍 DEBUG DETALHADO DOS ATTRIBUTES
					if (formData.attributes && Object.keys(formData.attributes).length > 0) {
						console.log('🎨 ATTRIBUTES DETECTADOS:');
						Object.entries(formData.attributes).forEach(([key, values]) => {
							const isVariation = Array.isArray(values) && values.length > 1;
							console.log(`  - ${key}: ${Array.isArray(values) ? values.join(', ') : values} (${Array.isArray(values) ? values.length : 1} opções)${isVariation ? ' ← PODE SER VARIAÇÃO!' : ''}`);
						});
					}
					
					// 🎨 VERIFICAR SE ATTRIBUTES INDICAM VARIAÇÕES E CRIAR AUTOMATICAMENTE
					if (formData.attributes && Object.keys(formData.attributes).length > 0) {
						console.log('🎨 Verificando attributes para variações automáticas...');
						
						// Identificar attributes com múltiplas opções
						const variationAttributes = Object.entries(formData.attributes).filter(([key, values]) => 
							Array.isArray(values) && values.length > 1
						);
						
						if (variationAttributes.length > 0 && (!formData.product_options || formData.product_options.length === 0)) {
							console.log(`✅ Criando ${variationAttributes.length} opções de variação automaticamente dos attributes!`);
							
							formData.product_options = variationAttributes.map(([key, values], index) => ({
								id: `auto_${Date.now()}_${index}`,
								name: key,
								position: index,
								values: Array.isArray(values) ? values.map((value, valueIndex) => ({
									id: `auto_${Date.now()}_${index}_${valueIndex}`,
									value: String(value),
									position: valueIndex
								})) : []
							}));
							
							formData.has_variants = true;
							
							console.log('📦 Opções de variação criadas automaticamente:', formData.product_options);
							console.log('🔧 has_variants definido como true');
							
							// 🚨 GERAR AUTOMATICAMENTE AS VARIAÇÕES (product_variants)
							console.log('🎨 Gerando variações automaticamente...');
							if (formData.product_options.length > 0) {
								// Função para gerar combinações
								function generateVariantsFromOptions() {
									const options = formData.product_options.filter((opt: any) => opt.values.length > 0);
									if (options.length === 0) return [];

									function cartesian(arrays: any[]): any[] {
										return arrays.reduce((acc: any[], curr: any[]) => 
											acc.flatMap((a: any) => curr.map((c: any) => [...a, c]))
										, [[]]);
									}

									const valueArrays = options.map((option: any) => 
										option.values.map((value: any) => ({ 
											optionName: option.name, 
											value: value.value 
										}))
									);

									const combinations = cartesian(valueArrays);
									
									return combinations.map((combination: any[], index: number) => {
										const option_values = combination.reduce((acc: Record<string, string>, { optionName, value }) => {
											acc[optionName] = value;
											return acc;
										}, {});
										
										const variantName = Object.values(option_values).join(' / ');
										
										return {
											id: Date.now() + index,
											sku: `${formData.sku}-${index + 1}`,
											price: formData.price || 0,
											original_price: formData.original_price || 0,
											cost: formData.cost || 0,
											quantity: 0,
											weight: formData.weight || 0,
											barcode: '',
											is_active: true,
											option_values: option_values,
											name: variantName
										};
									});
								}
								
								formData.product_variants = generateVariantsFromOptions();
								console.log(`✅ ${formData.product_variants.length} variações geradas automaticamente!`, formData.product_variants);
							}
						}
					}
					
					// 🚨 CARREGAR VARIAÇÕES REAIS SE AINDA NÃO TEM VARIAÇÕES
					if ((!formData.product_variants || formData.product_variants.length === 0) && 
						(!formData.product_options || formData.product_options.length === 0) && 
						formData.sku) {
						console.log('🔍 Produto sem variações. Buscando variações reais...');
						try {
							const realVariationsResponse = await fetch(`/api/products/real-variations/${formData.id}`);
							if (realVariationsResponse.ok) {
								const realData = await realVariationsResponse.json();
								if (realData.success && realData.variations && realData.variations.length > 0) {
									console.log(`✅ CARREGADAS ${realData.variations.length} variações reais automaticamente!`);
									
									if (realData.type === 'structured') {
										// Variações estruturadas
										formData.product_variants = realData.variations;
										formData.variant_type = 'structured';
									} else {
										// Produtos similares
										formData.related_products = realData.variations;
										formData.variant_type = 'real_products';
									}
									
									formData.has_variants = true;
									console.log('📦 Variações reais aplicadas:', realData.type, realData.variations.length);
								} else {
									console.log('ℹ️ Nenhuma variação real encontrada para este produto');
								}
							}
						} catch (error) {
							console.warn('⚠️ Erro ao carregar variações reais:', error);
						}
					}
					
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
					
					// ===== MAPEAR CAMPOS DE PREÇO PARA O PricingTab =====
					// O PricingTab espera: cost_price, sale_price, regular_price
					// Mas o banco envia: cost, price, original_price
					formData.cost_price = formData.cost || 0;
					formData.sale_price = formData.price || 0;
					formData.regular_price = formData.original_price || 0;
					console.log('💰 Preços mapeados:', {
						cost_price: formData.cost_price,
						sale_price: formData.sale_price,
						regular_price: formData.regular_price
					});
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
		// Validar antes de salvar
		if (!validateForm()) {
			toast.error('Por favor, corrija os erros antes de salvar');
			return;
		}
		
		saving = true;
		try {
			// ===== COMPARAR ESTADOS PARA HISTÓRICO DETALHADO =====
			const { compareProductStates, logProductHistory: logDetailedHistory } = await import('$lib/utils/productHistory');
			
			// Preparar dados para envio
			const dataToSend = {
				...formData,
				// Converter strings para arrays
				tags: formData.tags_input?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
				meta_keywords: formData.meta_keywords_input?.split(',').map((k: string) => k.trim()).filter(Boolean) || [],
				// ===== MAPEAR PREÇOS DO PricingTab PARA O BANCO =====
				// PricingTab usa: cost_price, sale_price, regular_price
				// Banco espera: cost, price, original_price
				price: parseFloat(formData.sale_price || formData.price) || 0,
				original_price: formData.regular_price ? parseFloat(formData.regular_price) : (formData.original_price ? parseFloat(formData.original_price) : null),
				cost: parseFloat(formData.cost_price || formData.cost) || 0,
				quantity: parseInt(formData.quantity) || 0,
				weight: formData.weight ? parseFloat(formData.weight) : null,
				height: formData.height ? parseFloat(formData.height) : null,
				width: formData.width ? parseFloat(formData.width) : null,
				length: formData.length ? parseFloat(formData.length) : null,
				delivery_days_min: formData.delivery_days_min ? parseInt(formData.delivery_days_min) : null,
				delivery_days_max: formData.delivery_days_max ? parseInt(formData.delivery_days_max) : null,
				// Garantir que category_id seja enviado corretamente
				category_id: formData.category_id || null,
				brand_id: formData.brand_id || null
			};
			
			// Remover campos temporários
			delete dataToSend.tags_input;
			delete dataToSend.meta_keywords_input;
			delete dataToSend.category_name;
			delete dataToSend.brand_name;
			delete dataToSend.vendor_name;
			delete dataToSend.cost_price;
			delete dataToSend.sale_price;
			delete dataToSend.regular_price;
			delete dataToSend.categories;
			delete dataToSend.category_ids;
			delete dataToSend.related_products;
			delete dataToSend.upsell_products;
			delete dataToSend.download_files;
			delete dataToSend.product_options;
			delete dataToSend.product_variants;
			delete dataToSend.variant_type;
			delete dataToSend.related_product_ids;
			delete dataToSend.upsell_product_ids;
			delete dataToSend.custom_fields;
			
			// 🎯 COMPARAR COM DADOS ORIGINAIS DO BANCO (ANTES DO PROCESSAMENTO)
			console.log('🔍 Comparando dados para histórico:');
			console.log('  - Original (banco):', originalDatabaseData);
			console.log('  - Novo (enviando):', dataToSend);
			
			const historyData = compareProductStates(originalDatabaseData, dataToSend);
			
			// 🚨 DEBUG: Mostrar EXATAMENTE quais campos foram detectados como alterados
			console.log('🔍 CAMPOS DETECTADOS COMO ALTERADOS:');
			Object.entries(historyData.changes).forEach(([field, change]) => {
				console.log(`  - ${field}: "${change.old}" → "${change.new}" (${change.label})`);
			});
			
			console.log('📊 Alterações detectadas:', {
				totalChanges: historyData.totalChanges,
				changesByType: historyData.changesByType,
				summary: historyData.summary,
				fields: Object.keys(historyData.changes).map(key => ({
					field: key,
					label: historyData.changes[key].label,
					type: historyData.changes[key].type
				}))
			});
			
			console.log('📝 Dados sendo enviados para a API:', {
				id: formData.id,
				name: dataToSend.name,
				category_id: dataToSend.category_id,
				brand_id: dataToSend.brand_id,
				attributes: dataToSend.attributes,
				specifications: dataToSend.specifications,
				product_options: dataToSend.product_options?.length || 0,
				product_variants: dataToSend.product_variants?.length || 0,
				has_variants: dataToSend.has_variants
			});
			
			const response = await fetch(`/api/products/${productId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`
				},
				body: JSON.stringify(dataToSend)
			});
			
			const result = await response.json();
			
			if (response.ok && result.success) {
				toast.success(result.message || 'Produto atualizado com sucesso!');
				
							// ✅ HISTÓRICO AGORA É REGISTRADO AUTOMATICAMENTE NO BACKEND
			console.log('ℹ️ Histórico será registrado automaticamente pelo backend após salvar');
				
				await loadProduct(); // Recarregar dados
			} else {
				console.error('❌ Erro no salvamento:', result);
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
			
			toast.success('🚀 Produto enriquecido com IA! Revise todas as abas e clique em Salvar quando estiver pronto.');
		} else {
			console.error('Nenhum dado retornado do enriquecimento');
			toast.error('Erro: Nenhum dado foi retornado pela IA');
		}
		
		showEnrichmentProgress = false;
		isEnriching = false;
		
		// ❌ REMOVIDO: Não salvar automaticamente no formulário
		// O usuário deve revisar e salvar manualmente
		console.log('✅ Enriquecimento concluído. Aguardando usuário salvar manualmente.');
	}
	
	// Callback quando o enriquecimento for cancelado
	function handleEnrichmentCancel() {
		showEnrichmentProgress = false;
		isEnriching = false;
		toast.info('Enriquecimento cancelado');
	}
	
	// FUNÇÃO REMOVIDA - Agora usa o modal DuplicateModal.svelte
	
	// Validação em tempo real
	function validateField(field: string, value: any) {
		fieldsTouched.add(field);
		
		// Limpar erro anterior
		delete validationErrors[field];
		
		// Validar campos obrigatórios
		if (field === 'name' && (!value || value.trim().length < 3)) {
			validationErrors[field] = 'Nome deve ter pelo menos 3 caracteres';
		}
		
		if (field === 'sku' && (!value || value.trim() === '')) {
			validationErrors[field] = 'SKU é obrigatório';
		}
		
		if (field === 'price' && (!value || parseFloat(value) <= 0)) {
			validationErrors[field] = 'Preço deve ser maior que zero';
		}
		
		if (field === 'sale_price' && (!value || parseFloat(value) <= 0)) {
			validationErrors[field] = 'Preço de venda deve ser maior que zero';
		}
		
		// Revalidar se necessário
		validationErrors = { ...validationErrors };
	}
	
	// Validar antes de salvar
	function validateForm() {
		const errors: Record<string, string> = {};
		
		if (!formData.name || formData.name.trim().length < 3) {
			errors.name = 'Nome é obrigatório e deve ter pelo menos 3 caracteres';
		}
		
		if (!formData.sku || formData.sku.trim() === '') {
			errors.sku = 'SKU é obrigatório';
		}
		
		const price = parseFloat(formData.sale_price || formData.price);
		if (!price || price <= 0) {
			errors.price = 'Preço é obrigatório e deve ser maior que zero';
		}
		
		validationErrors = errors;
		return Object.keys(errors).length === 0;
	}
	
	// Registrar histórico de alterações
	async function logProductHistory(action: string, changes: Record<string, any>) {
		try {
			console.log('📝 Registrando histórico:', { action, changes, productId });
			
			const response = await fetch(`/api/products/${productId}/history`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`
				},
				body: JSON.stringify({
					action,
					changes
				})
			});
			
			const result = await response.json();
			console.log('📋 Resultado do histórico:', result);
			
			if (!result.success) {
				console.warn('⚠️ Erro ao registrar histórico:', result.error);
			}
		} catch (error) {
			console.warn('❌ Erro ao registrar histórico:', error);
		}
	}
	
	// Lifecycle
	onMount(async () => {
		await loadProduct();
		
		// Verificar se deve abrir histórico automaticamente
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('tab') === 'history') {
			showHistory = true;
		}
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
					<!-- Botão de Histórico -->
					<button
						type="button"
						onclick={() => showHistory = true}
						class="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
						title="Ver histórico de alterações"
					>
						<ModernIcon name="history" size="sm" />
						Histórico
					</button>
					
					<!-- Botão de Duplicar -->
					<button
						type="button"
						onclick={() => {
							console.log('🔍 BOTÃO DUPLICAR CLICADO!');
							console.log('Product Name:', formData.name);
							console.log('Product SKU:', formData.sku);
							console.log('Product ID:', productId);
							showDuplicateModal = true;
							console.log('Modal state:', showDuplicateModal);
						}}
						disabled={loading}
						class="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
						title="Duplicar produto"
					>
						<ModernIcon name="Copy" size="sm" />
						Duplicar
					</button>
				
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
				<div class="flex gap-1 overflow-x-auto">
					{#each tabs as tab}
						<button
							type="button"
							onclick={() => activeTab = tab.id}
							class="py-4 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap font-medium {
								activeTab === tab.id 
									? 'border-[#00BFB3] text-[#00BFB3] bg-[#00BFB3]/5' 
									: 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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

<!-- Modal de Histórico Avançado -->
<ProductHistoryAdvanced 
	productId={productId}
	bind:show={showHistory}
/>

<!-- Modal de Duplicação Avançada -->
<DuplicateModal 
	bind:show={showDuplicateModal}
	productId={productId}
	productName={formData.name}
	productSku={formData.sku}
/>

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