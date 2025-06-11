<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { DataTable } from '$lib/components/ui';
	import AISuggestionCard from '$lib/components/shared/AISuggestionCard.svelte';
	import { aiReviewMode, aiSuggestionsByCategory } from '$lib/stores/aiReview';
	
	let { formData = $bindable() } = $props();

	interface OptionValue {
		id: number;
		value: string;
		position: number;
	}

	interface ProductOption {
		id: string;
		name: string;
		position: number;
		values: OptionValue[];
	}

	interface ProductVariant {
		id: number;
		sku: string;
		price: number | string;
		original_price: number | string;
		cost: number | string;
		quantity: number;
		weight: number | string;
		barcode: string;
		is_active: boolean;
		option_values: Record<string, string>;
		name?: string;
	}

	// Inicializar campos de variações se não existirem
	if (!formData.product_options) formData.product_options = [];
	if (!formData.product_variants) formData.product_variants = [];
	if (!formData.has_variants) formData.has_variants = false;

	// 🎨 COLUNAS DO GRID DE VARIAÇÕES (mesmo visual do grid de produtos)
	const variantsColumns = [
		{
			key: 'image',
			label: 'Imagem',
			width: '80px',
			render: (value: string, row: ProductVariant) => {
				// Usar a primeira imagem do produto principal
				const imageUrl = formData.images?.[0] || `/api/placeholder/60/60?text=${encodeURIComponent(formData.name || 'Produto')}`;
				return `
					<img src="${imageUrl}" 
						alt="${formData.name || 'Produto'}" 
						class="w-12 h-12 rounded-lg object-cover"
						onerror="this.src='/api/placeholder/60/60?text=${encodeURIComponent(formData.name || 'Produto')}'"
					/>
				`;
			}
		},
		{
			key: 'name',
			label: 'Variação',
			sortable: true,
			render: (value: string, row: ProductVariant) => {
				const variantName = row.name || Object.values(row.option_values || {}).join(' / ');
				const optionDetails = Object.entries(row.option_values || {})
					.map(([key, value]) => `${key}: ${value}`)
					.join(' • ');
				
				return `
					<div>
						<div class="font-medium text-gray-900">${variantName}</div>
						<div class="text-sm text-gray-500">${optionDetails}</div>
					</div>
				`;
			}
		},
		{
			key: 'sku',
			label: 'SKU',
			sortable: true,
			render: (value: string) => `
				<span class="font-mono text-sm text-gray-600">${value}</span>
			`
		},
		{
			key: 'price',
			label: 'Preço',
			sortable: true,
			align: 'right' as const,
			render: (value: number | string) => `
				<span class="font-medium">R$ ${Number(value).toFixed(2)}</span>
			`
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: boolean) => {
				const status = value ? 'Ativo' : 'Inativo';
				const color = value ? 'green' : 'red';
				return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-800">${status}</span>`;
			}
		}
	];

	// Estados locais com $state
	let newOptionName = $state('');
	let newOptionValue = $state('');
	let selectedOptionIndex = $state(-1);
	let editingVariant = $state<ProductVariant | null>(null);
	let showVariantForm = $state(false);
	let aiLoading = $state(false);

	// Estados para revisão IA em lote
	let isAIReviewMode = $state(false);
	let aiSuggestions = $state<any[]>([]);

	// Subscrever ao modo IA
	aiReviewMode.subscribe(mode => {
		isAIReviewMode = mode;
	});

	// Subscrever às sugestões da categoria 'variants'
	aiSuggestionsByCategory.subscribe(suggestions => {
		aiSuggestions = suggestions.variants || [];
		console.log('🎨 VariantsTab: Sugestões recebidas:', aiSuggestions);
	});

	// Estados do modal de confirmação
	let showConfirmDialog = $state(false);
	let confirmDialogConfig = $state({
		title: '',
		message: '',
		variant: 'warning' as 'danger' | 'warning' | 'info',
		onConfirm: () => {}
	});

	// 🧠 SISTEMA INTELIGENTE DE OPÇÕES - Baseado em categoria e análise do produto
	function getSmartOptions() {
		const productName = formData.name?.toLowerCase() || '';
		const categoryName = formData.category_name?.toLowerCase() || '';
		
		// 1️⃣ FILTRO POR CATEGORIA
		const categoryOptions: Record<string, Array<{name: string, values: string[]}>> = {
			// Decoração e Casa
			'decoracao': [
				{ name: 'Cor', values: ['Azul', 'Rosa', 'Amarelo', 'Verde', 'Branco', 'Preto', 'Vermelho', 'Roxo', 'Dourado', 'Prata'] },
				{ name: 'Tamanho', values: ['Pequeno', 'Médio', 'Grande', 'XG'] },
				{ name: 'Formato', values: ['Redondo', 'Quadrado', 'Retangular', 'Oval', 'Estrela', 'Coração', 'Nuvem', 'Animal'] },
				{ name: 'Material', values: ['Tecido', 'Papel', 'Vinil', 'Madeira', 'Plástico', 'Metal'] }
			],
			'adesivos': [
				{ name: 'Cor', values: ['Azul', 'Rosa', 'Amarelo', 'Verde', 'Branco', 'Preto', 'Vermelho', 'Roxo', 'Dourado', 'Prata'] },
				{ name: 'Formato', values: ['Estrela', 'Nuvem', 'Coração', 'Animal', 'Redondo', 'Quadrado'] },
				{ name: 'Tamanho', values: ['5cm', '7cm', '10cm', '15cm', '20cm', 'Pequeno', 'Médio', 'Grande'] }
			],
			// Eletrônicos
			'eletronicos': [
				{ name: 'Cor', values: ['Preto', 'Branco', 'Prata', 'Dourado', 'Azul', 'Rosa', 'Verde'] },
				{ name: 'Voltagem', values: ['110V', '220V', 'Bivolt'] },
				{ name: 'Capacidade', values: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
				{ name: 'Tamanho', values: ['Pequeno', 'Médio', 'Grande'] }
			],
			// Moda e Roupas
			'moda': [
				{ name: 'Tamanho', values: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'] },
				{ name: 'Cor', values: ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom'] },
				{ name: 'Material', values: ['Algodão', 'Poliéster', 'Jeans', 'Linho', 'Viscose', 'Malha'] }
			],
			// Calçados
			'calcados': [
				{ name: 'Tamanho', values: ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
				{ name: 'Cor', values: ['Preto', 'Branco', 'Marrom', 'Azul', 'Vermelho', 'Rosa', 'Cinza'] },
				{ name: 'Material', values: ['Couro', 'Sintético', 'Tecido', 'Borracha'] }
			],
			// Alimentação
			'alimentacao': [
				{ name: 'Sabor', values: ['Baunilha', 'Chocolate', 'Morango', 'Coco', 'Banana', 'Açaí', 'Frutas Vermelhas', 'Café', 'Caramelo'] },
				{ name: 'Peso', values: ['100g', '250g', '500g', '1kg', '2kg', '5kg'] },
				{ name: 'Tipo', values: ['Natural', 'Orgânico', 'Diet', 'Light', 'Integral'] }
			],
			// Eletrodomésticos
			'eletrodomesticos': [
				{ name: 'Voltagem', values: ['110V', '220V', 'Bivolt'] },
				{ name: 'Cor', values: ['Branco', 'Inox', 'Preto', 'Prata'] },
				{ name: 'Capacidade', values: ['1L', '2L', '3L', '5L', '10L', '15L', '20L'] }
			],
			// Bebês e Crianças
			'baby': [
				{ name: 'Idade', values: ['0-6 meses', '6-12 meses', '1-2 anos', '3-4 anos', '5-6 anos', '7-8 anos'] },
				{ name: 'Cor', values: ['Rosa', 'Azul', 'Amarelo', 'Verde', 'Branco', 'Vermelho', 'Roxo'] },
				{ name: 'Tamanho', values: ['RN', 'P', 'M', 'G', 'GG', '1 ano', '2 anos', '3 anos'] }
			]
		};

		// 2️⃣ ANÁLISE DO NOME DO PRODUTO
		const nameAnalysis = {
			hasColor: /\b(azul|rosa|amarelo|verde|branco|preto|vermelho|roxo|dourado|prata|cinza|marrom)\b/i.test(productName),
			hasSize: /\b(\d+cm|\d+mm|\d+"|\d+pol|pequeno|médio|grande|pp|p|m|g|gg)\b/i.test(productName),
			hasVoltage: /\b(110v|220v|bivolt|volt)\b/i.test(productName),
			hasCapacity: /\b(\d+ml|\d+l|\d+gb|\d+tb)\b/i.test(productName),
			isAdesivo: /\b(adesivo|adesivos)\b/i.test(productName),
			isEletronico: /\b(tv|celular|smartphone|notebook|tablet|fone|monitor)\b/i.test(productName),
			isRoupa: /\b(camisa|camiseta|blusa|vestido|calça|short|saia)\b/i.test(productName),
			isBaby: /\b(baby|bebê|infantil|criança)\b/i.test(productName)
		};

		// 3️⃣ DETERMINAR CATEGORIA INTELIGENTE
		let smartCategory = 'geral';
		
		if (nameAnalysis.isAdesivo || productName.includes('parede') || productName.includes('decoração')) {
			smartCategory = 'adesivos';
		} else if (nameAnalysis.isEletronico || categoryName.includes('eletronic') || categoryName.includes('tecnologia')) {
			smartCategory = 'eletronicos';
		} else if (nameAnalysis.isRoupa || categoryName.includes('moda') || categoryName.includes('vestuario')) {
			smartCategory = 'moda';
		} else if (categoryName.includes('sapato') || categoryName.includes('calcado')) {
			smartCategory = 'calcados';
		} else if (categoryName.includes('alimentacao') || categoryName.includes('comida') || categoryName.includes('bebida')) {
			smartCategory = 'alimentacao';
		} else if (categoryName.includes('eletrodomestico') || nameAnalysis.hasVoltage) {
			smartCategory = 'eletrodomesticos';
		} else if (nameAnalysis.isBaby || categoryName.includes('infantil') || categoryName.includes('baby')) {
			smartCategory = 'baby';
		} else if (categoryName.includes('decoracao') || categoryName.includes('casa')) {
			smartCategory = 'decoracao';
		}

		// 4️⃣ OBTER OPÇÕES DA CATEGORIA
		let options = categoryOptions[smartCategory] || [
			{ name: 'Cor', values: ['Azul', 'Rosa', 'Amarelo', 'Verde', 'Branco', 'Preto'] },
			{ name: 'Tamanho', values: ['Pequeno', 'Médio', 'Grande'] }
		];

		// 5️⃣ FILTRAR BASEADO NA ANÁLISE DO NOME
		options = options.filter(option => {
			const optionName = option.name.toLowerCase();
			
			// Se já tem cor no nome, não sugerir cor (a menos que seja a diferença encontrada)
			if (optionName === 'cor' && nameAnalysis.hasColor && !hasColorVariations()) {
				return false;
			}
			
			// Se já tem tamanho no nome, não sugerir tamanho (a menos que seja a diferença encontrada)  
			if (optionName === 'tamanho' && nameAnalysis.hasSize && !hasSizeVariations()) {
				return false;
			}
			
			// Se não é eletrônico, não sugerir voltagem
			if (optionName === 'voltagem' && !nameAnalysis.isEletronico && !nameAnalysis.hasVoltage) {
				return false;
			}
			
			// Se não é comida, não sugerir sabor
			if (optionName === 'sabor' && !categoryName.includes('alimentacao') && !productName.includes('sabor')) {
				return false;
			}
			
			return true;
		});

		// 6️⃣ ADICIONAR OPÇÕES BASEADAS EM VARIAÇÕES REAIS ENCONTRADAS
		// (Simplificado para evitar dependências externas)
		console.log(`🧠 FILTRO INTELIGENTE: "${productName}" → Categoria: ${smartCategory} → ${options.length} opções relevantes`);
		console.log(`🎯 Opções sugeridas:`, options.map(o => o.name).join(', '));
		
		return options;
	}

	// Funções auxiliares para análise de variações (simplificadas)
	function hasColorVariations(): boolean {
		// Por enquanto retorna false, pode ser melhorado depois
		return false;
	}

	function hasSizeVariations(): boolean {
		// Por enquanto retorna false, pode ser melhorado depois  
		return false;
	}

	// Opções inteligentes (reativo)
	let smartOptions = $derived(getSmartOptions());

	// Dados para formulário de variant
	let variantFormData = $state<ProductVariant>({
		id: 0,
		sku: '',
		price: '',
		original_price: '',
		cost: '',
		quantity: 0,
		weight: '',
		barcode: '',
		is_active: true,
		option_values: {}
	});

	// Processar suggestions da IA (separado do modal)
	function processSuggestions(data: any) {
		// Aplicar sugestões de variações
		formData.has_variants = true;
		
		// Verificar o formato dos dados e tentar diferentes estruturas
		let variationsData = data;
		
		// Se for string, tentar fazer parse
		if (typeof variationsData === 'string') {
			try {
				variationsData = JSON.parse(variationsData);
				console.log('🔍 Dados parseados:', variationsData);
			} catch (e) {
				console.error('❌ Erro ao fazer parse da resposta:', e);
				toast.error('Erro no formato da resposta da IA');
				return;
			}
		}
		
		// ✅ Processar formato suggestions da IA (variações artificiais)
		if (variationsData.suggestions && Array.isArray(variationsData.suggestions)) {
			console.log('🔍 Processando suggestions da IA:', variationsData.suggestions);
			for (const suggestion of variationsData.suggestions) {
				if (suggestion.type && suggestion.options && Array.isArray(suggestion.options)) {
					const newOption: ProductOption = {
						id: Date.now().toString() + Math.random(),
						name: suggestion.type,
						position: formData.product_options.length,
						values: suggestion.options.map((value: string, index: number) => ({
							id: Date.now() + index + Math.random(),
							value,
							position: index
						}))
					};
					formData.product_options = [...formData.product_options, newOption];
					console.log(`✅ Adicionada opção: ${suggestion.type} com ${suggestion.options.length} valores`);
				}
			}
		}
		
		generateVariants();
		toast.success('Variações sugeridas com sucesso!');
	}

	// Sugerir variações com IA
	async function suggestVariationsWithAI() {
		if (!formData.name) {
			toast.error('Por favor, preencha o nome do produto primeiro');
			return;
		}

		// 🚨 PRIORIDADE 1: Verificar se já tem variações REAIS estruturadas
		if (formData.product_variants && formData.product_variants.length > 0) {
			toast.info(`❌ Este produto já possui ${formData.product_variants.length} variações reais estruturadas. Use o sistema de variações abaixo ao invés da IA.`);
			return;
		}

		// 🚨 PRIORIDADE 2: Verificar se já tem opções de variações
		if (formData.product_options && formData.product_options.length > 0) {
			toast.info(`❌ Este produto já possui ${formData.product_options.length} opções de variação configuradas. Use o sistema de variações abaixo ao invés da IA.`);
			return;
		}

		// 🔍 PRIORIDADE 3: Para produtos variantes, buscar variações reais primeiro
		if (formData.sku) {
			try {
				console.log(`🔍 Verificando se produto SKU ${formData.sku} tem variações reais no sistema...`);
				
				const realVariationsResponse = await fetch(`/api/products/real-variations/${formData.id}`);
				if (realVariationsResponse.ok) {
					const realData = await realVariationsResponse.json();
					if (realData.success && realData.variations && realData.variations.length > 0) {
						console.log(`🎯 ENCONTRADAS ${realData.variations.length} variações reais! Usando sistema estruturado.`);
						
						// Aplicar variações reais encontradas
						formData.product_variants = realData.variations;
						formData.has_variants = true;
						
						toast.success(`✅ Encontradas ${realData.variations.length} variações reais! Sistema estruturado ativado automaticamente.`);
						return; // Sair da função
					}
				}
			} catch (error) {
				console.warn('⚠️ Erro ao verificar variações reais:', error);
			}
		}

		aiLoading = true;
		try {
			// 🔄 FORÇAR NOVA CONSULTA sem cache
			const timestamp = Date.now();
			const randomId = Math.random().toString(36).substring(7);
			
			console.log(`🔄 Iniciando nova consulta IA - timestamp: ${timestamp}, id: ${randomId}`);
			console.log(`⚠️ AVISO: Nenhuma variação real encontrada. Usando sistema de IA como último recurso.`);
			
			const response = await fetch(`/api/ai/enrich?t=${timestamp}&r=${randomId}`, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache'
				},
				body: JSON.stringify({
					field: 'variations',
					currentData: {
						id: formData.id,
						name: formData.name,
						description: formData.description,
						category: formData.category_ids?.[0] || formData.category,
						brand_id: formData.brand_id,
						_timestamp: timestamp,
						_requestId: randomId
					}
				})
			});

			if (!response.ok) throw new Error('Erro ao sugerir variações');

			const result = await response.json();
			console.log('🔍 Resposta da IA para variations:', result);
			
			if (result.success && result.data) {
				console.log('🔍 Dados recebidos da IA:', result.data);
				
				// 🔍 DEBUG: Análise detalhada da resposta
				console.log('=' .repeat(80));
				console.log('🔍 DEBUG: ANÁLISE DETALHADA DA RESPOSTA DA IA');
				console.log('🔍 Tipo de result:', typeof result);
				console.log('🔍 result.success:', result.success);
				console.log('🔍 Tipo de result.data:', typeof result.data);
				console.log('🔍 result.data é string?', typeof result.data === 'string');
				console.log('🔍 result.data é object?', typeof result.data === 'object');
				console.log('🔍 result.data tem related_products?', !!(result.data?.related_products));
				console.log('🔍 result.data tem suggestions?', !!(result.data?.suggestions));
				console.log('🔍 Chaves de result.data:', Object.keys(result.data || {}));
				if (result.data?.related_products) {
					console.log('🔍 Quantidade de related_products:', result.data.related_products.length);
				}
				if (result.data?.suggestions) {
					console.log('🔍 Quantidade de suggestions:', result.data.suggestions.length);
				}
				console.log('=' .repeat(80));
				
				// 🚨 VALIDAÇÃO INTELIGENTE: Detectar problemas antes de prosseguir
				const hasRelatedProducts = result.data?.related_products && Array.isArray(result.data.related_products) && result.data.related_products.length > 0;
				const hasSuggestions = result.data?.suggestions && Array.isArray(result.data.suggestions) && result.data.suggestions.length > 0;
				
				// ❌ CENÁRIO 1: Sistema antigo com suggestions (indica que busca falhou)
				if (!hasRelatedProducts && hasSuggestions) {
					console.warn('⚠️ AVISO: IA retornou formato antigo (suggestions). Indica que busca inteligente falhou.');
					toast.warning('🤖 IA não encontrou produtos similares reais. Prefere criar variações manualmente para ter mais controle?');
					
					// Dar opção ao usuário através do modal bonito
					confirmDialogConfig = {
						title: '🤖 IA não encontrou variações reais',
						message: 'A IA não encontrou produtos similares reais no seu catálogo. Deseja criar variações genéricas mesmo assim?',
						variant: 'warning',
						onConfirm: () => {
							console.log('👤 Usuário optou por criar variações genéricas');
							showConfirmDialog = false;
							// Continuar processamento das suggestions
							processSuggestions(result.data);
						}
					};
					showConfirmDialog = true;
					return; // Pausar execução até o usuário decidir
				}
				
				// ❌ CENÁRIO 2: Nenhum dado útil
				if (!hasRelatedProducts && !hasSuggestions) {
					console.warn('⚠️ AVISO: IA não retornou dados úteis');
					toast.info('🤖 IA não conseguiu analisar este produto. Tente criar variações manualmente.');
					return; // Não criar nada
				}
				
				// ⚠️ VERIFICAR SE IA RETORNOU DADOS ÚTEIS
				let hasUsefulData = false;
				if (result.data.related_products && result.data.related_products.length > 0) {
					hasUsefulData = true;
				}
				if (Array.isArray(result.data) && result.data.length > 0) {
					hasUsefulData = true;
				}
				if (result.data.product_options && result.data.product_options.length > 0) {
					hasUsefulData = true;
				}
				// ✅ NOVO: Verificar formato suggestions da IA
				if (result.data.suggestions && Array.isArray(result.data.suggestions) && result.data.suggestions.length > 0) {
					hasUsefulData = true;
				}
				
				if (!hasUsefulData) {
					toast.info('IA não encontrou variações adequadas para este produto. Tente com um produto que tenha mais similares no catálogo.');
					return;
				}
				
				// Aplicar sugestões de variações
				formData.has_variants = true;
				
				// Verificar o formato dos dados e tentar diferentes estruturas
				let variationsData = result.data;
				
				// Se for string, tentar fazer parse
				if (typeof variationsData === 'string') {
					try {
						variationsData = JSON.parse(variationsData);
						console.log('🔍 Dados parseados:', variationsData);
					} catch (e) {
						console.error('❌ Erro ao fazer parse da resposta:', e);
						toast.error('Erro no formato da resposta da IA');
						return;
					}
				}
				
				// 🎯 PRIMEIRO: Verificar se são PRODUTOS RELACIONADOS REAIS (IA inteligente)
				if (variationsData.related_products && Array.isArray(variationsData.related_products) && variationsData.related_products.length > 0) {
					console.log('🎨 🧠 IA INTELIGENTE: Processando produtos relacionados REAIS:', variationsData.related_products);
					
					// 🔍 DEBUG: Verificar se image_url está chegando
					console.log('🔍 DEBUG - Image URLs dos produtos relacionados:');
					variationsData.related_products.forEach((product: any, idx: number) => {
						console.log(`   ${idx + 1}. "${product.name}" - image_url: "${product.image_url || 'NULL'}"`);
					});
					
					// 🚨 DEDUPLICAÇÃO MUITO MAIS RIGOROSA E LIMITAÇÃO DRÁSTICA
					const seenIds = new Set();
					const seenNames = new Set();
					const seenSkus = new Set();
					
					const uniqueProducts = variationsData.related_products
						.filter((product: any) => {
							// Filtrar por ID único
							if (seenIds.has(product.id)) return false;
							seenIds.add(product.id);
							
							// Filtrar por nome único (ignorar case)
							const nameKey = product.name?.toLowerCase()?.trim();
							if (!nameKey || seenNames.has(nameKey)) return false;
							seenNames.add(nameKey);
							
							// Filtrar por SKU único se existir
							if (product.sku && product.sku !== 'N/A') {
								if (seenSkus.has(product.sku)) return false;
								seenSkus.add(product.sku);
							}
							
							return true;
						})
						.slice(0, 8); // 🎯 PERMITIR ATÉ 8 produtos relacionados
					
					console.log(`🔧 DEDUPLICAÇÃO: ${variationsData.related_products.length} → ${uniqueProducts.length} produtos únicos`);
					
					// Salvar produtos relacionados reais (não são variações artificiais)
					formData.related_products = uniqueProducts.map((product: any) => ({
						id: product.id,
						name: product.name,
						sku: product.sku || 'N/A',
						price: parseFloat(product.price?.toString() || '0'),
						slug: product.slug || product.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
						relationship_type: product.relationship_type || 'variation',
						difference: product.difference || 'Produto relacionado',
						variation_type: product.variation_type || 'other',
						confidence: typeof product.confidence === 'number' ? product.confidence : 0.95,
						image_url: (product.image_url && product.image_url !== 'NULL' && product.image_url !== 'null') ? product.image_url : null,
						is_real_product: true
					}));
					
					// 🔍 DEBUG: Verificar formData.related_products após processamento
					console.log('🔍 DEBUG - formData.related_products após processamento:');
					console.log('🔍 DEBUG - Objeto completo formData.related_products:', formData.related_products);
					formData.related_products.forEach((product: any, idx: number) => {
						console.log(`   ${idx + 1}. ID: ${product.id}`);
						console.log(`      Nome: "${product.name}"`);
						console.log(`      Image URL: "${product.image_url || 'NULL'}"`);
						console.log(`      Type: ${typeof product.image_url}`);
						console.log(`      SKU: ${product.sku}`);
						console.log(`      Slug: ${product.slug}`);
						console.log(`      Price: ${product.price}`);
						console.log(`      Objeto completo:`, product);
						console.log('---');
					});
					
					// Indicar que são produtos relacionados reais, não variações artificiais
					(formData as any).variant_type = 'real_products';
					formData.has_variants = true; // Marcar como tendo variações
					
					console.log(`✅ INTELIGENTE: ${formData.related_products.length} produtos relacionados REAIS identificados:`);
					
					// Log detalhado dos produtos encontrados
					formData.related_products.forEach((p: any, idx: number) => {
						console.log(`   ${idx + 1}. "${p.name}" - ${p.difference} (${(p.confidence * 100).toFixed(0)}% confiança) - IMG: ${p.image_url ? 'SIM' : 'NÃO'}`);
					});
					
					// Salvar análise se disponível
					if (variationsData.analysis) {
						formData.variation_analysis = variationsData.analysis;
						console.log(`📊 Análise salva:`, variationsData.analysis);
					}
					
					// 🧠 TAMBÉM CRIAR OPÇÕES BASEADAS NAS DIFERENÇAS (para compatibilidade)
					const optionsByType: Record<string, Set<string>> = {};
					
					for (const relatedProduct of variationsData.related_products) {
						if (relatedProduct.difference && relatedProduct.name) {
							console.log(`🔍 Analisando diferença: "${relatedProduct.difference}"`);
							
							// 🎯 PROCESSAR MÚLTIPLAS DIFERENÇAS (cor: azul,cor: marinho,estilo: clássico)
							const difference = relatedProduct.difference.toLowerCase();
							const parts = difference.split(',');
							
							// 🧠 EXTRAIR NOME ORIGINAL PARA COMPARAÇÃO
							const currentName = formData.name.toLowerCase();
							const productName = relatedProduct.name.toLowerCase();
							
							for (const part of parts) {
								const trimmedPart = part.trim();
								let variationType = 'Variação';
								let extractedValue = '';
								
								if (trimmedPart.includes('cor:')) {
									variationType = 'Cor';
									extractedValue = trimmedPart.split('cor:')[1]?.trim() || '';
								} else if (trimmedPart.includes('estilo:')) {
									variationType = 'Estilo';
									extractedValue = trimmedPart.split('estilo:')[1]?.trim() || '';
								} else if (trimmedPart.includes('material:')) {
									variationType = 'Material';
									extractedValue = trimmedPart.split('material:')[1]?.trim() || '';
								} else if (trimmedPart.includes('tamanho:')) {
									variationType = 'Tamanho';
									extractedValue = trimmedPart.split('tamanho:')[1]?.trim() || '';
								} else if (trimmedPart.includes('formato:')) {
									variationType = 'Formato';
									extractedValue = trimmedPart.split('formato:')[1]?.trim() || '';
								}
								
								// 🎯 NOVO: Processar valores com formato "valor1 → valor2"
								if (extractedValue.includes('→')) {
									const [fromValue, toValue] = extractedValue.split('→').map(v => v.trim());
									
									// Adicionar ambos os valores (o original e o da variação)
									if (fromValue && toValue) {
										// Inicializar conjunto se não existir
										if (!optionsByType[variationType]) {
											optionsByType[variationType] = new Set();
										}
										
										// Adicionar valor base (produto atual)
										let finalFromValue = processVariationValue(fromValue);
										optionsByType[variationType].add(finalFromValue);
										console.log(`✅ Adicionado: ${variationType} = "${finalFromValue}" (valor base)`);
										
										// Adicionar valor da variação
										let finalToValue = processVariationValue(toValue);
										optionsByType[variationType].add(finalToValue);
										console.log(`✅ Adicionado: ${variationType} = "${finalToValue}" (variação)`);
										
										continue; // Pular o processamento normal
									}
								}
								
								// 🔍 FALLBACK: Extrair do nome do produto se não conseguiu da diferença
								if (!extractedValue && variationType === 'Cor') {
									// Buscar cores no nome do produto relacionado que não estão no produto atual
									const cores = ['azul', 'rosa', 'vermelho', 'branco', 'preto', 'verde', 'amarelo', 'roxo', 'cinza', 'marrom', 'bege', 'creme', 'rosé', 'cappuccino', 'marinho', 'bebê', 'clássico'];
									for (const cor of cores) {
										if (productName.includes(cor) && !currentName.includes(cor)) {
											extractedValue = cor;
											break;
										}
									}
								}
								
								// Processar valor único (sem →)
								if (extractedValue && extractedValue.length > 1) {
									// Inicializar conjunto se não existir
									if (!optionsByType[variationType]) {
										optionsByType[variationType] = new Set();
									}
									
									let finalValue = processVariationValue(extractedValue);
									optionsByType[variationType].add(finalValue);
									console.log(`✅ Adicionado: ${variationType} = "${finalValue}"`);
								}
							}
						}
					}
					
					// 🏗️ CRIAR OPÇÕES BASEADAS NOS TIPOS ENCONTRADOS
					console.log('🏗️ Criando opções por tipo:', optionsByType);
					
					for (const [typeName, valuesSet] of Object.entries(optionsByType)) {
						if (valuesSet.size > 0) {
							const newOption: ProductOption = {
								id: Date.now().toString() + Math.random(),
								name: typeName,
								position: formData.product_options.length,
								values: Array.from(valuesSet).map((value: string, index: number) => ({
									id: Date.now() + index + Math.random(),
									value,
									position: index
								}))
							};
							
							formData.product_options = [...formData.product_options, newOption];
							console.log(`✅ Criada opção "${typeName}" com valores: ${Array.from(valuesSet).join(', ')}`);
						}
					}
					
					// Mostrar toast específico para produtos relacionados
					toast.success(`🧠 IA Inteligente encontrou ${formData.related_products.length} produtos relacionados reais!`);
					
					console.log('🔍 Product options após processamento:', formData.product_options);
					generateVariants();
					return; // ✅ IMPORTANTE: Sair aqui para não processar outros formatos
				}
				
				// Se tiver product_options, usar diretamente 
				else if (variationsData.product_options && Array.isArray(variationsData.product_options)) {
					console.log('🔍 Usando product_options diretamente');
					formData.product_options = variationsData.product_options;
				}
				
				// ✅ NOVO: Processar formato suggestions da IA (variações artificiais)
				else if (variationsData.suggestions && Array.isArray(variationsData.suggestions)) {
					console.log('🔍 Processando suggestions da IA:', variationsData.suggestions);
					for (const suggestion of variationsData.suggestions) {
						if (suggestion.type && suggestion.options && Array.isArray(suggestion.options)) {
							const newOption: ProductOption = {
								id: Date.now().toString() + Math.random(),
								name: suggestion.type,
								position: formData.product_options.length,
								values: suggestion.options.map((value: string, index: number) => ({
									id: Date.now() + index + Math.random(),
									value,
									position: index
								}))
							};
							formData.product_options = [...formData.product_options, newOption];
							console.log(`✅ Adicionada opção: ${suggestion.type} com ${suggestion.options.length} valores`);
						}
					}
				}
				

				
				// Como fallback, criar algumas variações padrão baseadas no produto
				else {
					console.log('🔍 Criando variações padrão como fallback');
					// Baseado no tipo de produto, criar variações básicas
					const productName = formData.name.toLowerCase();
					
					if (productName.includes('cortina')) {
						// Para cortinas, criar variações de cor
						const newOption: ProductOption = {
							id: Date.now().toString(),
							name: 'Cor',
							position: 0,
							values: [
								{ id: Date.now() + 1, value: 'Branco', position: 0 },
								{ id: Date.now() + 2, value: 'Bege', position: 1 },
								{ id: Date.now() + 3, value: 'Azul', position: 2 }
							]
						};
						formData.product_options = [newOption];
					}
				}
				
				console.log('🔍 Product options após processamento:', formData.product_options);
				generateVariants();
				toast.success('Variações sugeridas com sucesso!');
			} else {
				console.error('❌ Resposta da IA inválida:', result);
				toast.error('Resposta da IA inválida');
			}
		} catch (error) {
			console.error('Erro ao sugerir variações:', error);
			
			// 🚫 ERRO CRÍTICO: Não preencher nada, apenas mostrar mensagem amigável
			const errorMessage = (error as Error)?.message || String(error);
			
			if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
				toast.error('⏱️ Timeout na busca. Tente novamente em alguns segundos.');
			} else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
				toast.error('🌐 Problema de conexão. Verifique sua internet e tente novamente.');
			} else {
				toast.error('❌ Erro inesperado ao analisar variações. Tente novamente ou crie manualmente.');
			}
			
			// ✅ IMPORTANTE: NÃO criar variações quando há erro
			// Deixar o produto como está, sem modificações
			
		} finally {
			aiLoading = false;
		}
	}

	// Adicionar opção predefinida
	function addCommonOption(optionName: string, values: string[]) {
		const newOption: ProductOption = {
			id: Date.now().toString(),
			name: optionName,
			position: formData.product_options.length,
			values: values.map((value, index) => ({
				id: Date.now() + index,
				value,
				position: index
			}))
		};
		formData.product_options = [...formData.product_options, newOption];
		formData.has_variants = true;
		generateVariants();
	}

	// Adicionar opção customizada
	function addCustomOption() {
		if (!newOptionName.trim()) return;

		const newOption: ProductOption = {
			id: Date.now().toString(),
			name: newOptionName.trim(),
			position: formData.product_options.length,
			values: []
		};
		formData.product_options = [...formData.product_options, newOption];
		formData.has_variants = true;
		newOptionName = '';
		generateVariants();
	}

	// Remover opção
	function removeOption(optionIndex: number) {
		formData.product_options = formData.product_options.filter((_: any, index: number) => index !== optionIndex);
		if (formData.product_options.length === 0) {
			formData.has_variants = false;
			formData.product_variants = [];
		} else {
			generateVariants();
		}
	}

	// Adicionar valor à opção
	function addValueToOption(optionIndex: number, value: string) {
		if (!value.trim()) return;

		const newValue: OptionValue = {
			id: Date.now(),
			value: value.trim(),
			position: formData.product_options[optionIndex].values.length
		};
		formData.product_options[optionIndex].values.push(newValue);
		formData.product_options = [...formData.product_options];
		generateVariants();
	}

	// Remover valor da opção
	function removeValueFromOption(optionIndex: number, valueIndex: number) {
		formData.product_options[optionIndex].values.splice(valueIndex, 1);
		formData.product_options = [...formData.product_options];
		generateVariants();
	}

	// Gerar todas as combinações de variants
	function generateVariants() {
		if (formData.product_options.length === 0) {
			formData.product_variants = [];
			return;
		}

		const combinations = getOptionCombinations();
		const existingVariants = formData.product_variants || [];
		
		formData.product_variants = combinations.map((combination: any, index: number) => {
			// Procurar variant existente com a mesma combinação
			const existing = existingVariants.find((v: ProductVariant) => 
				JSON.stringify(v.option_values) === JSON.stringify(combination.option_values)
			);

			if (existing) {
				return existing;
			}

			// Criar nova variant
			const variantName = Object.values(combination.option_values).join(' / ');
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
				option_values: combination.option_values,
				name: variantName
			};
		});
	}

	// Obter todas as combinações possíveis
	function getOptionCombinations() {
		const options = formData.product_options.filter((opt: ProductOption) => opt.values.length > 0);
		if (options.length === 0) return [];

		function cartesian(arrays: any[]): any[] {
			return arrays.reduce((acc: any[], curr: any[]) => 
				acc.flatMap((a: any) => curr.map((c: any) => [...a, c]))
			, [[]]);
		}

		const valueArrays = options.map((option: ProductOption) => 
			option.values.map((value: OptionValue) => ({ 
				optionName: option.name, 
				value: value.value 
			}))
		);

		const combinations = cartesian(valueArrays);
		
		return combinations.map((combination: any[]) => ({
			option_values: combination.reduce((acc: Record<string, string>, { optionName, value }) => {
				acc[optionName] = value;
				return acc;
			}, {})
		}));
	}

	// Editar variant
	function editVariant(variant: ProductVariant) {
		editingVariant = variant;
		variantFormData = { ...variant };
		showVariantForm = true;
	}

	// Salvar variant
	function saveVariant() {
		if (editingVariant) {
			const index = formData.product_variants.findIndex((v: ProductVariant) => v.id === editingVariant!.id);
			if (index !== -1) {
				formData.product_variants[index] = { ...variantFormData };
				formData.product_variants = [...formData.product_variants];
			}
		}
		resetVariantForm();
	}

	// Resetar formulário de variant
	function resetVariantForm() {
		editingVariant = null;
		showVariantForm = false;
		variantFormData = {
			id: 0,
			sku: '',
			price: '',
			original_price: '',
			cost: '',
			quantity: 0,
			weight: '',
			barcode: '',
			is_active: true,
			option_values: {}
		};
	}

	// Toggle de ativação de variações
	function toggleVariants() {
		if (!formData.has_variants) {
			formData.product_options = [];
			formData.product_variants = [];
		}
	}

	// 🎯 AÇÕES DA TABELA DE VARIAÇÕES (mesmo padrão do grid de produtos)
	function getVariantActions(variant: ProductVariant) {
		return [
			{
				label: 'Editar',
				icon: 'Edit',
				onclick: () => editVariant(variant)
			}
		];
	}

	// Handlers para input
	function handleNewValueKeydown(event: KeyboardEvent, optionIndex: number) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const input = event.target as HTMLInputElement;
			addValueToOption(optionIndex, input.value);
			input.value = '';
		}
	}



	// 🎯 FUNÇÃO PARA PROCESSAR E MAPEAR VALORES DE VARIAÇÃO
	function processVariationValue(value: string): string {
		// Limpar e validar valor
		let cleanValue = value.replace(/[^a-záàâãéêíóôõúç\s\-]/gi, '').trim();
		
		// 🎯 MAPEAR VALORES COMPOSTOS
		if (cleanValue === 'azul bebê' || cleanValue.includes('bebê')) {
			return 'Azul Bebê';
		} else if (cleanValue === 'azul clássico' || cleanValue === 'azul classico') {
			return 'Azul Clássico';
		} else if (cleanValue === 'azul marinho' || cleanValue.includes('marinho')) {
			return 'Azul Marinho';
		} else if (cleanValue === 'rosa clássico' || cleanValue === 'rosa classico') {
			return 'Rosa Clássico';
		} else if (cleanValue === 'branco clássico' || cleanValue === 'branco classico') {
			return 'Branco Clássico';
		} else if (cleanValue === 'chuva de amor') {
			return 'Chuva de Amor';
		} else {
			// Capitalizar primeira letra
			return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
		}
	}
