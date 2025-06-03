<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { writable } from 'svelte/store';
	
	// Interfaces básicas
	interface Product {
		id: string;
		name: string;
		slug: string;
		sku: string;
		price: number;
		originalPrice?: number;
		cost?: number;
		stock: number;
		category: string;
		categorySlug?: string;
		brand?: string;
		vendor: string;
		image: string;
		status: 'active' | 'inactive' | 'out_of_stock' | 'pending' | 'draft';
		rating?: number;
		reviews: number;
		sales: number;
		featured: boolean;
		createdAt: string;
		updatedAt: string;
	}

	interface ProductImage {
		id?: string;
		url: string;
		alt_text?: string;
		position: number;
		is_primary?: boolean;
	}

	interface ProductVariant {
		id?: string;
		sku: string;
		price: number;
		quantity: number;
		attributes: Record<string, string>;
	}

	interface ProductForm {
		// Básico
		name: string;
		sku: string;
		description: string;
		price: number;
		original_price?: number;
		quantity: number;
		is_active: boolean;
		
		// Categorização
		category_id: string;
		brand: string;
		tags: string[];
		
		// SEO
		meta_title: string;
		meta_description: string;
		meta_keywords: string[];
		
		// Relacionamentos
		images: ProductImage[];
		variants: ProductVariant[];
	}

	interface Category {
		id: string;
		name: string;
		slug: string;
	}

	interface Brand {
		id: string;
		name: string;
		slug: string;
	}

	// Estado
	let products: Product[] = [];
	let categories: Category[] = [];
	let brands: Brand[] = [];
	let loading = true;
	let showSlidePanel = false;
	let editingProduct: Product | null = null;
	let searchTerm = '';
	let selectedStatus = 'all';
	let selectedCategory = 'all';
	let selectedBrand = 'all';
	let sortBy = 'created_at';
	let sortOrder = 'desc';
	let currentPage = 1;
	let itemsPerPage = 20;
	let totalPages = 1;
	let saving = false;
	let deleting = false;
	let viewMode = 'grid'; // 'grid' ou 'list'
	let showFilters = false;

	// Controle de abas
	let activeTab = 'basic';
	let formData: ProductForm = {
		name: '',
		sku: '',
		description: '',
		price: 0,
		original_price: undefined,
		quantity: 0,
		is_active: true,
		category_id: '',
		brand: '',
		tags: [],
		meta_title: '',
		meta_description: '',
		meta_keywords: [],
		images: [],
		variants: []
	};

	let stats = {
		total: 0,
		active: 0,
		inactive: 0,
		lowStock: 0
	};

	// Configuração das abas
	const tabs = [
		{ id: 'basic', name: 'Básico', icon: '📝' },
		{ id: 'pricing', name: 'Preços', icon: '💰' },
		{ id: 'inventory', name: 'Estoque', icon: '📦' },
		{ id: 'categories', name: 'Categorias', icon: '📂' },
		{ id: 'images', name: 'Imagens', icon: '🖼️' },
		{ id: 'variants', name: 'Variações', icon: '🎨' },
		{ id: 'seo', name: 'SEO', icon: '🔍' },
		{ id: 'advanced', name: 'Avançado', icon: '⚙️' }
	];

	// Opções de ordenação
	const sortOptions = [
		{ value: 'created_at', label: 'Data de criação', order: 'desc' },
		{ value: 'name', label: 'Nome A-Z', order: 'asc' },
		{ value: 'name', label: 'Nome Z-A', order: 'desc' },
		{ value: 'price', label: 'Menor preço', order: 'asc' },
		{ value: 'price', label: 'Maior preço', order: 'desc' },
		{ value: 'stock', label: 'Maior estoque', order: 'desc' },
		{ value: 'stock', label: 'Menor estoque', order: 'asc' },
		{ value: 'sales', label: 'Mais vendidos', order: 'desc' }
	];

	// Produtos filtrados
	$: filteredProducts = products.filter(product => {
		const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
		
		const matchesStatus = selectedStatus === 'all' || 
							 (selectedStatus === 'active' && product.status === 'active') ||
							 (selectedStatus === 'inactive' && (product.status === 'inactive' || product.status === 'draft')) ||
							 (selectedStatus === 'out_of_stock' && product.status === 'out_of_stock') ||
							 (selectedStatus === 'pending' && product.status === 'pending') ||
							 (selectedStatus === 'low_stock' && product.stock <= 10);
		
		const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
		const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;
		
		return matchesSearch && matchesStatus && matchesCategory && matchesBrand;
	}).sort((a, b) => {
		let aVal, bVal;
		switch (sortBy) {
			case 'name':
				aVal = a.name.toLowerCase();
				bVal = b.name.toLowerCase();
				break;
			case 'price':
				aVal = a.price;
				bVal = b.price;
				break;
			case 'stock':
				aVal = a.stock;
				bVal = b.stock;
				break;
			case 'sales':
				aVal = a.sales;
				bVal = b.sales;
				break;
			default:
				aVal = new Date(a.createdAt).getTime();
				bVal = new Date(b.createdAt).getTime();
		}
		
		if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
		if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
		return 0;
	});

	// Produtos paginados
	$: paginatedProducts = filteredProducts.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	// Atualizar total de páginas
	$: totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

	onMount(() => {
		loadProducts();
		loadCategories();
		loadBrands();
	});

	async function loadProducts() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: itemsPerPage.toString(),
				search: searchTerm,
				status: selectedStatus,
				category: selectedCategory,
				brand: selectedBrand,
				sort: sortBy,
				order: sortOrder
			});

			const response = await fetch(`/api/products?${params}`);
			const result = await response.json();
			
			if (result.success) {
				products = result.data.products;
				stats = {
					total: result.data.stats.total || 0,
					active: result.data.stats.active || 0,
					inactive: (result.data.stats.total || 0) - (result.data.stats.active || 0),
					lowStock: result.data.stats.lowStock || 0
				};
				totalPages = result.data.pagination.totalPages;
			} else {
				console.error('Erro ao carregar produtos:', result.error);
				products = [];
			}
		} catch (error) {
			console.error('Erro ao carregar produtos:', error);
			products = [];
		} finally {
			loading = false;
		}
	}

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
			} else {
				console.error('Erro ao carregar categorias:', result.error);
				categories = [];
			}
		} catch (error) {
			console.error('Erro ao carregar categorias:', error);
			categories = [];
		}
	}

	async function loadBrands() {
		try {
			const response = await fetch('/api/brands?limit=100');
			const result = await response.json();
			
			if (result.success) {
				brands = result.data.brands.map((brand: any) => ({
					id: brand.id,
					name: brand.name,
					slug: brand.slug
				}));
			} else {
				console.error('Erro ao carregar marcas:', result.error);
				brands = [];
			}
		} catch (error) {
			console.error('Erro ao carregar marcas:', error);
			brands = [];
		}
	}

	function openCreatePanel() {
		editingProduct = null;
		activeTab = 'basic';
		resetForm();
		showSlidePanel = true;
	}

	function openEditPanel(product: Product) {
		editingProduct = product;
		activeTab = 'basic';
		loadProductData(product);
		showSlidePanel = true;
	}

	function closePanel() {
		showSlidePanel = false;
		editingProduct = null;
		activeTab = 'basic';
		resetForm();
	}

	function resetForm() {
		formData = {
			name: '',
			sku: '',
			description: '',
			price: 0,
			original_price: undefined,
			quantity: 0,
			is_active: true,
			category_id: '',
			brand: '',
			tags: [],
			meta_title: '',
			meta_description: '',
			meta_keywords: [],
			images: [],
			variants: []
		};
	}

	function loadProductData(product: Product) {
		// Buscar categoria por nome
		const category = categories.find(c => c.name === product.category);
		
		formData = {
			name: product.name,
			sku: product.sku,
			description: '',
			price: product.price,
			original_price: product.originalPrice,
			quantity: product.stock,
			is_active: product.status === 'active',
			category_id: category?.id || '',
			brand: product.brand || '',
			tags: [],
			meta_title: '',
			meta_description: '',
			meta_keywords: [],
			images: product.image ? [{ url: product.image, position: 0, alt_text: product.name }] : [],
			variants: []
		};
	}

	async function saveProduct() {
		if (!formData.name.trim() || !formData.sku.trim()) {
			alert('Nome e SKU são obrigatórios');
			return;
		}

		saving = true;
		try {
			const payload = {
				id: editingProduct?.id,
				name: formData.name,
				sku: formData.sku,
				description: formData.description,
				price: formData.price,
				comparePrice: formData.original_price,
				stock: formData.quantity,
				status: formData.is_active ? 'active' : 'draft',
				categoryId: formData.category_id || null,
				brandId: null, // Implementar busca de marca por nome se necessário
				tags: formData.tags,
				images: formData.images.map(img => img.url).filter(Boolean),
				seo: {
					title: formData.meta_title || formData.name,
					description: formData.meta_description || formData.description,
					keywords: formData.meta_keywords
				}
			};

			const url = editingProduct ? '/api/products' : '/api/products';
			const method = editingProduct ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const result = await response.json();
			
			if (result.success) {
				alert(editingProduct ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
				await loadProducts(); // Recarregar lista
				closePanel();
			} else {
				alert(result.error || 'Erro ao salvar produto');
			}
		} catch (error) {
			console.error('Erro ao salvar produto:', error);
			alert('Erro ao salvar produto');
		} finally {
			saving = false;
		}
	}

	async function deleteProduct(productId: string) {
		if (!confirm('Tem certeza que deseja excluir este produto?')) {
			return;
		}

		deleting = true;
		try {
			const response = await fetch('/api/products', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ ids: [productId] })
			});

			const result = await response.json();
			
			if (result.success) {
				alert('Produto excluído!');
				await loadProducts(); // Recarregar lista
			} else {
				alert(result.error || 'Erro ao excluir produto');
			}
		} catch (error) {
			console.error('Erro ao excluir produto:', error);
			alert('Erro ao excluir produto');
		} finally {
			deleting = false;
		}
	}

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('pt-BR');
	}

	function getStatusLabel(status: string): string {
		const statusMap: Record<string, string> = {
			'active': 'Ativo',
			'inactive': 'Inativo',
			'out_of_stock': 'Sem Estoque',
			'pending': 'Pendente',
			'draft': 'Rascunho'
		};
		return statusMap[status] || status;
	}

	function getStatusClass(status: string): string {
		const classMap: Record<string, string> = {
			'active': 'bg-emerald-100 text-emerald-800',
			'inactive': 'bg-red-100 text-red-800',
			'out_of_stock': 'bg-amber-100 text-amber-800',
			'pending': 'bg-cyan-100 text-cyan-800',
			'draft': 'bg-gray-100 text-gray-800'
		};
		return classMap[status] || 'bg-gray-100 text-gray-800';
	}

	function addTag() {
		const newTag = prompt('Digite a nova tag:');
		if (newTag && newTag.trim() && !formData.tags.includes(newTag.trim())) {
			formData.tags = [...formData.tags, newTag.trim()];
		}
	}

	function removeTag(tagToRemove: string) {
		formData.tags = formData.tags.filter(tag => tag !== tagToRemove);
	}

	function addImage() {
		formData.images = [...formData.images, {
			url: '',
			alt_text: '',
			position: formData.images.length,
			is_primary: formData.images.length === 0
		}];
	}

	function removeImage(index: number) {
		formData.images = formData.images.filter((_, i) => i !== index);
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			loadProducts();
		}
	}

	function clearFilters() {
		searchTerm = '';
		selectedStatus = 'all';
		selectedCategory = 'all';
		selectedBrand = 'all';
		currentPage = 1;
		loadProducts();
	}

	function setSortOption(value: string, order: string) {
		sortBy = value;
		sortOrder = order;
		currentPage = 1;
		loadProducts();
	}

	// Observar mudanças nos filtros para recarregar
	$: {
		if (searchTerm !== undefined || selectedStatus !== undefined || selectedCategory !== undefined || selectedBrand !== undefined) {
			const timeoutId = setTimeout(() => {
				currentPage = 1;
				loadProducts();
			}, 500);
		}
	}
