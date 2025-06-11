<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import AISuggestionCard from '$lib/components/shared/AISuggestionCard.svelte';
	import { aiReviewMode, aiSuggestionsByCategory } from '$lib/stores/aiReview';
	import { toast } from '$lib/stores/toast';
	
	interface Props {
		formData: any;
	}
	
	let { formData = $bindable() }: Props = $props();
	
	// Estados locais
	let newAttribute = $state({ key: '', values: '' });
	let newSpecification = $state({ key: '', value: '' });
	let aiLoading = $state(false);
	let aiLoadingSpecs = $state(false);
	
	// Estados para revisão IA em lote
	let isAIReviewMode = $state(false);
	let aiSuggestions = $state<any[]>([]);
	
	// Garantir que os campos existam e sejam objetos válidos
	function ensureValidObjects() {
		console.log('🔍 AttributesSection - formData.attributes:', typeof formData.attributes, formData.attributes);
		console.log('🔍 AttributesSection - formData.specifications:', typeof formData.specifications, formData.specifications);
		
		// 🔧 DEBUG: Ver estrutura completa
		console.log('🔍 AttributesSection - formData.specifications keys:', Object.keys(formData.specifications || {}));
		console.log('🔍 AttributesSection - formData.specifications entries:', Object.entries(formData.specifications || {}));
		
		// Verificar e converter attributes se necessário
		if (typeof formData.attributes === 'string') {
			try {
				console.log('🔄 Convertendo attributes de string para objeto');
				formData.attributes = JSON.parse(formData.attributes) as Record<string, any>;
			} catch (error) {
				console.error('❌ Erro ao parsear attributes:', error);
				formData.attributes = {} as Record<string, any>;
			}
		} else if (!formData.attributes || typeof formData.attributes !== 'object' || Array.isArray(formData.attributes)) {
			console.log('🔄 Inicializando attributes como objeto vazio');
			formData.attributes = {} as Record<string, any>;
		}
		
		// Verificar e converter specifications se necessário
		if (typeof formData.specifications === 'string') {
			try {
				console.log('🔄 Convertendo specifications de string para objeto');
				formData.specifications = JSON.parse(formData.specifications) as Record<string, any>;
			} catch (error) {
				console.error('❌ Erro ao parsear specifications:', error);
				formData.specifications = {} as Record<string, any>;
			}
		} else if (!formData.specifications || typeof formData.specifications !== 'object' || Array.isArray(formData.specifications)) {
			console.log('🔄 Inicializando specifications como objeto vazio');
			formData.specifications = {} as Record<string, any>;
		}
		
		console.log('✅ AttributesSection - attributes final:', formData.attributes);
		console.log('✅ AttributesSection - specifications final:', formData.specifications);
		
		// 🔧 FORÇA BRUTA: Se ainda está mostrando números como keys, converter
		if (formData.specifications && Object.keys(formData.specifications).some(key => !isNaN(Number(key)))) {
			console.log('🔧 FORÇA BRUTA: Detectados keys numéricos, forçando conversão');
			try {
				// Se parece com string JSON quebrada, tentar reconstruir
				const stringified = JSON.stringify(formData.specifications);
				console.log('🔧 FORÇA BRUTA: stringified:', stringified);
				
				// Tentar parsear novamente
				formData.specifications = JSON.parse(stringified);
				console.log('🔧 FORÇA BRUTA: Após reparsing:', formData.specifications);
			} catch (error) {
				console.log('🔧 FORÇA BRUTA: Erro no reparsing, resetando:', error);
				formData.specifications = {};
			}
		}
	}
	
	// Chamar a função de inicialização
	ensureValidObjects();
	
	// 🔧 VARIÁVEIS DERIVADAS PARA DADOS SEGUROS
	let safeSpecifications = $derived(() => {
		if (typeof formData.specifications === 'string') {
			try {
				return JSON.parse(formData.specifications);
			} catch {
				return {};
			}
		}
		if (!formData.specifications || typeof formData.specifications !== 'object' || Array.isArray(formData.specifications)) {
			return {};
		}
		return formData.specifications;
	});
	
	let safeAttributes = $derived(() => {
		if (typeof formData.attributes === 'string') {
			try {
				return JSON.parse(formData.attributes);
			} catch {
				return {};
			}
		}
		if (!formData.attributes || typeof formData.attributes !== 'object' || Array.isArray(formData.attributes)) {
			return {};
		}
		return formData.attributes;
	});
	
	// Adicionar atributo (para filtros)
	function addAttribute() {
		if (newAttribute.key.trim() && newAttribute.values.trim()) {
			const key = newAttribute.key.trim();
			const values = newAttribute.values.split(',').map(v => v.trim()).filter(Boolean);
			
			if (values.length > 0) {
				formData.attributes[key] = values;
				formData.attributes = { ...formData.attributes }; // Trigger reactivity
				newAttribute = { key: '', values: '' };
				toast.success(`Atributo "${key}" adicionado`);
			}
		}
	}
	
	// Remover atributo
	function removeAttribute(key: string) {
		delete formData.attributes[key];
		formData.attributes = { ...formData.attributes };
		toast.success(`Atributo "${key}" removido`);
	}
	
	// Adicionar especificação
	function addSpecification() {
		if (newSpecification.key.trim() && newSpecification.value.trim()) {
			// 🔧 GARANTIR QUE SPECIFICATIONS SEJA OBJETO
			if (typeof formData.specifications === 'string') {
				try {
					formData.specifications = JSON.parse(formData.specifications);
				} catch {
					formData.specifications = {};
				}
			}
			if (!formData.specifications || typeof formData.specifications !== 'object') {
				formData.specifications = {};
			}
			
			formData.specifications[newSpecification.key.trim()] = newSpecification.value.trim();
			formData.specifications = { ...formData.specifications };
			newSpecification = { key: '', value: '' };
			toast.success('Especificação adicionada');
		}
	}
	
	// Remover especificação
	function removeSpecification(key: string) {
		delete formData.specifications[key];
		formData.specifications = { ...formData.specifications };
		toast.success('Especificação removida');
	}
	
	// Subscrever ao modo IA
	aiReviewMode.subscribe(mode => {
		isAIReviewMode = mode;
	});

	// Subscrever às sugestões da categoria 'attributes'
	aiSuggestionsByCategory.subscribe(suggestions => {
		aiSuggestions = suggestions.attributes || [];
		console.log('🏷️ AttributesSection: Sugestões recebidas:', aiSuggestions);
	});
	
	// Sugerir atributos com IA
	async function suggestAttributesWithAI() {
		if (!formData.name || !formData.category_id) {
			toast.error('Por favor, preencha o nome e categoria do produto primeiro');
			return;
		}
		
		aiLoading = true;
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field: 'attributes',
					currentData: {
						name: formData.name,
						description: formData.description,
						category: formData.category_id
					}
				})
			});
			
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					// Mesclar com atributos existentes
					formData.attributes = {
						...formData.attributes,
						...result.data
					};
					toast.success('Atributos sugeridos pela IA foram adicionados!');
				}
			} else {
				throw new Error('Erro na resposta da API');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao buscar sugestões da IA');
		} finally {
			aiLoading = false;
		}
	}
	
	// NOVA FUNÇÃO: Sugerir especificações com IA
	async function suggestSpecificationsWithAI() {
		if (!formData.name || !formData.category_id) {
			toast.error('Por favor, preencha o nome e categoria do produto primeiro');
			return;
		}
		
		aiLoadingSpecs = true;
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field: 'specifications',
					currentData: {
						name: formData.name,
						description: formData.description,
						category: formData.category_id,
						attributes: formData.attributes
					}
				})
			});
			
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					console.log('🔧 IA SPECS: Dados recebidos:', typeof result.data, result.data);
					
					// 🔧 NORMALIZAR DADOS DA IA ANTES DE APLICAR
					let safeData = result.data;
					
					// Se veio como string JSON, parsear
					if (typeof result.data === 'string') {
						try {
							safeData = JSON.parse(result.data);
							console.log('🔧 IA SPECS: Parseado de string:', safeData);
						} catch (error) {
							console.error('❌ IA SPECS: Erro ao parsear string JSON:', error);
							safeData = {};
						}
					}
					
					// Garantir que formData.specifications seja objeto
					if (typeof formData.specifications !== 'object' || Array.isArray(formData.specifications)) {
						formData.specifications = {} as Record<string, any>;
					}
					
					// Mesclar com especificações existentes
					formData.specifications = {
						...formData.specifications,
						...safeData
					} as Record<string, any>;
					
					console.log('✅ IA SPECS: Especificações aplicadas:', formData.specifications);
					toast.success('Especificações sugeridas pela IA foram adicionadas!');
				}
			} else {
				throw new Error('Erro na resposta da API');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao buscar sugestões da IA');
		} finally {
			aiLoadingSpecs = false;
		}
	}
	
	// Templates de atributos por categoria
	const attributeTemplates: Record<string, Record<string, string[]>> = {
		eletronicos: {
			'Voltagem': ['110V', '220V', 'Bivolt'],
			'Cor': ['Preto', 'Branco', 'Prata', 'Dourado'],
			'Memória': ['4GB', '8GB', '16GB', '32GB', '64GB', '128GB'],
			'Armazenamento': ['128GB', '256GB', '512GB', '1TB', '2TB']
		},
		roupas: {
			'Tamanho': ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
			'Cor': ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo'],
			'Material': ['Algodão', 'Poliéster', 'Viscose', 'Linho', 'Jeans']
		},
		moveis: {
			'Cor': ['Branco', 'Preto', 'Madeira Natural', 'Carvalho', 'Mogno'],
			'Material': ['MDF', 'MDP', 'Madeira Maciça', 'Metal', 'Vidro'],
			'Tamanho': ['Pequeno', 'Médio', 'Grande']
		}
	};
	
	// Aplicar template
	function applyTemplate(category: string) {
		const template = attributeTemplates[category];
		if (template) {
			formData.attributes = {
				...formData.attributes,
				...template
			};
			toast.success(`Template de ${category} aplicado!`);
		}
	}
	
	// NOVA FUNÇÃO: Garantir que attributes sejam sempre arrays
	function normalizeAttributes(attributes: Record<string, any>): Record<string, string[]> {
		const normalized: Record<string, string[]> = {};
		
		for (const [key, value] of Object.entries(attributes)) {
			if (Array.isArray(value)) {
				normalized[key] = value.map(v => String(v)); // Garantir strings no array
			} else if (typeof value === 'string') {
				normalized[key] = [value]; // Converter string para array
			} else {
				normalized[key] = [String(value)]; // Converter outros tipos
			}
		}
		
		return normalized;
	}
	
	// NOVA FUNÇÃO: Aplicar normalização quando dados vêm da IA
	export function applyAIAttributes(aiAttributes: Record<string, any>) {
		console.log('🔄 Normalizando attributes da IA:', aiAttributes);
		const normalized = normalizeAttributes(aiAttributes);
		
		// Garantir que formData.attributes seja do tipo correto
		if (!formData.attributes || typeof formData.attributes !== 'object') {
			formData.attributes = {};
		}
		
		formData.attributes = {
			...formData.attributes,
			...normalized
		} as Record<string, any>;
		
		console.log('✅ Attributes normalizados:', formData.attributes);
		toast.success('Atributos da IA aplicados e normalizados!');
	}
