<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { aiReviewActions, aiReviewMode, aiChangesCount } from '$lib/stores/aiReview';
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import AIReviewHeader from '$lib/components/shared/AIReviewHeader.svelte';
	import type { FormConfig } from '$lib/config/formConfigs';
	import { aiReviewStore } from '$lib/stores/aiReview';
	
	// Components dinâmicos (importados dinamicamente)
	import BasicTab from '$lib/components/produtos/BasicTab.svelte';
	import PricingTab from '$lib/components/produtos/PricingTab.svelte';
	import AttributesSection from '$lib/components/produtos/AttributesSection.svelte';
	import MediaTab from '$lib/components/produtos/MediaTab.svelte';
	import ShippingTab from '$lib/components/produtos/ShippingTab.svelte';
	import SeoTab from '$lib/components/produtos/SeoTab.svelte';
	import AdvancedTab from '$lib/components/produtos/AdvancedTab.svelte';
	import VariantsTab from '$lib/components/produtos/VariantsTab.svelte';
	import InventoryTab from '$lib/components/produtos/InventoryTab.svelte';
	import ProductHistorySimple from '$lib/components/produtos/ProductHistorySimple.svelte';
	import ProductHistoryAdvanced from '$lib/components/produtos/ProductHistoryAdvanced.svelte';
	import DuplicateModal from '$lib/components/produtos/DuplicateModal.svelte';
	import AIAnalysisModal from '$lib/components/ui/AIAnalysisModal.svelte';

	// Componentes de Variações
	import VariationBasicTab from '$lib/components/form-tabs/VariationBasicTab.svelte';
	import VariationPricingTab from '$lib/components/form-tabs/VariationPricingTab.svelte';
	import VariationInventoryTab from '$lib/components/form-tabs/VariationInventoryTab.svelte';
	import VariationOptionsTab from '$lib/components/form-tabs/VariationOptionsTab.svelte';
	
	// Props
	interface Props {
		config: FormConfig;
		entityId?: string;
		isEdit?: boolean;
	}
	
	let { config, entityId, isEdit = false }: Props = $props();
	
	// Estados principais
	let loading = $state(true);
	let saving = $state(false);
	let duplicating = $state(false);
	let analyzingWithAI = $state(false);
	let activeTab = $state(config.defaultTab);
	let formData = $state<any>({ ...config.defaultFormData });
	let originalDatabaseData = $state<any>({});
	
	// Estados de interface
	let showHistory = $state(false);
	let showDuplicateModal = $state(false);
	let showAIModal = $state(false);
	let validationErrors = $state<Record<string, string>>({});
	let fieldsTouched = $state(new Set<string>());
	
	// Estados para IA
	let isAIReviewMode = $state(false);
	let aiCounts = $state<Record<string, number>>({});
	let showAllAIResponses = $state(false);
	
	// Subscrever aos stores de IA
	aiReviewMode.subscribe(mode => {
		isAIReviewMode = mode;
	});
	
	aiChangesCount.subscribe(counts => {
		aiCounts = counts;
	});
	
	// Mapeamento de componentes
	const componentMap: Record<string, any> = {
		BasicTab,
		PricingTab,
		AttributesSection,
		MediaTab,
		ShippingTab,
		SeoTab,
		AdvancedTab,
		VariantsTab,
		InventoryTab,
		// Componentes de Variações
		VariationBasicTab,
		VariationPricingTab,
		VariationInventoryTab,
		VariationOptionsTab
	};
	
	// Função para iniciar análise IA
	async function startAIReview() {
		if (!config.aiEnabled) {
			return;
		}
		
		if (!formData.name || formData.name.trim() === '') {
			return;
		}
		
		// Simplesmente abrir o modal - toda lógica está lá
		showAIModal = true;
	}
	
	// Carregar dados
	async function loadData() {
		if (!isEdit || !entityId) {
			loading = false;
			return;
		}
		
		loading = true;
		try {
			const endpoint = config.loadEndpoint ? config.loadEndpoint(entityId) : config.updateEndpoint(entityId);
			const response = await fetch(endpoint);
			
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					// Guardar dados originais para comparação
					originalDatabaseData = JSON.parse(JSON.stringify(result.data));
					
					// Aplicar callback onAfterLoad se existir
					let loadedData = result.data;
					if (config.onAfterLoad) {
						loadedData = config.onAfterLoad(loadedData);
					}
					
					formData = { ...config.defaultFormData, ...loadedData };
					
					console.log(`✅ ${config.entityName} carregado com sucesso`);
				} else {
					toast.error(result.error || `Erro ao carregar ${config.entityName}`);
					goto(config.listRoute);
				}
			} else {
				toast.error(`Erro ao carregar ${config.entityName}`);
				goto(config.listRoute);
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error(`Erro ao carregar ${config.entityName}`);
			goto(config.listRoute);
		} finally {
			loading = false;
		}
	}
	
	// Salvar dados
	async function saveData() {
		// Validar antes de salvar
		if (!validateForm()) {
			toast.error('Por favor, corrija os erros antes de salvar');
			return;
		}
		
		saving = true;
		try {
			// Preparar dados para envio
			let dataToSend = { ...formData };
			
			// Aplicar callback onBeforeSave se existir
			if (config.onBeforeSave) {
				dataToSend = config.onBeforeSave(dataToSend);
			}
			
			const endpoint = isEdit ? config.updateEndpoint(entityId!) : config.createEndpoint;
			const method = isEdit ? 'PUT' : 'POST';
			
			console.log(`📤 Salvando ${config.entityName}:`, {
				endpoint,
				method,
				data: dataToSend
			});
			
			const response = await fetch(endpoint, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`
				},
				body: JSON.stringify(dataToSend)
			});
			
			const result = await response.json();
			
			if (response.ok && result.success) {
				const message = isEdit 
					? `${config.entityName} atualizado com sucesso!`
					: `${config.entityName} criado com sucesso!`;
				
				toast.success(result.message || message);
				
				// Aplicar callback onAfterSave se existir
				if (config.onAfterSave) {
					config.onAfterSave(dataToSend, result);
				}
				
				// Se for criação, redirecionar para edição
				if (!isEdit && result.id) {
					goto(`${config.listRoute}/${result.id}`);
					return;
				}
				
				// Recarregar dados se for edição
				if (isEdit) {
					await loadData();
				}
			} else {
				console.error('❌ Erro no salvamento:', result);
				toast.error(result.error || result.message || `Erro ao salvar ${config.entityName}`);
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error(`Erro ao salvar ${config.entityName}`);
		} finally {
			saving = false;
		}
	}
	
	// Validação
	function validateField(field: string, value: any) {
		fieldsTouched.add(field);
		
		// Limpar erro anterior
		delete validationErrors[field];
		
		// Validar campos obrigatórios
		if (config.requiredFields?.includes(field)) {
			if (!value || (typeof value === 'string' && value.trim() === '')) {
				validationErrors[field] = `${field} é obrigatório`;
			}
		}
		
		// Validações específicas
		if (field === 'name' && value && value.trim().length < 3) {
			validationErrors[field] = 'Nome deve ter pelo menos 3 caracteres';
		}
		
		if ((field === 'price' || field === 'sale_price') && value && parseFloat(value) <= 0) {
			validationErrors[field] = 'Preço deve ser maior que zero';
		}
		
		validationErrors = { ...validationErrors };
	}
	
	function validateForm() {
		const errors: Record<string, string> = {};
		
		// Validar campos obrigatórios
		config.requiredFields?.forEach(field => {
			if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
				errors[field] = `${field} é obrigatório`;
			}
		});
		
		validationErrors = errors;
		return Object.keys(errors).length === 0;
	}
	
	// Funções de interface
	function handleCancel() {
		goto(config.listRoute);
	}
	
	function handleDuplicate() {
		if (!isEdit || !entityId) return;
		showDuplicateModal = true;
	}
	
	function toggleHistory() {
		showHistory = !showHistory;
	}
	
	// Função para copiar todas as respostas da IA
	function copyAllResponses() {
		const allResponses = $aiReviewStore.suggestions.map(suggestion => ({
			field: suggestion.field,
			label: suggestion.label,
			currentValue: suggestion.currentValue,
			suggestedValue: suggestion.suggestedValue,
			confidence: suggestion.confidence,
			reasoning: suggestion.reasoning,
			source: suggestion.source,
			category: suggestion.category
		}));
		
		const debugText = `=== DEBUG COMPLETO DA IA ===
Total de sugestões: ${allResponses.length}
Produto: ${formData.name || 'Sem nome'}

SUGESTÕES:
${allResponses.map((s, i) => `
${i + 1}. ${s.label} (${s.field})
   Valor atual: ${JSON.stringify(s.currentValue)}
   Valor sugerido: ${JSON.stringify(s.suggestedValue)}
   Confiança: ${s.confidence}%
   Reasoning: ${s.reasoning}
   Categoria: ${s.category}
   ---
`).join('')}

JSON COMPLETO:
${JSON.stringify(allResponses, null, 2)}
=================================`;
		
		navigator.clipboard.writeText(debugText).then(() => {
			toast.success('Debug completo copiado! Cole no chat para análise.');
		});
	}
	
	// Lifecycle
	onMount(() => {
		loadData();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						type="button"
						onclick={handleCancel}
						class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ModernIcon name="ChevronLeft" />
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">
							{isEdit ? `Editar ${config.title}` : `Novo ${config.title}`}
							{#if formData.name}
								<span class="text-lg text-gray-600 font-normal ml-2">- {formData.name}</span>
							{/if}
						</h1>
						<p class="text-sm text-gray-600">
							{config.subtitle || (isEdit ? `Atualize as informações do ${config.entityName}` : `Preencha as informações para criar um novo ${config.entityName}`)}
						</p>
					</div>
				</div>
				
				<div class="flex items-center gap-2">
					<!-- Botão IA -->
					{#if config.aiEnabled}
						<button
							type="button"
							onclick={startAIReview}
							disabled={analyzingWithAI || saving}
							class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
							title="Analisar com IA"
						>
							{#if analyzingWithAI}
								<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								<span>Analisando...</span>
							{:else}
								<ModernIcon name="robot" />
								<span>Analisar com IA</span>
							{/if}
						</button>
					{/if}
					
					<!-- Botão Histórico -->
					{#if config.showHistory && isEdit}
						<button
							type="button"
							onclick={toggleHistory}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
						>
							<ModernIcon name="History" />
							Histórico
						</button>
					{/if}
					
					<!-- Botão Duplicar -->
					{#if config.showDuplicate && isEdit}
						<button
							type="button"
							onclick={handleDuplicate}
							disabled={duplicating}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
						>
							<ModernIcon name="Copy" />
							Duplicar
						</button>
					{/if}
					
					<!-- Botão Cancelar -->
					<button
						type="button"
						onclick={handleCancel}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Cancelar
					</button>
					
					<!-- Botão Salvar -->
					<button
						type="button"
						onclick={saveData}
						disabled={saving}
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name={isEdit ? "Save" : "Plus"} />
						{/if}
						{saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
					</button>
				</div>
			</div>
		</div>
	</div>
	
	{#if loading}
		<!-- Loading State -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<p class="text-gray-600">Carregando...</p>
			</div>
		</div>
	{:else}
		<!-- Navegação das Abas -->
		<div class="bg-white border-b sticky top-0 z-10">
			<div class="max-w-[calc(100vw-100px)] mx-auto px-4">
				<div class="flex gap-1 overflow-x-auto">
					{#each config.tabs as tab}
						<button
							type="button"
							onclick={() => activeTab = tab.id}
							class="py-4 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap font-medium {
								activeTab === tab.id 
									? 'border-[#00BFB3] text-[#00BFB3] bg-[#00BFB3]/5' 
									: 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
							}"
						>
							<ModernIcon name={tab.icon} />
							{tab.label}
							{#if isAIReviewMode && aiCounts[tab.id] > 0}
								<span class="bg-[#00BFB3] text-white text-xs px-2 py-1 rounded-full">
									{aiCounts[tab.id]}
								</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
		
		<!-- Conteúdo -->
		<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
			<!-- Header de Revisão IA -->
			<AIReviewHeader {formData} />
			
			<!-- Histórico (se ativado) -->
			{#if showHistory && isEdit}
				<div class="mb-6">
					<div class="bg-white rounded-lg border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-gray-900">Histórico de Alterações</h3>
							<button
								type="button"
								onclick={() => showHistory = false}
								class="text-gray-400 hover:text-gray-600"
							>
								<ModernIcon name="X" />
							</button>
						</div>
						<ProductHistorySimple productId={entityId} />
					</div>
				</div>
			{/if}
			
			<!-- Renderizar componente da aba ativa -->
			{#each config.tabs as tab}
				{#if activeTab === tab.id}
					<div class="tab-content">
						{#if tab.component === 'BasicTab'}
							<BasicTab bind:formData />
						{:else if tab.component === 'PricingTab'}
							<PricingTab bind:formData />
						{:else if tab.component === 'AttributesSection'}
							<AttributesSection bind:formData />
						{:else if tab.component === 'VariantsTab'}
							<VariantsTab bind:formData />
						{:else if tab.component === 'InventoryTab'}
							<InventoryTab bind:formData />
						{:else if tab.component === 'MediaTab'}
							<MediaTab bind:formData productId={entityId || ''} />
						{:else if tab.component === 'ShippingTab'}
							<ShippingTab bind:formData />
						{:else if tab.component === 'SeoTab'}
							<SeoTab bind:formData />
						{:else if tab.component === 'AdvancedTab'}
							<AdvancedTab bind:formData />
						{:else if tab.component === 'VariationBasicTab'}
							<VariationBasicTab data={formData} errors={validationErrors} on:change={(e) => { formData[e.detail.field] = e.detail.value; }} />
						{:else if tab.component === 'VariationPricingTab'}
							<VariationPricingTab data={formData} errors={validationErrors} on:change={(e) => { formData[e.detail.field] = e.detail.value; }} />
						{:else if tab.component === 'VariationInventoryTab'}
							<VariationInventoryTab data={formData} errors={validationErrors} on:change={(e) => { formData[e.detail.field] = e.detail.value; }} />
						{:else if tab.component === 'VariationOptionsTab'}
							<VariationOptionsTab data={formData} errors={validationErrors} on:change={(e) => { formData[e.detail.field] = e.detail.value; }} />
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<!-- Modal de Duplicação -->
{#if showDuplicateModal}
	<DuplicateModal 
		productId={entityId} 
		onClose={() => showDuplicateModal = false}
	/>
{/if}

<!-- Modal de Análise IA -->
{#if showAIModal}
	<AIAnalysisModal
		isOpen={showAIModal}
		productName={formData.name || config.entityName}
		{formData}
		onClose={() => showAIModal = false}
	/>
{/if}

<!-- 🔧 PAINEL DEBUG DA IA -->
{#if $aiReviewStore.isActive && $aiReviewStore.suggestions.length > 0}
	<div class="fixed bottom-4 right-4 z-40">
		<button
			onclick={() => showAllAIResponses = !showAllAIResponses}
			class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-lg flex items-center gap-2"
		>
			<ModernIcon name="Bug" />
			Debug IA ({$aiReviewStore.suggestions.length})
		</button>
	</div>

	{#if showAllAIResponses}
		<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				<div class="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold">🔧 Todas as Respostas da IA para Debug</h3>
					<div class="flex items-center gap-2">
						<button
							onclick={copyAllResponses}
							class="px-3 py-1 bg-green-500 text-white rounded text-sm"
						>
							📋 Copiar Todas
						</button>
						<button
							onclick={() => showAllAIResponses = false}
							class="p-2 text-gray-400 hover:text-gray-600"
						>
							<ModernIcon name="X" />
						</button>
					</div>
				</div>
				
				<div class="p-6 space-y-4">
					<div class="text-sm text-gray-600 mb-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
						📢 <strong>COLE TUDO ISSO NO CHAT:</strong><br>
						Este é o debug completo da IA. Cole todo o conteúdo no chat para que eu possa ver exatamente o que a IA está retornando e identificar onde estão os problemas de IDs vs nomes.
					</div>
					
					{#each $aiReviewStore.suggestions as suggestion, index}
						<div class="border rounded-lg p-4 bg-gray-50">
							<div class="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
								<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{index + 1}</span>
								{suggestion.label} 
								<code class="text-xs bg-gray-200 px-1 rounded">({suggestion.field})</code>
							</div>
							<div class="text-xs font-mono bg-gray-100 p-3 rounded overflow-x-auto">
								{JSON.stringify(suggestion, null, 2)}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.tab-content {
		animation: fadeIn 0.2s ease-in-out;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style> 