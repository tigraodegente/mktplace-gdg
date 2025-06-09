<script lang="ts">
	import { slide } from 'svelte/transition';
	import ModernIcon from '../shared/ModernIcon.svelte';
	import { Select, Input } from '$lib/components/ui';
	import EnhancedMultiSelect from './EnhancedMultiSelect.svelte';
	
	let {
		categories = [],
		brands = [],
		statusFilter = $bindable('all'),
		categoryFilter = $bindable('all'),
		brandFilter = $bindable('all'),
		priceRange = $bindable({ min: '', max: '' }),
		// Props para busca
		search = $bindable(''),
		searchPlaceholder = 'Buscar...',
		onSearchChange = () => {},
		onFiltersChange = () => {},
		defaultOpen = true,
		// Props para controlar quais filtros mostrar
		showCategoryFilter = true,
		showBrandFilter = true,
		showPriceFilter = true,
		statusOptions = [
			{ value: 'all', label: 'Todos os Status' },
			{ value: 'active', label: 'Ativos' },
			{ value: 'inactive', label: 'Inativos' }
		],
		// 🎯 NOVOS: Filtros customizados específicos da página
		customFilters = [],
		customFilterValues = $bindable({}),
		onCustomFilterChange = () => {}
	} = $props();
	
	let isOpen = $state(defaultOpen);
	
	// Estados para categorias hierárquicas DINÂMICAS
	let selectedCategories = $state<string[]>([]);
	let expandedCategories = $state(new Set<string>());
	let categoryDropdownOpen = $state(false);
	let categorySearchQuery = $state('');
	let dropdownElement = $state<HTMLElement>();
	
	// Estado para controle avançado de seleção
	let selectAllMode = $state(false);
	let lastSelectedCategory = $state<string | null>(null);
	
	// Computed: categorias raiz (sem pai) - USANDO DADOS DA API
	const rootCategories = $derived(
		categories.filter(cat => !cat.parentId)
	);
	
	// Computed: mapa de subcategorias por categoria pai - CORRIGIDO DEFINITIVO
	const subcategoriesMap = $derived(() => {
		const map: Record<string, any[]> = {};
		
		categories.forEach(cat => {
			// Verificar tanto parentId (camelCase) quanto parent_id (snake_case)
			const parentId = cat.parentId || cat.parent_id;
			if (parentId) {
				if (!map[parentId]) map[parentId] = [];
				map[parentId].push(cat);
			}
		});
		
		return map;
	});
	
	// Computed: categorias filtradas por busca - CORRIGIDO
	const filteredRootCategories = $derived(
		categorySearchQuery && categorySearchQuery.trim() !== '' 
			? rootCategories.filter(cat => 
				cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
			)
			: rootCategories
	);
	
	// Persistir estado no localStorage
	$effect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('admin-filters-accordion');
			if (saved !== null) {
				isOpen = JSON.parse(saved);
			}
		}
	});
	
	// Fechar dropdown ao clicar fora
	$effect(() => {
		if (typeof window === 'undefined') return;
		
		function handleClickOutside(event: MouseEvent) {
			if (categoryDropdownOpen && dropdownElement && !dropdownElement.contains(event.target as Node)) {
				categoryDropdownOpen = false;
			}
		}
		
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});
	
	function toggleAccordion() {
		isOpen = !isOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('admin-filters-accordion', JSON.stringify(isOpen));
		}
	}

	// Funções DINÂMICAS para controle de categorias
	function handleCategoryToggle(categoryId: string, checked: boolean) {
		const category = categories.find(c => c.id === categoryId);
		
		if (checked) {
			selectedCategories = [...selectedCategories, categoryId];
		} else {
			selectedCategories = selectedCategories.filter(id => id !== categoryId);
		}
		
		// Atualizar filtro principal
		categoryFilter = selectedCategories.length > 0 ? selectedCategories.join(',') : 'all';
		lastSelectedCategory = categoryId;
	}
	
	// Função para toggle de categoria ao clicar no texto
	function handleCategoryClick(categoryId: string) {
		const isSelected = selectedCategories.includes(categoryId);
		handleCategoryToggle(categoryId, !isSelected);
	}
	
	function toggleCategoryExpansion(categoryId: string) {
		const newExpanded = new Set(expandedCategories);
		const category = categories.find(c => c.id === categoryId);
		
		if (newExpanded.has(categoryId)) {
			newExpanded.delete(categoryId);
		} else {
			newExpanded.add(categoryId);
		}
		expandedCategories = newExpanded;
	}
	
	function clearAllCategories() {
		selectedCategories = [];
		categoryFilter = 'all';
	}
	
	function selectAllVisible() {
		selectedCategories = filteredRootCategories.map(c => c.id);
		categoryFilter = selectedCategories.join(',');
	}

	// Watch for changes and notify parent
	$effect(() => {
		onFiltersChange({
			status: statusFilter,
			category: categoryFilter,
			brand: brandFilter,
			priceMin: priceRange.min,
			priceMax: priceRange.max,
			// Adicionar contagem para o componente pai
			categoryCount: selectedCategories.length,
			selectedCategories: selectedCategories
		});
	});
