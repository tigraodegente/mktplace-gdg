<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	interface Props {
		onComplete?: (result: any) => void;
		onCancel?: () => void;
		productData?: any;
	}
	
	let { 
		onComplete = () => {}, 
		onCancel = () => {},
		productData = {}
	}: Props = $props();
	
	interface EnrichmentStep {
		id: string;
		label: string;
		status: 'pending' | 'active' | 'completed';
		progress: number;
	}
	
	let steps = $state<EnrichmentStep[]>([
		{ id: 'analyze', label: 'Analisando produto...', status: 'pending', progress: 0 },
		{ id: 'category', label: 'Identificando categoria', status: 'pending', progress: 0 },
		{ id: 'brand', label: 'Detectando marca', status: 'pending', progress: 0 },
		{ id: 'descriptions', label: 'Criando descrições', status: 'pending', progress: 0 },
		{ id: 'variations', label: 'Sugerindo variações', status: 'pending', progress: 0 },
		{ id: 'shipping', label: 'Calculando frete', status: 'pending', progress: 0 },
		{ id: 'seo', label: 'Otimizando SEO', status: 'pending', progress: 0 },
		{ id: 'finalize', label: 'Finalizando...', status: 'pending', progress: 0 }
	]);
	
	let currentStepIndex = $state(0);
	let overallProgress = $state(0);
	let error = $state<string | null>(null);
	let abortController: AbortController | null = null;
	let cancelled = $state(false);
	
	// Resetar estados ao montar
	onMount(() => {
		// Resetar todos os estados
		currentStepIndex = 0;
		overallProgress = 0;
		error = null;
		cancelled = false;
		
		// Resetar steps para estado inicial
		steps = steps.map(step => ({
			...step,
			status: 'pending',
			progress: 0
		}));
		
		// Iniciar o enriquecimento
		startEnrichment();
	});
	
	onDestroy(() => {
		// Cancelar requisição se ainda estiver em andamento
		if (abortController) {
			abortController.abort();
		}
	});
	
	async function startEnrichment() {
		// Criar novo AbortController
		abortController = new AbortController();
		
		try {
			// Atualizar primeiro passo
			updateStep(0, 'active', 0);
			
			// Simular progresso inicial
			await simulateProgress(0, 100, 1000);
			updateStep(0, 'completed', 100);
			
			// Iniciar enriquecimento real
			updateStep(1, 'active', 0);
			
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...productData,
					fetchCategories: true,
					fetchBrands: true
				}),
				signal: abortController.signal
			});
			
			if (!response.ok) {
				throw new Error('Erro ao enriquecer produto');
			}
			
			// Simular progresso dos passos restantes
			for (let i = 1; i < steps.length; i++) {
				if (cancelled) break;
				
				updateStep(i, 'active', 0);
				await simulateProgress(i, 100, 800);
				updateStep(i, 'completed', 100);
				
				if (i < steps.length - 1) {
					updateStep(i + 1, 'active', 0);
				}
			}
			
			if (!cancelled) {
				const result = await response.json();
				
				if (result.success) {
					onComplete(result.data);
				} else if (result.cancelled) {
					// Foi cancelado pelo usuário, não mostrar erro
					return;
				} else {
					throw new Error(result.error || 'Erro ao enriquecer produto');
				}
			}
		} catch (err: any) {
			if (err.name === 'AbortError' || cancelled) {
				// Operação cancelada - não mostrar erro
				console.log('Enriquecimento cancelado pelo usuário');
				return;
			}
			error = err.message;
			console.error('Erro no enriquecimento:', err);
		}
	}
	
	function updateStep(index: number, status: 'pending' | 'active' | 'completed', progress: number) {
		if (index >= 0 && index < steps.length) {
			steps[index] = { ...steps[index], status, progress };
			currentStepIndex = index;
			
			// Calcular progresso geral
			const completedSteps = steps.filter(s => s.status === 'completed').length;
			const activeProgress = status === 'active' ? progress / 100 * 0.125 : 0; // Cada passo vale 12.5%
			overallProgress = Math.round((completedSteps / steps.length) * 100 + activeProgress * 100);
		}
	}
	
	async function simulateProgress(stepIndex: number, targetProgress: number, duration: number) {
		const startTime = Date.now();
		const startProgress = steps[stepIndex].progress;
		
		return new Promise<void>((resolve) => {
			const updateProgress = () => {
				if (cancelled) {
					resolve();
					return;
				}
				
				const elapsed = Date.now() - startTime;
				const progress = Math.min(
					startProgress + (targetProgress - startProgress) * (elapsed / duration),
					targetProgress
				);
				
				updateStep(stepIndex, 'active', Math.round(progress));
				
				if (progress < targetProgress) {
					requestAnimationFrame(updateProgress);
				} else {
					resolve();
				}
			};
			
			updateProgress();
		});
	}
	
	function handleCancel() {
		cancelled = true;
		if (abortController) {
			abortController.abort();
		}
		onCancel();
	}
