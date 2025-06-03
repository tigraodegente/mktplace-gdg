<script lang="ts">
	import ModernIcon from './ModernIcon.svelte';
	
	let { show = false } = $props();
	
	// Estados de progresso
	let steps = $state([
		{ id: 'analyzing', label: 'Analisando produto...', status: 'processing', icon: 'search' },
		{ id: 'category', label: 'Identificando categoria', status: 'pending', icon: 'category' },
		{ id: 'brand', label: 'Detectando marca', status: 'pending', icon: 'brand' },
		{ id: 'description', label: 'Criando descrições', status: 'pending', icon: 'description' },
		{ id: 'variations', label: 'Sugerindo variações', status: 'pending', icon: 'Package' },
		{ id: 'shipping', label: 'Calculando frete', status: 'pending', icon: 'truck' },
		{ id: 'seo', label: 'Otimizando SEO', status: 'pending', icon: 'search' },
		{ id: 'finalizing', label: 'Finalizando...', status: 'pending', icon: 'Check' }
	]);
	
	let currentStep = $state(0);
	let progressPercent = $state(0);
	
	// Resetar e iniciar progresso quando show mudar para true
	$effect(() => {
		if (show) {
			// Resetar todos os estados
			currentStep = 0;
			progressPercent = 0;
			steps = steps.map((step, idx) => ({
				...step,
				status: idx === 0 ? 'processing' : 'pending'
			}));
			
			// Iniciar progresso após um pequeno delay para garantir renderização
			setTimeout(() => {
				const interval = setInterval(() => {
					if (currentStep < steps.length - 1) {
						// Atualizar status do passo atual
						steps[currentStep] = { ...steps[currentStep], status: 'completed' };
						currentStep++;
						steps[currentStep] = { ...steps[currentStep], status: 'processing' };
						
						// Atualizar barra de progresso
						progressPercent = Math.round((currentStep / (steps.length - 1)) * 100);
					} else {
						// Completar último passo
						steps[currentStep] = { ...steps[currentStep], status: 'completed' };
						progressPercent = 100;
						clearInterval(interval);
					}
				}, 800); // 800ms por passo
				
				// Cleanup
				return () => clearInterval(interval);
			}, 100);
		}
	});
</script>

{#if show}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
			<!-- Header -->
			<div class="text-center">
				<div class="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
					<ModernIcon name="robot" size={32} color="#9333ea" />
				</div>
				<h3 class="text-xl font-bold text-gray-900">Enriquecendo com IA</h3>
				<p class="text-sm text-gray-600 mt-1">Aguarde enquanto melhoramos seu produto</p>
			</div>
			
			<!-- Barra de progresso -->
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span class="text-gray-600">Progresso</span>
					<span class="font-medium text-purple-600">{progressPercent}%</span>
				</div>
				<div class="h-2 bg-gray-200 rounded-full overflow-hidden">
					<div 
						class="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
						style="width: {progressPercent}%"
					></div>
				</div>
			</div>
			
			<!-- Lista de passos -->
			<div class="space-y-3 max-h-96 overflow-y-auto">
				{#each steps as step, index (step.id)}
					<div class="flex items-center gap-3">
						<!-- Ícone/Status -->
						<div class="flex-shrink-0">
							{#if step.status === 'completed'}
								<div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
									<ModernIcon name="Check" size={16} color="#10b981" />
								</div>
							{:else if step.status === 'processing'}
								<div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
									<ModernIcon name={step.icon} size={16} color="#9333ea" />
								</div>
							{:else}
								<div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
									<ModernIcon name={step.icon} size={16} color="#9ca3af" />
								</div>
							{/if}
						</div>
						
						<!-- Texto -->
						<div class="flex-1">
							<p class="text-sm font-medium {
								step.status === 'completed' ? 'text-green-600' : 
								step.status === 'processing' ? 'text-purple-600' : 
								'text-gray-400'
							}">
								{step.label}
							</p>
						</div>
						
						<!-- Loading spinner para item atual -->
						{#if step.status === 'processing'}
							<div class="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
						{/if}
					</div>
				{/each}
			</div>
			
			<!-- Dica -->
			<div class="bg-purple-50 rounded-lg p-3 border border-purple-200">
				<p class="text-xs text-purple-700">
					💡 <strong>Dica:</strong> A IA está analisando seu produto e gerando conteúdo otimizado para vendas e SEO.
				</p>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Animação suave para a barra de progresso */
	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}
	
	.animate-shimmer {
		background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}
</style> 