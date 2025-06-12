<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	import { aiReviewActions, aiReviewMode } from '$lib/stores/aiReview';
	
	interface Props {
		isOpen: boolean;
		entityName: string;
		formData: any;
		onClose: () => void;
	}
	
	let { isOpen = false, entityName = '', formData = {}, onClose } = $props();
	
	let analyzing = $state(false);
	let currentStep = $state('');
	let progress = $state(0);
	let error = $state('');
	let success = $state(false);
	
	const steps = [
		'Analisando conteúdo básico...',
		'Otimizando SEO...',
		'Sugerindo categorias...',
		'Calculando preços...',
		'Gerenciando estoque...',
		'Criando mídia...',
		'Definindo atributos...',
		'Configurando dimensões...',
		'Sugerindo variações...',
		'Finalizando análise...'
	];
	
	async function startAnalysis() {
		if (!formData.name || formData.name.trim() === '') {
			error = `Por favor, insira um nome para o ${entityName} antes de analisar com IA`;
			return;
		}
		
		analyzing = true;
		error = '';
		success = false;
		progress = 0;
		
		try {
			// Simular progresso dos steps
			for (let i = 0; i < steps.length; i++) {
				currentStep = steps[i];
				progress = ((i + 1) / steps.length) * 100;
				await new Promise(resolve => setTimeout(resolve, 300));
			}
			
			// Fazer análise real
			await aiReviewActions.startReview(formData);
			
			success = true;
			currentStep = 'Análise concluída com sucesso!';
			
			// Fechar modal após 2 segundos
			setTimeout(() => {
				onClose();
				resetModal();
			}, 2000);
			
		} catch (err: any) {
			console.error('💥 Erro na análise IA:', err);
			error = err.message || `Erro ao analisar ${entityName} com IA`;
			currentStep = 'Erro na análise';
		} finally {
			analyzing = false;
		}
	}
	
	function resetModal() {
		analyzing = false;
		currentStep = '';
		progress = 0;
		error = '';
		success = false;
	}
	
	function handleClose() {
		if (!analyzing) {
			onClose();
			resetModal();
		}
	}
	
	// Auto-iniciar análise quando modal abre
	$effect(() => {
		if (isOpen && !analyzing && !error && !success) {
			startAnalysis();
		}
	});
</script>

{#if isOpen}
	<!-- Overlay -->
	<div 
		class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
		onclick={handleClose}
	>
		<!-- Modal -->
		<div 
			class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center gap-3 mb-6">
				<div class="w-10 h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
					<ModernIcon name="robot" />
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Análise com IA</h3>
					<p class="text-sm text-gray-600">{entityName}</p>
				</div>
				{#if !analyzing}
					<button
						onclick={handleClose}
						class="ml-auto p-2 text-gray-400 hover:text-gray-600 transition-colors"
					>
						<ModernIcon name="X" size="sm" />
					</button>
				{/if}
			</div>
			
			<!-- Content -->
			<div class="space-y-4">
				{#if error}
					<!-- Error State -->
					<div class="text-center py-4">
						<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<ModernIcon name="AlertTriangle" class="text-red-600" />
						</div>
						<h4 class="text-base font-medium text-gray-900 mb-2">Erro na Análise</h4>
						<p class="text-sm text-red-600 mb-4">{error}</p>
						<button
							onclick={handleClose}
							class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Fechar
						</button>
					</div>
				{:else if success}
					<!-- Success State -->
					<div class="text-center py-4">
						<div class="w-16 h-16 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
							<ModernIcon name="CheckCircle" class="text-[#00BFB3]" />
						</div>
						<h4 class="text-base font-medium text-gray-900 mb-2">Análise Concluída!</h4>
						<p class="text-sm text-gray-600 mb-4">
							Sugestões aplicadas com sucesso. Revise as abas para ver as melhorias.
						</p>
						<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto"></div>
						<p class="text-xs text-gray-500 mt-2">Fechando automaticamente...</p>
					</div>
				{:else}
					<!-- Loading State -->
					<div class="space-y-4">
						<!-- Progress Bar -->
						<div class="space-y-2">
							<div class="flex justify-between text-sm">
								<span class="text-gray-600">Progresso</span>
								<span class="text-[#00BFB3] font-medium">{Math.round(progress)}%</span>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-2">
								<div 
									class="bg-[#00BFB3] h-2 rounded-full transition-all duration-300"
									style="width: {progress}%"
								></div>
							</div>
						</div>
						
						<!-- Current Step -->
						<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
							<div class="w-6 h-6 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
							<span class="text-sm text-gray-700">{currentStep}</span>
						</div>
						
						<!-- Info -->
						<div class="text-center">
							<p class="text-xs text-gray-500">
								A análise pode levar alguns minutos. Por favor, aguarde...
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Prevenir scroll do body quando modal está aberto */
	:global(body:has(.modal-open)) {
		overflow: hidden;
	}
</style> 