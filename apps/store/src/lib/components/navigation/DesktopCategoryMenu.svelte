<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { categoryService, type Category } from '$lib/services/categoryService';
	
	let categories = $state<Category[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let activeCategory = $state<string | null>(null);
	let hoverTimeout: NodeJS.Timeout;
	let isMenuOpen = $state(false);
	
	// Buscar categorias
	async function loadCategories() {
		try {
			isLoading = true;
			error = null;
			categories = await categoryService.getCategories();
		} catch (err) {
			console.error('Erro ao buscar categorias:', err);
			error = err instanceof Error ? err.message : 'Erro ao buscar categorias';
		} finally {
			isLoading = false;
		}
	}
	
	onMount(() => {
		loadCategories();
		
		// Cleanup
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
	
	// Dados de exemplo para itens em destaque e banner
	const featuredItems = [
		{ name: 'Novidades', link: '/novidades', gradient: 'from-purple-500 to-pink-500' },
		{ name: 'Mais Vendidos', link: '/mais-vendidos', gradient: 'from-blue-500 to-cyan-500' },
		{ name: 'Promoções', link: '/promocoes', gradient: 'from-orange-500 to-red-500' }
	];
	
	const bannerData = {
		title: 'Frete Grátis',
		subtitle: 'Em compras acima de R$ 199',
		cta: 'Aproveitar',
		link: '/promocoes',
		gradient: 'from-[#00BFB3] to-[#00A89D]'
	};
</script>

<svelte:window on:keydown={handleKeyDown} on:click={handleClickOutside} />

<nav class="category-menu-container bg-white border-b border-gray-200 relative">
	<div class="container mx-auto px-4">
		<div class="flex items-center justify-center">
			{#if isLoading}
				<div class="py-3 text-gray-500">
					<div class="flex items-center gap-2">
						<div class="w-4 h-4 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
						<span class="text-sm">Carregando categorias...</span>
					</div>
				</div>
			{:else if error}
				<div class="py-3 text-red-500 text-sm">
					{error}
				</div>
			{:else if categories.length > 0}
				<ul class="flex items-center gap-1">
					{#each categories as category}
						<li>
							<a
								href="/categoria/{category.slug}"
								class="flex items-center gap-2 px-4 py-3 text-gray-700 hover:text-[#00BFB3] transition-colors relative group"
								onmouseenter={() => handleMouseEnter(category.id)}
								onmouseleave={handleMouseLeave}
								style="font-family: 'Lato', sans-serif; font-weight: 500; font-size: 14px;"
							>
								{@html categoryService.getCategoryIcon(category)}
								<span>{category.name}</span>
								{#if category.product_count && category.product_count > 0}
									<span class="text-xs text-gray-500">({category.product_count})</span>
								{/if}
								
								{#if category.subcategories.length > 0}
									<svg class="w-4 h-4 text-gray-400 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								{/if}
								
								<!-- Indicador ativo -->
								{#if activeCategory === category.id}
									<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00BFB3]"></span>
								{/if}
							</a>
						</li>
					{/each}
					
					<!-- Separador -->
					<li class="h-6 w-px bg-gray-300 mx-2"></li>
					
					<!-- Link Ver Todas -->
					<li>
						<a
							href="/categorias"
							class="flex items-center gap-2 px-4 py-3 text-[#00BFB3] hover:text-[#00A89D] transition-colors"
							style="font-family: 'Lato', sans-serif; font-weight: 600; font-size: 14px;"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
							<span>Ver Todas</span>
						</a>
					</li>
				</ul>
			{:else}
				<div class="py-3 text-gray-500 text-sm">
					Nenhuma categoria disponível
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Mega Menu -->
	{#if isMenuOpen && activeCategory}
		{@const activecat = categories.find(c => c.id === activeCategory)}
		{#if activecat && activecat.subcategories.length > 0}
			<div
				class="absolute left-0 right-0 top-full bg-white shadow-lg border-t border-gray-200 z-50"
				onmouseenter={() => clearTimeout(hoverTimeout)}
				onmouseleave={handleMouseLeave}
				transition:fade={{ duration: 200 }}
				role="menu"
				aria-label="Submenu de {activecat.name}"
			>
				<div class="container mx-auto px-4 py-6">
					<div class="grid grid-cols-4 gap-8">
						<!-- Subcategorias - 2 colunas -->
						<div class="col-span-2">
							<h3 class="text-lg font-semibold text-gray-800 mb-4" style="font-family: 'Lato', sans-serif;">
								{activecat.name}
							</h3>
							<div class="grid grid-cols-2 gap-x-8 gap-y-2">
								{#each activecat.subcategories as subcategory}
									<a
										href="/categoria/{activecat.slug}/{subcategory.slug}"
										class="flex items-center justify-between py-2 text-gray-600 hover:text-[#00BFB3] transition-colors group"
										style="font-family: 'Lato', sans-serif; font-size: 14px;"
									>
										<span>{subcategory.name}</span>
										{#if subcategory.product_count && subcategory.product_count > 0}
											<span class="text-xs text-gray-400 group-hover:text-[#00BFB3]">
												({subcategory.product_count})
											</span>
										{/if}
									</a>
								{/each}
							</div>
							
							<!-- Link Ver Todos -->
							<div class="mt-4 pt-4 border-t border-gray-200">
								<a
									href="/categoria/{activecat.slug}"
									class="inline-flex items-center gap-2 text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors"
									style="font-family: 'Lato', sans-serif; font-size: 14px;"
								>
									<span>Ver todos em {activecat.name}</span>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</a>
							</div>
						</div>
						
						<!-- Em Destaque -->
						<div>
							<h3 class="text-lg font-semibold text-gray-800 mb-4" style="font-family: 'Lato', sans-serif;">
								Em Destaque
							</h3>
							<div class="space-y-3">
								{#each featuredItems as item}
									<a
										href={item.link}
										class="block p-4 rounded-lg bg-gradient-to-r {item.gradient} text-white hover:shadow-md transition-shadow"
									>
										<p class="font-medium" style="font-family: 'Lato', sans-serif;">
											{item.name}
										</p>
									</a>
								{/each}
							</div>
						</div>
						
						<!-- Banner Promocional -->
						<div>
							<a
								href={bannerData.link}
								class="block h-full p-6 rounded-lg bg-gradient-to-br {bannerData.gradient} text-white hover:shadow-lg transition-shadow"
							>
								<h3 class="text-2xl font-bold mb-2" style="font-family: 'Lato', sans-serif;">
									{bannerData.title}
								</h3>
								<p class="text-sm mb-4 opacity-90" style="font-family: 'Lato', sans-serif;">
									{bannerData.subtitle}
								</p>
								<span class="inline-flex items-center gap-2 text-sm font-medium bg-white/20 px-4 py-2 rounded-full hover:bg-white/30 transition-colors">
									{bannerData.cta}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</nav>

<style>
	.category-menu-container {
		position: relative;
	}
	
	/* Animação de rotação suave */
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	
	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style> 