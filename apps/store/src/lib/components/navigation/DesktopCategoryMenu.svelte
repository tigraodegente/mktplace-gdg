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
			
			console.log(`✅ Menu carregado: ${menuItems.length} itens principais, ${allCategoriesTree.length} categorias no mega menu, ${featuredProducts.length} produtos em destaque globais`);
			
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
			
			console.log(`✅ Produtos em destaque carregados para categoria '${categorySlug}': ${products.length} produtos`);
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
	
	// Formatar preço em moeda brasileira
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value);
	}
</script>

<svelte:window onkeydown={handleKeyDown} onclick={handleClickOutside} />

<div class="w-full h-full px-4 lg:px-6 xl:px-8 category-menu-container">
	<div class="h-full flex items-center">
		{#if isLoading}
			<div class="flex items-center gap-4 lg:gap-6 xl:gap-8">
				{#each Array(6) as _}
				<div class="h-4 w-16 lg:w-20 xl:w-24 bg-white/20 rounded animate-pulse"></div>
				{/each}
			</div>
		{:else if error}
			<p class="text-white/80 text-sm lg:text-base">Erro ao carregar menu</p>
		{:else}
			<!-- Menu responsivo com scroll horizontal se necessário -->
			<div class="w-full overflow-x-auto scrollbar-hide">
				<ul class="flex items-center gap-4 lg:gap-6 xl:gap-8 min-w-max lg:justify-center xl:justify-between">
					<!-- Link Ver Todas - Primeiro item -->
					<li class="flex-shrink-0">
						<a 
							href="/busca"
							class="flex items-center gap-2 py-3 px-2 text-white hover:text-white/90 transition-all group relative whitespace-nowrap"
							onmouseenter={() => handleMouseEnter('ver-todas')}
							onmouseleave={handleMouseLeave}
							onclick={handleLinkClick}
							style="font-family: 'Lato', sans-serif; font-weight: 700; font-size: clamp(13px, 1.2vw, 16px);"
						>
							<span>Ver Todas</span>
							{#if totalProducts > 0}
								<span class="text-xs text-white/70 group-hover:text-white/90 transition-colors">({totalProducts})</span>
							{/if}
							
							<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white/70 group-hover:text-white/90 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
							
							<!-- Indicador hover -->
							<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
							
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
									class="flex items-center gap-2 py-3 px-2 text-white hover:text-white/90 transition-all relative group whitespace-nowrap"
									onmouseenter={() => handleMouseEnter(item.id)}
									onmouseleave={handleMouseLeave}
									onclick={handleLinkClick}
									style="font-family: 'Lato', sans-serif; font-weight: 600; font-size: clamp(13px, 1.2vw, 16px);"
								>
									<span>{item.name}</span>
									{#if item.product_count && Number(item.product_count) > 0}
										<span class="text-xs text-white/70 hidden lg:inline">({item.product_count})</span>
									{/if}
									
									<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white/70 group-hover:text-white/90 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
									
									<!-- Indicador hover -->
									<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
									
									<!-- Indicador ativo -->
									{#if activeCategory === item.id}
										<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></span>
									{/if}
								</a>
							{:else}
								<!-- Páginas estáticas como Blog -->
								<a
									href={item.href}
									class="flex items-center gap-2 py-3 px-2 text-yellow-400 transition-all group relative whitespace-nowrap"
									onclick={handleLinkClick}
									style="font-family: 'Lato', sans-serif; font-weight: 700; font-size: clamp(13px, 1.2vw, 16px);"
								>
									<span>{item.name}</span>
									
									<!-- Indicador hover -->
									<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<!-- Mega Menu Responsivo -->
	{#if isMenuOpen && activeCategory}
		{#if activeCategory === 'ver-todas'}
			<!-- Mega Menu para Ver Todas - Mostra todas as categorias principais -->
			<div
				class="absolute left-0 right-0 top-full bg-white shadow-lg border-t border-gray-200 z-50"
				onmouseenter={() => clearTimeout(hoverTimeout)}
				onmouseleave={handleMouseLeave}
				transition:fade={{ duration: 200 }}
				role="menu"
				tabindex="0"
				aria-label="Todas as categorias"
			>
				<div class="w-full max-w-[1440px] mx-auto px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
					<div class="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 xl:gap-8">
						<!-- Todas as categorias principais com subcategorias -->
						<div class="lg:col-span-4 xl:col-span-4">
							<h3 class="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4" style="font-family: 'Lato', sans-serif;">
								Todas as Categorias
							</h3>
							
							<!-- Grid de categorias com subcategorias -->
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
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
												<span class="font-semibold text-gray-800 group-hover:text-[#00BFB3] text-sm lg:text-base">{category.name}</span>
												<svg class="w-4 h-4 text-gray-400 group-hover:text-[#00BFB3] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
												</svg>
											</div>
											{#if category.product_count && Number(category.product_count) > 0}
												<span class="text-xs text-gray-500 group-hover:text-[#00BFB3]">
													{category.product_count} produto{Number(category.product_count) !== 1 ? 's' : ''}
												</span>
											{/if}
										</a>
										
										<!-- Subcategorias -->
										{#if category.children && category.children.length > 0}
											<div class="space-y-1 ml-2">
												{#each category.children.slice(0, 6) as subcategory}
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
												
												<!-- Mostrar "Ver mais" com número de categorias restantes -->
												{#if category.children && category.children.length > 6}
													<a 
														href="/busca?categoria={category.slug}"
														class="block py-1 px-2 text-xs text-[#00BFB3] hover:text-[#00A89D] hover:bg-gray-50 rounded font-medium transition-colors"
														style="font-family: 'Lato', sans-serif;"
														onclick={handleLinkClick}
													>
														ver mais {category.children.length - 6} categoria{category.children.length - 6 !== 1 ? 's' : ''}...
													</a>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
						
						<!-- Produtos em Destaque - Substituindo banner promocional -->
						<div class="hidden xl:block">
							<h3 class="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4" style="font-family: 'Lato', sans-serif;">
								Em Destaque
							</h3>
							
							{#if featuredProducts.length > 0}
								<div class="space-y-3">
									{#each featuredProducts.slice(0, 4) as product}
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
												<h4 class="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#00BFB3] transition-colors">
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
																<span class="text-xs {i < Math.floor(product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}">★</span>
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
					class="absolute left-0 right-0 top-full bg-white shadow-lg border-t border-gray-200 z-50"
					onmouseenter={() => clearTimeout(hoverTimeout)}
					onmouseleave={handleMouseLeave}
					transition:fade={{ duration: 200 }}
					role="menu"
					tabindex="0"
					aria-label="Submenu de {activecat.name}"
				>
					<div class="w-full max-w-[1440px] mx-auto px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
						<!-- Layout responsivo do mega menu -->
						<div class="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 xl:gap-8">
							<!-- Subcategorias - Responsivo -->
							<div class="lg:col-span-2 xl:col-span-2">
								<h3 class="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4" style="font-family: 'Lato', sans-serif;">
									{activecat.name}
								</h3>
								
								<!-- Grid responsivo para subcategorias -->
								<div class="grid grid-cols-1 lg:grid-cols-2 gap-x-4 lg:gap-x-6 xl:gap-x-8 gap-y-1 lg:gap-y-2">
									{#each activecat.children as subcategory}
										<a 
											href="/busca?categoria={subcategory.slug}"
											class="flex items-center justify-between py-1.5 lg:py-2 text-gray-600 hover:text-[#00BFB3] transition-colors group text-sm lg:text-base"
											style="font-family: 'Lato', sans-serif;"
											onclick={handleLinkClick}
										>
											<span class="truncate mr-2">{subcategory.name}</span>
											{#if subcategory.product_count && Number(subcategory.product_count) > 0}
												<span class="text-xs text-gray-400 group-hover:text-[#00BFB3] flex-shrink-0">
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
										<svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</a>
								</div>
							</div>
						
							<!-- Em Destaque - Oculto em telas menores, visível em lg+ -->
							<div class="hidden lg:block">
								<h3 class="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4" style="font-family: 'Lato', sans-serif;">
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
													<h4 class="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#00BFB3] transition-colors">
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
																	<span class="text-xs {i < Math.floor(product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}">★</span>
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
									<h3 class="text-lg lg:text-xl xl:text-2xl font-bold mb-2" style="font-family: 'Lato', sans-serif;">
										Frete Grátis
									</h3>
									<p class="text-sm mb-3 lg:mb-4 opacity-90" style="font-family: 'Lato', sans-serif;">
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
	
	/* Scroll horizontal suave - ocultar scrollbar */
	.scrollbar-hide {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style> 