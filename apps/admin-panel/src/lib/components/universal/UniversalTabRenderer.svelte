<script lang="ts">
	import type { FormTab, FormConfig } from '$lib/config/formConfigs';
	import UniversalFieldRenderer from './UniversalFieldRenderer.svelte';
	
	// Componentes específicos importados dinamicamente apenas quando necessário
	const COMPONENT_IMPORTS = {
		// Produtos (mantidos para compatibilidade)
		'BasicTab': () => import('$lib/components/produtos/BasicTab.svelte'),
		'PricingTab': () => import('$lib/components/produtos/PricingTab.svelte'),
		'AttributesSection': () => import('$lib/components/produtos/AttributesSection.svelte'),
		'VariantsTab': () => import('$lib/components/produtos/VariantsTab.svelte'),
		'InventoryTab': () => import('$lib/components/produtos/InventoryTab.svelte'),
		'MediaTab': () => import('$lib/components/produtos/MediaTab.svelte'),
		'ShippingTab': () => import('$lib/components/produtos/ShippingTab.svelte'),
		'SeoTab': () => import('$lib/components/produtos/SeoTab.svelte'),
		'AdvancedTab': () => import('$lib/components/produtos/AdvancedTab.svelte'),
		'AnalyticsTab': () => import('$lib/components/produtos/AnalyticsTab.svelte'),
		
		// Variações
		'VariationBasicTab': () => import('$lib/components/form-tabs/VariationBasicTab.svelte'),
		'VariationPricingTab': () => import('$lib/components/form-tabs/VariationPricingTab.svelte'),
		'VariationInventoryTab': () => import('$lib/components/form-tabs/VariationInventoryTab.svelte'),
		'VariationOptionsTab': () => import('$lib/components/form-tabs/VariationOptionsTab.svelte')
		
		// Nota: Componentes universais usam UniversalFieldRenderer dinamicamente via tab.fields
	};
	
	// Props
	interface Props {
		tab: FormTab;
		config: FormConfig;
		formData: any;
		validationErrors: Record<string, string>;
		entityId?: string;
		isEdit: boolean;
		onDataChange: (data: any) => void;
	}
	
	let { 
		tab, 
		config, 
		formData, 
		validationErrors, 
		entityId, 
		isEdit, 
		onDataChange 
	}: Props = $props();
	
	let componentInstance = $state<any>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	
	// Carregamento dinâmico de componente
	async function loadComponent() {
		if (!tab.component) return;
		
		// Se é um componente universal baseado em campos, usar UniversalFieldRenderer
		if (tab.fields) {
			componentInstance = null; // Usar renderização inline
			return;
		}
		
		// Se é um componente específico, carregar dinamicamente
		if (COMPONENT_IMPORTS[tab.component]) {
			loading = true;
			error = null;
			
			try {
				const module = await COMPONENT_IMPORTS[tab.component]();
				componentInstance = module.default;
			} catch (err) {
				console.error(`Erro ao carregar componente ${tab.component}:`, err);
				error = `Erro ao carregar aba ${tab.label}`;
			} finally {
				loading = false;
			}
		} else {
			error = `Componente ${tab.component} não encontrado`;
		}
	}
	
	// Carregar componente quando tab muda
	$effect(() => {
		loadComponent();
	});
	
	// Handler para mudanças de dados
	function handleFieldChange(fieldName: string, value: any) {
		onDataChange({ [fieldName]: value });
	}
	
	// Handler para mudanças múltiplas
	function handleMultipleChange(changes: Record<string, any>) {
		onDataChange(changes);
	}
	
	// Renderização de erro
	function renderError() {
		return {
			component: 'div',
			props: {
				class: 'p-8 text-center bg-red-50 border border-red-200 rounded-lg',
				children: [
					{
						component: 'div',
						props: {
							class: 'text-red-600 mb-2',
							children: '⚠️ Erro ao carregar aba'
						}
					},
					{
						component: 'p',
						props: {
							class: 'text-sm text-red-500',
							children: error
						}
					}
				]
			}
		};
	}
	
	// Renderização de loading
	function renderLoading() {
		return {
			component: 'div',
			props: {
				class: 'p-8 text-center',
				children: [
					{
						component: 'div',
						props: {
							class: 'w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4'
						}
					},
					{
						component: 'p',
						props: {
							class: 'text-gray-600',
							children: `Carregando ${tab.label}...`
						}
					}
				]
			}
		};
	}
</script>

<div class="universal-tab-content">
	{#if error}
		<!-- Erro -->
		<div class="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
			<div class="text-red-600 mb-2 text-2xl">⚠️</div>
			<h3 class="text-red-800 font-medium mb-2">Erro ao carregar aba</h3>
			<p class="text-sm text-red-600">{error}</p>
		</div>
	{:else if loading}
		<!-- Loading -->
		<div class="p-8 text-center">
			<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600">Carregando {tab.label}...</p>
		</div>
	{:else if tab.fields}
		<!-- Renderização Universal baseada em campos -->
		<div class="space-y-6">
			{#if tab.description}
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p class="text-sm text-blue-800">{tab.description}</p>
				</div>
			{/if}
			
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{#each tab.fields as field}
						<div class="field-container {field.fullWidth ? 'lg:col-span-2' : ''}">
							<UniversalFieldRenderer
								{field}
								value={formData[field.name]}
								error={validationErrors[field.name]}
								{config}
								{entityId}
								{isEdit}
								onChange={(value) => handleFieldChange(field.name, value)}
							/>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else if componentInstance}
		<!-- Renderização de Componente Específico -->
		<svelte:component 
			this={componentInstance} 
			{formData}
			{entityId}
			{validationErrors}
			on:change={(e) => handleFieldChange(e.detail.field, e.detail.value)}
			on:multipleChange={(e) => handleMultipleChange(e.detail)}
		/>
	{:else}
		<!-- Fallback: Aba vazia ou não configurada -->
		<div class="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg">
			<div class="text-gray-400 mb-2 text-2xl">📄</div>
			<h3 class="text-gray-600 font-medium mb-2">Aba em desenvolvimento</h3>
			<p class="text-sm text-gray-500">
				A aba "{tab.label}" ainda não foi configurada.
				{#if tab.component}
					<br>Componente esperado: <code class="bg-gray-200 px-1 rounded">{tab.component}</code>
				{/if}
			</p>
		</div>
	{/if}
</div>

<style>
	.universal-tab-content {
		animation: fadeIn 0.3s ease-in-out;
	}
	
	@keyframes fadeIn {
		from { 
			opacity: 0; 
			transform: translateY(20px); 
		}
		to { 
			opacity: 1; 
			transform: translateY(0); 
		}
	}
	
	.field-container {
		transition: all 0.2s ease-in-out;
	}
	
	.field-container:hover {
		transform: translateY(-1px);
	}
</style> 