</script>

<div class="bg-white rounded-lg border border-gray-200 overflow-visible">
	<!-- Header do Acordeão -->
	<button
		type="button"
		onclick={toggleAccordion}
		class="w-full flex items-center justify-between text-left py-4 px-6 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-inset"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-3">
			<div class="p-2 bg-[#00BFB3]/10 rounded-lg">
				<ModernIcon name="filter" size="md" color="#00BFB3" />
			</div>
			<h3 class="text-lg font-semibold text-gray-900">Filtros de Busca</h3>
		</div>
		
		<svg 
			class="w-5 h-5 text-gray-400 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	
	<!-- Conteúdo do Acordeão -->
	{#if isOpen}
		<div 
			class="border-t border-gray-200 overflow-visible"
			transition:slide={{ duration: 300 }}
		>
			<div class="p-6 space-y-6">
				<!-- Campo de Busca Principal -->
				<div class="space-y-2">
					<label class="block text-sm font-medium text-gray-700">Busca Geral</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<input
							type="text"
							bind:value={search}
							oninput={onSearchChange}
							placeholder={searchPlaceholder}
							class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] text-sm"
						/>
						{#if search}
							<button
								onclick={() => { search = ''; onSearchChange(); }}
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
							>
								<svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						{/if}
					</div>
				</div>
				
				<!-- Filtros Avançados -->
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					<!-- Status -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Status</label>
						<Select
							bind:value={statusFilter}
							options={statusOptions}
						/>
					</div>
					
					<!-- Categoria Dropdown Hierárquico Simples -->
					{#if showCategoryFilter}
						<div class="space-y-2 relative" bind:this={dropdownElement}>
							<label class="block text-sm font-medium text-gray-700">
								Categorias 
								<span class="text-xs text-gray-500">({selectedCategories.length} selecionadas)</span>
							</label>
							
							<!-- Dropdown Button -->
							<button
								type="button"
								onclick={() => categoryDropdownOpen = !categoryDropdownOpen}
								class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00BFB3]"
							>
								<span class="flex-1 truncate">
									{#if selectedCategories.length === 0}
										<span class="text-gray-500">Selecionar categorias</span>
									{:else}
										{selectedCategories.length} categoria(s) selecionada(s)
									{/if}
								</span>
								<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
							
							<!-- Dropdown Content -->
							{#if categoryDropdownOpen}
								<div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
									<!-- Header com busca e limpar -->
									<div class="p-3 border-b bg-gray-50">
										<div class="flex items-center justify-between mb-2">
											<span class="text-sm font-medium text-gray-700">
												Categorias 
												<span class="text-xs text-gray-500">({rootCategories.length} disponíveis)</span>
											</span>
											<div class="flex gap-2">
												{#if selectedCategories.length > 0}
													<button 
														type="button"
														onclick={clearAllCategories}
														class="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
													>
														🧹 Limpar ({selectedCategories.length})
													</button>
												{/if}
												<button 
													type="button"
													onclick={selectAllVisible}
													class="text-xs text-[#00BFB3] hover:text-[#00A89D] px-2 py-1 rounded hover:bg-[#00BFB3]/10"
												>
													✅ Todas Visíveis
												</button>
											</div>
										</div>
										<input
											type="text"
											bind:value={categorySearchQuery}
											placeholder="🔍 Buscar categorias... (Shift+Click = hierarquia)"
											class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00BFB3]"
										/>
									</div>
									
									<!-- Lista de categorias -->
									<div class="p-2">
										{#if filteredRootCategories.length === 0}
											<div class="p-4 text-center text-gray-500">
												{#if categories.length === 0}
													<p>📭 Nenhuma categoria disponível</p>
													<p class="text-xs mt-1">A lista de categorias está vazia</p>
												{:else if rootCategories.length === 0}
													<p>⚠️ Nenhuma categoria raiz encontrada</p>
													<p class="text-xs mt-1">{categories.length} categorias carregadas, mas nenhuma sem pai</p>
													<details class="mt-2 text-left">
														<summary class="cursor-pointer text-xs">🔍 Debug: Ver categorias</summary>
														<pre class="text-xs mt-1 overflow-auto max-h-32">{JSON.stringify(categories.slice(0, 3), null, 2)}</pre>
													</details>
												{:else}
													<p>🔍 Nenhuma categoria encontrada para "{categorySearchQuery}"</p>
													<p class="text-xs mt-1">{rootCategories.length} categorias raiz disponíveis</p>
												{/if}
											</div>
										{:else}
											<!-- ✅ Renderizar categorias normalmente -->
											{#each filteredRootCategories as category}
												<!-- Categoria Principal -->
												<div class="category-item">
													<div class="flex items-center py-2 px-2 hover:bg-gray-50 rounded cursor-pointer" onclick={() => handleCategoryClick(category.id)}>
														<input
															type="checkbox"
															checked={selectedCategories.includes(category.id)}
															onchange={(e) => handleCategoryToggle(category.id, (e.target as HTMLInputElement).checked)}
															onclick={(e) => e.stopPropagation()}
															class="h-4 w-4 text-[#00BFB3] rounded border-gray-300 focus:ring-[#00BFB3]"
														/>
														<span class="ml-2 text-sm font-medium text-gray-700 flex-1">
															{category.name}
															<span class="text-xs text-gray-400 ml-1">
																({category.subcategoryCount || subcategoriesMap[category.id]?.length || 0} filhos)
															</span>
														</span>
														{#if (category.subcategoryCount > 0) || (subcategoriesMap[category.id]?.length > 0)}
															<button 
																type="button"
																onclick={() => toggleCategoryExpansion(category.id)}
																class="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
																title="Expandir subcategorias"
															>
																<span class="text-sm font-bold">
																	{expandedCategories.has(category.id) ? '▼' : '▶'}
																</span>
															</button>
														{/if}
													</div>
													
																										<!-- Subcategorias -->
													{#if expandedCategories.has(category.id)}
														{@const subcategories = subcategoriesMap[category.id] || categories.filter(c => c.parentId === category.id || c.parent_id === category.id)}
														<div class="ml-6 space-y-1 border-l-2 border-gray-200 pl-4">
															{#if subcategories.length > 0}
																{#each subcategories as subcategory}
																	<div class="flex items-center py-1 px-2 hover:bg-gray-50 rounded cursor-pointer" onclick={() => handleCategoryClick(subcategory.id)}>
																		<input
																			type="checkbox"
																			checked={selectedCategories.includes(subcategory.id)}
																			onchange={(e) => handleCategoryToggle(subcategory.id, (e.target as HTMLInputElement).checked)}
																			onclick={(e) => e.stopPropagation()}
																			class="h-4 w-4 text-[#00BFB3] rounded border-gray-300 focus:ring-[#00BFB3]"
																		/>
																		<span class="ml-2 text-sm text-gray-600">
																			{subcategory.name}
																		</span>
																	</div>
																{/each}
															{:else if category.subcategoryCount > 0}
																<div class="py-2 px-2 text-xs text-gray-500 italic">
																	⚠️ Subcategorias não mapeadas (API reporta {category.subcategoryCount} filhos)
																</div>
															{:else}
																<div class="py-2 px-2 text-xs text-gray-400 italic">
																	📭 Nenhuma subcategoria encontrada
																</div>
															{/if}
														</div>
													{/if}
												</div>
											{/each}
										{/if}
									</div>
									
									<!-- Footer -->
									<div class="p-3 border-t bg-gray-50">
										<div class="flex justify-between items-center mb-2">
																					<span class="text-sm text-gray-600">
											📊 {selectedCategories.length} selecionada(s)
										</span>
											<button
												type="button"
												onclick={() => categoryDropdownOpen = false}
												class="px-3 py-1 text-sm bg-[#00BFB3] text-white rounded hover:bg-[#00A89D] transition-colors"
											>
												✅ Aplicar Filtros
											</button>
										</div>
										{#if selectedCategories.length > 0}
											<div class="text-xs text-gray-500">
												💡 Dica: Use Shift+Click para expandir/seleções em massa
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/if}
					
					<!-- Marca -->
					{#if showBrandFilter}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-gray-700">Marca</label>
							<Select
								bind:value={brandFilter}
								options={[
									{ value: 'all', label: 'Todas as Marcas' },
									...brands.map(b => ({ value: b.id, label: b.name }))
								]}
							/>
						</div>
					{/if}
					
					<!-- Faixa de Preço -->
					{#if showPriceFilter}
						<div class="space-y-2 md:col-span-2">
							<label class="block text-sm font-medium text-gray-700">Faixa de Preço (R$)</label>
							<div class="flex gap-3">
								<div class="flex-1">
									<Input
										type="number"
										placeholder="Preço mínimo"
										bind:value={priceRange.min}
										class="w-full text-center"
									/>
								</div>
								<div class="flex items-center px-2 text-gray-500">
									até
								</div>
								<div class="flex-1">
									<Input
										type="number"
										placeholder="Preço máximo"
										bind:value={priceRange.max}
										class="w-full text-center"
									/>
								</div>
							</div>
						</div>
					{/if}
					
					<!-- 🎯 FILTROS CUSTOMIZADOS ESPECÍFICOS DA PÁGINA -->
					{#each customFilters as filter}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-gray-700">{filter.label}</label>
							{#if filter.type === 'select'}
								<select 
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
									value={customFilterValues[filter.key] || 'all'}
									onchange={(e) => {
										customFilterValues[filter.key] = e.target.value;
										onCustomFilterChange(filter.key, e.target.value);
									}}
								>
									{#each filter.options || [] as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
							{:else if filter.type === 'input'}
								<input 
									type="text"
									placeholder={filter.placeholder || `Filtrar por ${filter.label.toLowerCase()}`}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
									value={customFilterValues[filter.key] || ''}
									oninput={(e) => {
										customFilterValues[filter.key] = e.target.value;
										onCustomFilterChange(filter.key, e.target.value);
									}}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div> 