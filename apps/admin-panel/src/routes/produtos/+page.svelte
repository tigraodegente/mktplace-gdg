<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	
	// Crossfade para transições entre views
	const [send, receive] = crossfade({
		duration: 400,
		fallback(node) {
			return blur(node, { amount: 10, duration: 400 });
		}
	});
	
	// Interfaces
	interface Product {
		id: string;
		name: string;
		price: number;
		originalPrice?: number;
		description?: string;
		stock: number;
		category: string;
		image: string;
		sku: string;
		rating?: number;
		reviews?: number;
		vendor?: string;
		badge?: string;
		discount?: number;
		status: 'active' | 'draft' | 'archived' | 'inactive' | 'pending';
		createdAt: string;
		updatedAt?: string;
		sales: number;
	}
	
	interface Filter {
		search: string;
		status: string;
		category: string;
		minPrice: number;
		maxPrice: number;
	}
	
	interface StatCard {
		title: string;
		value: string | number;
		change?: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
	}
	
	interface ProductFormData {
		name: string;
		slug: string;
		description: string;
		price: number;
		comparePrice?: number;
		cost?: number;
		sku: string;
		barcode?: string;
		stock: number;
		category?: string;
		tags: string[];
		images: string[];
		seo: {
			title: string;
			description: string;
			keywords: string;
		};
		variations: Array<{
			id: string;
			name: string;
			options: string[];
		}>;
		status: 'active' | 'draft' | 'archived';
		featured: boolean;
		weight?: number;
		dimensions?: {
			length: number;
			width: number;
			height: number;
		};
	}
	
	// Estado
	let products = $state<Product[]>([]);
	let filteredProducts = $state<Product[]>([]);
	let loading = $state(true);
	let selectedProducts = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(false);
	let showCreateModal = $state(false);
	let editingProduct = $state<Product | null>(null);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		status: 'all',
		category: 'all',
		minPrice: 0,
		maxPrice: 10000
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	
	// Estatísticas
	let stats = $state({
		total: 0,
		active: 0,
		pending: 0,
		lowStock: 0
	});
	
	// Categorias do banco
	let categories = $state<Array<{id: string, name: string, slug: string}>>([]);
	
	// Formulário
	let formData = $state<ProductFormData>({
		name: '',
		slug: '',
		description: '',
		price: 0,
		comparePrice: undefined,
		cost: undefined,
		sku: '',
		barcode: '',
		stock: 0,
		category: '',
		tags: [],
		images: [],
		seo: {
			title: '',
			description: '',
			keywords: ''
		},
		variations: [],
		status: 'draft',
		featured: false,
		weight: undefined,
		dimensions: {
			length: 0,
			width: 0,
			height: 0
		}
	});
	
	let activeTab = $state<'basic' | 'images' | 'inventory' | 'seo' | 'shipping'>('basic');
	let uploadingImages = $state(false);
	let newTag = $state('');
	let newVariation = $state({ name: '', options: '' });
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...products];
		
		// Busca
		if (filters.search) {
			result = result.filter(p => 
				p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
				p.sku.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Status
		if (filters.status !== 'all') {
			result = result.filter(p => p.status === filters.status);
		}
		
		// Categoria
		if (filters.category !== 'all') {
			result = result.filter(p => p.category === filters.category);
		}
		
		// Preço
		result = result.filter(p => 
			p.price >= filters.minPrice && p.price <= filters.maxPrice
		);
		
		filteredProducts = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		// Atualizar estatísticas
		updateStats(result);
	});
	
	// Funções do formulário
	function openCreateModal() {
		formData = {
			name: '',
			slug: '',
			description: '',
			price: 0,
			comparePrice: undefined,
			cost: undefined,
			sku: '',
			barcode: '',
			stock: 0,
			category: '',
			tags: [],
			images: [],
			seo: {
				title: '',
				description: '',
				keywords: ''
			},
			variations: [],
			status: 'draft',
			featured: false,
			weight: undefined,
			dimensions: {
				length: 0,
				width: 0,
				height: 0
			}
		};
		editingProduct = null;
		activeTab = 'basic';
		showCreateModal = true;
	}
	
	function openEditModal(product: Product) {
		formData = {
			name: product.name,
			slug: product.name.toLowerCase().replace(/\s+/g, '-'),
			description: product.description || '',
			price: product.price,
			comparePrice: product.originalPrice,
			cost: undefined,
			sku: product.sku || '',
			barcode: '',
			stock: product.stock,
			category: product.category,
			tags: [],
			images: [product.image],
			seo: {
				title: product.name,
				description: product.description || '',
				keywords: ''
			},
			variations: [],
			status: product.stock > 0 ? 'active' : 'draft',
			featured: product.badge === 'Destaque',
			weight: undefined,
			dimensions: {
				length: 0,
				width: 0,
				height: 0
			}
		};
		editingProduct = product;
		activeTab = 'basic';
		showCreateModal = true;
	}
	
	function closeModal() {
		showCreateModal = false;
		editingProduct = null;
		activeTab = 'basic';
	}
	
	function generateSlug() {
		if (!formData.name) return;
		formData.slug = formData.name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}
	
	function addTag() {
		if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
			formData.tags = [...formData.tags, newTag.trim()];
			newTag = '';
		}
	}
	
	function removeTag(tag: string) {
		formData.tags = formData.tags.filter(t => t !== tag);
	}
	
	function addVariation() {
		if (newVariation.name.trim() && newVariation.options.trim()) {
			formData.variations = [...formData.variations, {
				id: crypto.randomUUID(),
				name: newVariation.name.trim(),
				options: newVariation.options.split(',').map(o => o.trim()).filter(Boolean)
			}];
			newVariation = { name: '', options: '' };
		}
	}
	
	function removeVariation(id: string) {
		formData.variations = formData.variations.filter(v => v.id !== id);
	}
	
	async function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;
		
		uploadingImages = true;
		// Simular upload
		setTimeout(() => {
			for (const file of input.files!) {
				const url = URL.createObjectURL(file);
				formData.images = [...formData.images, url];
			}
			uploadingImages = false;
		}, 1000);
	}
	
	function removeImage(index: number) {
		formData.images = formData.images.filter((_, i) => i !== index);
	}
	
	function moveImage(index: number, direction: 'up' | 'down') {
		const newImages = [...formData.images];
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		[newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
		formData.images = newImages;
	}
	
	async function saveProduct() {
		// Validações básicas
		if (!formData.name.trim()) {
			alert('Nome do produto é obrigatório');
			return;
		}
		if (!formData.price || formData.price <= 0) {
			alert('Preço deve ser maior que zero');
			return;
		}
		if (!formData.sku.trim()) {
			alert('SKU é obrigatório');
			return;
		}
		
		try {
			const url = editingProduct ? '/api/products' : '/api/products';
			const method = editingProduct ? 'PUT' : 'POST';
			
			const payload = {
				...(editingProduct && { id: editingProduct.id }),
				name: formData.name,
				slug: formData.slug,
				sku: formData.sku,
				description: formData.description,
				price: formData.price,
				comparePrice: formData.comparePrice,
				cost: formData.cost,
				stock: formData.stock,
				categoryId: formData.category,
				tags: formData.tags,
				images: formData.images,
				seo: formData.seo,
				variations: formData.variations,
				status: formData.status,
				featured: formData.featured,
				weight: formData.weight,
				dimensions: formData.dimensions,
				barcode: formData.barcode
			};
			
			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});
			
			const result = await response.json();
			
			if (result.success) {
				alert(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
				closeModal();
				loadProducts();
			} else {
				alert(result.error || 'Erro ao salvar produto');
			}
		} catch (error) {
			console.error('Erro ao salvar produto:', error);
			alert('Erro ao salvar produto');
		}
	}
	
	onMount(() => {
		loadProducts();
		loadCategories();
	});
	
	async function loadCategories() {
		try {
			const response = await fetch('/api/categories?active=true');
			const result = await response.json();
			
			if (result.success) {
				categories = result.data.categories.map((cat: any) => ({
					id: cat.id,
					name: cat.name,
					slug: cat.slug
				}));
			}
		} catch (error) {
			console.error('Erro ao carregar categorias:', error);
		}
	}
	
	async function loadProducts() {
		loading = true;
		
		try {
			// Construir query params
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: itemsPerPage.toString()
			});
			
			if (filters.search) params.append('search', filters.search);
			if (filters.status !== 'all') params.append('status', filters.status);
			if (filters.category !== 'all') params.append('category', filters.category);
			
			// Buscar produtos da API
			const response = await fetch(`/api/products?${params}`);
			const result = await response.json();
			
			if (result.success) {
				products = result.data.products;
				totalPages = result.data.pagination.totalPages;
				
				// Atualizar estatísticas
				stats = result.data.stats;
			} else {
				console.error('Erro ao carregar produtos:', result.error);
				// Mostrar mensagem de erro para o usuário
			}
		} catch (error) {
			console.error('Erro ao carregar produtos:', error);
			// Fallback para lista vazia
			products = [];
		} finally {
			loading = false;
		}
	}
	
	function updateStats(prods: Product[]) {
		stats = {
			total: prods.length,
			active: prods.filter(p => p.status === 'active').length,
			pending: prods.filter(p => p.status === 'pending').length,
			lowStock: prods.filter(p => p.stock < 10).length
		};
	}
	
	function toggleProductSelection(id: string) {
		const newSet = new Set(selectedProducts);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedProducts = newSet;
	}
	
	function toggleAllProducts() {
		if (selectedProducts.size === paginatedProducts.length) {
			selectedProducts = new Set();
		} else {
			selectedProducts = new Set(paginatedProducts.map(p => p.id));
		}
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			active: 'badge-success',
			inactive: 'badge-danger',
			pending: 'badge-warning',
			draft: 'badge-info'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			active: 'Ativo',
			inactive: 'Inativo',
			pending: 'Pendente',
			draft: 'Rascunho'
		};
		return labels[status as keyof typeof labels] || status;
	}
	
	function formatPrice(price: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
	}
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	// Produtos paginados
	const paginatedProducts = $derived(
		filteredProducts.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Ações em lote
	async function bulkUpdateStatus(status: Product['status']) {
		try {
			const ids = Array.from(selectedProducts);
			
			// Por enquanto, fazer uma requisição por produto
			// TODO: Criar endpoint para atualização em lote
			for (const id of ids) {
				await fetch('/api/products', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ id, status })
				});
			}
			
			alert(`${ids.length} produtos atualizados`);
			selectedProducts = new Set();
			loadProducts();
		} catch (error) {
			console.error('Erro ao atualizar produtos:', error);
			alert('Erro ao atualizar produtos');
		}
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedProducts.size} produtos?`)) {
			try {
				const response = await fetch('/api/products', {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ ids: Array.from(selectedProducts) })
				});
				
				const result = await response.json();
				
				if (result.success) {
					alert(result.data.message);
					selectedProducts = new Set();
					loadProducts();
				} else {
					alert(result.error || 'Erro ao excluir produtos');
				}
			} catch (error) {
				console.error('Erro ao excluir produtos:', error);
				alert('Erro ao excluir produtos');
			}
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Todos os Produtos' : 'Meus Produtos'}
			</h1>
			<p class="text-gray-600 mt-1">Gerencie o catálogo de produtos do marketplace</p>
		</div>
		
		<div class="flex items-center gap-3">
			<!-- View Mode -->
			<div class="flex items-center bg-gray-100 rounded-lg p-1">
				<button 
					onclick={() => viewMode = 'list'}
					class="p-2 rounded {viewMode === 'list' ? 'bg-white shadow-sm' : ''} transition-all duration-300 hover:scale-105"
					title="Visualização em lista"
				>
					<svg class="w-5 h-5 transition-transform duration-300 {viewMode === 'list' ? 'scale-110' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<button 
					onclick={() => viewMode = 'grid'}
					class="p-2 rounded {viewMode === 'grid' ? 'bg-white shadow-sm' : ''} transition-all duration-300 hover:scale-105"
					title="Visualização em grade"
				>
					<svg class="w-5 h-5 transition-transform duration-300 {viewMode === 'grid' ? 'scale-110' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
				</button>
			</div>
			
			<!-- Toggle Filters -->
			<button
				onclick={() => showFilters = !showFilters}
				class="btn btn-ghost"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				Filtros
			</button>
			
			<!-- Add Product -->
			<button 
				onclick={() => openCreateModal()}
				class="btn btn-primary"
			>
				➕ Novo Produto
			</button>
		</div>
	</div>
	
	<!-- Stats Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4" in:fly={{ y: 20, duration: 500, delay: 100 }}>
		<div class="stat-card" in:fly={{ y: 30, duration: 500, delay: 200, easing: backOut }}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total de Produtos</p>
					<p class="text-2xl font-bold text-gray-900 transition-all duration-300">{stats.total}</p>
				</div>
				<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
				</div>
			</div>
		</div>
		
		<div class="stat-card" in:fly={{ y: 30, duration: 500, delay: 300, easing: backOut }}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Produtos Ativos</p>
					<p class="text-2xl font-bold text-green-600 transition-all duration-300">{stats.active}</p>
				</div>
				<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>
		
		<div class="stat-card" in:fly={{ y: 30, duration: 500, delay: 400, easing: backOut }}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Aprovação Pendente</p>
					<p class="text-2xl font-bold text-yellow-600 transition-all duration-300">{stats.pending}</p>
				</div>
				<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110">
					<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>

		<div class="stat-card" in:fly={{ y: 30, duration: 500, delay: 500, easing: backOut }}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Estoque Baixo</p>
					<p class="text-2xl font-bold text-red-600 transition-all duration-300">{stats.lowStock}</p>
				</div>
				<div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110">
					<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Filters -->
	{#if showFilters}
		<div class="card" transition:slide={{ duration: 300 }}>
			<div class="card-body">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
					<!-- Search -->
					<div class="lg:col-span-2">
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="Nome ou SKU..."
							class="input"
						/>
					</div>
					
					<!-- Status -->
					<div>
						<label class="label">Status</label>
						<select bind:value={filters.status} class="input">
							<option value="all">Todos</option>
							<option value="active">Ativo</option>
							<option value="inactive">Inativo</option>
							<option value="pending">Pendente</option>
							<option value="draft">Rascunho</option>
						</select>
					</div>
					
					<!-- Category -->
					<div>
						<label class="label">Categoria</label>
						<select bind:value={filters.category} class="input">
							<option value="all">Todas</option>
							{#each categories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>
					
					<!-- Price Range -->
					<div>
						<label class="label">Preço</label>
						<div class="flex items-center gap-2">
							<input
								type="number"
								bind:value={filters.minPrice}
								placeholder="Min"
								class="input"
							/>
							<span class="text-gray-500">-</span>
							<input
								type="number"
								bind:value={filters.maxPrice}
								placeholder="Max"
								class="input"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Actions -->
	{#if selectedProducts.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedProducts.size} {selectedProducts.size === 1 ? 'produto selecionado' : 'produtos selecionados'}
					</p>
					<div class="flex items-center gap-2">
						<button 
							onclick={() => bulkUpdateStatus('active')}
							class="btn btn-sm btn-ghost text-green-600"
						>
							Ativar
						</button>
						<button 
							onclick={() => bulkUpdateStatus('inactive')}
							class="btn btn-sm btn-ghost text-yellow-600"
						>
							Desativar
						</button>
						<button 
							onclick={bulkDelete}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Excluir
						</button>
						<button 
							onclick={() => selectedProducts = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Products Table/Grid -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando produtos...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if viewMode === 'list'}
		<!-- List View -->
		<div class="card overflow-hidden">
			<div class="overflow-x-auto">
				<table class="table-modern">
					<thead>
						<tr>
							<th class="w-12">
								<input
									type="checkbox"
									checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
									onchange={toggleAllProducts}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
							<th>Produto</th>
							<th>SKU</th>
							<th>Preço</th>
							<th>Estoque</th>
							<th>Status</th>
							{#if userRole === 'admin'}
								<th>Vendedor</th>
							{/if}
							<th>Vendas</th>
							<th>Avaliação</th>
							<th class="text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedProducts as product, i}
							<tr 
								class="hover:bg-gray-50 transition-colors"
								in:fly={{ x: -20, duration: 400, delay: i * 50 }}
							>
								<td>
									<input
										type="checkbox"
										checked={selectedProducts.has(product.id)}
										onchange={() => toggleProductSelection(product.id)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<img
											src={product.image}
											alt={product.name}
											class="w-10 h-10 rounded-lg object-cover"
										/>
										<div>
											<p class="font-medium text-gray-900">{product.name}</p>
											<p class="text-sm text-gray-500">{product.category}</p>
										</div>
									</div>
								</td>
								<td class="text-gray-600">{product.sku}</td>
								<td class="font-medium">{formatPrice(product.price)}</td>
								<td>
									<span class:text-red-600={product.stock < 10} class:font-semibold={product.stock < 10}>
										{product.stock}
									</span>
								</td>
								<td>
									<span class="badge {getStatusBadge(product.status)}">
										{getStatusLabel(product.status)}
									</span>
								</td>
								{#if userRole === 'admin'}
									<td class="text-gray-600">{product.vendor}</td>
								{/if}
								<td class="text-gray-600">{product.sales}</td>
								<td>
									<div class="flex items-center gap-1">
										<span class="text-yellow-500">⭐</span>
										<span class="text-sm font-medium">{product.rating}</span>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
									<div class="flex items-center justify-end gap-2">
										<button
											onclick={() => openEditModal(product)}
											class="text-indigo-600 hover:text-indigo-900 transition-colors"
										>
											✏️ Editar
										</button>
										<button class="text-red-600 hover:text-red-900 transition-colors">
											🗑️ Excluir
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Grid View -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each paginatedProducts as product, i (product.id)}
				<div 
					class="card group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
					in:scale={{ duration: 400, delay: i * 50, easing: elasticOut, start: 0.8 }}
					out:fade={{ duration: 200 }}
				>
					<div class="relative overflow-hidden">
						<img
							src={product.image}
							alt={product.name}
							class="w-full h-48 object-cover group-hover:scale-125 transition-transform duration-700"
						/>
						<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
						<div class="absolute top-2 right-2" in:fly={{ x: 20, duration: 300, delay: 100 + i * 50 }}>
							<span class="badge {getStatusBadge(product.status)} transform transition-transform duration-300 group-hover:scale-110">
								{getStatusLabel(product.status)}
							</span>
						</div>
						{#if product.stock < 10}
							<div class="absolute top-2 left-2" in:fly={{ x: -20, duration: 300, delay: 100 + i * 50 }}>
								<span class="badge badge-danger animate-pulse">
									Estoque Baixo
								</span>
							</div>
						{/if}
					</div>
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 line-clamp-2 group-hover:text-cyan-600 transition-colors duration-300">{product.name}</h3>
						<p class="text-sm text-gray-500 transition-all duration-300 group-hover:text-gray-700">{product.category}</p>
						<div class="flex items-center justify-between mt-2">
							<p class="text-xl font-bold text-gray-900 transition-transform duration-300 group-hover:scale-110">{formatPrice(product.price)}</p>
							<div class="flex items-center gap-1 transition-transform duration-300 group-hover:scale-110">
								<span class="text-yellow-500">⭐</span>
								<span class="text-sm font-medium">{product.rating}</span>
							</div>
						</div>
						<div class="flex items-center justify-between mt-4 text-sm text-gray-600">
							<span class="transition-opacity duration-300 group-hover:opacity-70">Estoque: {product.stock}</span>
							<span class="transition-opacity duration-300 group-hover:opacity-70">Vendas: {product.sales}</span>
						</div>
					</div>
					<div class="card-footer flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
						<button class="btn btn-sm btn-ghost flex-1 hover:scale-105 transition-transform duration-200">
							Editar
						</button>
						<button class="btn btn-sm btn-primary flex-1 hover:scale-105 transition-transform duration-200">
							Detalhes
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-gray-600">
				Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length} produtos
			</p>
			<div class="flex items-center gap-2">
				<button
					onclick={() => currentPage = Math.max(1, currentPage - 1)}
					disabled={currentPage === 1}
					class="btn btn-ghost btn-sm"
				>
					Anterior
				</button>
				{#each Array(totalPages) as _, i}
					{#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
						<button
							onclick={() => currentPage = i + 1}
							class="btn btn-sm {currentPage === i + 1 ? 'btn-primary' : 'btn-ghost'}"
						>
							{i + 1}
						</button>
					{:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
						<span class="text-gray-400">...</span>
					{/if}
				{/each}
				<button
					onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
					disabled={currentPage === totalPages}
					class="btn btn-ghost btn-sm"
				>
					Próximo
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- Modal de Criar/Editar Produto -->
{#if showCreateModal}
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		onclick={closeModal}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
			transition:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold flex items-center gap-3">
						📦 {editingProduct ? 'Editar' : 'Novo'} Produto
					</h2>
					<button 
						onclick={closeModal}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						✕
					</button>
				</div>
			</div>
			
			<!-- Tabs -->
			<div class="border-b border-gray-200">
				<div class="flex">
					{#each [
						{ id: 'basic', label: 'Informações Básicas', icon: '📋' },
						{ id: 'images', label: 'Imagens', icon: '🖼️' },
						{ id: 'inventory', label: 'Estoque', icon: '📦' },
						{ id: 'seo', label: 'SEO', icon: '🔍' },
						{ id: 'shipping', label: 'Frete', icon: '🚚' }
					] as tab}
						<button
							onclick={() => activeTab = tab.id as typeof activeTab}
							class="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 {
								activeTab === tab.id 
									? 'text-cyan-600 border-cyan-500 bg-cyan-50' 
									: 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
							}"
						>
							<span class="mr-2">{tab.icon}</span>
							{tab.label}
						</button>
					{/each}
				</div>
			</div>
			
			<!-- Content -->
			<div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
				{#if activeTab === 'basic'}
					<div class="space-y-6">
						<!-- Nome e Slug -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Nome do Produto *
								</label>
								<input
									type="text"
									bind:value={formData.name}
									onblur={generateSlug}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="Ex: Notebook Dell Inspiron"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Slug (URL)
								</label>
								<input
									type="text"
									bind:value={formData.slug}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="notebook-dell-inspiron"
								/>
							</div>
						</div>
						
						<!-- Descrição -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Descrição
							</label>
							<textarea
								bind:value={formData.description}
								rows="4"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Descreva o produto em detalhes..."
							></textarea>
						</div>
						
						<!-- Preços -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Preço de Venda *
								</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
									<input
										type="number"
										bind:value={formData.price}
										step="0.01"
										min="0"
										class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="0,00"
									/>
								</div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Preço Comparativo
								</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
									<input
										type="number"
										bind:value={formData.comparePrice}
										step="0.01"
										min="0"
										class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="0,00"
									/>
								</div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Custo
								</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
									<input
										type="number"
										bind:value={formData.cost}
										step="0.01"
										min="0"
										class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="0,00"
									/>
								</div>
							</div>
						</div>
						
						<!-- Categoria e Status -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Categoria
								</label>
								<select
									bind:value={formData.category}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								>
									<option value="">Selecione uma categoria</option>
									{#each categories as cat}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Status
								</label>
								<select
									bind:value={formData.status}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								>
									<option value="draft">Rascunho</option>
									<option value="active">Ativo</option>
									<option value="inactive">Inativo</option>
									<option value="pending">Pendente</option>
									<option value="archived">Arquivado</option>
								</select>
							</div>
						</div>
						
						<!-- Tags -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Tags
							</label>
							<input
								type="text"
								bind:value={newTag}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Digite uma nova tag"
							/>
							<button
								onclick={addTag}
								class="btn btn-sm btn-ghost text-cyan-600"
							>
								➕ Adicionar Tag
							</button>
						</div>
						
						<!-- Variations -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Variations
							</label>
							<input
								type="text"
								bind:value={newVariation.name}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Nome da Variation"
							/>
							<input
								type="text"
								bind:value={newVariation.options}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Opções da Variation"
							/>
							<button
								onclick={addVariation}
								class="btn btn-sm btn-ghost text-cyan-600"
							>
								➕ Adicionar Variation
							</button>
						</div>
						
						<!-- Imagens -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Imagens
							</label>
							<input
								type="file"
								multiple
								onchange={handleImageUpload}
								class="file-input file-input-bordered file-input-primary w-full"
							/>
							<div class="mt-4">
								{#each formData.images as image, index}
									<div class="flex items-center gap-2">
										<img
											src={image}
											alt={formData.name}
											class="w-20 h-20 rounded-lg object-cover"
										/>
										<button
											onclick={() => removeImage(index)}
											class="btn btn-sm btn-ghost text-red-600"
										>
											🗑️ Remover
										</button>
									</div>
								{/each}
							</div>
						</div>
						
						<!-- SEO -->
						<div class="space-y-4">
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Título
							</label>
							<input
								type="text"
								bind:value={formData.seo.title}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Título do produto"
							/>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Descrição
							</label>
							<textarea
								bind:value={formData.seo.description}
								rows="4"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Descrição do produto"
							></textarea>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Palavras-chave
							</label>
							<input
								type="text"
								bind:value={formData.seo.keywords}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Palavras-chave do produto"
							/>
						</div>
						
						<!-- Peso e Dimensões -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Peso
								</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Kg</span>
									<input
										type="number"
										bind:value={formData.weight}
										step="0.01"
										min="0"
										class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="0,00"
									/>
								</div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Dimensões
								</label>
								<div class="flex items-center gap-2">
									<input
										type="number"
										value={formData.dimensions?.length || 0}
										oninput={(e) => {
											if (!formData.dimensions) formData.dimensions = { length: 0, width: 0, height: 0 };
											formData.dimensions.length = Number((e.target as HTMLInputElement).value);
										}}
										step="0.01"
										min="0"
										class="w-16 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="Comprimento"
									/>
									<input
										type="number"
										value={formData.dimensions?.width || 0}
										oninput={(e) => {
											if (!formData.dimensions) formData.dimensions = { length: 0, width: 0, height: 0 };
											formData.dimensions.width = Number((e.target as HTMLInputElement).value);
										}}
										step="0.01"
										min="0"
										class="w-16 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="Largura"
									/>
									<input
										type="number"
										value={formData.dimensions?.height || 0}
										oninput={(e) => {
											if (!formData.dimensions) formData.dimensions = { length: 0, width: 0, height: 0 };
											formData.dimensions.height = Number((e.target as HTMLInputElement).value);
										}}
										step="0.01"
										min="0"
										class="w-16 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
										placeholder="Altura"
									/>
								</div>
							</div>
						</div>
					</div>
				{:else if activeTab === 'images'}
					<div class="space-y-4">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Imagens
						</label>
						<input
							type="file"
							multiple
							onchange={handleImageUpload}
							class="file-input file-input-bordered file-input-primary w-full"
						/>
						<div class="mt-4">
							{#each formData.images as image, index}
								<div class="flex items-center gap-2">
									<img
										src={image}
										alt={formData.name}
										class="w-20 h-20 rounded-lg object-cover"
									/>
									<button
										onclick={() => removeImage(index)}
										class="btn btn-sm btn-ghost text-red-600"
									>
										🗑️ Remover
									</button>
								</div>
							{/each}
						</div>
					</div>
				{:else if activeTab === 'inventory'}
					<div class="space-y-4">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Estoque
						</label>
						<input
							type="number"
							bind:value={formData.stock}
							step="1"
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							placeholder="Quantidade em estoque"
						/>
					</div>
				{:else if activeTab === 'seo'}
					<div class="space-y-4">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Título
						</label>
						<input
							type="text"
							bind:value={formData.seo.title}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							placeholder="Título do produto"
						/>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Descrição
						</label>
						<textarea
							bind:value={formData.seo.description}
							rows="4"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							placeholder="Descrição do produto"
						></textarea>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Palavras-chave
						</label>
						<input
							type="text"
							bind:value={formData.seo.keywords}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							placeholder="Palavras-chave do produto"
						/>
					</div>
				{:else if activeTab === 'shipping'}
					<div class="space-y-4">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Informações de Frete
						</label>
						<p class="text-sm text-gray-500">
							As informações de frete são calculadas automaticamente com base no peso e dimensões do produto.
						</p>
						{#if formData.weight}
							<p class="text-sm">Peso: {formData.weight} kg</p>
						{/if}
						{#if formData.dimensions}
							<p class="text-sm">
								Dimensões: {formData.dimensions.length} x {formData.dimensions.width} x {formData.dimensions.height} cm
							</p>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Footer -->
			<div class="bg-gray-100 p-6">
				<div class="flex items-center justify-between">
					<button 
						onclick={saveProduct}
						class="btn btn-primary"
					>
						Salvar
					</button>
					<button 
						onclick={closeModal}
						class="btn btn-ghost"
					>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Animação para hover nas imagens */
	img {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Melhora na tabela */
	:global(.table-modern tbody tr) {
		position: relative;
		overflow: hidden;
	}
	
	:global(.table-modern tbody tr::before) {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: #00BFB3;
		transform: translateX(-100%);
		transition: transform 0.3s ease;
	}
	
	:global(.table-modern tbody tr:hover::before) {
		transform: translateX(0);
	}
</style> 