<script lang="ts">
	export let message = 'Carregando...';
</script>

<div class="flex flex-col items-center justify-center p-8">
	<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
	<p class="text-gray-600">{message}</p>
</div>

<style>
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
</style> 