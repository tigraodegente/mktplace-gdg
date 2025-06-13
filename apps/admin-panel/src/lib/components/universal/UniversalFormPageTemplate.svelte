<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import type { FormConfig } from '$lib/config/formConfigs';
	import { universalApiService } from '$lib/services/universalApiService';
	import { validationService } from '$lib/services/validationService';
	import UniversalTabRenderer from './UniversalTabRenderer.svelte';
	import UniversalHistoryModal from './UniversalHistoryModal.svelte';
	import UniversalDuplicateModal from './UniversalDuplicateModal.svelte';
	import UniversalAIModal from './UniversalAIModal.svelte';
	import AIReviewHeader from '../shared/AIReviewHeader.svelte';
	import { aiReviewStore, aiReviewActions, aiChangesCount } from '$lib/stores/aiReview';
	
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
	let activeTab = $state(config.defaultTab);
	let formData = $state<any>({ ...config.defaultFormData });
	let originalData = $state<any>({});
	
	// Estados de interface
	let showHistory = $state(false);
	let showDuplicateModal = $state(false);
	let showAIModal = $state(false);
	let validationErrors = $state<Record<string, string>>({});
	let hasUnsavedChanges = $state(false);
	
	// Estados da IA
	let analyzingWithAI = $state(false);
	let showAllAIResponses = $state(false);
	let aiCounts = $state<Record<string, number>>({});
	let isAIReviewMode = $state(false);
	
	// Subscriptions para IA
	aiChangesCount.subscribe(counts => {
		aiCounts = counts;
	});
	
	aiReviewStore.subscribe(state => {
		isAIReviewMode = state.isActive;
	});
	
	// Computed
	const entityDisplayName = config.title || config.entityName;
	const pageTitle = isEdit ? `Editar ${entityDisplayName}` : `Novo ${entityDisplayName}`;
	const hasChanges = () => JSON.stringify(formData) !== JSON.stringify(originalData);
	
	// Lifecycle
	onMount(async () => {
		await loadData();
		setupUnsavedChangesWarning();
	});
	
	// Carregamento de dados
	async function loadData() {
		if (!isEdit || !entityId) {
			loading = false;
			return;
		}
		
		loading = true;
		try {
			const result = await universalApiService.loadEntity(config, entityId);
			
			if (result.success) {
				// Aplicar transformações pós-carregamento
				let loadedData = result.data;
				if (config.onAfterLoad) {
					loadedData = config.onAfterLoad(loadedData);
				}
				
				formData = { ...config.defaultFormData, ...loadedData };
				originalData = JSON.parse(JSON.stringify(formData));
				
				console.log(`✅ ${config.entityName} carregado com sucesso`);
			} else {
				toast.error(result.error || `Erro ao carregar ${config.entityName}`);
				goto(config.listRoute);
			}
		} catch (error) {
			console.error('Erro ao carregar:', error);
			toast.error(`Erro ao carregar ${config.entityName}`);
			goto(config.listRoute);
		} finally {
			loading = false;
		}
	}
	
	// Salvamento de dados
	async function saveData() {
		// Validação
		const validation = validationService.validate(formData, config);
		if (!validation.isValid) {
			validationErrors = validation.errors;
			toast.error('Corrija os erros antes de salvar');
			return;
		}
		
		saving = true;
		try {
					// Aplicar transformações pré-salvamento
		let dataToSend = JSON.parse(JSON.stringify(formData));
		if (config.onBeforeSave) {
			dataToSend = config.onBeforeSave(dataToSend);
		}
			
			const result = await universalApiService.saveEntity(
				config,
				dataToSend,
				isEdit ? entityId : undefined
			);
			
			if (result.success) {
				const message = isEdit 
					? `${config.entityName} atualizado com sucesso!`
					: `${config.entityName} criado com sucesso!`;
				
				toast.success(result.message || message);
				
				// Callback pós-salvamento
				if (config.onAfterSave) {
					config.onAfterSave(dataToSend, result);
				}
				
				// Redirecionar para edição se foi criação
				if (!isEdit && result.data?.id) {
					goto(`${config.listRoute}/${result.data.id}`);
					return;
				}
				
				// Recarregar dados se foi edição
				if (isEdit) {
					await loadData();
				}
				
				hasUnsavedChanges = false;
			} else {
				toast.error(result.error || `Erro ao salvar ${config.entityName}`);
			}
		} catch (error) {
			console.error('Erro ao salvar:', error);
			toast.error(`Erro ao salvar ${config.entityName}`);
		} finally {
			saving = false;
		}
	}
	
	// Funções de interface
	function handleCancel() {
		if (hasChanges() && !confirm('Descartar alterações não salvas?')) {
			return;
		}
		goto(config.listRoute);
	}
	
	function handleTabChange(tabId: string) {
		activeTab = tabId;
	}
	
	function handleDataChange(newData: any) {
		formData = { ...formData, ...newData };
		hasUnsavedChanges = hasChanges();
		
		// Limpar erros de validação relacionados
		Object.keys(newData).forEach(key => {
			delete validationErrors[key];
		});
		validationErrors = { ...validationErrors };
	}
	
	// Função para iniciar análise IA (com modal bonito)
	function startAIAnalysis() {
		if (!config.aiEnabled) return;
		
		if (!formData.name || formData.name.trim() === '') {
			toast.error('Por favor, insira um nome para o produto antes de analisar com IA');
			return;
		}
		
		// Abrir o modal bonito com progresso
		showAIModal = true;
	}
	
	function openHistory() {
		if (!config.showHistory || !isEdit) return;
		showHistory = true;
	}
	
	function openDuplicate() {
		if (!config.showDuplicate || !isEdit) return;
		showDuplicateModal = true;
	}
	
	function openPreview() {
		if (!config.showPreview || !isEdit) return;
		const previewUrl = config.previewUrl?.(entityId!) || `${config.listRoute}/${entityId}/preview`;
		window.open(previewUrl, '_blank');
	}
	
	// Aviso de alterações não salvas
	function setupUnsavedChangesWarning() {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		
		window.addEventListener('beforeunload', handleBeforeUnload);
		
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}
	
	// Atalhos de teclado
	function handleKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey) {
			switch (e.key) {
				case 's':
					e.preventDefault();
					saveData();
					break;
				case 'Escape':
					e.preventDefault();
					handleCancel();
					break;
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b shadow-sm">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<!-- Navegação e Título -->
				<div class="flex items-center gap-4">
					<button
						type="button"
						onclick={handleCancel}
						class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
						title="Voltar"
					>
						<ModernIcon name="ChevronLeft" />
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
							{pageTitle}
							{#if hasUnsavedChanges}
								<span class="w-2 h-2 bg-orange-500 rounded-full" title="Alterações não salvas"></span>
							{/if}
						</h1>
						{#if formData.name}
							<p class="text-sm text-gray-600 mt-1">{formData.name}</p>
						{/if}
						{#if config.subtitle}
							<p class="text-sm text-gray-500">{config.subtitle}</p>
						{/if}
					</div>
				</div>
				
				<!-- Ações -->
				<div class="flex items-center gap-2">
					<!-- IA -->
					{#if config.aiEnabled}
						<button
							type="button"
							onclick={startAIAnalysis}
							disabled={saving || analyzingWithAI}
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
					
					<!-- Preview -->
					{#if config.showPreview && isEdit}
						<button
							type="button"
							onclick={openPreview}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
							title="Visualizar"
						>
							<ModernIcon name="Eye" />
							<span class="hidden sm:inline">Preview</span>
						</button>
					{/if}
					
					<!-- Histórico -->
					{#if config.showHistory && isEdit}
						<button
							type="button"
							onclick={openHistory}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
							title="Ver histórico"
						>
							<ModernIcon name="History" />
							<span class="hidden sm:inline">Histórico</span>
						</button>
					{/if}
					
					<!-- Duplicar -->
					{#if config.showDuplicate && isEdit}
						<button
							type="button"
							onclick={openDuplicate}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
							title="Duplicar"
						>
							<ModernIcon name="Copy" />
							<span class="hidden sm:inline">Duplicar</span>
						</button>
					{/if}
					
					<!-- Cancelar -->
					<button
						type="button"
						onclick={handleCancel}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Cancelar
					</button>
					
					<!-- Salvar -->
					<button
						type="button"
						onclick={saveData}
						disabled={saving || !hasChanges()}
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						title={saving ? 'Salvando...' : hasChanges() ? 'Salvar (Ctrl+S)' : 'Nenhuma alteração'}
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
		<div class="flex items-center justify-center py-16">
			<div class="text-center">
				<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<p class="text-gray-600">Carregando {config.entityName}...</p>
			</div>
		</div>
	{:else}
		<!-- Navegação das Abas -->
		{#if config.tabs.length > 1}
			<div class="bg-white border-b sticky top-0 z-10 shadow-sm">
				<div class="max-w-[calc(100vw-100px)] mx-auto px-4">
					<div class="flex gap-1 overflow-x-auto scrollbar-hide">
						{#each config.tabs as tab}
							<button
								type="button"
								onclick={() => handleTabChange(tab.id)}
								class="py-4 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap font-medium {
									activeTab === tab.id 
										? 'border-[#00BFB3] text-[#00BFB3] bg-[#00BFB3]/5' 
										: 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
								}"
								title={tab.description}
							>
								<ModernIcon name={tab.icon} />
								{tab.label}
								{#if isAIReviewMode && aiCounts[tab.id] > 0}
									<span class="bg-[#00BFB3] text-white text-xs px-2 py-1 rounded-full">
										{aiCounts[tab.id]}
									</span>
								{:else if tab.badge && tab.badge() > 0}
									<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
										{tab.badge()}
									</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Conteúdo Principal -->
		<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
			<!-- Header de Revisão IA -->
			<AIReviewHeader {formData} />
			
			<!-- Erros de Validação Globais -->
			{#if Object.keys(validationErrors).length > 0}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div class="flex items-center gap-2 mb-2">
						<ModernIcon name="AlertCircle" class="text-red-500" />
						<h3 class="text-sm font-medium text-red-800">Corrija os seguintes erros:</h3>
					</div>
					<ul class="text-sm text-red-700 space-y-1">
						{#each Object.entries(validationErrors) as [field, error]}
							<li>• {error}</li>
						{/each}
					</ul>
				</div>
			{/if}
			
			<!-- Renderização da Aba Ativa -->
			{#each config.tabs as tab}
				{#if activeTab === tab.id}
					<div class="tab-content" key={tab.id}>
						<UniversalTabRenderer
							{tab}
							{config}
							{formData}
							{validationErrors}
							{entityId}
							{isEdit}
							onDataChange={handleDataChange}
						/>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<!-- Modais -->
{#if showHistory && isEdit}
	<UniversalHistoryModal
		{config}
		{entityId}
		isOpen={showHistory}
		onClose={() => showHistory = false}
	/>
{/if}

{#if showDuplicateModal && isEdit}
	<UniversalDuplicateModal
		{config}
		{entityId}
		{formData}
		isOpen={showDuplicateModal}
		onClose={() => showDuplicateModal = false}
		onSuccess={(newId) => {
			showDuplicateModal = false;
			goto(`${config.listRoute}/${newId}`);
		}}
	/>
{/if}

{#if showAIModal}
	<UniversalAIModal
		isOpen={showAIModal}
		entityName={formData.name || entityDisplayName}
		{formData}
		onClose={() => showAIModal = false}
	/>
{/if}

<style>
	.tab-content {
		animation: fadeIn 0.2s ease-in-out;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style> 