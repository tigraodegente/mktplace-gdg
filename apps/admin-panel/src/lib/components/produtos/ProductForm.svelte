<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/db/client';
	import { toast } from '$lib/stores/toast';
	import TabsForm from '$lib/components/shared/TabsForm.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	
	// Import das tabs
	import BasicTab from './BasicTab.svelte';
	import PricingTab from './PricingTab.svelte';
	import InventoryTab from './InventoryTab.svelte';
	import CategoriesTab from './CategoriesTab.svelte';
	import ImagesTab from './ImagesTab.svelte';
	import SeoTab from './SeoTab.svelte';
	import AdvancedTab from './AdvancedTab.svelte';
	import VariantsTab from './VariantsTab.svelte';

	interface Props {
		productId?: string | null;
		onSave?: (() => Promise<void>) | null;
		onCancel?: (() => void) | null;
	}
	
	let {
		productId = null,
		onSave = null,
		onCancel = null
	}: Props = $props();
	
	// Estados
	let loading = $state(true);
	let saving = $state(false);
	let formData = $state<any>({});
	let originalData = $state<any>({});
	let showConfirmDialog = $state(false);
	let pendingAction = $state<(() => void) | null>(null);

	// Estados da interface
	let activeTab = 'basic';
	let enrichingField = '';
	let aiProcessing = false;

	// Dados externos
	let categories: any[] = [];
	let brands: any[] = [];

	// Lista de abas
	const tabs = [
		{ 
			id: 'basic', 
			name: 'Básico', 
			icon: '📝',
			description: 'Informações fundamentais'
		},
		{ 
			id: 'pricing', 
			name: 'Preços', 
			icon: '💰',
			description: 'Valores e margens'
		},
		{ 
			id: 'inventory', 
			name: 'Estoque', 
			icon: '📦',
			description: 'Inventário e dimensões'
		},
		{ 
			id: 'categories', 
			name: 'Categorias', 
			icon: '📂',
			description: 'Tags e SEO'
		},
		{ 
			id: 'images', 
			name: 'Imagens', 
			icon: '🖼️',
			description: 'Galeria de fotos'
		},
		{ 
			id: 'variants', 
			name: 'Variações', 
			icon: '🎨',
			description: 'Cores, tamanhos, etc'
		},
		{ 
			id: 'seo', 
			name: 'SEO', 
			icon: '🔍',
			description: 'Meta dados e URL'
		},
		{ 
			id: 'advanced', 
			name: 'Avançado', 
			icon: '⚙️',
			description: 'Configurações extras'
		}
	];

	// Funções
	function generateSlug() {
		if (formData.name) {
			formData.slug = formData.name
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[^a-z0-9\s-]/g, '')
				.trim()
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.substring(0, 100);
		}
	}

	function generateSKU() {
		if (formData.name) {
			const words = formData.name.split(' ').slice(0, 3);
			const sku = words.map((word: string) => word.substring(0, 3).toUpperCase()).join('-');
			const timestamp = Date.now().toString().slice(-4);
			formData.sku = `${sku}-${timestamp}`;
		}
	}

	async function enrichName() {
		enrichingField = 'name';
		aiProcessing = true;
		try {
			// Implementar chamada para API de IA
			await new Promise(resolve => setTimeout(resolve, 2000));
			// formData.name = resultado da IA
		} catch (error) {
			console.error('Erro ao enriquecer nome:', error);
		} finally {
			enrichingField = '';
			aiProcessing = false;
		}
	}

	async function enrichDescription() {
		enrichingField = 'description';
		aiProcessing = true;
		try {
			// Implementar chamada para API de IA
			await new Promise(resolve => setTimeout(resolve, 2000));
			// formData.description = resultado da IA
		} catch (error) {
			console.error('Erro ao enriquecer descrição:', error);
		} finally {
			enrichingField = '';
			aiProcessing = false;
		}
	}

	async function loadData() {
		loading = true;
		try {
			// Carregar categorias e marcas
			const [categoriesRes, brandsRes] = await Promise.all([
				fetch('/api/categories'),
				fetch('/api/brands')
			]);
			
			categories = await categoriesRes.json();
			brands = await brandsRes.json();

			// Se editando, carregar dados do produto
			if (productId) {
				const productRes = await fetch(`/api/products/${productId}`);
				const product = await productRes.json();
				formData = { ...formData, ...product };
			}
		} catch (error) {
			console.error('Erro ao carregar dados:', error);
		} finally {
			loading = false;
		}
	}

	async function saveProduct() {
		saving = true;
		try {
			const method = productId ? 'PUT' : 'POST';
			const url = productId ? `/api/products/${productId}` : '/api/products';
			
			// Preparar dados para envio
			const dataToSend = {
				...formData,
				// Garantir que enviamos category_ids ao invés de category_id
				category_ids: formData.category_ids || (formData.category_id ? [formData.category_id] : []),
				primary_category_id: formData.primary_category_id || formData.category_ids?.[0] || formData.category_id
			};
			
			// Remover category_id se estiver presente (campo legado)
			delete dataToSend.category_id;
			
			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(dataToSend)
			});

			if (response.ok) {
				const result = await response.json();
				if (!productId) {
					productId = result.id;
				}
				// Chamar callback se fornecido
				if (onSave) {
					await onSave();
				}
				// Mostrar notificação de sucesso
			} else {
				throw new Error('Erro ao salvar produto');
			}
		} catch (error) {
			console.error('Erro ao salvar:', error);
			// Mostrar notificação de erro
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		if (onCancel) {
			onCancel();
		}
	}

	onMount(() => {
		loadData();
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
	<div class="w-full max-w-none px-2 py-4">
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-slate-900 mb-2">
						{productId ? 'Editar Produto' : 'Novo Produto'}
					</h1>
					<p class="text-slate-600">
						{productId ? 'Atualize as informações do produto' : 'Crie um novo produto para sua loja'}
					</p>
				</div>
				
				<div class="flex gap-3">
					<button
						type="button"
						class="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
						on:click={handleCancel}
					>
						Cancelar
					</button>
					<button
						type="button"
						on:click={saveProduct}
						disabled={saving || !formData.name || !formData.sku}
						class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{/if}
						{saving ? 'Salvando...' : productId ? 'Atualizar' : 'Salvar'}
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
			<div class="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-2 mb-6">
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
					{#each tabs as tab}
						<button
							type="button"
							on:click={() => activeTab = tab.id}
							class="group relative p-3 lg:p-4 rounded-xl transition-all duration-200 {activeTab === tab.id 
								? 'bg-[#00BFB3] text-white shadow-lg' 
								: 'hover:bg-white/50 text-slate-700'}"
						>
							<div class="text-center">
								<div class="text-xl lg:text-2xl mb-1">{tab.icon}</div>
								<div class="text-xs lg:text-sm font-medium">{tab.name}</div>
								<div class="text-xs opacity-75 hidden xl:block mt-1">{tab.description}</div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Conteúdo das Abas -->
			<div class="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl">
				<div class="p-4 lg:p-6">
					{#if activeTab === 'basic'}
						<BasicTab 
							{formData} 
							{categories} 
							{brands} 
							{enrichingField} 
							{aiProcessing}
							{enrichName}
							{generateSKU}
							{enrichDescription}
							{generateSlug}
						/>
					{:else if activeTab === 'pricing'}
						<PricingTab {formData} />
					{:else if activeTab === 'inventory'}
						<InventoryTab {formData} />
					{:else if activeTab === 'categories'}
						<CategoriesTab {formData} />
					{:else if activeTab === 'images'}
						<ImagesTab {formData} />
					{:else if activeTab === 'variants'}
						<VariantsTab {formData} />
					{:else if activeTab === 'seo'}
						<SeoTab {formData} />
					{:else if activeTab === 'advanced'}
						<AdvancedTab {formData} />
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div> 