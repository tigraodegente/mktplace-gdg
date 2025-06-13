<script lang="ts">
	import { onMount } from 'svelte';

	let loading = true;

	onMount(async () => {
		// Simular carregamento
		setTimeout(() => {
			loading = false;
		}, 1000);
	});
</script>

<div class="p-6">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Aprovação de IA</h1>
		<p class="text-gray-600">
			Revise e aprove sugestões de melhorias geradas pela inteligência artificial.
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3]"></div>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-center py-12">
				<div class="text-gray-400 text-6xl mb-4">🤖</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Sistema de Aprovação IA</h3>
				<p class="text-gray-500 mb-4">
					Funcionalidade implementada! Execute as migrações para ativar.
				</p>
				<div class="text-sm text-gray-600">
					<p>• API: /api/ai-approval/ ✅</p>
					<p>• Serviços: aiApprovalService.ts ✅</p>
					<p>• Tipos: aiApproval.ts ✅</p>
				</div>
			</div>
		</div>
	{/if}
</div> 