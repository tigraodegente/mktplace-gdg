<script lang="ts">
	import { toast } from '$lib/stores/toast';
	
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

	// Estados locais com $state
	let newOptionName = $state('');
	let newOptionValue = $state('');
	let selectedOptionIndex = $state(-1);
	let editingVariant = $state<ProductVariant | null>(null);
	let showVariantForm = $state(false);
	let aiLoading = $state(false);

	// Opções comuns predefinidas
	const commonOptions = [
		{ name: 'Cor', values: ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Roxo'] },
		{ name: 'Tamanho', values: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'] },
		{ name: 'Tamanho Sapato', values: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
		{ name: 'Voltagem', values: ['110V', '220V', 'Bivolt'] },
		{ name: 'Capacidade', values: ['1L', '2L', '5L', '10L', '20L'] },
		{ name: 'Material', values: ['Algodão', 'Poliéster', 'Couro', 'Metal', 'Plástico', 'Madeira'] }
	];

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

	// Sugerir variações com IA
	async function suggestVariationsWithAI() {
		if (!formData.name) {
			toast.error('Por favor, preencha o nome do produto primeiro');
			return;
		}

		aiLoading = true;
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field: 'variations',
					currentData: {
						name: formData.name,
						description: formData.description,
						category: formData.category_ids?.[0] || formData.category
					}
				})
			});

			if (!response.ok) throw new Error('Erro ao sugerir variações');

			const result = await response.json();
			if (result.success && result.data) {
				// Aplicar sugestões de variações
				formData.has_variants = true;
				
				// Adicionar cada tipo de variação sugerida
				for (const variation of result.data) {
					const newOption: ProductOption = {
						id: Date.now().toString() + Math.random(),
						name: variation.type,
						position: formData.product_options.length,
						values: variation.options.map((value: string, index: number) => ({
							id: Date.now() + index + Math.random(),
							value,
							position: index
						}))
					};
					formData.product_options = [...formData.product_options, newOption];
				}
				
				generateVariants();
				toast.success('Variações sugeridas com sucesso!');
			}
		} catch (error) {
			console.error('Erro ao sugerir variações:', error);
			toast.error('Erro ao sugerir variações com IA');
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

	// Handlers para input
	function handleNewValueKeydown(event: KeyboardEvent, optionIndex: number) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const input = event.target as HTMLInputElement;
			addValueToOption(optionIndex, input.value);
			input.value = '';
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
			<button
				type="button"
				onclick={suggestVariationsWithAI}
				disabled={aiLoading || !formData.name}
				class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				title="Sugerir variações com IA"
			>
				{#if aiLoading}
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					<span>Analisando...</span>
				{:else}
					🤖
					<span>Sugerir com IA</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- ATIVAR VARIAÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<div class="flex items-center justify-between">
			<div>
				<h4 class="font-semibold text-gray-900 mb-2 flex items-center gap-2">
					🎨 Produto com Variações
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
				⚡ Opções Rápidas
			</h4>

			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				{#each commonOptions as option}
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
				➕ Criar Opção Personalizada
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
								🗑️
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

		<!-- VARIAÇÕES GERADAS -->
		{#if formData.product_variants && formData.product_variants.length > 0}
			<div class="bg-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6">
				<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7l2 2m0 0l2 2m-2-2h-6m6 0V2m-8 4h6m-4 0v8m0 0H5m0 0l-2-2m2 2l-2 2m2-2V8" />
					</svg>
					Variações do Produto ({formData.product_variants.length})
				</h4>

				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-[#00BFB3]/10">
								<th class="text-left py-3 px-2 text-sm font-medium text-slate-700">Variação</th>
								<th class="text-left py-3 px-2 text-sm font-medium text-slate-700">SKU</th>
								<th class="text-left py-3 px-2 text-sm font-medium text-slate-700">Preço</th>
								<th class="text-left py-3 px-2 text-sm font-medium text-slate-700">Estoque</th>
								<th class="text-left py-3 px-2 text-sm font-medium text-slate-700">Status</th>
								<th class="text-left py-3 px-2 text-sm font-medium text-slate-700">Ações</th>
							</tr>
						</thead>
						<tbody>
							{#each formData.product_variants as variant}
								<tr class="border-b border-[#00BFB3]/10">
									<td class="py-3 px-2">
										<div class="font-medium text-slate-900">{variant.name}</div>
										<div class="text-xs text-slate-500">
											{Object.entries(variant.option_values).map(([key, value]) => `${key}: ${value}`).join(' • ')}
										</div>
									</td>
									<td class="py-3 px-2 text-sm text-slate-600 font-mono">{variant.sku}</td>
									<td class="py-3 px-2 text-sm text-slate-600">R$ {variant.price}</td>
									<td class="py-3 px-2 text-sm text-slate-600">{variant.quantity}</td>
									<td class="py-3 px-2">
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {variant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
											{variant.is_active ? 'Ativo' : 'Inativo'}
										</span>
									</td>
									<td class="py-3 px-2">
										<button
											type="button"
											on:click={() => editVariant(variant)}
											class="p-2 text-[#00BFB3] hover:text-[#00A89D] hover:bg-[#00BFB3]/10 rounded-lg transition-colors"
											title="Editar variação"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
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
								on:click={resetVariantForm}
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
								on:click={resetVariantForm}
								class="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
							>
								Cancelar
							</button>
							<button
								type="button"
								on:click={saveVariant}
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