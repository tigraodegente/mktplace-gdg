<script lang="ts">
	import MultiSelect from '$lib/components/ui/MultiSelect.svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import AISuggestionCard from '$lib/components/shared/AISuggestionCard.svelte';
	import { aiReviewMode, aiSuggestionsByCategory } from '$lib/stores/aiReview';
	import { toast } from '$lib/stores/toast';
	
	interface Props {
		formData: any;
	}
	
	let { formData = $bindable() }: Props = $props();
	
	// Estados para seleções
	let categories = $state<Array<{id: string, name: string, parent_id?: string | null}>>([]);
	let brands = $state<Array<{id: string, name: string}>>([]);
	let sellers = $state<Array<{id: string, company_name: string}>>([]);
	let loading = $state(true);
	
	// Estados de categorias múltiplas
	let selectedCategories = $state<string[]>([]);
	let primaryCategory = $state<string | null>(null);
	
	// Estados de loading para IA individual
	let aiLoading = $state<Record<string, boolean>>({});
	let aiStatus = $state<Record<string, 'none' | 'success' | 'partial' | 'error'>>({});
	let aiMessages = $state<Record<string, string>>({});
	
	// Estados para revisão IA em lote
	let isAIReviewMode = $state(false);
	let aiSuggestions = $state<any[]>([]);
	
	// Garantir que formData.tags seja sempre um array
	$effect(() => {
		if (!Array.isArray(formData.tags)) {
			formData.tags = [];
		}
		if (typeof formData.tags_input !== 'string') {
			formData.tags_input = '';
		}
		
		// Inicializar categorias selecionadas do formData
		if (formData.category_id && !selectedCategories.includes(formData.category_id)) {
			selectedCategories = [formData.category_id];
			primaryCategory = formData.category_id;
		}
		
		// Suportar múltiplas categorias se existir
		if (formData._selected_categories && Array.isArray(formData._selected_categories)) {
			selectedCategories = formData._selected_categories;
			primaryCategory = formData.category_id || selectedCategories[0] || null;
		}
	});
	
	// Função para obter ícone de status da IA
	function getStatusInfo(field: string) {
		switch (aiStatus[field]) {
			case 'success':
				return { 
					iconName: 'Check', 
					className: 'text-gray-600', 
					message: aiMessages[field] || 'Preenchido com IA' 
				};
			case 'partial':
				return { 
					iconName: 'warning', 
					className: 'text-gray-600', 
					message: aiMessages[field] || 'Analisado pela IA' 
				};
			case 'error':
				return { 
					iconName: 'AlertTriangle', 
					className: 'text-gray-600', 
					message: aiMessages[field] || 'Erro na IA' 
				};
			default:
				return null;
		}
	}
	
	// Função de enriquecimento individual por campo
	async function enrichField(field: string) {
		console.log(`🤖 Frontend: Iniciando enriquecimento do campo: ${field}`);
		console.log(`📦 Frontend: Dados atuais:`, {
			name: formData.name,
			description: formData.description,
			category: categories.find(c => c.id === formData.category_id)?.name,
			price: formData.price
		});
		
		aiLoading[field] = true;
		aiStatus[field] = 'none';
		aiMessages[field] = '';
		
		try {
			const requestBody = {
				field,
				currentData: formData,
				category: categories.find(c => c.id === formData.category_id)?.name
			};
			
			console.log(`📤 Frontend: Enviando requisição para API:`, requestBody);
			
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});
			
			console.log(`📥 Frontend: Resposta recebida - Status: ${response.status}`);
			
			if (!response.ok) {
				throw new Error('Erro na resposta da API');
			}
			
			const result = await response.json();
			console.log(`✅ Frontend: Resultado processado para ${field}:`, result);
			
			if (result.success && result.data) {
				let applied = false;
				
				console.log(`🔍 Frontend: Processando resultado para campo "${field}":`, result.data);
				
				// Aplicar resultado específico do campo
				switch (field) {
					case 'name':
						if (result.data.name || result.data.enhanced_name) {
							const newName = result.data.name || result.data.enhanced_name;
							console.log(`📝 Frontend: Aplicando novo nome: "${formData.name}" → "${newName}"`);
							formData.name = newName;
							applied = true;
						}
						break;
					case 'description':
						if (result.data.description) {
							console.log(`📝 Frontend: Aplicando nova descrição (${result.data.description.length} chars)`);
							formData.description = result.data.description;
							applied = true;
						}
						break;
					case 'short_description':
						if (result.data.short_description) {
							console.log(`📝 Frontend: Aplicando nova descrição curta (${result.data.short_description.length} chars)`);
							formData.short_description = result.data.short_description;
							applied = true;
						}
						break;
					case 'sku':
						if (result.data.sku) {
							console.log(`📝 Frontend: Aplicando novo SKU: "${formData.sku}" → "${result.data.sku}"`);
							formData.sku = result.data.sku;
							applied = true;
						}
						break;
					case 'tags':
						if (result.data.tags && Array.isArray(result.data.tags)) {
							console.log(`📝 Frontend: Aplicando ${result.data.tags.length} tags:`, result.data.tags);
							formData.tags = result.data.tags;
							formData.tags_input = result.data.tags.join(', ');
							applied = true;
						} else if (typeof result.data === 'string') {
							// Fallback para resposta como string
							const tags = result.data.split(',').map((tag: string) => tag.trim().replace(/"/g, ''));
							console.log(`📝 Frontend: Aplicando tags (fallback):`, tags);
							formData.tags = tags;
							formData.tags_input = tags.join(', ');
							applied = true;
						}
						break;
					case 'model':
						if (result.data.model || typeof result.data === 'string') {
							const newModel = result.data.model || result.data;
							console.log(`📝 Frontend: Aplicando novo modelo: "${formData.model}" → "${newModel}"`);
							formData.model = newModel;
							applied = true;
						}
						break;
					case 'barcode':
						if (result.data.barcode || typeof result.data === 'string') {
							const newBarcode = result.data.barcode || result.data;
							console.log(`📝 Frontend: Aplicando novo código de barras: "${formData.barcode}" → "${newBarcode}"`);
							formData.barcode = newBarcode;
							applied = true;
						}
						break;
					case 'category':
						// Para campo específico, a resposta vem diretamente em result.data
						const suggestion = result.data.category_suggestion || result.data;
						
						if (suggestion && suggestion.primary_category_id) {
							// Aplicar categoria principal
							primaryCategory = suggestion.primary_category_id;
							formData.category_id = suggestion.primary_category_id;
							selectedCategories = [suggestion.primary_category_id];
							applied = true;
							
							// Aplicar categorias relacionadas
							if (suggestion.related_categories && Array.isArray(suggestion.related_categories)) {
								const relatedIds = suggestion.related_categories
									.map((cat: any) => cat.category_id)
									.filter((id: string) => categories.some(c => c.id === id));
								
								if (relatedIds.length > 0) {
									selectedCategories = [...new Set([primaryCategory, ...relatedIds].filter(Boolean))];
									applied = true;
								}
							}
							
							// Salvar dados adicionais
							formData._selected_categories = selectedCategories;
							if (suggestion.related_categories) {
								formData._related_categories = suggestion.related_categories;
							}
							
							// Definir mensagem detalhada
							const mainCat = categories.find(c => c.id === primaryCategory)?.name;
							const relatedCount = selectedCategories.length - 1;
							aiMessages[field] = `Principal: ${mainCat}${relatedCount > 0 ? ` + ${relatedCount} relacionada(s)` : ''}`;
							console.log(`✅ Categorias aplicadas: Principal=${mainCat}, Relacionadas=${relatedCount}`);
						} else {
							console.log('❌ Resposta da IA não contém primary_category_id:', suggestion);
						}
						break;
					case 'brand':
						// Para campo de marca, a resposta pode vir como brand_suggestion ou diretamente
						const brandSuggestion = result.data.brand_suggestion || result.data;
						
						if (brandSuggestion && brandSuggestion.brand_id) {
							// Marca encontrada no banco de dados
							const brand = brands.find(b => b.id === brandSuggestion.brand_id);
							if (brand) {
								formData.brand_id = brandSuggestion.brand_id;
								aiMessages[field] = `Marca "${brand.name}" identificada e aplicada`;
								applied = true;
								console.log(`✅ Marca aplicada: ${brand.name} (ID: ${brandSuggestion.brand_id})`);
							}
						} else if (brandSuggestion && brandSuggestion.brand_name) {
							// Marca detectada mas não cadastrada
							aiMessages[field] = `Marca "${brandSuggestion.brand_name}" detectada, mas não está cadastrada no sistema`;
							applied = false; // Marca detectada mas não aplicada
							console.log(`⚠️ Marca detectada mas não cadastrada: ${brandSuggestion.brand_name}`);
						} else if (brandSuggestion && brandSuggestion.detected_brand) {
							// Formato alternativo da resposta
							const detectedBrand = brandSuggestion.detected_brand;
							const brand = brands.find(b => 
								b.name.toLowerCase() === detectedBrand.toLowerCase() ||
								b.name.toLowerCase().includes(detectedBrand.toLowerCase())
							);
							
							if (brand) {
								formData.brand_id = brand.id;
								aiMessages[field] = `Marca "${brand.name}" identificada e aplicada`;
								applied = true;
								console.log(`✅ Marca encontrada por busca: ${brand.name} (ID: ${brand.id})`);
							} else {
								aiMessages[field] = `Marca "${detectedBrand}" detectada, mas não está cadastrada no sistema`;
								applied = false;
								console.log(`⚠️ Marca detectada mas não cadastrada: ${detectedBrand}`);
							}
						} else {
							console.log('❌ Resposta da IA não contém informações de marca:', brandSuggestion);
						}
						break;
				}
				
				if (applied) {
					aiStatus[field] = 'success';
					if (!aiMessages[field]) {
						aiMessages[field] = 'Preenchido com sucesso';
					}
					toast.success(`✅ ${field === 'category' ? 'Categorias sugeridas' : `Campo "${field}" enriquecido`} com IA!`);
				} else {
					aiStatus[field] = 'partial';
					aiMessages[field] = 'IA analisou mas não encontrou melhorias';
					toast.info(`ℹ️ ${field === 'category' ? 'Categorias analisadas' : `Campo "${field}" analisado`} pela IA`);
				}
			} else {
				aiStatus[field] = 'error';
				aiMessages[field] = 'Erro na resposta da IA';
				toast.error(`❌ Erro ao ${field === 'category' ? 'sugerir categorias' : `enriquecer "${field}"`}`);
			}
		} catch (error: any) {
			console.error(`❌ Erro ao enriquecer ${field}:`, error);
			aiStatus[field] = 'error';
			aiMessages[field] = `Erro: ${error.message}`;
			toast.error(`❌ Erro ao conectar com IA para ${field === 'category' ? 'categorias' : `"${field}"`}`);
		} finally {
			aiLoading[field] = false;
		}
	}
	
	// Carregar dados para os selects
	async function loadSelectData() {
		try {
			const [categoriesRes, brandsRes, sellersRes] = await Promise.all([
				fetch('/api/categories'),
				fetch('/api/brands'),
				fetch('/api/sellers')
			]);
			
			if (categoriesRes.ok) {
				const data = await categoriesRes.json();
				console.log('📦 BasicTab: dados de categorias recebidos:', data);
				
				// Suportar diferentes estruturas da API
				if (data.success && data.data) {
					if (data.data.categories && Array.isArray(data.data.categories)) {
						// Estrutura: { success: true, data: { categories: [...] } }
						categories = data.data.categories.map((cat: any) => ({
							id: cat.id,
							name: cat.name,
							parent_id: cat.parentId || cat.parent_id || null
						}));
					} else if (Array.isArray(data.data)) {
						// Estrutura: { success: true, data: [...] }
						categories = data.data.map((cat: any) => ({
							id: cat.id,
							name: cat.name,
							parent_id: cat.parentId || cat.parent_id || null
						}));
					} else {
						categories = [];
					}
				} else {
					categories = [];
				}
				console.log('✅ BasicTab: categorias processadas:', categories.length);
			}
			
			if (brandsRes.ok) {
				const data = await brandsRes.json();
				// Suportar diferentes estruturas
				if (data.success && data.data) {
					brands = Array.isArray(data.data) ? data.data : (data.data.brands || []);
				} else {
					brands = [];
				}
			}
			
			if (sellersRes.ok) {
				const data = await sellersRes.json();
				// Suportar diferentes estruturas
				if (data.success && data.data) {
					sellers = Array.isArray(data.data) ? data.data : (data.data.sellers || []);
				} else {
					sellers = [];
				}
			}
		} catch (error) {
			console.error('Erro ao carregar dados:', error);
			categories = [];
			brands = [];
			sellers = [];
		} finally {
			loading = false;
		}
	}
	
	// Carregar dados na inicialização
	$effect(() => {
		console.log('🔄 BasicTab $effect executado - iniciando loadSelectData');
		loadSelectData();
	});
	
	// Sincronizar categorias selecionadas
	$effect(() => {
		if (formData.category_id) {
			selectedCategories = [formData.category_id];
			primaryCategory = formData.category_id;
		}
	});
	
	// Atualizar categoria principal quando seleção muda
	function handleCategoryChange(selected: string[]) {
		selectedCategories = selected;
		if (selected.length > 0) {
			// Se não há categoria principal ou ela não está nas selecionadas, definir a primeira como principal
			if (!primaryCategory || !selected.includes(primaryCategory)) {
				primaryCategory = selected[0];
			}
			formData.category_id = primaryCategory;
		} else {
			primaryCategory = null;
			formData.category_id = '';
		}
		
		// Salvar múltiplas categorias para outras abas
		formData._selected_categories = selected;
	}
	
	// Função para definir categoria principal
	function handlePrimaryChange(categoryId: string | null) {
		primaryCategory = categoryId;
		if (categoryId) {
			formData.category_id = categoryId;
		}
	}
	
	// Função para remover uma categoria específica
	function removeCategory(categoryId: string | null) {
		if (!categoryId) return;
		
		// Remover da lista de selecionadas
		selectedCategories = selectedCategories.filter(id => id !== categoryId);
		
		// Se removeu a categoria principal, definir nova principal
		if (primaryCategory === categoryId) {
			primaryCategory = selectedCategories.length > 0 ? selectedCategories[0] : null;
			formData.category_id = primaryCategory || '';
		}
		
		// Atualizar formData
		formData._selected_categories = selectedCategories;
		
		// Se removeu todas as categorias, limpar status da IA
		if (selectedCategories.length === 0) {
			aiStatus.category = 'none';
			aiMessages.category = '';
		}
	}
	
	// Função para definir uma categoria relacionada como principal
	function setPrimaryCategory(categoryId: string) {
		if (!selectedCategories.includes(categoryId)) return;
		
		primaryCategory = categoryId;
		formData.category_id = categoryId;
	}
	
	// Função para enriquecimento completo
	async function enrichCompleteProduct() {
		const allFields = Object.keys(aiLoading);
		allFields.forEach(field => aiLoading[field] = true);
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'enrich_all',
					...formData,
					category: categories.find(c => c.id === formData.category_id)?.name
				})
			});
			
			if (!response.ok) throw new Error('Erro na resposta da API');
			
			const result = await response.json();
			
			if (result.success) {
				const data = result.data;
				
				// Aplicar todos os dados enriquecidos
				if (data.name) {
					formData.name = data.name;
					formData.slug = data.slug || generateSlug(data.name);
				}
				if (data.sku) formData.sku = data.sku;
				if (data.description) formData.description = data.description;
				if (data.short_description) formData.short_description = data.short_description;
				if (data.model) formData.model = data.model;
				if (data.barcode) formData.barcode = data.barcode;
				if (data.price) formData.price = parseFloat(data.price);
				if (data.cost) formData.cost = parseFloat(data.cost);
				if (data.weight) formData.weight = parseFloat(data.weight);
				if (data.dimensions) {
					formData.height = data.dimensions.height;
					formData.width = data.dimensions.width;
					formData.length = data.dimensions.length;
				}
				if (data.care_instructions) formData.care_instructions = data.care_instructions;
				if (data.age_group) formData.age_group = data.age_group;
				if (data.warranty_period) formData.warranty_period = data.warranty_period;
				if (data.manufacturing_country) formData.manufacturing_country = data.manufacturing_country;
				if (data.ncm_code) formData.ncm_code = data.ncm_code;
				if (data.stock_location) formData.stock_location = data.stock_location;
				if (data.delivery_days_min) formData.delivery_days_min = data.delivery_days_min;
				if (data.delivery_days_max) formData.delivery_days_max = data.delivery_days_max;
				
				// Aplicar tags
				if (data.tags && Array.isArray(data.tags)) {
					formData.tags = data.tags;
					formData.tags_input = data.tags.join(', ');
				}
				
				// APLICAR ATRIBUTOS PARA FILTROS (NOVO)
				if (data.suggested_attributes && typeof data.suggested_attributes === 'object') {
					console.log('🎯 Aplicando atributos sugeridos da IA:', data.suggested_attributes);
					if (!formData.attributes) formData.attributes = {};
					
					// Converter array de objetos para objeto simples se necessário
					if (Array.isArray(data.suggested_attributes)) {
						const attributesObj: Record<string, string[]> = {};
						data.suggested_attributes.forEach((attr: any) => {
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
							...data.suggested_attributes
						};
					}
					console.log('✅ Atributos aplicados:', formData.attributes);
				} else if (data.attributes && typeof data.attributes === 'object') {
					console.log('🎯 Aplicando atributos da IA:', data.attributes);
					if (!formData.attributes) formData.attributes = {};
					formData.attributes = {
						...formData.attributes,
						...data.attributes
					};
					console.log('✅ Atributos aplicados:', formData.attributes);
				}
				
				// APLICAR ESPECIFICAÇÕES TÉCNICAS (NOVO)
				if (data.suggested_specifications && typeof data.suggested_specifications === 'object') {
					console.log('🎯 Aplicando especificações sugeridas da IA:', data.suggested_specifications);
					if (!formData.specifications) formData.specifications = {};
					formData.specifications = {
						...formData.specifications,
						...data.suggested_specifications
					};
					console.log('✅ Especificações aplicadas:', formData.specifications);
				} else if (data.specifications && typeof data.specifications === 'object') {
					console.log('🎯 Aplicando especificações da IA:', data.specifications);
					if (!formData.specifications) formData.specifications = {};
					formData.specifications = {
						...formData.specifications,
						...data.specifications
					};
					console.log('✅ Especificações aplicadas:', formData.specifications);
				}
				
				// Aplicar categoria sugerida
				if (data.category_suggestion?.primary_category_id) {
					console.log('🎯 BasicTab: Aplicando categoria do enriquecimento completo:', data.category_suggestion);
					
					selectedCategories = [data.category_suggestion.primary_category_id];
					primaryCategory = data.category_suggestion.primary_category_id;
					formData.category_id = data.category_suggestion.primary_category_id;
					formData._selected_categories = [data.category_suggestion.primary_category_id];
					
					if (data.category_suggestion.related_categories) {
						const relatedIds = data.category_suggestion.related_categories.map((c: any) => c.category_id);
						selectedCategories = [...new Set([data.category_suggestion.primary_category_id, ...relatedIds])];
						formData._selected_categories = selectedCategories;
						formData._related_categories = data.category_suggestion.related_categories;
						
						console.log('✅ BasicTab: Categorias aplicadas:', {
							principal: primaryCategory,
							relacionadas: relatedIds,
							total: selectedCategories
						});
					}
					
					// Marcar como sucesso para feedback visual
					aiStatus.category = 'success';
					const mainCat = categories.find(c => c.id === primaryCategory)?.name;
					const relatedCount = selectedCategories.length - 1;
					aiMessages.category = `Principal: ${mainCat}${relatedCount > 0 ? ` + ${relatedCount} relacionada(s)` : ''}`;
					
					console.log('🎉 BasicTab: Status da categoria atualizado:', {
						status: aiStatus.category,
						message: aiMessages.category
					});
				} else {
					console.log('❌ BasicTab: Nenhuma categoria encontrada no enriquecimento completo');
				}
				
				// Aplicar marca sugerida
				if (data.brand_suggestion?.brand_id) {
					console.log('🎯 BasicTab: Aplicando marca do enriquecimento completo:', data.brand_suggestion);
					formData.brand_id = data.brand_suggestion.brand_id;
					aiStatus.brand = 'success';
					const brand = brands.find(b => b.id === data.brand_suggestion.brand_id);
					aiMessages.brand = `Marca "${brand?.name || 'Desconhecida'}" identificada e aplicada`;
					
					console.log('✅ BasicTab: Marca aplicada:', {
						brand_id: data.brand_suggestion.brand_id,
						brand_name: brand?.name
					});
				} else if (data.brand_suggestion?.brand_name) {
					console.log('⚠️ BasicTab: Marca detectada mas não cadastrada:', data.brand_suggestion.brand_name);
					// Marca detectada mas não cadastrada
					formData.brand = data.brand_suggestion.brand_name;
					aiStatus.brand = 'partial';
					aiMessages.brand = `Marca "${data.brand_suggestion.brand_name}" detectada, mas não está cadastrada no sistema`;
				} else {
					console.log('❌ BasicTab: Nenhuma marca encontrada no enriquecimento completo');
				}
				
				// Salvar dados para outras abas
				if (data._suggested_variations) formData._suggested_variations = data._suggested_variations;
				if (data.meta_title) formData.meta_title = data.meta_title;
				if (data.meta_description) formData.meta_description = data.meta_description;
				if (data.meta_keywords) formData.meta_keywords = data.meta_keywords;
				
				toast.success('🎉 Produto enriquecido completamente com IA! Incluindo atributos e especificações.');
			} else {
				toast.error('Erro ao enriquecer produto completo');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao conectar com o serviço de IA');
		} finally {
			allFields.forEach(field => aiLoading[field] = false);
		}
	}
	
	// Gerar slug automaticamente
	function generateSlug(name: string) {
		return name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}
	
	// Atualizar slug quando o nome mudar
	$effect(() => {
		if (formData.name && !formData.slug) {
			formData.slug = generateSlug(formData.name);
		}
	});

	// Subscrever ao modo IA
	aiReviewMode.subscribe(mode => {
		isAIReviewMode = mode;
	});

	// Subscrever às sugestões da categoria 'basic'
	aiSuggestionsByCategory.subscribe(suggestions => {
		// Pegar sugestões da categoria basic
		aiSuggestions = suggestions.basic || [];
		console.log('📋 BasicTab: Sugestões recebidas:', aiSuggestions.length);
	});

	// Garantir reatividade do dropdown de marcas
	let brandReactiveKey = $state(0);
	
	$effect(() => {
		// Forçar re-render quando brand_id mudar
		if (formData.brand_id && brands.length > 0) {
			const selectedBrand = brands.find(b => b.id === formData.brand_id);
			if (selectedBrand) {
				console.log('✅ Marca selecionada:', selectedBrand.name);
				brandReactiveKey++; // Força re-render do dropdown
			}
		}
	});
