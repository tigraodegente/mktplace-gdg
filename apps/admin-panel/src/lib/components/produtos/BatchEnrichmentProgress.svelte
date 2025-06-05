<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	interface Props {
		selectedProducts?: any[];
		onComplete?: (result: any) => void;
		onCancel?: () => void;
	}
	
	let { 
		selectedProducts = [], 
		onComplete = () => {}, 
		onCancel = () => {}
	}: Props = $props();
	
	interface ProductProgress {
		id: string;
		name: string;
		status: 'pending' | 'processing' | 'completed' | 'error';
		progress: number;
		currentStep: string;
		error?: string;
	}
	
	interface EnrichmentStep {
		id: string;
		label: string;
		description: string;
	}
	
	const enrichmentSteps: EnrichmentStep[] = [
		{ id: 'analyze', label: 'Analisando', description: 'Processando informações básicas' },
		{ id: 'category', label: 'Categoria', description: 'Identificando categoria adequada' },
		{ id: 'description', label: 'Descrição', description: 'Gerando descrição completa' },
		{ id: 'seo', label: 'SEO', description: 'Otimizando meta dados' },
		{ id: 'specifications', label: 'Especificações', description: 'Definindo dados técnicos' },
		{ id: 'tags', label: 'Tags', description: 'Gerando tags relevantes' },
		{ id: 'pricing', label: 'Preços', description: 'Calculando custos e margens' },
		{ id: 'finalize', label: 'Finalizando', description: 'Compilando informações' }
	];
	
	let productsProgress = $state<ProductProgress[]>([]);
	let currentProductIndex = $state(0);
	let overallProgress = $state(0);
	let isComplete = $state(false);
	let error = $state<string | null>(null);
	let cancelled = $state(false);
	let successCount = $state(0);
	let errorCount = $state(0);
	
	// Inicializar progresso dos produtos
	function initializeProgress() {
		productsProgress = selectedProducts.map(product => ({
			id: product.id,
			name: product.name || 'Produto sem nome',
			status: 'pending',
			progress: 0,
			currentStep: ''
		}));
	}
	
	// Processar um produto específico
	async function processProduct(productIndex: number): Promise<void> {
		if (cancelled || productIndex >= productsProgress.length) return;
		
		const productProgress = productsProgress[productIndex];
		const product = selectedProducts[productIndex];
		
		try {
			productProgress.status = 'processing';
			productProgress.progress = 0;
			
			// Simular progresso através das etapas
			for (let stepIndex = 0; stepIndex < enrichmentSteps.length; stepIndex++) {
				if (cancelled) return;
				
				const step = enrichmentSteps[stepIndex];
				productProgress.currentStep = step.label;
				
				// Simular progresso da etapa
				for (let progress = 0; progress <= 100; progress += 20) {
					if (cancelled) return;
					
					const stepProgress = (stepIndex * 100 + progress) / enrichmentSteps.length;
					productProgress.progress = Math.min(stepProgress, 100);
					
					// Força reatividade
					productsProgress = [...productsProgress];
					
					await new Promise(resolve => setTimeout(resolve, 150));
				}
			}
			
			// Fazer a chamada real para a API
			const response = await fetch(`/api/ai/enrich`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'enrich_all',
					currentData: product,
					category: product.category_name
				})
			});
			
			if (!response.ok) {
				throw new Error(`Erro na API: ${response.status}`);
			}
			
			const result = await response.json();
			
			if (result.success) {
				productProgress.status = 'completed';
				productProgress.progress = 100;
				productProgress.currentStep = 'Concluído';
				successCount++;
			} else {
				throw new Error(result.error || 'Erro desconhecido');
			}
			
		} catch (err: any) {
			console.error(`❌ Erro ao enriquecer produto ${product.name}:`, err);
			productProgress.status = 'error';
			productProgress.error = err.message;
			productProgress.currentStep = 'Erro';
			errorCount++;
		}
		
		// Força reatividade
		productsProgress = [...productsProgress];
		
		// Atualizar progresso geral
		updateOverallProgress();
	}
	
	// Atualizar progresso geral
	function updateOverallProgress() {
		const totalProgress = productsProgress.reduce((sum, product) => sum + product.progress, 0);
		overallProgress = totalProgress / productsProgress.length;
	}
	
	// Executar enriquecimento em lote
	async function executeBatchEnrichment() {
		try {
			console.log('🚀 Iniciando enriquecimento em lote...');
			
			// Processar produtos em lotes para não sobrecarregar
			const batchSize = 2;
			for (let i = 0; i < productsProgress.length; i += batchSize) {
				if (cancelled) break;
				
				currentProductIndex = i;
				const batch = [];
				
				// Criar promises para o lote atual
				for (let j = 0; j < batchSize && i + j < productsProgress.length; j++) {
					batch.push(processProduct(i + j));
				}
				
				// Processar lote em paralelo
				await Promise.all(batch);
				
				// Pequena pausa entre lotes
				if (i + batchSize < productsProgress.length && !cancelled) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			}
			
			if (!cancelled) {
				isComplete = true;
				
				// Aguardar um pouco antes de chamar callback
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Chamar callback de sucesso
				onComplete({
					success: true,
					successCount,
					errorCount,
					total: productsProgress.length
				});
			}
			
		} catch (err: any) {
			console.error('❌ Erro no enriquecimento em lote:', err);
			error = err.message;
		}
	}
	
	// Cancelar processo
	function handleCancel() {
		cancelled = true;
		console.log('🛑 Enriquecimento em lote cancelado');
		onCancel();
	}
	
	// Tentar novamente
	function handleRetry() {
		// Resetar estados
		error = null;
		cancelled = false;
		isComplete = false;
		currentProductIndex = 0;
		overallProgress = 0;
		successCount = 0;
		errorCount = 0;
		
		// Reinicializar progresso
		initializeProgress();
		
		// Iniciar novamente
		executeBatchEnrichment();
	}
	
	// Fechar modal
	function handleClose() {
		if (isComplete) {
			onComplete({
				success: true,
				successCount,
				errorCount,
				total: productsProgress.length
			});
		} else {
			onCancel();
		}
	}
	
	// Inicializar quando componente for montado
	onMount(() => {
		console.log('🎯 BatchEnrichmentProgress montado com', selectedProducts.length, 'produtos');
		initializeProgress();
		executeBatchEnrichment();
	});
	
	// Cleanup
	onDestroy(() => {
		cancelled = true;
	});
