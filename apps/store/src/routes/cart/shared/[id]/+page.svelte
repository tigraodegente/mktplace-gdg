<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { advancedCartStore } from '$lib/stores/advancedCartStore';
	import { decompressCartData } from '$lib/services/cartLinkService';
	import { scale, fade } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	
	// Estados
	let loading = $state(true);
	let error = $state('');
	let success = $state(false);
	let itemsAdded = $state(0);
	
	onMount(async () => {
		try {
			// Obter dados da URL
			const compressed = $page.url.searchParams.get('data');
			
			if (!compressed) {
				throw new Error('Link inválido ou expirado');
			}
			
			// Descomprimir dados
			const cartData = decompressCartData(compressed);
			
			if (!cartData) {
				throw new Error('Link expirado ou dados inválidos');
			}
			
			// Adicionar items ao carrinho
			// Nota: Em produção, você faria uma chamada API para buscar os produtos atualizados
			// Por enquanto, vamos simular com dados mockados
			let addedCount = 0;
			
			for (const item of cartData.items) {
				// Simular busca do produto (em produção seria uma API call)
				const product = await fetchProduct(item.productId);
				
				if (product) {
					// Adicionar ao carrinho
					await advancedCartStore.addItem(
						product,
						product.seller_id || 'default',
						product.seller_name || 'Vendedor',
						item.quantity,
						{
							color: item.selectedColor,
							size: item.selectedSize
						}
					);
					addedCount++;
				}
			}
			
			itemsAdded = addedCount;
			success = true;
			
			// Redirecionar para home após 3 segundos
			setTimeout(() => {
				goto('/');
			}, 3000);
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erro ao carregar carrinho';
		} finally {
			loading = false;
		}
	});
	
	// Simular busca de produto (em produção seria uma chamada real à API)
	async function fetchProduct(productId: string) {
		// Simular delay de rede
		await new Promise(resolve => setTimeout(resolve, 300));
		
		// Produtos mockados para demonstração
		const mockProducts = {
			'prod-1': {
				id: 'prod-1',
				name: 'Notebook Gamer RGB',
				slug: 'notebook-gamer-rgb',
				price: 4999.90,
				original_price: 5999.90,
				discount: 17,
				image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400',
				images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400'],
				category_id: 'cat-1',
				seller_id: 'seller-1',
				seller_name: 'TechStore',
				weight: 2.5,
				is_black_friday: true,
				has_fast_delivery: true,
				stock: 10
			},
			'prod-2': {
				id: 'prod-2',
				name: 'Mouse Gamer Wireless',
				slug: 'mouse-gamer-wireless',
				price: 299.90,
				original_price: 399.90,
				discount: 25,
				image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
				images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'],
				category_id: 'cat-1',
				seller_id: 'seller-1',
				seller_name: 'TechStore',
				weight: 0.2,
				is_black_friday: true,
				has_fast_delivery: true,
				stock: 50
			}
		};
		
		return mockProducts[productId as keyof typeof mockProducts] || null;
	}
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="max-w-md w-full">
		{#if loading}
			<!-- Loading State -->
			<div 
				class="bg-white rounded-2xl shadow-xl p-8 text-center"
				transition:scale={{ duration: 400, easing: elasticOut }}
			>
				<div class="mb-6">
					<svg class="w-16 h-16 text-[#00BFB3] mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				</div>
				<h2 class="text-xl font-bold text-gray-900 mb-2">Carregando carrinho...</h2>
				<p class="text-gray-600">Aguarde enquanto adicionamos os produtos</p>
			</div>
		{:else if error}
			<!-- Error State -->
			<div 
				class="bg-white rounded-2xl shadow-xl p-8 text-center"
				transition:scale={{ duration: 400, easing: elasticOut }}
			>
				<div class="mb-6">
					<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
						<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
				</div>
				<h2 class="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
				<p class="text-gray-600 mb-6">{error}</p>
				<a 
					href="/"
					class="inline-flex items-center gap-2 px-6 py-3 bg-[#00BFB3] text-white rounded-xl hover:bg-[#00A89D] transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
					</svg>
					Ir para a loja
				</a>
			</div>
		{:else if success}
			<!-- Success State -->
			<div 
				class="bg-white rounded-2xl shadow-xl p-8 text-center"
				transition:scale={{ duration: 400, easing: elasticOut }}
			>
				<div class="mb-6">
					<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce-once">
						<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
				</div>
				<h2 class="text-xl font-bold text-gray-900 mb-2">Carrinho carregado!</h2>
				<p class="text-gray-600 mb-2">
					{itemsAdded} {itemsAdded === 1 ? 'produto foi adicionado' : 'produtos foram adicionados'} ao seu carrinho
				</p>
				<p class="text-sm text-gray-500 mb-6">Redirecionando para a loja...</p>
				
				<div class="flex items-center justify-center gap-2 text-[#00BFB3]">
					<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span class="text-sm">Aguarde...</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes bounce-once {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-20px);
		}
	}
	
	.animate-bounce-once {
		animation: bounce-once 0.6s ease-out;
	}
</style> 