</script>

<!-- Layout principal com design moderno -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
	<!-- Header moderno com cor do logo -->
	<div class="bg-white shadow-lg border-b border-slate-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between py-6 gap-4">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<div class="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
							</svg>
						</div>
						<div>
							<h1 class="text-3xl font-bold text-slate-900">Produtos</h1>
							<p class="text-slate-600 mt-1">Gerencie todo o catálogo da sua loja</p>
						</div>
					</div>
				</div>
				
				<div class="flex items-center gap-3">
					<!-- Botão toggle de visualização -->
					<div class="hidden sm:flex bg-slate-100 rounded-lg p-1">
						<button
							on:click={() => viewMode = 'grid'}
							class="px-3 py-2 rounded-md text-sm font-medium transition-colors {
								viewMode === 'grid' 
								? 'bg-white text-slate-900 shadow-sm' 
								: 'text-slate-600 hover:text-slate-900'
							}"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
							</svg>
						</button>
						<button
							on:click={() => viewMode = 'list'}
							class="px-3 py-2 rounded-md text-sm font-medium transition-colors {
								viewMode === 'list' 
								? 'bg-white text-slate-900 shadow-sm' 
								: 'text-slate-600 hover:text-slate-900'
							}"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
							</svg>
						</button>
					</div>
					
					<!-- Botão novo produto -->
					<button
						on:click={openCreatePanel}
						class="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						<span class="hidden sm:inline">Novo Produto</span>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Container principal -->
	<div class="flex h-[calc(100vh-140px)]">
		<!-- Conteúdo principal com transição -->
		<div class="flex-1 transition-all duration-300 {showSlidePanel ? 'mr-[1000px]' : 'mr-0'}">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full flex flex-col">
				
				<!-- Estatísticas modernas -->
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-4">
							<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
								<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
								</svg>
							</div>
							<div>
								<p class="text-sm font-medium text-slate-600">Total</p>
								<p class="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-4">
							<div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
								<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<p class="text-sm font-medium text-slate-600">Ativos</p>
								<p class="text-2xl font-bold text-slate-900">{stats.active.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-4">
							<div class="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
								<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<p class="text-sm font-medium text-slate-600">Inativos</p>
								<p class="text-2xl font-bold text-slate-900">{stats.inactive.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-4">
							<div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
								<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<div>
								<p class="text-sm font-medium text-slate-600">Estoque Baixo</p>
								<p class="text-2xl font-bold text-slate-900">{stats.lowStock.toLocaleString()}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Filtros e busca avançados -->
				<div class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
					<div class="p-6">
						<!-- Barra de busca principal -->
						<div class="flex flex-col lg:flex-row gap-4 mb-4">
							<div class="flex-1">
								<div class="relative">
									<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<input
										type="text"
										placeholder="Buscar por nome, SKU ou marca..."
										bind:value={searchTerm}
										class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
									/>
									{#if searchTerm}
										<button
											on:click={() => searchTerm = ''}
											class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									{/if}
								</div>
							</div>
							
							<!-- Botão de filtros -->
							<button
								on:click={() => showFilters = !showFilters}
								class="lg:hidden flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
								</svg>
								Filtros
							</button>
						</div>

						<!-- Filtros (sempre visíveis no desktop, toggle no mobile) -->
						<div class="grid grid-cols-1 lg:grid-cols-5 gap-4 {showFilters ? 'block' : 'hidden lg:grid'}">
							<!-- Status -->
							<select
								bind:value={selectedStatus}
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
							>
								<option value="all">Todos os status</option>
								<option value="active">✅ Ativos</option>
								<option value="inactive">❌ Inativos</option>
								<option value="out_of_stock">📦 Sem Estoque</option>
								<option value="pending">⏳ Pendentes</option>
								<option value="low_stock">⚠️ Estoque Baixo</option>
							</select>
							
							<!-- Categoria -->
							<select
								bind:value={selectedCategory}
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
							>
								<option value="all">Todas as categorias</option>
								{#each categories as category}
									<option value={category.name}>{category.name}</option>
								{/each}
							</select>
							
							<!-- Marca -->
							<select
								bind:value={selectedBrand}
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
							>
								<option value="all">Todas as marcas</option>
								{#each brands as brand}
									<option value={brand.name}>{brand.name}</option>
								{/each}
							</select>
							
							<!-- Ordenação -->
							<select
								on:change={(e) => {
									const option = sortOptions.find(opt => `${opt.value}-${opt.order}` === e.target.value);
									if (option) setSortOption(option.value, option.order);
								}}
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
							>
								{#each sortOptions as option}
									<option value="{option.value}-{option.order}" selected={sortBy === option.value && sortOrder === option.order}>
										{option.label}
									</option>
								{/each}
							</select>
							
							<!-- Limpar filtros -->
							<button
								on:click={clearFilters}
								class="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								<span class="hidden sm:inline">Limpar</span>
							</button>
						</div>
					</div>
				</div>

				<!-- Lista/Grid de Produtos -->
				<div class="flex-1 overflow-hidden">
					{#if loading}
						<div class="bg-white rounded-2xl shadow-sm border border-slate-200 h-64 flex items-center justify-center">
							<div class="text-center">
								<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
								<p class="text-slate-600">Carregando produtos...</p>
							</div>
						</div>
					{:else if paginatedProducts.length === 0}
						<div class="bg-white rounded-2xl shadow-sm border border-slate-200 h-64 flex items-center justify-center">
							<div class="text-center">
								<div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
									<svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
									</svg>
								</div>
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Nenhum produto encontrado</h3>
								<p class="text-slate-600 mb-4">
									{searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all' || selectedBrand !== 'all'
										? 'Tente ajustar os filtros ou criar um novo produto'
										: 'Crie seu primeiro produto para começar'
									}
								</p>
								<button
									on:click={openCreatePanel}
									class="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
								>
									Criar Primeiro Produto
								</button>
							</div>
						</div>
					{:else}
						<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
							
							<!-- Grid/Lista responsiva -->
							<div class="flex-1 overflow-auto">
								{#if viewMode === 'grid'}
									<!-- Grid de Cards (mobile-first) -->
									<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-6">
										{#each paginatedProducts as product, i}
											<div 
												class="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-cyan-300"
												in:scale={{ duration: 300, delay: i * 50 }}
											>
												<!-- Imagem do produto -->
												<div class="aspect-square bg-slate-50 relative overflow-hidden">
													<img
														src={product.image}
														alt={product.name}
														class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
														on:error={(e) => {
															e.currentTarget.src = `/api/placeholder/300/300?text=${encodeURIComponent(product.name.charAt(0))}`;
														}}
													/>
													<!-- Badge de status -->
													<div class="absolute top-3 left-3">
														<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusClass(product.status)}">
															{getStatusLabel(product.status)}
														</span>
													</div>
													<!-- Ações rápidas -->
													<div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
														<div class="flex gap-2">
															<button
																on:click={() => openEditPanel(product)}
																class="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center shadow-sm transition-colors"
																title="Editar"
															>
																<svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
																</svg>
															</button>
															<button
																on:click={() => deleteProduct(product.id)}
																class="w-8 h-8 bg-white/90 hover:bg-red-50 rounded-lg flex items-center justify-center shadow-sm transition-colors"
																title="Excluir"
																disabled={deleting}
															>
																<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
																</svg>
															</button>
														</div>
													</div>
												</div>
												
												<!-- Informações do produto -->
												<div class="p-4">
													<div class="mb-2">
														<h3 class="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
														{#if product.brand}
															<p class="text-xs text-slate-500">{product.brand}</p>
														{/if}
													</div>
													
													<div class="flex items-center justify-between text-sm mb-2">
														<span class="font-mono text-slate-600">#{product.sku}</span>
														<span class="text-slate-500">{product.category || 'Sem categoria'}</span>
													</div>
													
													<div class="flex items-end justify-between">
														<div>
															<div class="font-bold text-slate-900">{formatPrice(product.price)}</div>
															{#if product.originalPrice && product.originalPrice > product.price}
																<div class="text-xs text-slate-500 line-through">{formatPrice(product.originalPrice)}</div>
															{/if}
														</div>
														<div class="text-right">
															<div class="text-sm text-slate-900">{product.stock} un.</div>
															{#if product.stock <= 10}
																<div class="text-xs text-amber-600">Baixo</div>
															{/if}
														</div>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<!-- Lista/Tabela (desktop) -->
									<div class="overflow-x-auto">
										<table class="min-w-full divide-y divide-slate-200">
											<thead class="bg-slate-50">
												<tr>
													<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produto</th>
													<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
													<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Preço</th>
													<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estoque</th>
													<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
													<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
													<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
													<th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
												</tr>
											</thead>
											<tbody class="bg-white divide-y divide-slate-200">
												{#each paginatedProducts as product, i}
													<tr 
														class="hover:bg-slate-50 transition-colors"
														in:fly={{ y: 20, duration: 300, delay: i * 50 }}
													>
														<td class="px-6 py-4 whitespace-nowrap">
															<div class="flex items-center gap-3">
																<img
																	src={product.image}
																	alt={product.name}
																	class="w-12 h-12 rounded-lg object-cover"
																	on:error={(e) => {
																		e.currentTarget.src = `/api/placeholder/48/48?text=${encodeURIComponent(product.name.charAt(0))}`;
																	}}
																/>
																<div>
																	<div class="text-sm font-medium text-slate-900">{product.name}</div>
																	{#if product.brand}
																		<div class="text-sm text-slate-500">{product.brand}</div>
																	{/if}
																</div>
															</div>
														</td>
														<td class="px-6 py-4 whitespace-nowrap">
															<span class="text-sm font-mono text-slate-900">{product.sku}</span>
														</td>
														<td class="px-6 py-4 whitespace-nowrap">
															<div>
																<div class="text-sm font-bold text-slate-900">{formatPrice(product.price)}</div>
																{#if product.originalPrice && product.originalPrice > product.price}
																	<div class="text-xs text-slate-500 line-through">{formatPrice(product.originalPrice)}</div>
																{/if}
															</div>
														</td>
														<td class="px-6 py-4 whitespace-nowrap">
															<div>
																<div class="text-sm text-slate-900">{product.stock}</div>
																{#if product.stock <= 10}
																	<div class="text-xs text-amber-600">Estoque baixo</div>
																{/if}
															</div>
														</td>
														<td class="px-6 py-4 whitespace-nowrap">
															<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusClass(product.status)}">
																{getStatusLabel(product.status)}
															</span>
														</td>
														<td class="px-6 py-4 whitespace-nowrap">
															<span class="text-sm text-slate-900">{product.category || 'Sem categoria'}</span>
														</td>
														<td class="px-6 py-4 whitespace-nowrap">
															<span class="text-sm text-slate-500">{formatDate(product.createdAt)}</span>
														</td>
														<td class="px-6 py-4 whitespace-nowrap text-right">
															<div class="flex justify-end gap-2">
																<button
																	on:click={() => openEditPanel(product)}
																	class="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
																	title="Editar"
																>
																	<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
																	</svg>
																</button>
																<button
																	on:click={() => deleteProduct(product.id)}
																	class="p-2 text-slate-400 hover:text-red-600 transition-colors"
																	title="Excluir"
																	disabled={deleting}
																>
																	<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
																	</svg>
																</button>
															</div>
														</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{/if}
							</div>

							<!-- Paginação moderna -->
							{#if totalPages > 1}
								<div class="border-t border-slate-200 bg-slate-50 px-6 py-4">
									<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
										<div class="text-sm text-slate-600">
											Mostrando 
											<span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
											a
											<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span>
											de
											<span class="font-medium">{filteredProducts.length}</span>
											produtos
										</div>
										
										<div class="flex items-center gap-2">
											<button
												on:click={() => goToPage(currentPage - 1)}
												disabled={currentPage === 1}
												class="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												Anterior
											</button>
											
											<div class="flex gap-1">
												{#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
													let page = currentPage - 2 + i;
													if (page < 1) page = i + 1;
													if (page > totalPages) page = totalPages - 4 + i;
													return Math.max(1, Math.min(totalPages, page));
												}) as page}
													<button
														on:click={() => goToPage(page)}
														class="w-10 h-10 text-sm font-medium rounded-lg transition-colors {
															page === currentPage
															? 'bg-cyan-500 text-white shadow-sm'
															: 'text-slate-600 hover:bg-slate-100'
														}"
													>
														{page}
													</button>
												{/each}
											</div>
											
											<button
												on:click={() => goToPage(currentPage + 1)}
												disabled={currentPage === totalPages}
												class="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												Próximo
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Slide Panel Moderno -->
		{#if showSlidePanel}
			<div 
				class="fixed right-0 top-0 h-full w-[1000px] bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col"
				transition:fly={{ x: 1000, duration: 300 }}
			>
				<!-- Header moderno com degradê do logo -->
				<div class="modern-header-gradient text-white p-6 shadow-lg">
					<div class="flex items-center justify-between">
						<div>
							<div class="flex items-center gap-3 mb-2">
								<div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
									<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
									</svg>
								</div>
								<h2 class="text-xl font-bold">
									{editingProduct ? 'Editar Produto' : 'Novo Produto'}
								</h2>
							</div>
							<p class="text-cyan-100 text-sm">
								{editingProduct ? `Editando: ${editingProduct.name}` : 'Criar um novo produto no catálogo'}
							</p>
						</div>
						<button
							on:click={closePanel}
							class="p-3 hover:bg-white/20 rounded-xl transition-colors group"
						>
							<svg class="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<!-- Navegação por Abas moderna -->
					<div class="mt-6 flex space-x-2 bg-white/10 rounded-2xl p-2 overflow-x-auto">
						{#each tabs as tab}
							<button
								on:click={() => activeTab = tab.id}
								class="flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap {
									activeTab === tab.id
									? 'bg-white text-cyan-600 shadow-lg'
									: 'text-cyan-100 hover:bg-white/20'
								}"
							>
								<span class="text-base">{tab.icon}</span>
								<span>{tab.name}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Conteúdo Scrollável -->
				<div class="flex-1 overflow-y-auto p-8">
					{#if activeTab === 'basic'}
						<div class="space-y-6">
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Informações Básicas</h3>
								<p class="text-slate-600">Configure as informações principais do produto</p>
							</div>
							
							<!-- Nome -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Nome do Produto *
								</label>
								<input
									type="text"
									bind:value={formData.name}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
									placeholder="Digite o nome do produto"
								/>
							</div>

							<!-- SKU -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									SKU *
								</label>
								<input
									type="text"
									bind:value={formData.sku}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors font-mono"
									placeholder="Código único do produto"
								/>
							</div>

							<!-- Descrição -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Descrição
								</label>
								<textarea
									bind:value={formData.description}
									rows="4"
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
									placeholder="Descreva o produto detalhadamente"
								></textarea>
							</div>

							<!-- Marca -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Marca
								</label>
								<input
									type="text"
									bind:value={formData.brand}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
									placeholder="Nome da marca"
								/>
							</div>

							<!-- Status -->
							<div class="bg-slate-50 rounded-xl p-4">
								<label class="flex items-center gap-3">
									<input
										type="checkbox"
										bind:checked={formData.is_active}
										class="w-5 h-5 rounded border-slate-300 text-cyan-600 shadow-sm focus:border-cyan-300 focus:ring focus:ring-cyan-200 focus:ring-opacity-50"
									/>
									<div>
										<span class="text-sm font-medium text-slate-900">Produto ativo</span>
										<p class="text-xs text-slate-600">Produto visível na loja</p>
									</div>
								</label>
							</div>
						</div>

					{:else if activeTab === 'pricing'}
						<div class="space-y-6">
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Preços</h3>
								<p class="text-slate-600">Configure os valores de venda do produto</p>
							</div>
							
							<!-- Preço -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Preço de Venda *
								</label>
								<div class="relative">
									<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
									<input
										type="number"
										bind:value={formData.price}
										min="0"
										step="0.01"
										class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
										placeholder="0,00"
									/>
								</div>
							</div>

							<!-- Preço Original -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Preço Original (riscar)
								</label>
								<div class="relative">
									<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
									<input
										type="number"
										bind:value={formData.original_price}
										min="0"
										step="0.01"
										class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
										placeholder="0,00"
									/>
								</div>
								<p class="text-xs text-slate-500 mt-1">Preço original para mostrar desconto</p>
							</div>
						</div>

					{:else if activeTab === 'inventory'}
						<div class="space-y-6">
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Controle de Estoque</h3>
								<p class="text-slate-600">Gerencie a quantidade disponível</p>
							</div>
							
							<!-- Quantidade -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Quantidade em Estoque
								</label>
								<input
									type="number"
									bind:value={formData.quantity}
									min="0"
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
									placeholder="0"
								/>
								{#if formData.quantity <= 10}
									<p class="text-xs text-amber-600 mt-1">⚠️ Estoque baixo - considere reabastecer</p>
								{/if}
							</div>
						</div>

					{:else if activeTab === 'categories'}
						<div class="space-y-6">
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Categorização</h3>
								<p class="text-slate-600">Organize o produto no catálogo</p>
							</div>
							
							<!-- Categoria -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Categoria Principal
								</label>
								<select
									bind:value={formData.category_id}
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
								>
									<option value="">Selecione uma categoria</option>
									{#each categories as category}
										<option value={category.id}>{category.name}</option>
									{/each}
								</select>
							</div>

							<!-- Tags -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Tags
								</label>
								<div class="flex flex-wrap gap-2 mb-3">
									{#each formData.tags as tag}
										<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-cyan-100 text-cyan-800 border border-cyan-200">
											{tag}
											<button
												type="button"
												on:click={() => removeTag(tag)}
												class="ml-2 text-cyan-600 hover:text-cyan-800 transition-colors"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</span>
									{/each}
								</div>
								<button
									type="button"
									on:click={addTag}
									class="text-sm text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
									Adicionar tag
								</button>
							</div>
						</div>

					{:else if activeTab === 'images'}
						<div class="space-y-6">
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Imagens do Produto</h3>
								<p class="text-slate-600">Adicione fotos do produto</p>
							</div>
							
							<div class="space-y-4">
								{#each formData.images as image, index}
									<div class="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
										<div class="flex-1">
											<input
												type="url"
												bind:value={image.url}
												placeholder="URL da imagem"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
											/>
										</div>
										<button
											type="button"
											on:click={() => removeImage(index)}
											class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								{/each}
								
								<button
									type="button"
									on:click={addImage}
									class="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-cyan-500 hover:text-cyan-600 transition-colors flex items-center justify-center gap-2"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
									Adicionar Imagem
								</button>
							</div>
						</div>

					{:else if activeTab === 'seo'}
						<div class="space-y-6">
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Otimização SEO</h3>
								<p class="text-slate-600">Melhore a visibilidade nos buscadores</p>
							</div>
							
							<!-- Título SEO -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Título SEO
								</label>
								<input
									type="text"
									bind:value={formData.meta_title}
									maxlength="60"
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
									placeholder="Título para mecanismos de busca"
								/>
								<div class="flex justify-between text-xs mt-1">
									<span class="text-slate-500">Título para Google, Bing, etc.</span>
									<span class="text-slate-400">{formData.meta_title.length}/60</span>
								</div>
							</div>
							
							<!-- Descrição SEO -->
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">
									Descrição SEO
								</label>
								<textarea
									bind:value={formData.meta_description}
									maxlength="160"
									rows="3"
									class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
									placeholder="Descrição para mecanismos de busca"
								></textarea>
								<div class="flex justify-between text-xs mt-1">
									<span class="text-slate-500">Resumo para resultados de busca</span>
									<span class="text-slate-400">{formData.meta_description.length}/160</span>
								</div>
							</div>
						</div>

					{:else}
						<div class="text-center py-12">
							<div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
								<svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							</div>
							<h3 class="text-lg font-medium text-slate-900 mb-2">
								Aba {activeTab}
							</h3>
							<p class="text-slate-500">
								Funcionalidade em desenvolvimento...
							</p>
						</div>
					{/if}
				</div>

				<!-- Footer fixo -->
				<div class="bg-slate-50 border-t border-slate-200 p-6">
					<div class="flex justify-end gap-3">
						<button
							type="button"
							on:click={closePanel}
							class="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
						>
							Cancelar
						</button>
						<button
							type="button"
							on:click={saveProduct}
							disabled={saving}
							class="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if saving}
								<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Salvando...
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								{editingProduct ? 'Atualizar' : 'Criar'} Produto
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Overlay -->
			<div 
				class="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
				transition:fade={{ duration: 300 }}
				on:click={closePanel}
			></div>
		{/if}
	</div>
</div>

<style>
	/* Animações suaves */
	:global(body) {
		transition: all 0.3s ease;
	}

	/* Degradê moderno com cor do logo */
	.modern-header-gradient {
		background: linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%);
		background-size: 200% 200%;
		animation: gradientFlow 6s ease infinite;
	}

	@keyframes gradientFlow {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	/* Estilo para truncar texto */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Scrollbar personalizada */
	:global(.overflow-auto::-webkit-scrollbar) {
		width: 6px;
		height: 6px;
	}

	:global(.overflow-auto::-webkit-scrollbar-track) {
		background: #f1f5f9;
		border-radius: 3px;
	}

	:global(.overflow-auto::-webkit-scrollbar-thumb) {
		background: #cbd5e1;
		border-radius: 3px;
	}

	:global(.overflow-auto::-webkit-scrollbar-thumb:hover) {
		background: #94a3b8;
	}
</style> 