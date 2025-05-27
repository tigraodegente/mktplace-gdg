<script lang="ts">
	import { ProductCard } from '@mktplace/ui';
	import type { Product } from '@mktplace/shared-types';
	
	// Props
	interface Props {
		product: Product;
	}
	
	let { product }: Props = $props();
	
	// Handlers
	function handleFavoriteToggle(product: Product, isFavorite: boolean) {
		// TODO: Implementar lógica de favoritos
		console.log('Toggle favorite:', product.id, isFavorite);
	}
</script>

<!-- Usar o ProductCard do @mktplace/ui com configurações específicas da store -->
<ProductCard 
	{product}
	variant="store"
	showFavorite={true}
	showRating={true}
	showSoldCount={true}
	showBadges={true}
	showInstallments={true}
	showPixPrice={true}
	showSku={true}
	onFavoriteToggle={handleFavoriteToggle}
/> 