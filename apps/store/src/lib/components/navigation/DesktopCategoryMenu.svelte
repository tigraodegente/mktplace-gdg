<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { menuService } from '$lib/services/menuService';
	import type { FeaturedItem, CategoryTree, MenuFeaturedProduct } from '$lib/types/menu';

	let menuItems: FeaturedItem[] = [];
	let allCategoriesTree: CategoryTree[] = [];
	let featuredProducts: MenuFeaturedProduct[] = [];
	let featuredProductsByCategory = new Map<string, MenuFeaturedProduct[]>();
	let isLoading = true;
	let error: string | null = null;
	let activeCategory: string | null = null;
	let hoverTimeout: NodeJS.Timeout;
	let isMenuOpen = false;
	let expandedCategories = new Set<string>();

	// Calcular total de produtos
	$: totalProducts = allCategoriesTree.reduce((total: number, category: CategoryTree) => {
		return total + (category.product_count || 0);
	}, 0);

	// Produtos em destaque para categoria ativa
	$: currentFeaturedProducts = (() => {
		if (!activeCategory || activeCategory === 'ver-todas') {
			return featuredProducts; // Global
		}

		const activecat = findCategoryById(activeCategory);
		if (!activecat) return featuredProducts;

		return featuredProductsByCategory.get(activecat.slug) || featuredProducts;
	})();

	// Observar mudanças na categoria ativa
	$: if (activeCategory && activeCategory !== 'ver-todas') {
		const activecat = findCategoryById(activeCategory);
		if (activecat && activecat.slug && !featuredProductsByCategory.has(activecat.slug)) {
			loadFeaturedProductsForCategory(activecat.slug);
		}
	}

	// Buscar dados do menu (nova API otimizada)
	async function loadMenuData() {
		try {
			isLoading = true;
			error = null;

			const [featuredItems, categoriesTree, globalFeaturedProducts] = await Promise.all([
				menuService.getFeaturedItems(),
				menuService.getCategoryTree(),
				fetchFeaturedProducts() // Global
			]);

			menuItems = featuredItems;
			allCategoriesTree = categoriesTree;
			featuredProducts = globalFeaturedProducts;

			console.log(
				`✅ Menu carregado: ${menuItems.length} itens principais, ${allCategoriesTree.length} categorias no mega menu, ${featuredProducts.length} produtos em destaque globais`
			);
		} catch (err) {
			console.error('❌ Erro ao carregar menu:', err);
			error = 'Erro ao carregar menu';

			// Fallback vazio
			menuItems = [];
			allCategoriesTree = [];
			featuredProducts = [];
		} finally {
			isLoading = false;
		}
	}

	// Buscar produtos em destaque para o mega menu (global ou por categoria)
	async function fetchFeaturedProducts(categorySlug?: string): Promise<MenuFeaturedProduct[]> {
		try {
			const params = new URLSearchParams({ limit: '4' });
			if (categorySlug) {
				params.set('categoria', categorySlug);
			}

			const response = await fetch(`/api/menu-featured-products?${params}`);
			if (!response.ok) throw new Error(`API error: ${response.status}`);

			const result = await response.json();
			if (!result.success) throw new Error(result.error || 'API returned error');

			return result.data || [];
		} catch (error) {
			console.warn('Erro ao carregar produtos em destaque para menu:', error);
			return [];
		}
	}

	// Carregar produtos em destaque para categoria específica
	async function loadFeaturedProductsForCategory(categorySlug: string) {
		// Evitar duplicadas
		if (featuredProductsByCategory.has(categorySlug)) {
			return;
		}

		try {
			const products = await fetchFeaturedProducts(categorySlug);
			featuredProductsByCategory.set(categorySlug, products);
			featuredProductsByCategory = featuredProductsByCategory; // Trigger reactivity

			console.log(
				`✅ Produtos em destaque carregados para categoria '${categorySlug}': ${products.length} produtos`
			);
		} catch (error) {
			console.warn(`❌ Erro ao carregar produtos para categoria '${categorySlug}':`, error);
			// Usar produtos globais como fallback
			featuredProductsByCategory.set(categorySlug, featuredProducts);
			featuredProductsByCategory = featuredProductsByCategory; // Trigger reactivity
		}
	}

	onMount(() => {
		loadMenuData();

		// Cleanup dos timeouts
		return () => {
			if (hoverTimeout) clearTimeout(hoverTimeout);
		};
	});

	function handleMouseEnter(categoryId: string) {
		clearTimeout(hoverTimeout);
		hoverTimeout = setTimeout(() => {
			activeCategory = categoryId;
			isMenuOpen = true;
		}, 100);
	}

	function handleMouseLeave() {
		clearTimeout(hoverTimeout);
		hoverTimeout = setTimeout(() => {
			activeCategory = null;
			isMenuOpen = false;
		}, 200);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isMenuOpen) {
			activeCategory = null;
			isMenuOpen = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.category-menu-container')) {
			activeCategory = null;
			isMenuOpen = false;
		}
	}

	// Fechar menu ao clicar em um link
	function handleLinkClick() {
		activeCategory = null;
		isMenuOpen = false;
	}

	// Encontrar categoria ativa para mega menu
	function findCategoryById(id: string): CategoryTree | undefined {
		return allCategoriesTree.find((category: CategoryTree) => category.id === id);
	}

	// Alternar expansão de categorias
	function toggleExpanded(categoryId: string) {
		if (expandedCategories.has(categoryId)) {
			expandedCategories.delete(categoryId);
		} else {
			expandedCategories.add(categoryId);
		}
		expandedCategories = expandedCategories; // trigger reactivity
	}

	// Formatar preço em moeda brasileira
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value);
	}
