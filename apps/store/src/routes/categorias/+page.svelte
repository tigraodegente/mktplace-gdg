<script lang="ts">
	import { onMount } from 'svelte';
	import { categoryService, type Category } from '$lib/services/categoryService';
	import { toastStore } from '$lib/stores/toastStore';
	
	let categories = $state<Category[]>([]);
	let isLoading = $state(true);
	let expandedCategories = $state<Set<string>>(new Set());
	
	// Agrupar categorias por letra
	let letterGroups = $derived(() => {
		const groups: Record<string, Array<any>> = {};
		
		categories.forEach(cat => {
			const letter = cat.name[0].toUpperCase();
			if (!groups[letter]) groups[letter] = [];
			groups[letter].push(cat);
			
			// Adicionar subcategorias também
			cat.subcategories.forEach((sub: any) => {
				const subLetter = sub.name[0].toUpperCase();
				if (!groups[subLetter]) groups[subLetter] = [];
				groups[subLetter].push({ ...sub, parentSlug: cat.slug });
			});
		});
		
		return groups;
	});
	
	onMount(async () => {
		try {
			categories = await categoryService.getCategories();
		} catch (error) {
			console.error('Erro ao carregar categorias:', error);
			toastStore.error('Erro ao carregar categorias');
		} finally {
			isLoading = false;
		}
	});
	
	function toggleCategory(categoryId: string) {
		const newExpanded = new Set(expandedCategories);
		if (newExpanded.has(categoryId)) {
			newExpanded.delete(categoryId);
		} else {
			newExpanded.add(categoryId);
		}
		expandedCategories = newExpanded;
	}
	
	// Cores para as categorias (mapeamento por slug)
	const categoryColors: Record<string, string> = {
		'eletronicos': 'from-blue-400 to-blue-600',
		'celulares': 'from-purple-400 to-purple-600',
		'informatica': 'from-indigo-400 to-indigo-600',
		'games': 'from-red-400 to-red-600',
		'casa': 'from-green-400 to-green-600',
		'default': 'from-gray-400 to-gray-600'
	};
	
	function getCategoryColor(slug: string): string {
		return categoryColors[slug] || categoryColors.default;
	}
	
	// Ícones para as categorias
	const categoryIcons: Record<string, string> = {
		'eletronicos': '📱',
		'celulares': '📲',
		'informatica': '💻',
		'games': '🎮',
		'casa': '🏠',
		'default': '📦'
	};
	
	function getCategoryIcon(slug: string): string {
		return categoryIcons[slug] || categoryIcons.default;
	}
</script>

<svelte:head>
	<title>Todas as Categorias | Marketplace GDG</title>
	<meta name="description" content="Explore todas as categorias de produtos disponíveis no Marketplace GDG" />
</svelte:head>

<div class="min-h-screen bg-white">
	<!-- Hero -->
	<div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white py-16">
		<div class="w-full max-w-[1440px] mx-auto px-8">
			<h1 class="text-4xl md:text-5xl font-bold mb-4">Todas as Categorias</h1>
			<p class="text-xl text-white/90">Encontre exatamente o que você procura</p>
		</div>
	</div>
	
	<div class="w-full max-w-[1440px] mx-auto px-8 py-12">
		{#if isLoading}
			<div class="flex items-center justify-center h-64">
				<div class="text-center">
					<div class="w-12 h-12 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p class="text-gray-600">Carregando categorias...</p>
				</div>
			</div>
		{:else if categories.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-600">Nenhuma categoria disponível no momento.</p>
			</div>
		{:else}
			<!-- Grid de categorias principais -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each categories as category}
					<div class="bg-white rounded-lg shadow-sm overflow-hidden">
						<!-- Header da categoria -->
						<div class="p-6 border-b">
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<h2 class="text-xl font-semibold text-gray-900 mb-1">{category.name}</h2>
									<p class="text-sm text-gray-600">
										{category.product_count || 0} produtos
									</p>
								</div>
								{#if category.subcategories.length > 0}
									<button
										onclick={() => toggleCategory(category.id)}
										class="p-2 hover:bg-gray-50 rounded-lg transition-colors"
										aria-label="Expandir subcategorias"
									>
										<svg 
											class="w-5 h-5 text-gray-400 transition-transform {expandedCategories.has(category.id) ? 'rotate-180' : ''}"
											fill="none" 
											stroke="currentColor" 
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</button>
								{/if}
							</div>
							
							<!-- Link para ver todos da categoria -->
							<a 
								href="/busca?categoria={category.slug}"
								class="inline-flex items-center gap-2 mt-3 text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors"
							>
								Ver todos os produtos
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</a>
						</div>
						
						<!-- Subcategorias -->
						{#if category.subcategories.length > 0}
							<div class="p-4 bg-gray-50 {expandedCategories.has(category.id) ? '' : 'hidden'}">
								<div class="space-y-2">
									{#each category.subcategories as subcat}
										<a 
											href="/busca?categoria={category.slug},{subcat.slug}"
											class="block px-4 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all group"
										>
											<div class="flex items-center justify-between">
												<span class="text-gray-700 group-hover:text-[#00BFB3] transition-colors">
													{subcat.name}
												</span>
												<span class="text-sm text-gray-500">
													{subcat.product_count || 0}
												</span>
											</div>
										</a>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
			
			<!-- Categorias em destaque -->
			{#if categories.filter(c => (c.product_count || 0) > 100).length > 0}
				<div class="mt-16">
					<h2 class="text-2xl font-bold text-gray-900 mb-8">Categorias em Destaque</h2>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						{#each categories.filter(c => (c.product_count || 0) > 100).slice(0, 8) as category}
							<a 
								href="/busca?categoria={category.slug}"
								class="group relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 hover:shadow-lg transition-all"
							>
								<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
								<div class="absolute bottom-0 left-0 right-0 p-4 text-white">
									<h3 class="font-semibold text-lg mb-1">{category.name}</h3>
									<p class="text-sm text-white/80">{category.product_count} produtos</p>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
			
			<!-- Navegação rápida por letra -->
			<div class="mt-16">
				<h2 class="text-2xl font-bold text-gray-900 mb-8">Navegação Rápida</h2>
				<div class="bg-white rounded-lg shadow-sm p-6">
					{#each Object.entries(letterGroups()).sort(([a], [b]) => a.localeCompare(b)) as [letter, cats]}
						<div class="mb-6">
							<h3 class="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b">{letter}</h3>
							<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
								{#each cats as cat}
									<a 
										href="/busca?categoria={cat.parentSlug ? `${cat.parentSlug},${cat.slug}` : cat.slug}"
										class="text-gray-700 hover:text-[#00BFB3] transition-colors"
									>
										{cat.name}
										{#if cat.parentSlug}
											<span class="text-xs text-gray-500 ml-1">(subcategoria)</span>
										{/if}
									</a>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.rotate-180 {
		transform: rotate(180deg);
	}
</style> 