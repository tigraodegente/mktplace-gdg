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
		// Carregar categorias imediatamente sem delay
		loadCategories();
	});
	
	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		
		return () => {
			document.body.style.overflow = '';
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
	<!-- Overlay -->
	<div
		class="fixed inset-0 bg-black/50 z-40 md:hidden"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		transition:fade={{ duration: 200 }}
		role="button"
		tabindex="-1"
		aria-label="Fechar menu"
	></div>
	
	<!-- Menu -->
	<div
		class="fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-white z-50 md:hidden overflow-y-auto"
		transition:fly={{ x: -320, duration: 300 }}
	>
		<!-- Header -->
		<div class="bg-[#00BBB4] p-4 grid grid-cols-3 items-center">
			<div></div>
			<div class="flex justify-center">
				<img src="/logo.png" alt="Logo" class="h-8 filter brightness-0 invert" />
			</div>
			<div class="flex justify-end">
				<button
					onclick={onClose}
					class="text-white p-2"
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
					class="block w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-center text-gray-800 font-medium shadow-sm hover:bg-gray-50 transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					Entre ou cadastre-se
				</a>
			{/if}
		</div>
		
		<!-- Categorias -->
		<div class="py-2">
			<div class="px-4 py-2">
				<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider" style="font-family: 'Lato', sans-serif;">
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
				{#each categories as category}
					<div class="border-b border-gray-100">
						{#if category.subcategories.length > 0}
							<button
								onclick={() => toggleCategory(category.id)}
								class="w-full px-4 py-3 flex items-center justify-between text-gray-800 hover:bg-gray-50 transition-colors"
								style="font-family: 'Lato', sans-serif;"
							>
								<span class="flex items-center gap-2">
									{category.name}
									{#if category.product_count && category.product_count > 0}
										<span class="text-xs text-gray-500">({category.product_count})</span>
									{/if}
								</span>
								<svg 
									class="w-5 h-5 text-gray-400 transition-transform {expandedCategories.has(category.id) ? 'rotate-180' : ''}"
									fill="none" 
									stroke="currentColor" 
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
							
							{#if expandedCategories.has(category.id)}
								<div class="bg-gray-50">
									{#each category.subcategories as subcategory}
										<a
											href="/busca?categoria={subcategory.slug}"
											class="block py-2 pl-12 pr-4 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#00BFB3] transition-colors"
											onclick={onClose}
										>
											{subcategory.name}
											{#if subcategory.product_count && subcategory.product_count > 0}
												<span class="text-xs text-gray-400 ml-1">({subcategory.product_count})</span>
											{/if}
										</a>
									{/each}
								</div>
							{/if}
						{:else}
							<a
								href="/busca?categoria={category.slug}"
								class="block py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-[#00BFB3] transition-colors font-medium"
								onclick={onClose}
							>
								{category.name}
								{#if category.product_count && category.product_count > 0}
									<span class="text-xs text-gray-500 ml-1">({category.product_count})</span>
								{/if}
							</a>
						{/if}
					</div>
				{/each}
			{:else}
				<div class="px-4 py-4 text-center text-gray-500 text-sm">
					Nenhuma categoria disponível
				</div>
			{/if}
		</div>
		
		<!-- Links Rápidos -->
		<div class="border-t border-gray-200 py-2">
			<div class="px-4 py-2">
				<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider" style="font-family: 'Lato', sans-serif;">
					Links Rápidos
				</h3>
			</div>
			
			<a
				href="/promocoes"
				onclick={onClose}
				class="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
				style="font-family: 'Lato', sans-serif;"
			>
				<span class="flex items-center gap-3">
					<svg class="w-5 h-5 text-[#FF8403]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					Promoções
				</span>
			</a>
			
			<a
				href="/novidades"
				onclick={onClose}
				class="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
				style="font-family: 'Lato', sans-serif;"
			>
				<span class="flex items-center gap-3">
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					Novidades
				</span>
			</a>
		</div>
		
		<!-- Links da Conta (se autenticado) -->
		{#if $isAuthenticated}
			<div class="border-t border-gray-200 py-2">
				<div class="px-4 py-2">
					<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider" style="font-family: 'Lato', sans-serif;">
						Minha Conta
					</h3>
				</div>
				
				<a
					href="/minha-conta"
					onclick={onClose}
					class="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					<span class="flex items-center gap-3">
						<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						Meus Dados
					</span>
				</a>
				
				<a
					href="/meus-pedidos"
					onclick={onClose}
					class="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					<span class="flex items-center gap-3">
						<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
						</svg>
						Meus Pedidos
					</span>
				</a>
				
				<a
					href="/favoritos"
					onclick={onClose}
					class="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					<span class="flex items-center gap-3">
						<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
						</svg>
						Favoritos
					</span>
				</a>
				
				<button
					onclick={handleLogout}
					class="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					<span class="flex items-center gap-3">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						Sair
					</span>
				</button>
			</div>
		{/if}
		
		<!-- Ajuda -->
		<div class="border-t border-gray-200 py-2 mb-4">
			<div class="px-4 py-2">
				<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider" style="font-family: 'Lato', sans-serif;">
					Ajuda
				</h3>
			</div>
			
			<a
				href="/central-ajuda"
				onclick={onClose}
				class="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
				style="font-family: 'Lato', sans-serif;"
			>
				<span class="flex items-center gap-3">
					<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Central de Ajuda
				</span>
			</a>
			
			<a
				href="/fale-conosco"
				onclick={onClose}
				class="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
				style="font-family: 'Lato', sans-serif;"
			>
				<span class="flex items-center gap-3">
					<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					Fale Conosco
				</span>
			</a>
		</div>
	</div>
{/if}

<style>
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
	
	/* Prevenir scroll do backdrop */
	:global(body.menu-open) {
		overflow: hidden;
	}
</style> 