</script>

<svelte:window onkeydown={handleKeyDown} onclick={handleClickOutside} />

<div class="w-full h-full px-3 md:px-4 lg:px-6 xl:px-8 category-menu-container">
	<div class="h-full flex items-center">
		{#if isLoading}
			<div class="flex items-center gap-3 md:gap-4 lg:gap-6 xl:gap-8">
				{#each Array(6) as _}
					<div
						class="h-3 w-12 md:h-4 md:w-16 lg:w-20 xl:w-24 bg-white/20 rounded animate-pulse"
					></div>
				{/each}
			</div>
		{:else if error}
			<p class="text-white/80 text-xs md:text-sm lg:text-base">Erro ao carregar menu</p>
		{:else}
			<!-- Menu responsivo com scroll horizontal se necessário -->
			<div class="w-full flex justify-center">
				<div class="overflow-x-auto scrollbar-hide scroll-smooth max-w-full">
					<ul
						class="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-8 whitespace-nowrap px-4 sm:px-0"
					>
						<!-- Link Ver Todas - Primeiro item -->
						<li class="flex-shrink-0">
							<a
								href="/busca"
								class="flex items-center gap-1 sm:gap-1.5 md:gap-2 py-1.5 sm:py-2 md:py-2.5 lg:py-3 px-1 sm:px-1.5 md:px-2 lg:px-2.5 text-white hover:text-white/90 transition-all group relative whitespace-nowrap"
								onmouseenter={() => handleMouseEnter('ver-todas')}
								onmouseleave={handleMouseLeave}
								onclick={handleLinkClick}
								style="font-family: 'Lato', sans-serif; font-weight: 700; font-size: clamp(10px, 2.5vw, 16px);"
							>
								<span>Ver Todas</span>
								{#if totalProducts > 0}
									<span class="text-xs text-white/70 group-hover:text-white/90 transition-colors"
										>({totalProducts})</span
									>
								{/if}

								<svg
									class="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 text-white/70 group-hover:text-white/90 transition-colors"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>

								<!-- Indicador hover -->
								<span
									class="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
								></span>

								<!-- Indicador ativo -->
								{#if activeCategory === 'ver-todas'}
									<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></span>
								{/if}
							</a>
						</li>

						<!-- Itens do menu principal (categorias e páginas em destaque) -->
						{#each menuItems as item}
							<li class="flex-shrink-0">
								{#if item.type === 'category'}
									<a
										href={item.href}
										class="flex items-center gap-1 sm:gap-1.5 md:gap-2 py-1.5 sm:py-2 md:py-2.5 lg:py-3 px-1 sm:px-1.5 md:px-2 lg:px-2.5 text-white hover:text-white/90 transition-all relative group whitespace-nowrap"
										onmouseenter={() => handleMouseEnter(item.id)}
										onmouseleave={handleMouseLeave}
										onclick={handleLinkClick}
										style="font-family: 'Lato', sans-serif; font-weight: 600; font-size: clamp(10px, 2.5vw, 16px);"
									>
										<span>{item.name}</span>
										{#if item.product_count && Number(item.product_count) > 0}
											<span class="text-xs text-white/70 hidden lg:inline"
												>({item.product_count})</span
											>
										{/if}

										<svg
											class="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 text-white/70 group-hover:text-white/90 transition-colors"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>

										<!-- Indicador hover -->
										<span
											class="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
										></span>

										<!-- Indicador ativo -->
										{#if activeCategory === item.id}
											<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></span>
										{/if}
									</a>
								{:else}
									<!-- Páginas estáticas como Blog -->
									<a
										href={item.href}
										class="flex items-center gap-1 sm:gap-1.5 md:gap-2 py-1.5 sm:py-2 md:py-2.5 lg:py-3 px-1 sm:px-1.5 md:px-2 lg:px-2.5 text-yellow-400 transition-all group relative whitespace-nowrap"
										onclick={handleLinkClick}
										style="font-family: 'Lato', sans-serif; font-weight: 700; font-size: clamp(10px, 2.5vw, 16px);"
									>
										<span>{item.name}</span>

										<!-- Indicador hover -->
										<span
											class="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
										></span>
									</a>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
	</div>

	<!-- Mega Menu Responsivo -->
	{#if isMenuOpen && activeCategory}
		{#if activeCategory === 'ver-todas'}
			<!-- Mega Menu para Ver Todas - Mostra todas as categorias principais -->
			<div
				class="absolute left-0 right-0 top-full bg-white shadow-lg border-t border-gray-200 z-50 max-h-[70vh] md:max-h-[80vh] lg:max-h-none overflow-y-auto"
				onmouseenter={() => clearTimeout(hoverTimeout)}
				onmouseleave={handleMouseLeave}
				transition:fade={{ duration: 200 }}
				role="menu"
				tabindex="0"
				aria-label="Todas as categorias"
				style="scrollbar-width: thin; scrollbar-color: #00BFB3 #f1f1f1;"
			>
				<!-- Indicador de scroll no topo -->
				<div
					class="sm:hidden sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-2 text-center"
				>
					<span class="text-xs text-gray-500 flex items-center justify-center gap-2">
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 14l-7 7m0 0l-7-7m7 7V3"
							/>
						</svg>
						Role para ver categorias e produtos
					</span>
				</div>

				<div
					class="w-full max-w-[1440px] mx-auto px-3 md:px-4 lg:px-6 xl:px-8 py-3 md:py-4 lg:py-6"
				>
					<div
						class="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6 xl:gap-8"
					>
						<!-- Todas as categorias principais com subcategorias -->
						<div class="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5">
							<h3
								class="text-sm md:text-base lg:text-lg font-semibold text-gray-800 mb-2 md:mb-3 lg:mb-4"
								style="font-family: 'Lato', sans-serif;"
							>
								Todas as Categorias
							</h3>

							<!-- Grid de categorias com subcategorias -->
							<div
								class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6"
							>
								{#each allCategoriesTree as category}
									<div class="space-y-2">
										<!-- Categoria principal -->
										<a
											href="/busca?categoria={category.slug}"
											class="block p-3 rounded-lg border border-gray-200 hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group"
											style="font-family: 'Lato', sans-serif;"
											onclick={handleLinkClick}
										>
											<div class="flex items-center justify-between">
												<span
													class="font-semibold text-gray-800 group-hover:text-[#00BFB3] text-sm lg:text-base"
													>{category.name}</span
												>
												<svg
													class="w-4 h-4 text-gray-400 group-hover:text-[#00BFB3] transition-colors flex-shrink-0"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</div>
											{#if category.product_count && Number(category.product_count) > 0}
												<span class="text-xs text-gray-500 group-hover:text-[#00BFB3]">
													{category.product_count} produto{Number(category.product_count) !== 1
														? 's'
														: ''}
												</span>
											{/if}
										</a>

										<!-- Subcategorias -->
										{#if category.children && category.children.length > 0}
											<div class="space-y-1 ml-2">
												{#each category.children.slice(0, expandedCategories.has(category.id) ? category.children.length : 6) as subcategory}
													<a
														href="/busca?categoria={subcategory.slug}"
														class="block py-1 px-2 text-sm text-gray-600 hover:text-[#00BFB3] hover:bg-gray-50 rounded transition-colors"
														style="font-family: 'Lato', sans-serif;"
														onclick={handleLinkClick}
													>
														<div class="flex items-center justify-between">
															<span class="truncate">{subcategory.name}</span>
															{#if subcategory.product_count && Number(subcategory.product_count) > 0}
																<span class="text-xs text-gray-400 flex-shrink-0 ml-1">
																	({subcategory.product_count})
																</span>
															{/if}
														</div>
													</a>
												{/each}

												<!-- Mostrar "Ver mais/menos" com número de categorias restantes -->
												{#if category.children && category.children.length > 6}
													<button
														type="button"
														onclick={() => toggleExpanded(category.id)}
														class="block py-1 px-2 text-xs text-[#00BFB3] hover:text-[#00A89D] hover:bg-gray-50 rounded font-medium transition-colors w-full text-left"
														style="font-family: 'Lato', sans-serif;"
													>
														{expandedCategories.has(category.id)
															? 'ver menos'
															: `ver mais ${category.children.length - 6} categoria${category.children.length - 6 !== 1 ? 's' : ''}...`}
													</button>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>

						<!-- Produtos em Destaque - SEMPRE VISÍVEL NA LATERAL -->
						<div class="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
							<h3
								class="text-sm md:text-base lg:text-lg font-semibold text-gray-800 mb-2 md:mb-3 lg:mb-4"
								style="font-family: 'Lato', sans-serif;"
							>
								Em Destaque
							</h3>

							{#if featuredProducts.length > 0}
								<div class="space-y-3">
									{#each featuredProducts.slice(0, 4) as product}
										<a
											href="/produto/{product.slug}"
											class="flex flex-col items-start gap-2 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors group"
											style="font-family: 'Lato', sans-serif;"
											onclick={handleLinkClick}
										>
											<!-- Imagem do produto -->
											<div
												class="w-full h-24 sm:h-20 md:h-24 lg:h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0"
											>
												<img
													src={product.image}
													alt={product.name}
													class="w-full h-full object-cover group-hover:scale-105 transition-transform"
													loading="lazy"
												/>
											</div>

											<!-- Informações do produto -->
											<div class="w-full min-w-0">
												<h4
													class="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#00BFB3] transition-colors mb-1"
												>
													{product.name}
												</h4>

												<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
													<span class="text-sm font-bold text-gray-900">
														{formatCurrency(product.price)}
													</span>

													{#if product.original_price && product.discount}
														<div class="flex items-center gap-1">
															<span class="text-xs text-gray-500 line-through">
																{formatCurrency(product.original_price)}
															</span>
															<span class="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">
																-{product.discount}%
															</span>
														</div>
													{/if}
												</div>

												{#if product.rating && product.reviews_count}
													<div class="flex items-center gap-1 mt-1">
														<div class="flex text-yellow-400">
															{#each Array(5) as _, i}
																<span
																	class="text-xs {i < Math.floor(product.rating || 0)
																		? 'text-yellow-400'
																		: 'text-gray-300'}">★</span
																>
															{/each}
														</div>
														<span class="text-xs text-gray-500">({product.reviews_count})</span>
													</div>
												{/if}
											</div>
										</a>
									{/each}
								</div>
							{:else}
								<div class="text-center py-4 text-gray-500">
									<p class="text-sm">Nenhum produto em destaque</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Mega Menu para categorias específicas -->
			{@const activecat = findCategoryById(activeCategory)}
			{#if activecat && activecat.children && activecat.children.length > 0}
				<div
					class="absolute left-0 right-0 top-full bg-white shadow-lg border-t border-gray-200 z-50 max-h-[60vh] md:max-h-[70vh] lg:max-h-none overflow-y-auto"
					onmouseenter={() => clearTimeout(hoverTimeout)}
					onmouseleave={handleMouseLeave}
					transition:fade={{ duration: 200 }}
					role="menu"
					tabindex="0"
					aria-label="Submenu de {activecat.name}"
					style="scrollbar-width: thin; scrollbar-color: #00BFB3 #f1f1f1;"
				>
					<!-- Indicador de scroll no topo -->
					<div
						class="md:hidden sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-2 text-center"
					>
						<span class="text-xs text-gray-500 flex items-center justify-center gap-2">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 14l-7 7m0 0l-7-7m7 7V3"
								/>
							</svg>
							Role para ver mais opções
						</span>
					</div>

					<div
						class="w-full max-w-[1440px] mx-auto px-3 md:px-4 lg:px-6 xl:px-8 py-3 md:py-4 lg:py-6"
					>
						<!-- Layout responsivo do mega menu -->
						<div
							class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 xl:gap-8"
						>
							<!-- Subcategorias - Responsivo -->
							<div class="md:col-span-1 lg:col-span-2 xl:col-span-2">
								<h3
									class="text-sm md:text-base lg:text-lg font-semibold text-gray-800 mb-2 md:mb-3 lg:mb-4"
									style="font-family: 'Lato', sans-serif;"
								>
									{activecat.name}
								</h3>

								<!-- Grid responsivo para subcategorias -->
								<div
									class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-x-3 md:gap-x-4 lg:gap-x-6 xl:gap-x-8 gap-y-1 lg:gap-y-2"
								>
									{#each activecat.children as subcategory}
										<a
											href="/busca?categoria={subcategory.slug}"
											class="flex items-center justify-between py-1.5 lg:py-2 text-gray-600 hover:text-[#00BFB3] transition-colors group text-sm lg:text-base"
											style="font-family: 'Lato', sans-serif;"
											onclick={handleLinkClick}
										>
											<span class="truncate mr-2">{subcategory.name}</span>
											{#if subcategory.product_count && Number(subcategory.product_count) > 0}
												<span
													class="text-xs text-gray-400 group-hover:text-[#00BFB3] flex-shrink-0"
												>
													({subcategory.product_count})
												</span>
											{/if}
										</a>
									{/each}
								</div>

								<!-- Link Ver Todos -->
								<div class="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-200">
									<a
										href="/busca?categoria={activecat.slug}"
										class="inline-flex items-center gap-2 text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm lg:text-base"
										style="font-family: 'Lato', sans-serif;"
										onclick={handleLinkClick}
									>
										<span>Ver todos em {activecat.name}</span>
										<svg
											class="w-3 h-3 lg:w-4 lg:h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</a>
								</div>
							</div>

							<!-- Em Destaque - Oculto em telas menores, visível em md+ -->
							<div class="hidden md:block">
								<h3
									class="text-sm md:text-base lg:text-lg font-semibold text-gray-800 mb-2 md:mb-3 lg:mb-4"
									style="font-family: 'Lato', sans-serif;"
								>
									Em Destaque
								</h3>

								{#if currentFeaturedProducts.length > 0}
									<div class="space-y-3">
										{#each currentFeaturedProducts as product}
											<a
												href="/produto/{product.slug}"
												class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
												style="font-family: 'Lato', sans-serif;"
												onclick={handleLinkClick}
											>
												<!-- Imagem do produto -->
												<div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
													<img
														src={product.image}
														alt={product.name}
														class="w-full h-full object-cover group-hover:scale-105 transition-transform"
														loading="lazy"
													/>
												</div>

												<!-- Informações do produto -->
												<div class="flex-1 min-w-0">
													<h4
														class="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#00BFB3] transition-colors"
													>
														{product.name}
													</h4>

													<div class="flex items-center gap-2 mt-1">
														<span class="text-sm font-bold text-gray-900">
															{formatCurrency(product.price)}
														</span>

														{#if product.original_price && product.discount}
															<span class="text-xs text-gray-500 line-through">
																{formatCurrency(product.original_price)}
															</span>
															<span class="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
																-{product.discount}%
															</span>
														{/if}
													</div>

													{#if product.rating && product.reviews_count}
														<div class="flex items-center gap-1 mt-1">
															<div class="flex text-yellow-400">
																{#each Array(5) as _, i}
																	<span
																		class="text-xs {i < Math.floor(product.rating || 0)
																			? 'text-yellow-400'
																			: 'text-gray-300'}">★</span
																	>
																{/each}
															</div>
															<span class="text-xs text-gray-500">({product.reviews_count})</span>
														</div>
													{/if}
												</div>
											</a>
										{/each}
									</div>
								{:else}
									<div class="text-center py-4 text-gray-500">
										<p class="text-sm">Nenhum produto em destaque</p>
									</div>
								{/if}
							</div>

							<!-- Banner Promocional - Apenas em xl+ -->
							<div class="hidden xl:block">
								<a
									href="/busca?categoria={activecat.slug}&promocao=true"
									class="block h-full p-4 lg:p-6 rounded-lg bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white hover:shadow-lg transition-shadow"
									onclick={handleLinkClick}
								>
									<h3
										class="text-lg lg:text-xl xl:text-2xl font-bold mb-2"
										style="font-family: 'Lato', sans-serif;"
									>
										Frete Grátis
									</h3>
									<p
										class="text-sm mb-3 lg:mb-4 opacity-90"
										style="font-family: 'Lato', sans-serif;"
									>
										Em compras acima de R$ 199
									</p>
								</a>
							</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.category-menu-container {
		position: relative;
	}

	/* Menu responsivo - estável e consistente */
	.category-menu-container ul {
		min-width: max-content;
		width: max-content;
	}

	/* Scroll horizontal suave - ocultar scrollbar */
	.scrollbar-hide {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}

	/* Custom scrollbar para mega menu */
	.category-menu-container div[style*='scrollbar-color']::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.category-menu-container div[style*='scrollbar-color']::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 4px;
	}

	.category-menu-container div[style*='scrollbar-color']::-webkit-scrollbar-thumb {
		background: #00bfb3;
		border-radius: 4px;
	}

	.category-menu-container div[style*='scrollbar-color']::-webkit-scrollbar-thumb:hover {
		background: #00a89d;
	}

	/* Indicador de scroll quando necessário */
	.category-menu-container div[style*='scrollbar-color']:before {
		content: '';
		position: absolute;
		top: 10px;
		right: 15px;
		width: 3px;
		height: 30px;
		background: linear-gradient(to bottom, transparent, #00bfb3, transparent);
		border-radius: 2px;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
		z-index: 10;
	}

	.category-menu-container div[style*='scrollbar-color']:hover:before {
		opacity: 0.6;
	}

	/* Scroll suave em todos os elementos */
	.category-menu-container * {
		scroll-behavior: smooth;
	}

	/* Transições mais suaves para todos os elementos interativos */
	.category-menu-container a {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Hover effects mais suaves */
	.category-menu-container a:hover {
		transform: translateY(-1px);
	}
</style>
