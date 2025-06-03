<script lang="ts">
	interface ProductCardSkeletonProps {
		class?: string;
	}
	
	let { class: className = '' }: ProductCardSkeletonProps = $props();
</script>

<div class="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse {className}">
	<!-- Imagem -->
	<div class="aspect-square bg-gray-200"></div>
	
	<!-- Conteúdo -->
	<div class="p-4 space-y-3">
		<!-- Título -->
		<div class="space-y-2">
			<div class="h-4 bg-gray-200 rounded w-3/4"></div>
			<div class="h-4 bg-gray-200 rounded w-1/2"></div>
		</div>
		
		<!-- Rating -->
		<div class="flex items-center gap-2">
			<div class="flex gap-0.5">
				{#each Array(5) as _}
					<div class="w-4 h-4 bg-gray-200 rounded"></div>
				{/each}
			</div>
			<div class="h-3 bg-gray-200 rounded w-12"></div>
		</div>
		
		<!-- Preço -->
		<div class="space-y-1">
			<div class="h-3 bg-gray-200 rounded w-20"></div>
			<div class="h-6 bg-gray-200 rounded w-24"></div>
		</div>
		
		<!-- Botões -->
		<div class="flex gap-2 pt-2">
			<div class="flex-1 h-10 bg-gray-200 rounded-lg"></div>
			<div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
		</div>
	</div>
</div> 