</script>

<div class="space-y-8">
	<!-- SUGESTÕES IA EM LOTE (quando modo revisão ativado) -->
	{#if isAIReviewMode && aiSuggestions.length > 0}
		<div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-6">
			<h3 class="text-lg font-semibold text-[#00BFB3] mb-4 flex items-center gap-2">
				<ModernIcon name="Tag" size="md" />
				Sugestões IA para Atributos e Filtros
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

	<!-- ATRIBUTOS PARA FILTROS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<h4 class="font-semibold text-gray-900 flex items-center gap-2">
				<ModernIcon name="search" size="md" /> Atributos para Filtros
			</h4>
			<button
				type="button"
				onclick={suggestAttributesWithAI}
				disabled={aiLoading}
				class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if aiLoading}
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				{:else}
					<ModernIcon name="robot" size="xs" />
				{/if}
				Sugerir com IA
			</button>
		</div>
		
		<p class="text-sm text-gray-600 mb-4">
			Defina atributos que serão usados como filtros na loja (cor, tamanho, etc)
		</p>
		
		<!-- Templates rápidos -->
		<div class="mb-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Templates rápidos:
			</label>
			<div class="flex gap-2 flex-wrap">
				{#each Object.keys(attributeTemplates) as template}
					<button
						type="button"
						onclick={() => applyTemplate(template)}
						class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors capitalize border border-gray-300"
					>
						{template}
					</button>
				{/each}
			</div>
		</div>
		
		<!-- Adicionar Atributo -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
			<input
				type="text"
				bind:value={newAttribute.key}
				placeholder="Nome do atributo (ex: Cor)"
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
			/>
			<input
				type="text"
				bind:value={newAttribute.values}
				placeholder="Valores separados por vírgula"
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
			/>
			<button
				type="button"
				onclick={addAttribute}
				disabled={!newAttribute.key.trim() || !newAttribute.values.trim()}
				class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				<ModernIcon name="Plus" size="sm" /> Adicionar
			</button>
		</div>
		
		<!-- Atributos Adicionados -->
		{#if Object.keys(formData.attributes).length > 0}
			<div class="space-y-3">
				<h5 class="text-sm font-medium text-gray-700">Atributos Configurados:</h5>
				{#each Object.entries(formData.attributes) as [key, values]}
					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
						<div class="flex-1">
							<span class="font-medium text-gray-900">{key}:</span>
							<div class="flex flex-wrap gap-2 mt-1">
								{#each (Array.isArray(values) ? values : [values]) as value}
									<span class="px-2 py-1 bg-[#00BFB3]/10 text-[#00BFB3] rounded text-xs font-medium">
										{value}
									</span>
								{/each}
							</div>
						</div>
						<button
							type="button"
							onclick={() => removeAttribute(key)}
							class="text-red-600 hover:text-red-800 transition-colors"
							title="Remover atributo"
						>
							<ModernIcon name="delete" size="sm" />
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
				<p class="text-gray-500 text-sm">Nenhum atributo adicionado</p>
				<p class="text-xs text-gray-500 mt-1">Atributos aparecem como filtros na loja</p>
			</div>
		{/if}
	</div>
	
	<!-- ESPECIFICAÇÕES TÉCNICAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<h4 class="font-semibold text-gray-900 flex items-center gap-2">
				<ModernIcon name="description" size="md" /> Especificações Técnicas
			</h4>
			<button
				type="button"
				onclick={suggestSpecificationsWithAI}
				disabled={aiLoadingSpecs}
				class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if aiLoadingSpecs}
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				{:else}
					<ModernIcon name="robot" size="xs" />
				{/if}
				Sugerir com IA
			</button>
		</div>
		
		<p class="text-sm text-gray-600 mb-4">
			Informações técnicas detalhadas do produto
		</p>
		
		<!-- Adicionar Especificação -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
			<input
				type="text"
				bind:value={newSpecification.key}
				placeholder="Nome da especificação"
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
			/>
			<input
				type="text"
				bind:value={newSpecification.value}
				placeholder="Valor"
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
			/>
			<button
				type="button"
				onclick={addSpecification}
				disabled={!newSpecification.key.trim() || !newSpecification.value.trim()}
				class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				<ModernIcon name="Plus" size="sm" /> Adicionar
			</button>
		</div>
		
		<!-- Especificações Adicionadas -->
		{#if formData.specifications && typeof formData.specifications === 'object' && !Array.isArray(formData.specifications) && Object.keys(formData.specifications).length > 0}
			<div class="space-y-3">
				<h5 class="text-sm font-medium text-gray-700">Especificações Configuradas:</h5>
				{#each Object.entries(formData.specifications) as [key, value]}
					{#if key !== 'custom_fields'} <!-- Não mostrar custom_fields aqui -->
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
							<div class="flex-1 grid grid-cols-2 gap-3">
								<div>
									<span class="text-sm font-medium text-gray-900">{key}:</span>
								</div>
								<div>
									<span class="text-sm text-gray-700">{value}</span>
								</div>
							</div>
							<button
								type="button"
								onclick={() => removeSpecification(key)}
								class="text-red-600 hover:text-red-800 transition-colors"
								title="Remover especificação"
							>
								<ModernIcon name="delete" size="sm" />
							</button>
						</div>
					{/if}
				{/each}
			</div>
		{:else if typeof formData.specifications === 'string'}
			<div class="space-y-3">
				<h5 class="text-sm font-medium text-gray-700">⚠️ Dados de Especificações Corrompidos:</h5>
				<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
					<p class="text-sm text-yellow-800">As especificações estão em formato JSON string. Clique no botão abaixo para corrigir:</p>
					<button 
						type="button"
						onclick={() => {
							try {
								formData.specifications = JSON.parse(formData.specifications);
							} catch {
								formData.specifications = {};
							}
						}}
						class="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
					>
						🔧 Corrigir Dados
					</button>
				</div>
			</div>
		{:else}
			<div class="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
				<p class="text-gray-500 text-sm">Nenhuma especificação adicionada</p>
				<p class="text-xs text-gray-500 mt-1">Especificações aparecem na página do produto</p>
			</div>
		{/if}
	</div>
	
	<!-- EXEMPLOS E DICAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="info" size="md" /> Dicas e Exemplos
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<h5 class="font-medium text-gray-700 mb-2 flex items-center gap-2">
					<ModernIcon name="search" size="sm" /> Atributos (Filtros)
				</h5>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• <strong>Cor:</strong> Azul, Verde, Vermelho</li>
					<li>• <strong>Tamanho:</strong> P, M, G, GG</li>
					<li>• <strong>Memória:</strong> 8GB, 16GB, 32GB</li>
					<li>• <strong>Voltagem:</strong> 110V, 220V, Bivolt</li>
				</ul>
			</div>
			
			<div>
				<h5 class="font-medium text-gray-700 mb-2 flex items-center gap-2">
					<ModernIcon name="description" size="sm" /> Especificações
				</h5>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• <strong>Peso:</strong> 1.5kg</li>
					<li>• <strong>Dimensões:</strong> 30x20x10cm</li>
					<li>• <strong>Material:</strong> Plástico ABS</li>
					<li>• <strong>Garantia:</strong> 12 meses</li>
				</ul>
			</div>
		</div>
		
		<div class="mt-4 p-3 bg-gray-50 rounded-lg">
			<p class="text-xs text-gray-600">
				<ModernIcon name="info" size="sm" class="inline mr-1" /> <strong>Dica:</strong> Atributos são usados para criar filtros na loja, 
				enquanto especificações são informações técnicas exibidas na página do produto.
			</p>
		</div>
	</div>
</div> 