<script lang="ts">
	export let title = 'Ops! Algo deu errado';
	export let message = 'Estamos com problemas técnicos. Por favor, tente novamente em alguns instantes.';
	export let showRetry = true;
	export let onRetry: (() => void) | undefined = undefined;
</script>

<div class="flex flex-col items-center justify-center p-8 text-center">
	<div class="mb-4">
		<!-- Ícone de erro -->
		<svg class="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	</div>
	
	<h3 class="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
	<p class="text-gray-600 max-w-md mb-6">{message}</p>
	
	{#if showRetry && onRetry}
		<button 
			on:click={onRetry}
			class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			Tentar Novamente
		</button>
	{/if}
</div>

<style>
	/* Animação suave para o botão */
	button {
		transition: all 0.2s ease-in-out;
	}
	
	button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}
	
	button:active {
		transform: translateY(0);
	}
</style> 