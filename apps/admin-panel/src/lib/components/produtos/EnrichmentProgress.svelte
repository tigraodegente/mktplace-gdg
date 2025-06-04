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
		description: string;
		status: 'pending' | 'active' | 'completed' | 'error';
		progress: number;
		result?: any;
		error?: string;
	}
	
	let steps = $state<EnrichmentStep[]>([
		{ 
			id: 'analyze', 
			label: 'Analisando produto', 
			description: 'Processando informações básicas do produto',
			status: 'pending', 
			progress: 0 
		},
		{ 
			id: 'category', 
			label: 'Identificando categoria', 
			description: 'Determinando a categoria mais adequada',
			status: 'pending', 
			progress: 0 
		},
		{ 
			id: 'description', 
			label: 'Gerando descrições', 
			description: 'Criando descrição completa e resumo',
			status: 'pending', 
			progress: 0 
		},
		{ 
			id: 'seo', 
			label: 'Otimizando SEO', 
			description: 'Criando meta título, descrição e keywords',
			status: 'pending', 
			progress: 0 
		},
		{ 
			id: 'specifications', 
			label: 'Definindo especificações', 
			description: 'Adicionando dados técnicos e dimensões',
			status: 'pending', 
			progress: 0 
		},
		{ 
			id: 'tags', 
			label: 'Gerando tags', 
			description: 'Criando tags relevantes para busca',
			status: 'pending', 
			progress: 0 
		},
		{ 
			id: 'pricing', 
			label: 'Calculando preços', 
			description: 'Estimando custos e margens',
			status: 'pending', 
			progress: 0 
		},
		{ 
			id: 'finalize', 
			label: 'Finalizando', 
			description: 'Compilando todas as informações',
			status: 'pending', 
			progress: 0 
		}
	]);
	
	let currentStepIndex = $state(0);
	let overallProgress = $state(0);
	let isComplete = $state(false);
	let error = $state<string | null>(null);
	let cancelled = $state(false);
	let enrichedData = $state<any>(null);
	
	// Simular progresso de uma etapa
	async function processStep(stepIndex: number): Promise<void> {
		if (cancelled) return;
		
		const step = steps[stepIndex];
		if (!step) return;
		
		// Marcar etapa como ativa
		step.status = 'active';
		step.progress = 0;
		
		// Simular progresso da etapa
		for (let progress = 0; progress <= 100; progress += 10) {
			if (cancelled) return;
			
			step.progress = progress;
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		// Marcar como completa
		step.status = 'completed';
		step.progress = 100;
		
		// Atualizar progresso geral
		overallProgress = ((stepIndex + 1) / steps.length) * 100;
	}
	
	// Executar enriquecimento completo
	async function executeEnrichment() {
		try {
			console.log('🚀 Iniciando enriquecimento na modal...');
			
			// Processar cada etapa visualmente
			for (let i = 0; i < steps.length && !cancelled; i++) {
				currentStepIndex = i;
				await processStep(i);
			}
			
			if (cancelled) return;
			
			// Fazer a chamada real para a API após a animação
			console.log('📡 Fazendo chamada real para a API...');
			
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'enrich_all',
					currentData: productData,
					category: productData.category_name
				})
			});
			
			if (!response.ok) {
				throw new Error(`Erro na API: ${response.status}`);
			}
			
			const result = await response.json();
			console.log('✅ Resposta da API:', result);
			
			if (result.success && result.data) {
				enrichedData = result.data;
				isComplete = true;
				
				// Aguardar um pouco para mostrar o sucesso
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Chamar callback de sucesso
				onComplete(result);
			} else {
				throw new Error(result.error || 'Erro desconhecido na API');
			}
		} catch (err: any) {
			console.error('❌ Erro no enriquecimento:', err);
			error = err.message;
			
			// Marcar etapa atual como erro
			if (currentStepIndex < steps.length) {
				steps[currentStepIndex].status = 'error';
				steps[currentStepIndex].error = err.message;
			}
		}
	}
	
	// Cancelar processo
	function handleCancel() {
		cancelled = true;
		console.log('🛑 Enriquecimento cancelado pelo usuário');
		onCancel();
	}
	
	// Tentar novamente
	function handleRetry() {
		// Resetar estados
		error = null;
		cancelled = false;
		isComplete = false;
		currentStepIndex = 0;
		overallProgress = 0;
		enrichedData = null;
		
		// Resetar steps
		steps = steps.map(step => ({
			...step,
			status: 'pending',
			progress: 0,
			error: undefined
		}));
		
		// Iniciar novamente
		executeEnrichment();
	}
	
	// Fechar modal
	function handleClose() {
		if (isComplete && enrichedData) {
			onComplete({ success: true, data: enrichedData });
		} else {
			onCancel();
		}
	}
	
	// Iniciar processo quando componente for montado
	onMount(() => {
		console.log('🎯 EnrichmentProgress montado, iniciando processo...');
		executeEnrichment();
	});
	
	// Cleanup
	onDestroy(() => {
		cancelled = true;
	});