</script>

<style>
	/* CSS removido - sem tooltips */
</style>

<div class="space-y-8">
	<!-- SUGESTÕES IA EM LOTE (quando modo revisão ativado) -->
	{#if isAIReviewMode && aiSuggestions.length > 0}
		<div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-6">
			<h3 class="text-lg font-semibold text-[#00BFB3] mb-4 flex items-center gap-2">
				<ModernIcon name="robot" size="md" />
				Sugestões IA para Informações Básicas
				<span class="px-2 py-1 bg-[#00BFB3] text-white rounded-full text-sm">
					{aiSuggestions.length}
				</span>
			</h3>
			
			<div class="space-y-4">
				{#each aiSuggestions as suggestion}
					<AISuggestionCard {suggestion} {formData} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- INFORMAÇÕES BÁSICAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="product" size="md" /> Informações do Produto
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Nome do Produto -->
			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Nome do Produto *
					{#if getStatusInfo('name')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('name')?.message}</span>
						</span>
					{/if}
				</label>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<input
							type="text"
							bind:value={formData.name}
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent {aiStatus.name === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
							placeholder="Ex: Smartphone Samsung Galaxy S24"
						/>
						{#if getStatusInfo('name')}
							<div class="absolute right-3 top-3">
								<ModernIcon name="Check" size="xs" />
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => enrichField('name')}
						disabled={aiLoading.name || !formData.name}
						class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50"
					>
						{#if aiLoading.name}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Slug -->
			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-gray-700 mb-2">
					URL Amigável (Slug) *
				</label>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={formData.slug}
						required
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-colors"
						placeholder="cesto-organizador-brinquedos"
					/>
					<button
						type="button"
						onclick={() => formData.slug = generateSlug(formData.name || '')}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
					>
						<ModernIcon name="refresh" size="sm" />
					</button>
				</div>
			</div>
			
			<!-- SKU -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					SKU (Código do Produto)
					{#if getStatusInfo('sku')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('sku')?.message}</span>
						</span>
					{/if}
				</label>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<input
							type="text"
							bind:value={formData.sku}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent {aiStatus.sku === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
							placeholder="SAM-GAL-S24-128"
						/>
						{#if getStatusInfo('sku')}
							<div class="absolute right-3 top-3">
								<ModernIcon name="Check" size="xs" />
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => enrichField('sku')}
						disabled={aiLoading.sku || !formData.name}
						class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50"
					>
						{#if aiLoading.sku}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Código de Barras -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Código de Barras (EAN)
					{#if getStatusInfo('barcode')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('barcode')?.message}</span>
						</span>
					{/if}
				</label>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<input
							type="text"
							bind:value={formData.barcode}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent {aiStatus.barcode === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
							placeholder="7891234567890"
						/>
						{#if getStatusInfo('barcode')}
							<div class="absolute right-3 top-3">
								<ModernIcon name="Check" size="xs" />
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => enrichField('barcode')}
						disabled={aiLoading.barcode || !formData.name}
						class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50"
					>
						{#if aiLoading.barcode}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Modelo -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Modelo
					{#if getStatusInfo('model')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('model')?.message}</span>
						</span>
					{/if}
				</label>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<input
							type="text"
							bind:value={formData.model}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent {aiStatus.model === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
							placeholder="Galaxy S24"
						/>
						{#if getStatusInfo('model')}
							<div class="absolute right-3 top-3">
								<ModernIcon name="Check" size="xs" />
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => enrichField('model')}
						disabled={aiLoading.model || !formData.name}
						class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50"
					>
						{#if aiLoading.model}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Condição -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Condição do Produto
				</label>
				<select
					bind:value={formData.condition}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-colors"
				>
					<option value="new">Novo</option>
					<option value="used">Usado</option>
					<option value="refurbished">Recondicionado</option>
				</select>
			</div>
			
			<!-- Tags -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Tags (separadas por vírgula)
					{#if getStatusInfo('tags')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('tags')?.message}</span>
						</span>
					{/if}
				</label>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<input
							type="text"
							bind:value={formData.tags_input}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent {aiStatus.tags === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
							placeholder="smartphone, samsung, android, 5g"
						/>
						{#if getStatusInfo('tags')}
							<div class="absolute right-3 top-3">
								<ModernIcon name="Check" size="xs" />
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => enrichField('tags')}
						disabled={aiLoading.tags || !formData.name}
						class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50"
					>
						{#if aiLoading.tags}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- DESCRIÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="fullDescription" size="md" /> Descrições
		</h4>
		
		<div class="space-y-6">
			<!-- Descrição Curta -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Descrição Curta
					<span class="text-xs text-gray-500 ml-2">Aparece nos cards de produto</span>
					{#if getStatusInfo('short_description')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('short_description')?.message}</span>
						</span>
					{/if}
				</label>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<textarea
							bind:value={formData.short_description}
							rows="3"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent resize-none {aiStatus.short_description === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
							placeholder="Uma breve descrição atrativa do produto..."
						></textarea>
						{#if getStatusInfo('short_description')}
							<div class="absolute right-3 top-3">
								<ModernIcon name="Check" size="xs" />
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => enrichField('short_description')}
						disabled={aiLoading.short_description || !formData.name}
						class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 self-start"
					>
						{#if aiLoading.short_description}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Descrição Completa -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Descrição Completa
					{#if getStatusInfo('description')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('description')?.message}</span>
						</span>
					{/if}
				</label>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<textarea
							bind:value={formData.description}
							rows="8"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent resize-none {aiStatus.description === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
							placeholder="Descrição detalhada com especificações, benefícios e características..."
						></textarea>
						{#if getStatusInfo('description')}
							<div class="absolute right-3 top-3">
								<ModernIcon name="Check" size="xs" />
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => enrichField('description')}
						disabled={aiLoading.description || !formData.name}
						class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 self-start"
					>
						{#if aiLoading.description}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- CATEGORIZAÇÃO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="category" size="md" /> Categorização
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Categoria -->
			<div>
				{#if loading}
					<div class="w-full h-12 bg-gray-100 rounded-lg animate-pulse"></div>
				{:else}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<label class="block text-sm font-medium text-gray-700">
								Categoria Principal *
								{#if getStatusInfo('category')}
									<span class="inline-flex items-center gap-1 ml-2">
										<ModernIcon name="Check" size="xs" />
										<span class="text-xs text-gray-600">{getStatusInfo('category')?.message}</span>
									</span>
								{/if}
							</label>
							<button
								type="button"
								onclick={() => enrichField('category')}
								disabled={aiLoading.category || !formData.name}
								class="px-3 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
							>
								{#if aiLoading.category}
									<div class="flex items-center gap-2">
										<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										<span class="text-xs">Analisando...</span>
									</div>
								{:else}
									<div class="flex items-center gap-2">
										<ModernIcon name="robot" size="xs" />
										<span class="text-xs">IA</span>
									</div>
								{/if}
							</button>
						</div>
						
						<div class="relative z-[9999]" style="overflow: visible;">
							<MultiSelect
								items={Array.isArray(categories) ? categories : []}
								selected={selectedCategories}
								onSelectionChange={handleCategoryChange}
								primarySelection={primaryCategory}
								onPrimaryChange={handlePrimaryChange}
								label=""
								placeholder="Selecione categorias..."
								hierarchical={true}
								allowMultiple={true}
								searchable={true}
							/>
						</div>
						
						<!-- Área de Categorias Selecionadas -->
						<div class="space-y-2">
							{#if selectedCategories.length > 0}
								<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
									<div class="flex items-center justify-between mb-2">
										<span class="text-sm font-medium text-gray-700">Categorias Selecionadas:</span>
										<span class="text-xs text-gray-500">{selectedCategories.length} categoria(s)</span>
									</div>
									
									<!-- Explicação do Sistema -->
									<div class="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
										<div class="flex items-start gap-2">
											<ModernIcon name="info" size="sm" />
											<div class="text-xs text-gray-600">
												<p><strong>Principal:</strong> Categoria principal para SEO e navegação</p>
												<p><strong>Relacionadas:</strong> Categorias extras onde o produto também aparece</p>
												<p>💡 Clique no <strong>X</strong> para remover ou no <strong>nome</strong> para tornar principal</p>
											</div>
										</div>
									</div>
									
									<div class="space-y-2">
										{#if primaryCategory}
											<div class="flex items-center gap-2">
												<ModernIcon name="Check" size="xs" />
												<span class="text-sm font-semibold text-gray-900">Principal:</span>
												<div class="flex items-center gap-1 bg-[#00BFB3] px-2 py-1 rounded border border-[#00A89D] text-white">
													<span class="text-sm font-semibold">
														{categories.find(c => c.id === primaryCategory)?.name || 'Categoria não encontrada'}
													</span>
													<button
														type="button"
														onclick={() => removeCategory(primaryCategory)}
														class="ml-1 w-4 h-4 text-white hover:text-red-200 rounded-full hover:bg-red-500 flex items-center justify-center"
													>
														<ModernIcon name="AlertTriangle" size="xs" />
													</button>
												</div>
											</div>
										{/if}
										
										{#if selectedCategories.filter(id => id !== primaryCategory).length > 0}
											<div class="flex items-start gap-2">
												<ModernIcon name="Check" size="xs" />
												<span class="text-sm font-medium text-gray-700">Relacionadas:</span>
												<div class="flex-1 flex flex-wrap gap-1">
													{#each selectedCategories.filter(id => id !== primaryCategory) as categoryId}
														<div class="flex items-center gap-1 bg-white px-2 py-1 rounded border hover:border-[#00BFB3] transition-colors group">
															<button
																type="button"
																onclick={() => setPrimaryCategory(categoryId)}
																class="text-sm text-gray-600 hover:text-green-600 transition-colors"
															>
																{categories.find(c => c.id === categoryId)?.name || 'N/A'}
															</button>
															<button
																type="button"
																onclick={() => removeCategory(categoryId)}
																class="w-4 h-4 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 flex items-center justify-center"
															>
																<ModernIcon name="AlertTriangle" size="xs" />
															</button>
														</div>
													{/each}
												</div>
											</div>
											<div class="text-xs text-gray-500 mt-1 ml-4">
												💡 Clique no nome de uma categoria relacionada para torná-la principal
											</div>
										{/if}
									</div>
								</div>
							{:else}
								<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
									<div class="flex items-center gap-2">
										<ModernIcon name="warning" size="sm" />
										<span class="text-sm text-gray-600">Nenhuma categoria selecionada</span>
									</div>
									<p class="text-xs text-gray-600 mt-1">
										Selecione pelo menos uma categoria ou use a IA para sugerir automaticamente.
									</p>
								</div>
							{/if}
						</div>
						
						{#if aiStatus.category === 'success' && selectedCategories.length > 0}
							<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
								<div class="flex items-start gap-2">
									<ModernIcon name="Check" size="sm" />
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-600">✅ Categorias sugeridas pela IA</p>
										<p class="text-xs text-gray-600 mt-1">
											As categorias foram analisadas e selecionadas automaticamente com base no nome e descrição do produto.
										</p>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Marca -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Marca
					{#if getStatusInfo('brand')}
						<span class="inline-flex items-center gap-1 ml-2">
							<ModernIcon name="Check" size="xs" />
							<span class="text-xs text-gray-600">{getStatusInfo('brand')?.message}</span>
						</span>
					{/if}
				</label>
				{#if loading}
					<div class="w-full h-12 bg-gray-100 rounded-lg animate-pulse"></div>
				{:else}
					<div class="space-y-3">
						<div class="flex gap-2">
							<div class="flex-1 relative">
								{#key brandReactiveKey}
								<select
									bind:value={formData.brand_id}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent {aiStatus.brand === 'success' ? 'bg-gray-50 border-gray-300' : ''}"
								>
									<option value="">Selecione uma marca</option>
									{#each brands as brand}
										<option value={brand.id}>{brand.name}</option>
									{/each}
								</select>
								{/key}
								{#if getStatusInfo('brand')}
									<div class="absolute right-3 top-3">
										<ModernIcon name="Check" size="xs" />
									</div>
								{/if}
							</div>
							<button
								type="button"
								onclick={() => enrichField('brand')}
								disabled={aiLoading.brand || !formData.name}
								class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50"
							>
								{#if aiLoading.brand}
									<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								{:else}
									<ModernIcon name="robot" size="xs" />
								{/if}
							</button>
						</div>

						<!-- Feedback da IA para Marca -->
						{#if aiStatus.brand === 'success'}
							<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
								<div class="flex items-start gap-2">
									<ModernIcon name="Check" size="sm" />
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-600">✅ Marca detectada pela IA</p>
										<p class="text-xs text-gray-600 mt-1">
											{aiMessages.brand || 'Marca identificada automaticamente no nome do produto.'}
										</p>
									</div>
								</div>
							</div>
						{:else if aiStatus.brand === 'partial'}
							<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
								<div class="flex items-start gap-2">
									<ModernIcon name="warning" size="sm" />
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-600">⚠️ Marca não encontrada</p>
										<p class="text-xs text-gray-600 mt-1">
											{aiMessages.brand || 'IA analisou mas não identificou uma marca cadastrada.'}
										</p>
									</div>
								</div>
							</div>
						{:else if aiStatus.brand === 'error'}
							<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
								<div class="flex items-start gap-2">
									<ModernIcon name="AlertTriangle" size="sm" />
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-600">❌ Erro ao detectar marca</p>
										<p class="text-xs text-gray-600 mt-1">
											{aiMessages.brand || 'Erro ao conectar com o serviço de IA.'}
										</p>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Vendedor -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Vendedor
				</label>
				{#if loading}
					<div class="w-full h-12 bg-gray-100 rounded-lg animate-pulse"></div>
				{:else}
					<select
						bind:value={formData.seller_id}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
					>
						<option value="">Selecione um vendedor</option>
						{#each sellers as seller}
							<option value={seller.id}>{seller.company_name}</option>
						{/each}
					</select>
				{/if}
			</div>
		</div>
	</div>
	
	<!-- STATUS E CONFIGURAÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="status" size="md" /> Status e Configurações
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Status -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Status do Produto
				</label>
				<select
					bind:value={formData.status}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				>
					<option value="draft">Rascunho</option>
					<option value="published">Publicado</option>
					<option value="archived">Arquivado</option>
				</select>
			</div>
			
			<!-- Condição -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Condição
				</label>
				<select
					bind:value={formData.condition}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				>
					<option value="new">Novo</option>
					<option value="used">Usado</option>
					<option value="refurbished">Recondicionado</option>
				</select>
			</div>
		</div>
		
		<!-- Data de Publicação -->
		<div class="mt-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Data de Publicação
				<span class="text-xs text-gray-500 ml-2">Deixe vazio para publicar imediatamente</span>
			</label>
			<input
				type="datetime-local"
				bind:value={formData.published_at}
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				placeholder=""
			/>
		</div>

		<!-- Checkboxes -->
		<div class="mt-6 space-y-4">
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					bind:checked={formData.is_active}
					class="w-5 h-5 text-[#00BFB3] bg-gray-100 border-gray-300 rounded focus:ring-[#00BFB3] focus:ring-2"
				/>
				<span class="text-sm font-medium text-gray-700">Produto ativo</span>
			</label>
			
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					bind:checked={formData.featured}
					class="w-5 h-5 text-[#00BFB3] bg-gray-100 border-gray-300 rounded focus:ring-[#00BFB3] focus:ring-2"
				/>
				<div class="flex items-center gap-2">
					<ModernIcon name="Star" size="sm" />
					<span class="text-sm font-medium text-gray-700">Produto em destaque</span>
				</div>
				<span class="text-xs text-gray-500">Aparece na homepage e banners</span>
			</label>
			
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					bind:checked={formData.age_restricted}
					class="w-5 h-5 text-[#00BFB3] bg-gray-100 border-gray-300 rounded focus:ring-[#00BFB3] focus:ring-2"
				/>
				<div class="flex items-center gap-2">
					<ModernIcon name="Shield" size="sm" />
					<span class="text-sm font-medium text-gray-700">Restrito por idade</span>
				</div>
				<span class="text-xs text-gray-500">Requer verificação de idade</span>
			</label>
		</div>
	</div>
</div> 