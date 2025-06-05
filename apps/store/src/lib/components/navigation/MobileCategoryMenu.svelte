<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { isAuthenticated, user } from '$lib/stores/authStore';
	import { authStore } from '$lib/stores/authStore';
	import { toastStore } from '$lib/stores/toastStore';
	import { categoryService, type Category } from '$lib/services/categoryService';
	
	interface MobileCategoryMenuProps {
		isOpen: boolean;
		onClose: () => void;
	}
	
	let { isOpen = $bindable(), onClose }: MobileCategoryMenuProps = $props();
	
	let categories = $state<Category[]>([]);
	let isLoadingCategories = $state(true);
	let expandedCategories = $state<Set<string>>(new Set());
	
	// Buscar categorias
	async function loadCategories() {
		try {
			isLoadingCategories = true;
			categories = await categoryService.getCategories();
		} catch (err) {
			console.error('Erro ao buscar categorias:', err);
			toastStore.error('Erro ao carregar categorias');
		} finally {
			isLoadingCategories = false;
		}
	}
	
	onMount(() => {
		loadCategories();
	});
	
	// iPad-specific: controle de scroll e body overflow
	$effect(() => {
		if (isOpen) {
			// Para iPad, precisamos ser mais específicos
			document.body.style.overflow = 'hidden';
			document.body.style.position = 'fixed';
			document.body.style.width = '100%';
			document.body.style.height = '100%';
		} else {
			document.body.style.overflow = '';
			document.body.style.position = '';
			document.body.style.width = '';
			document.body.style.height = '';
		}
		
		return () => {
			document.body.style.overflow = '';
			document.body.style.position = '';
			document.body.style.width = '';
			document.body.style.height = '';
		};
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
	
	// Helper para calcular total de produtos das subcategorias
	function getTotalProductCount(category: Category): number {
		if (!category.subcategories?.length) {
			return category.product_count || 0;
		}
		return category.subcategories.reduce((total, sub) => total + (sub.product_count || 0), 0);
	}
	
	async function handleLogout() {
		try {
			await authStore.logout();
			toastStore.success('Logout realizado com sucesso!');
			onClose();
		} catch (error) {
			toastStore.error('Erro ao fazer logout');
		}
	}
</script>

{#if isOpen}
	<!-- Overlay - iPad específico -->
	<div
		class="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
		style="z-index: 9998 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; -webkit-transform: translate3d(0,0,0);"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		transition:fade={{ duration: 200 }}
		role="button"
		tabindex="-1"
		aria-label="Fechar menu"
	></div>
	
	<!-- Menu - iPad específico -->
	<div
		class="mobile-menu-container fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-white z-[9999] lg:hidden overflow-y-auto overflow-x-hidden"
		style="z-index: 9999 !important; position: fixed !important; top: 0 !important; left: 0 !important; height: 100vh !important; -webkit-transform: translate3d(0,0,0); -webkit-overflow-scrolling: touch; word-wrap: break-word;"
		transition:fly={{ x: -320, duration: 300 }}
	>
		<!-- Header -->
		<div class="bg-[#00BFB3] p-4 grid grid-cols-3 items-center">
			<div></div>
			<div class="flex justify-center">
				<img src="/logo.png" alt="Logo" class="h-8 filter brightness-0 invert" />
			</div>
			<div class="flex justify-end">
				<button
					onclick={onClose}
					class="text-white p-2 touch-manipulation"
					style="-webkit-tap-highlight-color: transparent;"
					aria-label="Fechar menu"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
		
		<!-- Login/Cadastro ou Info do Usuário -->
		<div class="p-4 border-b border-gray-200">
			{#if $isAuthenticated && $user}
				<div class="text-center">
					<p class="text-gray-800 font-medium" style="font-family: 'Lato', sans-serif;">
						Olá, {$user.name?.split(' ')[0] || 'Usuário'}!
					</p>
					<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
						{$user.email}
					</p>
				</div>
			{:else}
				<a
					href="/login"
					onclick={onClose}
					class="block w-full py-3 px-4 bg-[#00BFB3] text-white rounded-lg text-center font-medium shadow-sm hover:bg-[#00A89D] transition-colors touch-manipulation"
					style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
				>
					Entre ou cadastre-se
				</a>
			{/if}
		</div>
		
		<!-- Categorias -->
		<div class="py-3">
			<div class="px-4 py-3">
				<h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2" style="font-family: 'Lato', sans-serif;">
					<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					Categorias
				</h3>
			</div>
			
			{#if isLoadingCategories}
				<div class="px-4 py-4 text-center">
					<div class="inline-flex items-center gap-2 text-gray-500">
						<div class="w-4 h-4 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
						<span class="text-sm">Carregando...</span>
					</div>
				</div>
			{:else if categories.length > 0}
				<div class="px-1">
					{#each categories as category (category.id)}
						{#if category.subcategories && category.subcategories.length > 0}
							<button
								onclick={() => toggleCategory(category.id)}
								class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 mb-1 touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<span class="flex items-center gap-2">
									<span>{category.name}</span>
									{#if getTotalProductCount(category) > 0}
										<span class="text-xs text-gray-500 font-normal">({getTotalProductCount(category)})</span>
									{/if}
								</span>
								<svg 
									class="w-4 h-4 text-gray-500 transition-transform {expandedCategories.has(category.id) ? 'rotate-180' : ''}"
									fill="none" 
									stroke="currentColor" 
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
							
							{#if expandedCategories.has(category.id)}
								<div class="mx-2 mb-2 bg-gray-50 rounded-lg">
									{#each category.subcategories as subcategory (subcategory.id)}
										<a
											href="/busca?categoria={subcategory.slug}"
											class="block py-2 pl-8 pr-4 text-sm text-gray-600 hover:text-[#00BFB3] transition-colors first:rounded-t-lg last:rounded-b-lg touch-manipulation"
											onclick={onClose}
											style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
										>
											<span class="flex items-center gap-2">
												<span>{subcategory.name}</span>
											{#if subcategory.product_count && subcategory.product_count > 0}
													<span class="text-xs text-gray-400">({subcategory.product_count})</span>
											{/if}
											</span>
										</a>
									{/each}
								</div>
							{/if}
						{:else}
							<a
								href="/busca?categoria={category.slug}"
								class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 mb-1 touch-manipulation"
								onclick={onClose}
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<span class="flex items-center gap-2">
									<span>{category.name}</span>
									{#if getTotalProductCount(category) > 0}
										<span class="text-xs text-gray-500 font-normal">({getTotalProductCount(category)})</span>
								{/if}
								</span>
							</a>
						{/if}
					{/each}
					</div>
			{:else}
				<div class="px-4 py-4 text-center text-gray-500 text-sm">
					Nenhuma categoria disponível
				</div>
			{/if}
		</div>
		
		<!-- Links Rápidos -->
		<div class="border-t border-gray-200 py-3">
			<div class="px-4 py-3">
				<h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2" style="font-family: 'Lato', sans-serif;">
					<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
					</svg>
					Links Rápidos
				</h3>
			</div>
			
			<div class="px-1">
			<a
				href="/listas-presentes"
				onclick={onClose}
					class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
					style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
				>
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
					</svg>
					<span>Listas de Presentes</span>
				</a>
				
				<a
					href="/promocoes"
					onclick={onClose}
					class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
					style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
			>
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					<span>Promoções</span>
				</a>
				
				<a
					href="/blog"
					onclick={onClose}
					class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
					style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
				>
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
					<span>Blog</span>
			</a>
			</div>
		</div>
		
		<!-- Links da Conta (se autenticado) -->
		{#if $isAuthenticated}
			<div class="border-t border-gray-200 py-3">
				<div class="px-4 py-3">
					<h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2" style="font-family: 'Lato', sans-serif;">
						<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						Minha Conta
					</h3>
				</div>
				
				<!-- Seção Principal da Conta -->
				<div class="px-1">
				<a
					href="/minha-conta"
					onclick={onClose}
						class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
				>
						<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						<span>Minha Conta</span>
				</a>
				
				<a
					href="/meus-pedidos"
					onclick={onClose}
						class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
				>
						<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
						<span>Meus Pedidos</span>
				</a>
				
				<a
					href="/favoritos"
					onclick={onClose}
						class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
				>
						<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
						</svg>
						<span>Favoritos</span>
				</a>
				</div>
			</div>
		{/if}
		
		<!-- Ajuda -->
		<div class="border-t border-gray-200 py-3 mb-4">
			<div class="px-4 py-3">
				<h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2" style="font-family: 'Lato', sans-serif;">
					<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Ajuda
				</h3>
			</div>
			
			<div class="px-1">
			<a
				href="/central-ajuda"
				onclick={onClose}
					class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
					style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
			>
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>Central de Ajuda</span>
			</a>
			
			<a
				href="/fale-conosco"
				onclick={onClose}
					class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:text-[#00BFB3] active:bg-[#00BFB3]/5 rounded-lg transition-all mx-2 touch-manipulation"
					style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
			>
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					<span>Fale Conosco</span>
			</a>
			</div>
		</div>
		
		<!-- Botão Sair - Sempre no final (se autenticado) -->
		{#if $isAuthenticated}
			<div class="border-t border-gray-200 py-3 mb-4">
				<div class="px-1">
					<button
						onclick={handleLogout}
						class="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-medium text-red-600 active:text-red-700 active:bg-red-50 rounded-lg transition-all mx-2 touch-manipulation"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
					>
						<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						<span>Sair</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* iPad-specific optimizations */
	:global(.touch-manipulation) {
		touch-action: manipulation;
	}
	
	/* Animação de rotação */
	:global(.rotate-180) {
		transform: rotate(180deg);
	}
	
	/* Animação de loading */
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
	
	/* iOS Safari specific fixes */
	@supports (-webkit-touch-callout: none) {
		:global(.fixed) {
			-webkit-transform: translate3d(0,0,0);
			transform: translate3d(0,0,0);
		}
	}
	
	/* Prevenir scroll horizontal e overflow */
	:global(.mobile-menu-item) {
		word-wrap: break-word;
		word-break: break-word;
		hyphens: auto;
		max-width: 100%;
		box-sizing: border-box;
	}
	
	/* Garantir que todos os elementos filhos não ultrapassem o container */
	:global(.mobile-menu-container *) {
		max-width: 100%;
		box-sizing: border-box;
	}
	
	/* Overflow específico para textos longos */
	:global(.mobile-menu-text) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: calc(100% - 2rem);
	}
</style> 