</script>

<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
		<!-- Header -->
		<div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white p-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
						<ModernIcon name="robot" size="lg" />
					</div>
					<div>
						<h3 class="text-xl font-bold">Enriquecimento com IA</h3>
						<p class="text-white/80 text-sm">
							{isComplete ? 'Concluído com sucesso!' : 
							 error ? 'Erro no processamento' : 
							 cancelled ? 'Cancelado' : 
							 `Processando ${productData.name || 'produto'}...`}
						</p>
					</div>
				</div>
				
				{#if !isComplete && !error}
					<button
						type="button"
						onclick={handleCancel}
						class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
						title="Cancelar"
					>
						<ModernIcon name="X" size="sm" />
					</button>
				{/if}
			</div>
			
			<!-- Progress Bar Geral -->
			<div class="mt-4">
				<div class="flex items-center justify-between text-sm mb-2">
					<span>Progresso Geral</span>
					<span>{Math.round(overallProgress)}%</span>
				</div>
				<div class="w-full bg-white/20 rounded-full h-2">
					<div 
						class="bg-white h-2 rounded-full transition-all duration-300 ease-out"
						style="width: {overallProgress}%"
					></div>
				</div>
			</div>
		</div>
		
		<!-- Content -->
		<div class="p-6 max-h-96 overflow-y-auto">
			{#if error}
				<!-- Estado de Erro -->
				<div class="text-center py-8">
					<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<ModernIcon name="AlertTriangle" size="lg" />
					</div>
					<h4 class="text-lg font-semibold text-gray-900 mb-2">Erro no Enriquecimento</h4>
					<p class="text-gray-600 mb-6">{error}</p>
					<div class="flex gap-3 justify-center">
						<button
							type="button"
							onclick={handleRetry}
							class="px-6 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
						>
							Tentar Novamente
						</button>
						<button
							type="button"
							onclick={handleCancel}
							class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancelar
						</button>
					</div>
				</div>
			{:else if isComplete}
				<!-- Estado de Sucesso -->
				<div class="text-center py-8">
					<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<ModernIcon name="Check" size="lg" />
					</div>
					<h4 class="text-lg font-semibold text-gray-900 mb-2">Enriquecimento Concluído!</h4>
					<p class="text-gray-600 mb-6">
						Produto enriquecido com sucesso. Todos os campos foram preenchidos com informações otimizadas.
					</p>
					<button
						type="button"
						onclick={handleClose}
						class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
					>
						Fechar e Aplicar
					</button>
				</div>
			{:else}
				<!-- Lista de Etapas -->
				<div class="space-y-4">
					{#each steps as step, index}
						<div class="flex items-center gap-4 p-4 rounded-xl {
							step.status === 'active' ? 'bg-[#00BFB3]/10 border border-[#00BFB3]/30' :
							step.status === 'completed' ? 'bg-green-50 border border-green-200' :
							step.status === 'error' ? 'bg-red-50 border border-red-200' :
							'bg-gray-50'
						}">
							<!-- Status Icon -->
							<div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 {
								step.status === 'active' ? 'bg-[#00BFB3]/20' :
								step.status === 'completed' ? 'bg-green-100' :
								step.status === 'error' ? 'bg-red-100' :
								'bg-gray-200'
							}">
								{#if step.status === 'active'}
									<div class="w-5 h-5 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
								{:else if step.status === 'completed'}
									<ModernIcon name="Check" size="sm" />
								{:else if step.status === 'error'}
									<ModernIcon name="AlertTriangle" size="sm" />
								{:else}
									<span class="text-sm font-medium text-gray-500">{index + 1}</span>
								{/if}
							</div>
							
							<!-- Step Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between">
									<h5 class="font-medium text-gray-900 truncate">{step.label}</h5>
									{#if step.status === 'active' || step.status === 'completed'}
										<span class="text-sm text-gray-500 ml-2">{step.progress}%</span>
									{/if}
								</div>
								<p class="text-sm text-gray-600 mt-1">{step.description}</p>
								
								{#if step.status === 'error' && step.error}
									<p class="text-sm text-red-600 mt-1">{step.error}</p>
								{/if}
								
								<!-- Progress Bar Individual -->
								{#if step.status === 'active' || step.status === 'completed'}
									<div class="mt-2 w-full bg-gray-200 rounded-full h-1.5">
										<div 
											class="h-1.5 rounded-full transition-all duration-300 {
												step.status === 'completed' ? 'bg-green-500' : 'bg-[#00BFB3]'
											}"
											style="width: {step.progress}%"
										></div>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		
		<!-- Footer -->
		{#if !error && !isComplete}
			<div class="bg-gray-50 px-6 py-4 border-t">
				<div class="flex items-center justify-between text-sm text-gray-600">
					<span>Etapa {currentStepIndex + 1} de {steps.length}</span>
					<span>Tempo estimado: {Math.max(1, steps.length - currentStepIndex)} min</span>
				</div>
			</div>
		{/if}
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