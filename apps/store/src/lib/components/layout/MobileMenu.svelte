<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { auth, user, isAuthenticated } from '$lib/stores/auth';
	
	interface Category {
		id: string;
		name: string;
		slug: string;
		icon?: string;
		children?: Category[];
		productCount?: number;
	}
	
	let { isOpen = $bindable(false) } = $props();
	
	let categories = $state<Category[]>([]);
	let isLoadingCategories = $state(true);
	let expandedCategories = $state<Set<string>>(new Set());
	
	// Categorias principais do menu
	const mainCategories = [
		{ name: 'Meninos', slug: 'meninos', hasChildren: true },
		{ name: 'Meninas', slug: 'meninas', hasChildren: true },
		{ name: 'Kits Berço', slug: 'kits-berco', hasChildren: true },
		{ name: 'Ninho', slug: 'ninho', hasChildren: true },
		{ name: 'Bolsas Maternidade', slug: 'bolsas-maternidade', hasChildren: true },
		{ name: 'Almofada Amamentação', slug: 'almofada-amamentacao', hasChildren: true }
	];
	
	// Carregar categorias da API
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
			isLoadingCategories = false;
		}
	}
	
	// Toggle categoria expandida
	function toggleCategory(categoryId: string) {
		const newExpanded = new Set(expandedCategories);
		if (newExpanded.has(categoryId)) {
			newExpanded.delete(categoryId);
		} else {
			newExpanded.add(categoryId);
		}
		expandedCategories = newExpanded;
	}
	
	// Prevenir scroll do body quando o menu estiver aberto
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
	
	onMount(() => {
		loadCategories();
	});
	
	function closeMenu() {
		isOpen = false;
		expandedCategories = new Set();
	}
	
	async function handleLogout() {
		await auth.logout();
		closeMenu();
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black/30 z-40 lg:hidden"
		transition:fade={{ duration: 200 }}
		onclick={closeMenu}
		aria-hidden="true"
	></div>
	
	<!-- Menu Drawer -->
	<div 
		class="fixed left-0 top-0 h-full w-[85%] max-w-[360px] bg-white z-50 lg:hidden overflow-hidden flex flex-col"
		transition:fly={{ x: -360, duration: 300 }}
	>
		<!-- Header -->
		<div class="bg-[#00BBB4] p-4 flex items-center justify-between relative">
			<!-- Logo Centralizado -->
			<div class="flex-1 flex justify-center">
				<img 
					src="/logo.png" 
					alt="Grão de Gente" 
					class="h-10 w-auto filter brightness-0 invert"
				/>
			</div>
			
			<!-- Close Button -->
			<button 
				onclick={closeMenu}
				class="text-white p-2 absolute right-2"
				aria-label="Fechar menu"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		</div>
		
		<!-- Login Button -->
		{#if !$isAuthenticated}
			<a 
				href="/login" 
				onclick={closeMenu}
				class="mx-4 mt-4 mb-2 flex items-center justify-between p-4 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors group"
				style="box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
			>
				<div class="flex items-center gap-3">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="#00BBB4">
						<path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
					</svg>
					<span class="text-gray-800 font-medium text-base" style="font-family: 'Lato', sans-serif;">
						Entre ou cadastre-se
					</span>
				</div>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="#999" class="group-hover:translate-x-1 transition-transform">
					<path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
				</svg>
			</a>
		{:else}
			<!-- User Info when logged in -->
			<div class="mx-4 mt-4 mb-2 p-4 bg-gray-50 rounded-2xl">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 bg-[#00BBB4] rounded-full flex items-center justify-center">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
							<path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
						</svg>
					</div>
					<div class="flex-1">
						<p class="text-gray-800 font-semibold" style="font-family: 'Lato', sans-serif;">
							Olá, {$user?.name.split(' ')[0]}
						</p>
						<p class="text-gray-600 text-sm" style="font-family: 'Lato', sans-serif;">
							{$user?.email}
						</p>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-4 py-2">
			<!-- All Categories Link -->
			<button
				onclick={() => window.location.href = '/categorias'}
				class="w-full flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 -mx-4 px-4 transition-colors"
			>
				<span class="text-gray-700 text-base" style="font-family: 'Lato', sans-serif;">
					Todas as categorias
				</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="#999">
					<path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
				</svg>
			</button>
			
			<!-- Main Categories -->
			{#each mainCategories as category}
				<button
					onclick={() => toggleCategory(category.slug)}
					class="w-full flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 -mx-4 px-4 transition-colors"
				>
					<span class="text-gray-700 text-base" style="font-family: 'Lato', sans-serif;">
						{category.name}
					</span>
					<svg 
						width="20" 
						height="20" 
						viewBox="0 0 24 24" 
						fill="#999"
						class="transition-transform duration-200"
						class:rotate-180={expandedCategories.has(category.slug)}
					>
						<path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
					</svg>
				</button>
				
				{#if expandedCategories.has(category.slug)}
					<div class="pl-8 bg-gray-50 -mx-4 px-4">
						<!-- Subcategorias seriam carregadas aqui -->
						<a 
							href="/categoria/{category.slug}"
							onclick={closeMenu}
							class="block py-3 text-gray-600 text-sm hover:text-[#00BBB4] transition-colors"
							style="font-family: 'Lato', sans-serif;"
						>
							Ver todos em {category.name}
						</a>
					</div>
				{/if}
			{/each}
			
			<!-- Additional Links -->
			{#if $isAuthenticated}
				<div class="mt-6 pt-6 border-t border-gray-200">
					<h3 class="text-xs font-bold text-gray-500 uppercase mb-3" style="font-family: 'Lato', sans-serif;">
						Minha Conta
					</h3>
					<a 
						href="/minha-conta"
						onclick={closeMenu}
						class="block py-3 text-gray-700 hover:text-[#00BBB4] transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						Dados Pessoais
					</a>
					<a 
						href="/meus-pedidos"
						onclick={closeMenu}
						class="block py-3 text-gray-700 hover:text-[#00BBB4] transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						Meus Pedidos
					</a>
					<a 
						href="/favoritos"
						onclick={closeMenu}
						class="block py-3 text-gray-700 hover:text-[#00BBB4] transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						Meus Favoritos
					</a>
				</div>
			{/if}
			
			<div class="mt-6 pt-6 border-t border-gray-200">
				<h3 class="text-xs font-bold text-gray-500 uppercase mb-3" style="font-family: 'Lato', sans-serif;">
					Ajuda
				</h3>
				<a 
					href="/central-ajuda"
					onclick={closeMenu}
					class="block py-3 text-gray-700 hover:text-[#00BBB4] transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					Central de Ajuda
				</a>
				<a 
					href="/fale-conosco"
					onclick={closeMenu}
					class="block py-3 text-gray-700 hover:text-[#00BBB4] transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					Fale Conosco
				</a>
			</div>
		</div>
		
		<!-- Footer Actions -->
		{#if $isAuthenticated}
			<div class="border-t border-gray-200 p-4">
				<button 
					onclick={handleLogout}
					class="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
					style="font-family: 'Lato', sans-serif;"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
					</svg>
					Sair da Conta
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Animação de rotação */
	:global(.rotate-180) {
		transform: rotate(-90deg);
	}
	
	/* Prevenir scroll do backdrop */
	:global(body.menu-open) {
		overflow: hidden;
	}
</style> 