</script>

<!-- Modal com classes estáticas -->
<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
		<!-- Header -->
		<div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white p-6 flex-shrink-0">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
						<ModernIcon name="robot" size="md" />
					</div>
					<div class="text-left">
						<h3 class="text-xl font-bold">Enriquecimento em Lote com IA</h3>
						<p class="text-white/80 text-sm">
							{isComplete ? `Concluído! ${successCount} sucessos, ${errorCount} erros` : 
							 error ? 'Erro no processamento' : 
							 cancelled ? 'Cancelado' : 
							 `Processando ${productsProgress.length} produtos...`}
						</p>
					</div>
				</div>
				
				{#if !isComplete && !error}
					<button
						type="button"
						onclick={handleCancel}
						class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
					>
						<ModernIcon name="X" size="sm" />
					</button>
				{/if}
			</div>
			
			<!-- Progress Bar Geral -->
			<div class="mt-4">
				<div class="flex items-center justify-between text-sm mb-2">
					<span class="text-white">Progresso Geral</span>
					<span class="text-white">{Math.round(overallProgress)}%</span>
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
		<div class="flex-1 overflow-hidden flex flex-col">
			{#if error}
				<!-- Estado de Erro -->
				<div class="flex-1 flex items-center justify-center p-8">
					<div class="text-center">
						<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<ModernIcon name="AlertTriangle" size="md" />
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
				</div>
			{:else if isComplete}
				<!-- Estado de Sucesso -->
				<div class="flex-1 flex items-center justify-center p-8">
					<div class="text-center">
						<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<ModernIcon name="Check" size="md" />
						</div>
						<h4 class="text-lg font-semibold text-gray-900 mb-2">Enriquecimento Concluído!</h4>
						<p class="text-gray-600 mb-6">
							{successCount} produto(s) enriquecido(s) com sucesso.
							{errorCount > 0 ? `${errorCount} produto(s) falharam.` : ''}
						</p>
						<button
							type="button"
							onclick={handleClose}
							class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
						>
							Fechar e Continuar
						</button>
					</div>
				</div>
			{:else}
				<!-- Lista de Produtos em Processamento -->
				<div class="flex-1 overflow-y-auto p-6">
					<div class="space-y-4">
						{#each productsProgress as product, index (product.id)}
							<!-- Card do produto - usando classes simples -->
							{#if product.status === 'processing'}
								<div class="flex items-center gap-4 p-4 rounded-xl border bg-[#00BFB3]/10 border-[#00BFB3]/30">
									<div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-[#00BFB3]/20">
										<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between mb-2">
											<h5 class="font-medium text-gray-900 truncate">{product.name}</h5>
											<span class="text-sm text-gray-500 ml-2">{Math.round(product.progress)}%</span>
										</div>
										<div class="flex items-center gap-4 text-sm text-gray-600">
											<span class="text-sm">Status: Processando</span>
											{#if product.currentStep}
												<span class="text-sm">Etapa: {product.currentStep}</span>
											{/if}
										</div>
										<div class="mt-3 w-full bg-gray-200 rounded-full h-2">
											<div 
												class="h-2 rounded-full transition-all duration-300 bg-[#00BFB3]"
												style="width: {product.progress}%"
											></div>
										</div>
									</div>
								</div>
							{:else if product.status === 'completed'}
								<div class="flex items-center gap-4 p-4 rounded-xl border bg-green-50 border-green-200">
									<div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
										<ModernIcon name="Check" size="sm" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between mb-2">
											<h5 class="font-medium text-gray-900 truncate">{product.name}</h5>
											<span class="text-sm text-gray-500 ml-2">100%</span>
										</div>
										<div class="flex items-center gap-4 text-sm text-gray-600">
											<span class="text-sm">Status: Concluído</span>
										</div>
										<div class="mt-3 w-full bg-gray-200 rounded-full h-2">
											<div class="h-2 rounded-full transition-all duration-300 bg-green-500 w-full"></div>
										</div>
									</div>
								</div>
							{:else if product.status === 'error'}
								<div class="flex items-center gap-4 p-4 rounded-xl border bg-red-50 border-red-200">
									<div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
										<ModernIcon name="AlertTriangle" size="sm" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between mb-2">
											<h5 class="font-medium text-gray-900 truncate">{product.name}</h5>
											<span class="text-sm text-gray-500 ml-2">{Math.round(product.progress)}%</span>
										</div>
										<div class="flex items-center gap-4 text-sm text-gray-600">
											<span class="text-sm">Status: Erro</span>
										</div>
										{#if product.error}
											<p class="text-sm text-red-600 mt-1">{product.error}</p>
										{/if}
										<div class="mt-3 w-full bg-gray-200 rounded-full h-2">
											<div 
												class="h-2 rounded-full transition-all duration-300 bg-red-500"
												style="width: {product.progress}%"
											></div>
										</div>
									</div>
								</div>
							{:else}
								<!-- Status pending -->
								<div class="flex items-center gap-4 p-4 rounded-xl border bg-gray-50 border-gray-200">
									<div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200">
										<span class="text-sm font-medium text-gray-500">{index + 1}</span>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between mb-2">
											<h5 class="font-medium text-gray-900 truncate">{product.name}</h5>
											<span class="text-sm text-gray-500 ml-2">0%</span>
										</div>
										<div class="flex items-center gap-4 text-sm text-gray-600">
											<span class="text-sm">Status: Aguardando</span>
										</div>
										<div class="mt-3 w-full bg-gray-200 rounded-full h-2">
											<div class="h-2 rounded-full transition-all duration-300 bg-gray-300 w-0"></div>
										</div>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Footer -->
		{#if !error && !isComplete}
			<div class="bg-gray-50 px-6 py-4 border-t flex-shrink-0">
				<div class="flex items-center justify-between text-sm text-gray-600">
					<span class="text-sm">
						{successCount + errorCount} de {productsProgress.length} produtos processados
					</span>
					<span class="text-sm">
						{successCount} sucessos • {errorCount} erros
					</span>
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