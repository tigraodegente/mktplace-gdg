<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

	interface Product {
		id: string;
		name: string;
		slug: string;
		price: number;
		seller_id: string;
		[key: string]: any;
	}

	let products: Product[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			// Buscar produtos em promoção
			const response = await fetch('/api/products/featured?type=promotion');
			if (response.ok) {
				const data = await response.json();
				products = data.data?.products || data.data || [];
			} else {
				error = 'Erro ao carregar promoções';
			}
		} catch (e) {
			error = 'Erro ao conectar com o servidor';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Promoções - Marketplace GDG</title>
	<meta name="description" content="Confira as melhores promoções e ofertas especiais em nossa loja" />
	<meta name="keywords" content="promoções, ofertas, descontos, produtos em promoção" />
</svelte:head>

<div class="promotions-page">
	<div class="container">
		<header class="page-header">
			<h1 class="page-title">Promoções</h1>
			<p class="page-subtitle">Aproveite as melhores ofertas!</p>
		</header>

		{#if loading}
			<div class="loading-container">
				<LoadingSpinner />
			</div>
		{:else if error}
			<div class="error-container">
				<p class="error-message">{error}</p>
			</div>
		{:else if products.length === 0}
			<div class="empty-state">
				<div class="empty-icon">🎁</div>
				<h2>Nenhuma promoção disponível no momento</h2>
				<p>Volte em breve para conferir novas ofertas!</p>
				<a href="/" class="btn-primary">Continuar comprando</a>
			</div>
		{:else}
			<div class="products-grid">
				{#each products as product}
					<ProductCard {product} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.promotions-page {
		min-height: calc(100vh - 200px);
		padding: 2rem 0;
		background: white;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.page-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.page-title {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-color, #333);
		margin-bottom: 0.5rem;
	}

	.page-subtitle {
		font-size: 1.125rem;
		color: var(--text-secondary, #666);
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.error-container {
		text-align: center;
		padding: 3rem;
	}

	.error-message {
		color: #dc3545;
		font-size: 1.125rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 1rem;
		max-width: 500px;
		margin: 0 auto;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		filter: grayscale(1);
		opacity: 0.5;
	}

	.empty-state h2 {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
		color: var(--text-color, #333);
	}

	.empty-state p {
		color: var(--text-secondary, #666);
		margin-bottom: 2rem;
	}

	.btn-primary {
		display: inline-block;
		background: #00BFB3;
		color: white;
		padding: 0.75rem 2rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
		transition: background 0.2s;
	}

	.btn-primary:hover {
		background: #00A89D;
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	@media (max-width: 768px) {
		.page-title {
			font-size: 2rem;
		}
		
		.page-subtitle {
			font-size: 1rem;
		}

		.products-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 1rem;
		}
	}
</style> 