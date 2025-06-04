<script lang="ts">
	import { wishlistStore, isWishlistEmpty } from '$lib/stores/wishlistStore';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import { advancedCartStore } from '$lib/stores/cartStore';
	import { toastStore } from '$lib/stores/toastStore';
	
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
</script>

<svelte:head>
	<title>Meus Favoritos - Grão de Gente Marketplace</title>
	<meta name="description" content="Seus produtos favoritos salvos no Marketplace Grão de Gente" />
</svelte:head>

<div class="min-h-screen bg-white">
	<div class="w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
		<!-- Header da página -->
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-[var(--text-color)] mb-2">
				Meus <span class="text-[#00BFB3]">Favoritos</span>
			</h1>
			<p class="text-[var(--gray300)]">
				{#if $isWishlistEmpty}
					Você ainda não tem produtos favoritos
				{:else}
					{$wishlistStore.length} {$wishlistStore.length === 1 ? 'produto adicionado' : 'produtos adicionados'} à sua lista
				{/if}
			</p>
		</div>
		
		{#if !$isWishlistEmpty}
			<!-- Ações da wishlist -->
			<div class="flex flex-wrap justify-center gap-3 mb-8">
				<button 
					onclick={addAllToCart}
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-200 text-sm font-medium border border-gray-200 hover:border-gray-300"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
					</svg>
					Adicionar todos
				</button>
				<button 
					onclick={clearWishlist}
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm font-medium border border-gray-200 hover:border-red-200"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Limpar lista
				</button>
			</div>
			
			<!-- Grid de produtos -->
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each $wishlistStore as product (product.id)}
					<ProductCard {product} />
				{/each}
			</div>
		{:else}
			<!-- Estado vazio -->
			<div class="flex flex-col items-center justify-center py-16">
				<svg class="w-24 h-24 text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
				</svg>
				<h2 class="text-2xl font-semibold text-gray-700 mb-2">Nenhum favorito ainda</h2>
				<p class="text-gray-500 mb-8 text-center max-w-md">
					Explore nossos produtos e adicione seus favoritos clicando no ícone de coração
				</p>
				<a 
					href="/" 
					class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors font-medium"
				>
					Explorar Produtos
				</a>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Animação suave para remoção de produtos */
	:global(.grid > div) {
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
</style> 