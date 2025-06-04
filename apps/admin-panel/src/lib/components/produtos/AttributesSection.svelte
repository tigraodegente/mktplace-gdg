<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	let { formData = $bindable() } = $props();
	
	// Estados locais
	let newAttribute = $state({ key: '', values: '' });
	let newSpecification = $state({ key: '', value: '' });
	let aiLoading = $state(false);
	
	// Garantir que os campos existam
	if (!formData.attributes) formData.attributes = {};
	if (!formData.specifications) formData.specifications = {};
	
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
</script>

<div class="space-y-8">
	<!-- ATRIBUTOS PARA FILTROS -->
	<div class="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
		<div class="flex items-center justify-between mb-4">
			<h4 class="font-semibold text-gray-900 flex items-center gap-2">
				<ModernIcon name="Settings" size={20} color="#9333ea" />
				Atributos para Filtros
			</h4>
			<button
				type="button"
				onclick={suggestAttributesWithAI}
				disabled={aiLoading}
				class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
			>
				{#if aiLoading}
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				{:else}
					<ModernIcon name="robot" size={16} color="white" />
				{/if}
				Sugerir com IA
			</button>
		</div>
		
		<p class="text-sm text-gray-600 mb-4">
			Defina atributos que serão usados como filtros na loja (cor, tamanho, etc)
		</p>
		
		<!-- Templates rápidos -->
		<div class="mb-4">
			<p class="text-xs text-gray-500 mb-2">Templates rápidos:</p>
			<div class="flex gap-2 flex-wrap">
				{#each Object.keys(attributeTemplates) as template}
					<button
						type="button"
						onclick={() => applyTemplate(template)}
						class="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full text-xs transition-colors capitalize"
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
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
			/>
			<input
				type="text"
				bind:value={newAttribute.values}
				placeholder="Valores separados por vírgula"
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
			/>
			<button
				type="button"
				onclick={addAttribute}
				disabled={!newAttribute.key.trim() || !newAttribute.values.trim()}
				class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Adicionar
			</button>
		</div>
		
		<!-- Atributos Adicionados -->
		{#if Object.keys(formData.attributes).length > 0}
			<div class="space-y-3">
				{#each Object.entries(formData.attributes) as [key, values]}
					<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200">
						<div class="flex-1">
							<span class="font-medium text-gray-900">{key}:</span>
							<div class="flex flex-wrap gap-2 mt-1">
								{#each (Array.isArray(values) ? values : [values]) as value}
									<span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
										{value}
									</span>
								{/each}
							</div>
						</div>
						<button
							type="button"
							onclick={() => removeAttribute(key)}
							class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
							title="Remover atributo"
						>
							<ModernIcon name="trash" size={16} />
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 border-2 border-dashed border-purple-300 rounded-lg">
				<p class="text-gray-500 text-sm">Nenhum atributo adicionado</p>
				<p class="text-xs text-gray-400 mt-1">Atributos aparecem como filtros na loja</p>
			</div>
		{/if}
	</div>
	
	<!-- ESPECIFICAÇÕES TÉCNICAS -->
	<div class="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="info" size={20} color="#0ea5e9" />
			Especificações Técnicas
		</h4>
		
		<p class="text-sm text-gray-600 mb-4">
			Informações técnicas detalhadas do produto
		</p>
		
		<!-- Adicionar Especificação -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
			<input
				type="text"
				bind:value={newSpecification.key}
				placeholder="Nome da especificação"
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
			<input
				type="text"
				bind:value={newSpecification.value}
				placeholder="Valor"
				class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
			<button
				type="button"
				onclick={addSpecification}
				disabled={!newSpecification.key.trim() || !newSpecification.value.trim()}
				class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Adicionar
			</button>
		</div>
		
		<!-- Especificações Adicionadas -->
		{#if Object.keys(formData.specifications).length > 0}
			<div class="space-y-3">
				{#each Object.entries(formData.specifications) as [key, value]}
					{#if key !== 'custom_fields'} <!-- Não mostrar custom_fields aqui -->
						<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
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
								class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
								title="Remover especificação"
							>
								<ModernIcon name="trash" size={16} />
							</button>
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 border-2 border-dashed border-blue-300 rounded-lg">
				<p class="text-gray-500 text-sm">Nenhuma especificação adicionada</p>
				<p class="text-xs text-gray-400 mt-1">Especificações aparecem na página do produto</p>
			</div>
		{/if}
	</div>
	
	<!-- EXEMPLOS E DICAS -->
	<div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="lightbulb" size={20} color="#10b981" />
			Dicas e Exemplos
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<h5 class="font-medium text-gray-700 mb-2">📌 Atributos (Filtros)</h5>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• <strong>Cor:</strong> Azul, Verde, Vermelho</li>
					<li>• <strong>Tamanho:</strong> P, M, G, GG</li>
					<li>• <strong>Memória:</strong> 8GB, 16GB, 32GB</li>
					<li>• <strong>Voltagem:</strong> 110V, 220V, Bivolt</li>
				</ul>
			</div>
			
			<div>
				<h5 class="font-medium text-gray-700 mb-2">📋 Especificações</h5>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• <strong>Peso:</strong> 1.5kg</li>
					<li>• <strong>Dimensões:</strong> 30x20x10cm</li>
					<li>• <strong>Material:</strong> Plástico ABS</li>
					<li>• <strong>Garantia:</strong> 12 meses</li>
				</ul>
			</div>
		</div>
		
		<div class="mt-4 p-3 bg-green-100 rounded-lg">
			<p class="text-xs text-green-800">
				<strong>💡 Dica:</strong> Atributos são usados para criar filtros na loja, 
				enquanto especificações são informações técnicas exibidas na página do produto.
			</p>
		</div>
	</div>
</div> 