</script>

<div class="space-y-8">
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-xl font-semibold text-gray-900 mb-2">Variações do Produto</h3>
				<p class="text-gray-600">Configure diferentes opções como cores, tamanhos, voltagens, etc.</p>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={suggestVariationsWithAI}
					disabled={aiLoading || !formData.name}
					class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					title="Buscar variações estruturadas ou sugerir com IA"
				>
					{#if aiLoading}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						<span>Analisando...</span>
					{:else}
						<ModernIcon name="search" size="xs" />
						<span>Buscar Variações</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- SUGESTÕES IA EM LOTE (quando modo revisão ativado) -->
	{#if isAIReviewMode && aiSuggestions.length > 0}
		<div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-6">
			<h3 class="text-lg font-semibold text-[#00BFB3] mb-4 flex items-center gap-2">
				<ModernIcon name="robot" size="md" />
				Sugestões IA para Variações do Produto
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

	<!-- ATIVAR VARIAÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<div class="flex items-center justify-between">
			<div>
											<h4 class="font-semibold text-gray-900 mb-2 flex items-center gap-2">
								<ModernIcon name="star" size="sm" />
								Produto com Variações
							</h4>
				<p class="text-gray-600 text-sm">
					{formData.has_variants 
						? 'Este produto possui diferentes variações (cor, tamanho, etc.)'
						: 'Ative para criar variações como cor, tamanho, voltagem, etc.'
					}
				</p>
			</div>
			
			<label class="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={formData.has_variants}
					onchange={toggleVariants}
					class="w-6 h-6 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
				/>
				<span class="text-sm font-medium text-gray-900">
					{formData.has_variants ? 'Ativado' : 'Desativado'}
				</span>
			</label>
		</div>
	</div>

	{#if formData.has_variants}
		<!-- OPÇÕES PREDEFINIDAS -->
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
				<ModernIcon name="Check" size="sm" />
				Opções Rápidas
			</h4>

			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				{#each smartOptions as option}
					<button
						type="button"
						onclick={() => addCommonOption(option.name, option.values)}
						class="p-3 text-left border border-gray-300 rounded-lg hover:border-[#00BFB3] hover:bg-gray-50 transition-colors"
					>
						<div class="font-medium text-gray-900">{option.name}</div>
						<div class="text-xs text-gray-500 mt-1">
							{option.values.slice(0, 3).join(', ')}{option.values.length > 3 ? '...' : ''}
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- OPÇÃO CUSTOMIZADA -->
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
				<ModernIcon name="Plus" size="sm" />
				Criar Opção Personalizada
			</h4>

			<div class="flex gap-3">
				<input
					type="text"
					bind:value={newOptionName}
					placeholder="Nome da opção (ex: Material, Voltagem...)"
					class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				/>
				<button
					type="button"
					onclick={addCustomOption}
					disabled={!newOptionName.trim()}
					class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Criar
				</button>
			</div>
		</div>

		<!-- OPÇÕES CONFIGURADAS -->
		{#if formData.product_options.length > 0}
			<div class="space-y-6">
				{#each formData.product_options as option, optionIndex}
					<div class="bg-white border border-gray-200 rounded-lg p-6">
						<div class="flex items-center justify-between mb-4">
							<h5 class="font-semibold text-gray-900 flex items-center gap-2">
								<span class="w-6 h-6 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center text-sm font-bold">
									{optionIndex + 1}
								</span>
								{option.name}
							</h5>
															<button
									type="button"
									onclick={() => removeOption(optionIndex)}
									class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
									title="Remover opção"
								>
									<ModernIcon name="delete" size="sm" />
								</button>
						</div>

						<!-- Adicionar Valor -->
						<div class="mb-4">
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Adicionar Valor
							</label>
							<input
								type="text"
								placeholder="Digite um valor e pressione Enter"
								onkeydown={(e) => handleNewValueKeydown(e, optionIndex)}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							/>
						</div>

						<!-- Valores da Opção -->
						{#if option.values.length > 0}
							<div class="space-y-2">
								<h6 class="text-sm font-medium text-gray-700">
									Valores ({option.values.length})
								</h6>
								<div class="flex flex-wrap gap-2">
									{#each option.values as value, valueIndex}
										<span class="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
											<span>{value.value}</span>
											<button
												type="button"
												onclick={() => removeValueFromOption(optionIndex, valueIndex)}
												class="text-gray-700 hover:text-red-600 transition-colors"
												title="Remover valor"
											>
												✕
											</button>
										</span>
									{/each}
								</div>
							</div>
						{:else}
							<div class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
								<p class="text-gray-500 text-sm">Nenhum valor adicionado para "{option.name}"</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- VARIAÇÕES ESTRUTURADAS -->
		{#if formData.product_variants && formData.product_variants.length > 0}
			<div class="space-y-4">
				<h4 class="font-semibold text-slate-900 flex items-center gap-2">
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					Sistema de Variações Estruturadas ({formData.product_variants.length})
				</h4>
				
				<div class="bg-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-lg p-4 mb-4">
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0">
							<svg class="w-5 h-5 text-[#00BFB3] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
						</div>
						<div>
							<h5 class="font-medium text-[#00BFB3] mb-1">Sistema Ativado</h5>
							<p class="text-sm text-gray-700">
								Este produto possui <strong>{formData.product_variants.length} variações estruturadas</strong> no banco de dados.
							</p>
						</div>
					</div>
				</div>
				
				<!-- Tabela administrativa -->
				<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div class="p-4">
						<DataTable
							columns={variantsColumns}
							data={formData.product_variants}
							loading={false}
							selectable={false}
							showHeaderPagination={false}
							actions={getVariantActions}
							emptyMessage="Nenhuma variação encontrada"
						/>
					</div>
				</div>
			</div>
		{:else if (formData.variant_type === 'real_products' || formData.related_products?.length > 0) && formData.related_products && formData.related_products.length > 0}
			<!-- PRODUTOS SIMILARES -->
			<div class="space-y-4">
				<h4 class="font-semibold text-slate-900 flex items-center gap-2">
					<svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-1.849-1.153L6.757 19.1z" />
					</svg>
					Sistema de IA - Produtos Similares ({formData.related_products.length})
				</h4>
				
				<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0">
							<svg class="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
							</svg>
						</div>
						<div>
							<h5 class="font-medium text-amber-900 mb-1">Sistema de IA</h5>
							<p class="text-sm text-amber-700">
								A IA encontrou <strong>{formData.related_products.length} produtos similares</strong> no catálogo.
							</p>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Produto
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Diferenças
									</th>
									<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
										Preço
									</th>
									<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Confiança IA
									</th>
									<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Ações
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each formData.related_products as product, index}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="flex items-center space-x-3">
												{#if product.image_url}
													<img 
														src={product.image_url} 
														alt={product.name}
														class="w-12 h-12 lg:w-16 lg:h-16 rounded-lg object-cover flex-shrink-0 shadow-sm"
														loading="lazy"
														onerror={(e) => {
															e.target.src = '/api/placeholder/80/80?text=' + encodeURIComponent(product.name);
														}}
													/>
												{:else}
													<div class="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-lg flex items-center justify-center">
														<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
														</svg>
													</div>
												{/if}
												<div class="min-w-0 flex-1">
													<div class="font-medium text-gray-900 text-sm lg:text-base truncate">
														<a href="/produtos/{product.id}" class="hover:text-[#00BFB3]">
															{product.name}
														</a>
													</div>
													<div class="text-xs lg:text-sm text-gray-500 mt-1">SKU: {product.sku}</div>
												</div>
											</div>
										</td>
										<td class="px-6 py-4">
											<div class="text-sm text-gray-900">
												{product.difference || 'Produto relacionado'}
											</div>
											<div class="text-xs text-gray-500 mt-1">
												Tipo: {product.variation_type?.toUpperCase() || 'OUTROS'}
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-right">
											<div class="font-semibold text-gray-900 text-sm lg:text-base">
												R$ {Number(product.price || 0).toFixed(2)}
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-center">
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
												{typeof product.confidence === 'number' && !isNaN(product.confidence) ? Math.round(product.confidence * 100) : 95}%
											</span>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
											<div class="flex items-center justify-center space-x-2">
												<a 
													href="/produtos/{product.id}" 
													class="text-gray-600 hover:text-gray-900"
													title="Ver produto"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
													</svg>
												</a>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}



		<!-- FORMULÁRIO DE EDIÇÃO DE VARIANT -->
		{#if showVariantForm && editingVariant}
			<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
				<div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
					<div class="p-6">
						<div class="flex items-center justify-between mb-6">
							<h3 class="text-xl font-semibold text-slate-900">
								Editar Variação: {editingVariant.name}
							</h3>
							<button
								type="button"
								onclick={resetVariantForm}
								class="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
							>
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<!-- SKU -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">SKU</label>
								<input
									type="text"
									bind:value={variantFormData.sku}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
								/>
							</div>

							<!-- Preço -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">Preço (R$)</label>
								<input
									type="number"
									step="0.01"
									bind:value={variantFormData.price}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
								/>
							</div>

							<!-- Preço Original -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">Preço Original (R$)</label>
								<input
									type="number"
									step="0.01"
									bind:value={variantFormData.original_price}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
								/>
							</div>

							<!-- Custo -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">Custo (R$)</label>
								<input
									type="number"
									step="0.01"
									bind:value={variantFormData.cost}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
								/>
							</div>

							<!-- Estoque -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">Quantidade em Estoque</label>
								<input
									type="number"
									bind:value={variantFormData.quantity}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
								/>
							</div>

							<!-- Peso -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">Peso (kg)</label>
								<input
									type="number"
									step="0.001"
									bind:value={variantFormData.weight}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
								/>
							</div>

							<!-- Código de Barras -->
							<div class="md:col-span-2">
								<label class="block text-sm font-medium text-slate-700 mb-2">Código de Barras</label>
								<input
									type="text"
									bind:value={variantFormData.barcode}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
								/>
							</div>
						</div>

						<!-- Status Ativo -->
						<div class="mt-6 flex items-center">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={variantFormData.is_active}
									class="w-5 h-5 rounded border-slate-300 text-[#00BFB3] shadow-sm focus:border-[#00BFB3] focus:ring focus:ring-[#00BFB3]/20 focus:ring-opacity-50"
								/>
								<span class="text-sm font-medium text-slate-900">Variação ativa</span>
							</label>
						</div>

						<!-- Botões -->
						<div class="mt-8 flex gap-3 justify-end">
							<button
								type="button"
								onclick={resetVariantForm}
								class="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
							>
								Cancelar
							</button>
							<button
								type="button"
								onclick={saveVariant}
								class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-xl transition-all"
							>
								Salvar Variação
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<!-- Estado sem variações -->
		<div class="text-center py-12 bg-slate-50 rounded-xl">
			<div class="w-16 h-16 mx-auto mb-4 text-slate-400">
				<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 011 1v1z" />
				</svg>
			</div>
			<h4 class="text-lg font-semibold text-slate-900 mb-2">Produto Simples</h4>
			<p class="text-slate-600 mb-4">Este produto não possui variações como cor, tamanho, etc.</p>
			<p class="text-sm text-slate-500">Ative as variações se precisar de diferentes opções para este produto</p>
		</div>
	{/if}
</div>

<!-- Modal de Confirmação -->
<ConfirmDialog
	show={showConfirmDialog}
	title={confirmDialogConfig.title}
	message={confirmDialogConfig.message}
	variant={confirmDialogConfig.variant}
	confirmText="Continuar"
	cancelText="Cancelar"
	onConfirm={confirmDialogConfig.onConfirm}
	onCancel={() => showConfirmDialog = false}
/>

 