</script>

<div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
	<!-- Header -->
	<div class="text-center mb-8">
		<div class="w-16 h-16 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
			<ModernIcon name="Robot" size={32} color="#00BFB3" />
		</div>
		<h2 class="text-2xl font-bold text-gray-900">Enriquecendo com IA</h2>
		<p class="text-gray-600 mt-2">Aguarde enquanto melhoramos seu produto</p>
	</div>
	
	<!-- Progress Bar -->
	<div class="mb-8">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-medium text-gray-700">Progresso</span>
			<span class="text-sm font-medium text-[#00BFB3]">{overallProgress}%</span>
		</div>
		<div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
			<div 
				class="bg-gradient-to-r from-[#00BFB3] to-[#00A399] h-full rounded-full transition-all duration-500 ease-out"
				style="width: {overallProgress}%"
			></div>
		</div>
	</div>
	
	<!-- Steps -->
	<div class="space-y-3 mb-8">
		{#each steps as step, index (step.id)}
			<div class="flex items-center gap-3">
				<!-- Step Icon -->
				<div class="flex-shrink-0">
					{#if step.status === 'completed'}
						<div class="w-6 h-6 bg-[#00BFB3] rounded-full flex items-center justify-center">
							<ModernIcon name="Check" size={14} color="white" />
						</div>
					{:else if step.status === 'active'}
						<div class="w-6 h-6 bg-[#00BFB3]/20 rounded-full flex items-center justify-center">
							<div class="w-3 h-3 bg-[#00BFB3] rounded-full animate-pulse"></div>
						</div>
					{:else}
						<div class="w-6 h-6 bg-gray-200 rounded-full"></div>
					{/if}
				</div>
				
				<!-- Step Label -->
				<div class="flex-1">
					<p class="text-sm {step.status === 'active' ? 'text-gray-900 font-medium' : step.status === 'completed' ? 'text-gray-700' : 'text-gray-400'}">
						{step.label}
					</p>
					{#if step.status === 'active' && step.progress > 0}
						<div class="mt-1 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
							<div 
								class="bg-[#00BFB3] h-full rounded-full transition-all duration-300"
								style="width: {step.progress}%"
							></div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	
	<!-- Error State -->
	{#if error}
		<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
			<div class="flex items-center gap-2">
				<ModernIcon name="AlertTriangle" size={20} color="#DC2626" />
				<p class="text-sm text-red-700">{error}</p>
			</div>
		</div>
	{/if}
	
	<!-- Footer -->
	<div class="flex items-center justify-between pt-4 border-t">
		<p class="text-xs text-gray-500">
			💡 Dica: A IA está analisando seu produto e gerando conteúdo otimizado para vendas e SEO.
		</p>
		<button
			onclick={handleCancel}
			class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
		>
			Cancelar
		</button>
	</div>
</div>

<style>
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style> 