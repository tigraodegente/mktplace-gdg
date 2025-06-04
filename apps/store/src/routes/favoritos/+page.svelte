<script lang="ts">
	import { wishlistStore, isWishlistEmpty } from '$lib/stores/wishlistStore';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import { advancedCartStore } from '$lib/stores/cartStore';
	import { toastStore } from '$lib/stores/toastStore';
	import { goto } from '$app/navigation';
	
	// Estado para expansão de texto
	let mostrarMais = false;
	
	// Função para adicionar todos os itens ao carrinho
	function addAllToCart() {
		const itemCount = $wishlistStore.length;
		
		$wishlistStore.forEach(item => {
			advancedCartStore.addItem(
				item,
				item.seller_id || 'seller-1',
				item.seller_name || 'Loja Exemplo',
				1
			);
		});
		
		toastStore.success(`${itemCount} ${itemCount === 1 ? 'produto adicionado' : 'produtos adicionados'} ao carrinho!`);
	}
	
	// Função para limpar a wishlist
	function clearWishlist() {
		if (confirm('Tem certeza que deseja remover todos os produtos dos favoritos?')) {
			const itemCount = $wishlistStore.length;
			wishlistStore.clear();
			toastStore.info(`${itemCount} ${itemCount === 1 ? 'produto removido' : 'produtos removidos'} dos favoritos`);
		}
	}
	
	function toggleMostrarMais() {
		mostrarMais = !mostrarMais;
	}
</script>

<svelte:head>
	<title>Meus Favoritos - Grão de Gente Marketplace</title>
	<meta name="description" content="Seus produtos favoritos salvos no Marketplace Grão de Gente" />
	<meta name="keywords" content="favoritos, wishlist, produtos salvos, grão de gente, marketplace" />
</svelte:head>

<!-- Header Padrão do Projeto -->
<div class="bg-white shadow-sm border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">Meus Favoritos</h1>
				<p class="mt-1 text-gray-600" style="font-family: 'Lato', sans-serif;">
				{#if $isWishlistEmpty}
						Organize seus produtos preferidos em um só lugar
				{:else}
						{$wishlistStore.length} {$wishlistStore.length === 1 ? 'produto salvo' : 'produtos salvos'} na sua lista
				{/if}
			</p>
		</div>
		
			<a 
				href="/" 
				class="text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors"
				style="font-family: 'Lato', sans-serif;"
			>
				← Continuar Comprando
			</a>
		</div>
		
		<!-- Descrição expandível -->
		<div class="mt-6 pt-6 border-t border-gray-200">
			<div class="text-center">
				<p class="text-gray-600 text-base leading-relaxed mb-4" style="font-family: 'Lato', sans-serif;">
					Salve seus produtos preferidos e tenha acesso rápido sempre que precisar. 
					Seus favoritos ficam salvos mesmo se você sair da loja!
				</p>
				
				<button
					onclick={toggleMostrarMais}
					class="inline-flex items-center gap-2 text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm"
					style="font-family: 'Lato', sans-serif;"
				>
					<span>{mostrarMais ? 'Ver Menos' : 'Ver Mais'}</span>
					<svg 
						class="w-4 h-4 transition-transform {mostrarMais ? 'rotate-180' : ''}" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if mostrarMais}
					<div class="mt-4 text-gray-600 text-base leading-relaxed" style="font-family: 'Lato', sans-serif;">
						<p>
							Com a lista de favoritos você pode salvar produtos que deseja comprar depois, 
							comparar diferentes opções e adicionar vários itens ao carrinho de uma só vez. 
							Ideal para planejamento de compras e para não perder produtos interessantes!
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Conteúdo Principal -->
<main class="py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		{#if !$isWishlistEmpty}
			<!-- Action Bar -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
				<div class="flex justify-between items-center">
					<div class="flex items-center gap-3">
						<svg class="h-6 w-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
						</svg>
						<div>
							<h2 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
								Seus Produtos Favoritos
							</h2>
							<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
								Gerencie sua coleção de produtos preferidos
							</p>
						</div>
					</div>
					
					<div class="flex gap-3">
				<button 
					onclick={addAllToCart}
							class="inline-flex items-center px-4 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
							style="font-family: 'Lato', sans-serif;"
				>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
					</svg>
							Adicionar Todos
				</button>
				<button 
					onclick={clearWishlist}
							class="inline-flex items-center px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-md border border-red-200 hover:bg-red-50 transition-colors"
							style="font-family: 'Lato', sans-serif;"
				>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
							Limpar Lista
				</button>
					</div>
				</div>
			</div>
			
			<!-- Grid de produtos -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-3 mb-6">
					<svg class="h-5 w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					<h3 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
						Produtos Salvos
					</h3>
				</div>
				
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each $wishlistStore as product (product.id)}
						<div class="product-card-wrapper">
					<ProductCard {product} />
						</div>
				{/each}
				</div>
			</div>
		{:else}
			<!-- Estado vazio -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
				<svg class="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
				</svg>
				<h2 class="text-xl font-medium text-gray-900 mb-2" style="font-family: 'Lato', sans-serif;">
					Nenhum favorito ainda
				</h2>
				<p class="text-gray-600 mb-8 max-w-md mx-auto" style="font-family: 'Lato', sans-serif;">
					Explore nossos produtos e adicione seus favoritos clicando no ícone de coração. 
					Seus produtos salvos aparecerão aqui para fácil acesso.
				</p>
				
				<div class="flex flex-col sm:flex-row gap-3 justify-center">
					<button 
						onclick={() => goto('/')}
						class="inline-flex items-center px-6 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					Explorar Produtos
					</button>
					<button 
						onclick={() => goto('/categorias')}
						class="inline-flex items-center px-6 py-2 bg-white text-[#00BFB3] text-sm font-medium rounded-md border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						Ver Categorias
					</button>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	/* Animação suave para os produtos */
	.product-card-wrapper {
		animation: fadeIn 0.3s ease-in-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Motion preferences */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style> 