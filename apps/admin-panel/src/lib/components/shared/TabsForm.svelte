<script lang="ts">
	import { onMount } from 'svelte';

	// Props do componente
	export let title: string = 'Formulário';
	export let subtitle: string = 'Preencha as informações necessárias';
	export let tabs: Array<{
		id: string;
		name: string;
		icon: string;
		description: string;
		component?: any;
	}> = [];
	export let activeTab: string = '';
	export let formData: any = {};
	export let onSave: (data: any) => Promise<void> = async () => {};
	export let onCancel: () => void = () => {};
	export let loading: boolean = false;
	export let saving: boolean = false;
	export let isEditing: boolean = false;
	export let requiredFields: string[] = [];
	export let customSlot: boolean = false;

	// Estados internos
	let activeTabIndex = 0;

	// Inicializar aba ativa
	onMount(() => {
		if (!activeTab && tabs.length > 0) {
			activeTab = tabs[0].id;
		}
		activeTabIndex = tabs.findIndex(tab => tab.id === activeTab);
	});

	// Funções
	function setActiveTab(tabId: string) {
		activeTab = tabId;
		activeTabIndex = tabs.findIndex(tab => tab.id === tabId);
	}

	function goToNextTab() {
		if (activeTabIndex < tabs.length - 1) {
			setActiveTab(tabs[activeTabIndex + 1].id);
		}
	}

	function goToPreviousTab() {
		if (activeTabIndex > 0) {
			setActiveTab(tabs[activeTabIndex - 1].id);
		}
	}

	async function handleSave() {
		try {
			await onSave(formData);
		} catch (error) {
			console.error('Erro ao salvar:', error);
		}
	}

	// Validação simples
	function isFormValid(): boolean {
		return requiredFields.every(field => {
			const value = formData[field];
			return value !== undefined && value !== null && value !== '';
		});
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-slate-900 mb-2">
						{title}
					</h1>
					<p class="text-slate-600">
						{subtitle}
					</p>
				</div>
				
				<div class="flex gap-3">
					<button
						type="button"
						on:click={onCancel}
						class="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
					>
						Cancelar
					</button>
					<button
						type="button"
						on:click={handleSave}
						disabled={saving || !isFormValid()}
						class="px-6 py-3 bg-gradient-to-r from-[#00BFB3] to-teal-500 hover:from-[#00A89D] hover:to-teal-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{/if}
						{saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
					</button>
				</div>
			</div>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p class="text-slate-600">Carregando...</p>
				</div>
			</div>
		{:else}
			<!-- Navegação das Abas -->
			<div class="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-2 mb-8">
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-{Math.min(tabs.length, 8)} gap-2">
					{#each tabs as tab, index}
						<button
							type="button"
							on:click={() => setActiveTab(tab.id)}
							class="group relative p-4 rounded-xl transition-all duration-200 {activeTab === tab.id 
								? 'bg-gradient-to-r from-[#00BFB3] to-teal-500 text-white shadow-lg' 
								: 'hover:bg-white/50 text-slate-700'}"
						>
							<div class="text-center">
								<div class="text-2xl mb-2">{tab.icon}</div>
								<div class="text-sm font-medium">{tab.name}</div>
								<div class="text-xs opacity-75 hidden lg:block">{tab.description}</div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Conteúdo das Abas -->
			<div class="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl">
				<div class="p-8">
					{#if customSlot}
						<slot name="tab-content" {activeTab} {formData} />
					{:else}
						{#each tabs as tab}
							{#if activeTab === tab.id}
								<svelte:component this={tab.component} {formData} />
							{/if}
						{/each}
					{/if}
				</div>

				<!-- Navegação entre abas -->
				<div class="px-8 pb-6 flex justify-between">
					<button
						type="button"
						on:click={goToPreviousTab}
						disabled={activeTabIndex === 0}
						class="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						Anterior
					</button>

					<div class="flex items-center gap-2">
						{#each tabs as tab, index}
							<div class="w-2 h-2 rounded-full {index === activeTabIndex ? 'bg-[#00BFB3]' : 'bg-slate-300'}"></div>
						{/each}
					</div>

					<button
						type="button"
						on:click={goToNextTab}
						disabled={activeTabIndex === tabs.length - 1}
						class="px-6 py-3 bg-gradient-to-r from-[#00BFB3] to-teal-500 hover:from-[#00A89D] hover:to-teal-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						Próximo
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div> 