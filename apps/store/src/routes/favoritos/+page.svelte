<script lang="ts">
	import { wishlistStore, isWishlistEmpty } from '$lib/stores/wishlistStore';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import { advancedCartStore } from '$lib/stores/cartStore';
	import { toastStore } from '$lib/stores/toastStore';
	
	// Função para adicionar todos os itens ao carrinho
	function addAllToCart() {
		const itemCount = $wishlistStore.length;
		
		$wishlistStore.forEach(item => {
			cartStore.addItem(
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
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-[var(--text-color)] mb-2">Meus Favoritos</h1>
			<p class="text-[var(--gray300)]">
				{#if $isWishlistEmpty}
					Você ainda não tem produtos favoritos
				{:else}
					{$wishlistStore.length} {$wishlistStore.length === 1 ? 'produto' : 'produtos'} na sua lista
				{/if}
			</p>
		</div>
		
		{#if !$isWishlistEmpty}
			<!-- Ações da wishlist -->
			<div class="flex flex-wrap gap-4 mb-8">
				<button 
					onclick={addAllToCart}
					class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors font-medium"
				>
					Adicionar Todos ao Carrinho
				</button>
				<button 
					onclick={clearWishlist}
					class="px-6 py-3 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium"
				>
					Limpar Favoritos
				</button>
			</div>
			
			<!-- Grid de produtos -->
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each $wishlistStore as product (product.id)}
					<div class="relative">
						<ProductCard {product} />
						<!-- Botão de remover específico -->
						<button
							onclick={() => wishlistStore.removeItem(product.id)}
							class="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow z-10"
							aria-label="Remover dos favoritos"
						>
							<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
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