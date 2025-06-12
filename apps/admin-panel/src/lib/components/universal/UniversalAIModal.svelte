<script lang="ts">
	import type { FormConfig } from '$lib/config/formConfigs';
	
	// Props
	interface Props {
		config: FormConfig;
		formData: any;
		isOpen: boolean;
		onClose: () => void;
		onApply: (data: any) => void;
	}
	
	let { config, formData, isOpen, onClose, onApply }: Props = $props();
	
	// Estados
	let loading = $state(false);
	let error = $state<string | null>(null);
	let suggestions = $state<any[]>([]);
	
	// Analisar com IA
	async function analyzeWithAI() {
		if (!config.aiEnabled) return;
		
		loading = true;
		error = null;
		
		try {
			// Simular análise IA por enquanto
			suggestions = [
				{
					field: 'name',
					label: 'Nome',
					suggestion: formData.name + ' - Melhorado',
					confidence: 85
				}
			];
		} catch (err) {
			error = 'Erro na análise IA';
		} finally {
			loading = false;
		}
	}
	
	// Aplicar sugestão
	function applySuggestion(suggestion: any) {
		onApply({ [suggestion.field]: suggestion.suggestion });
	}
	
	// Lifecycle
	$effect(() => {
		if (isOpen && config.aiEnabled) {
			analyzeWithAI();
		}
	});
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
			<!-- Header -->
			<div class="p-6 border-b">
				<h2 class="text-xl font-semibold text-gray-900">
					Análise IA - {config.title}
				</h2>
			</div>
			
			<!-- Content -->
			<div class="p-6 overflow-y-auto max-h-[60vh]">
				{#if !config.aiEnabled}
					<div class="text-center py-8">
						<p class="text-gray-600">IA não está habilitada para {config.entityName}</p>
					</div>
				{:else if loading}
					<div class="text-center py-8">
						<div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p class="text-gray-600">Analisando com IA...</p>
					</div>
				{:else if error}
					<div class="text-center py-8">
						<p class="text-red-600 mb-4">{error}</p>
						<button
							onclick={analyzeWithAI}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg"
						>
							Tentar novamente
						</button>
					</div>
				{:else if suggestions.length === 0}
					<div class="text-center py-8">
						<p class="text-gray-600">Nenhuma sugestão encontrada</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each suggestions as suggestion}
							<div class="border border-gray-200 rounded-lg p-4">
								<div class="flex justify-between items-start mb-2">
									<h3 class="font-medium text-gray-900">{suggestion.label}</h3>
									<span class="text-sm text-gray-500">{suggestion.confidence}% confiança</span>
								</div>
								<p class="text-sm text-gray-600 mb-3">
									Sugestão: <strong>{suggestion.suggestion}</strong>
								</p>
								<button
									onclick={() => applySuggestion(suggestion)}
									class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
								>
									Aplicar
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
				<button
					onclick={onClose}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
				>
					Fechar
				</button>
			</div>
		</div>
	</div>
{/if} 