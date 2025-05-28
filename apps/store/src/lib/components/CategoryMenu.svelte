<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	
	interface Category {
		id: string;
		name: string;
		slug: string;
		icon?: string;
		children?: Category[];
		productCount?: number;
	}
	
	let { class: className = '' } = $props();
	
	let categories = $state<Category[]>([]);
	let isLoading = $state(true);
	let activeCategory = $state<string | null>(null);
	let activeMobileCategory = $state<Category | null>(null);
	let isMobileMenuOpen = $state(false);
	let hoveredCategory = $state<string | null>(null);
	
	// Timer para delay no hover
	let hoverTimer: ReturnType<typeof setTimeout>;
	
	onMount(() => {
		loadCategories();
		
		// Fechar menu ao clicar fora
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.category-menu-container')) {
				hoveredCategory = null;
			}
		};
		
		document.addEventListener('click', handleClickOutside);
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
			if (hoverTimer) clearTimeout(hoverTimer);
		};
	});
	
	async function loadCategories() {
		try {
			const response = await fetch('/api/categories/tree');
			const data = await response.json();
			
			if (data.success) {
				categories = data.data;
			}
		} catch (error) {
			console.error('Erro ao carregar categorias:', error);
		} finally {
			isLoading = false;
		}
	}
	
	function handleMouseEnter(categoryId: string) {
		clearTimeout(hoverTimer);
		hoverTimer = setTimeout(() => {
			hoveredCategory = categoryId;
		}, 150); // Pequeno delay para evitar abrir acidentalmente
	}
	
	function handleMouseLeave() {
		clearTimeout(hoverTimer);
		hoverTimer = setTimeout(() => {
			hoveredCategory = null;
		}, 300); // Delay maior para dar tempo de mover para o submenu
	}
	
	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
		if (!isMobileMenuOpen) {
			activeMobileCategory = null;
		}
	}
	
	function selectMobileCategory(category: Category) {
		if (category.children && category.children.length > 0) {
			activeMobileCategory = category;
		} else {
			// Navegar para a categoria
			window.location.href = `/categoria/${category.slug}`;
		}
	}
	
	function goBackMobile() {
		activeMobileCategory = null;
	}
</script>

<!-- Desktop Menu -->
<div class="hidden lg:block w-full h-full {className}">
	<div class="w-full max-w-[1440px] mx-auto px-8 h-full">
		<ul class="flex items-center justify-between w-full h-full">
			{#each categories as category}
				<li class="relative group h-full flex items-center">
					<a
						href="/categoria/{category.slug}"
						class="flex items-center gap-1 px-3 py-2 text-white hover:text-white/90 transition-colors text-sm"
						onmouseenter={() => handleMouseEnter(category.id)}
						onmouseleave={handleMouseLeave}
					>
						{category.name}
						{#if category.children && category.children.length > 0}
							<span class="text-xs">▼</span>
						{/if}
					</a>
					
					{#if hoveredCategory === category.id && category.children && category.children.length > 0}
						<div 
							class="absolute top-full left-0 bg-white rounded-lg shadow-lg min-w-[220px] py-2 z-50"
							onmouseenter={() => handleMouseEnter(category.id)}
							onmouseleave={handleMouseLeave}
						>
							{#each category.children as subcategory}
								<a 
									href="/categoria/{subcategory.slug || subcategory.id}"
									class="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#00BFB3] transition-colors"
								>
									{subcategory.name}
									{#if subcategory.productCount}
										<span class="text-xs text-gray-500 ml-1">({subcategory.productCount})</span>
									{/if}
								</a>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</div>

<!-- Mobile Menu Button -->
<button
	class="lg:hidden flex items-center gap-2 text-white p-2"
	onclick={toggleMobileMenu}
	aria-label="Menu de categorias"
>
	<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
	</svg>
</button>

<!-- Mobile Menu Overlay -->
{#if isMobileMenuOpen}
	<div class="lg:hidden fixed inset-0 z-50">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black bg-opacity-50"
			onclick={toggleMobileMenu}
			aria-label="Fechar menu"
		></button>
		
		<!-- Menu Panel -->
		<div 
			class="relative bg-white w-full max-w-sm h-full overflow-hidden"
			transition:fly={{ x: -320, duration: 300 }}
		>
			<!-- Header -->
			<div class="bg-[#00BFB3] text-white p-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">
					{activeMobileCategory ? activeMobileCategory.name : 'Categorias'}
				</h2>
				<button
					onclick={toggleMobileMenu}
					class="p-1 -mr-1"
					aria-label="Fechar menu"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<!-- Content -->
			<div class="overflow-y-auto h-[calc(100%-64px)]">
				{#if isLoading}
					<div class="p-8 text-center">
						<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3]"></div>
					</div>
				{:else if activeMobileCategory}
					<!-- Subcategorias -->
					<div>
						<!-- Botão voltar -->
						<button
							onclick={goBackMobile}
							class="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors border-b"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
							<span>Voltar</span>
						</button>
						
						<!-- Link para categoria pai -->
						<a
							href="/categoria/{activeMobileCategory.slug}"
							class="block px-4 py-3 bg-gray-50 font-medium text-[#00BFB3]"
							onclick={toggleMobileMenu}
						>
							Ver todos em {activeMobileCategory.name}
						</a>
						
						<!-- Subcategorias -->
						{#if activeMobileCategory.children}
							{#each activeMobileCategory.children as subCategory}
								<a
									href="/categoria/{subCategory.slug}"
									class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
									onclick={toggleMobileMenu}
								>
									<span class="text-gray-700">{subCategory.name}</span>
									{#if subCategory.productCount}
										<span class="text-sm text-gray-500">({subCategory.productCount})</span>
									{/if}
								</a>
							{/each}
						{/if}
					</div>
				{:else}
					<!-- Categorias principais -->
					<div>
						{#each categories as category}
							<button
								onclick={() => selectMobileCategory(category)}
								class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
							>
								<div class="flex items-center gap-3">
									<span class="text-gray-700">{category.name}</span>
									{#if category.productCount}
										<span class="text-sm text-gray-500">({category.productCount})</span>
									{/if}
								</div>
								{#if category.children && category.children.length > 0}
									<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
							</button>
						{/each}
						
						<!-- Link para ver todas -->
						<div class="border-t border-gray-200 bg-gray-50">
							<a
								href="/categorias"
								class="flex items-center justify-center px-4 py-4 text-[#00BFB3] font-medium"
								onclick={toggleMobileMenu}
							>
								Ver todas as categorias
							</a>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Animação suave para o menu mobile */
	:global(.category-menu-mobile-enter) {
		transform: translateX(-100%);
	}
	
	:global(.category-menu-mobile-enter-active) {
		transform: translateX(0);
		transition: transform 300ms ease-out;
	}
</style> 