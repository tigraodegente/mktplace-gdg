<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	
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
	let currentPage = 1;
	let itemsPerPage = 20;
	let totalPages = 1;
	let saving = false;
	let deleting = false;

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

	// Produtos filtrados
	$: filteredProducts = products.filter(product => {
		const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 product.sku.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = selectedStatus === 'all' || 
							 (selectedStatus === 'active' && product.status === 'active') ||
							 (selectedStatus === 'inactive' && (product.status === 'inactive' || product.status === 'draft')) ||
							 (selectedStatus === 'out_of_stock' && product.status === 'out_of_stock') ||
							 (selectedStatus === 'pending' && product.status === 'pending');
		return matchesSearch && matchesStatus;
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
				status: selectedStatus
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
			'active': 'bg-green-100 text-green-800',
			'inactive': 'bg-red-100 text-red-800',
			'out_of_stock': 'bg-yellow-100 text-yellow-800',
			'pending': 'bg-blue-100 text-blue-800',
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

	// Observar mudanças nos filtros para recarregar
	$: {
		if (searchTerm !== undefined || selectedStatus !== undefined) {
			const timeoutId = setTimeout(() => {
				currentPage = 1;
				loadProducts();
			}, 500);
		}
	}
</script>

<!-- Estrutura principal -->
<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Produtos</h1>
					<p class="mt-1 text-sm text-gray-500">Gerencie todos os produtos da loja</p>
				</div>
				<button
					on:click={openCreatePanel}
					class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
				>
					+ Novo Produto
				</button>
			</div>
		</div>
	</div>

	<!-- Container principal com slide panel -->
	<div class="flex h-screen pt-0">
		<!-- Conteúdo principal -->
		<div class="flex-1 transition-all duration-300 {showSlidePanel ? 'mr-[1000px]' : 'mr-0'}">
			<!-- Estatísticas -->
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
					<div class="bg-white p-6 rounded-lg shadow-sm">
						<div class="flex items-center">
							<div class="text-3xl text-blue-600">📦</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Total</p>
								<p class="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white p-6 rounded-lg shadow-sm">
						<div class="flex items-center">
							<div class="text-3xl text-green-600">✅</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Ativos</p>
								<p class="text-2xl font-bold text-gray-900">{stats.active.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white p-6 rounded-lg shadow-sm">
						<div class="flex items-center">
							<div class="text-3xl text-red-600">❌</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Inativos</p>
								<p class="text-2xl font-bold text-gray-900">{stats.inactive.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white p-6 rounded-lg shadow-sm">
						<div class="flex items-center">
							<div class="text-3xl text-yellow-600">⚠️</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Estoque Baixo</p>
								<p class="text-2xl font-bold text-gray-900">{stats.lowStock.toLocaleString()}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Filtros -->
				<div class="bg-white p-6 rounded-lg shadow-sm mb-6">
					<div class="flex flex-col sm:flex-row gap-4">
						<div class="flex-1">
							<input
								type="text"
								placeholder="Buscar produtos por nome ou SKU..."
								bind:value={searchTerm}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
							/>
						</div>
						
						<div class="sm:w-48">
							<select
								bind:value={selectedStatus}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
							>
								<option value="all">Todos os status</option>
								<option value="active">Ativos</option>
								<option value="inactive">Inativos</option>
								<option value="out_of_stock">Sem Estoque</option>
								<option value="pending">Pendentes</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Tabela de Produtos -->
				<div class="bg-white rounded-lg shadow-sm overflow-hidden">
					{#if loading}
						<div class="p-8 text-center">
							<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
							<p class="mt-2 text-gray-500">Carregando produtos...</p>
						</div>
					{:else if paginatedProducts.length === 0}
						<div class="p-8 text-center">
							<div class="text-6xl mb-4">📦</div>
							<p class="text-xl text-gray-500 mb-2">Nenhum produto encontrado</p>
							<p class="text-gray-400">
								{searchTerm || selectedStatus !== 'all' 
									? 'Tente ajustar os filtros ou criar um novo produto'
									: 'Crie seu primeiro produto para começar'
								}
							</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Produto
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											SKU
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Preço
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Estoque
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Categoria
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Data
										</th>
										<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Ações
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each paginatedProducts as product, i}
										<tr 
											class="hover:bg-gray-50 transition-colors"
											in:fly={{ y: 20, duration: 300, delay: i * 50 }}
										>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center">
													<img 
														src={product.image} 
														alt={product.name}
														class="h-10 w-10 rounded-md object-cover mr-3"
														on:error={(e) => {
															e.currentTarget.src = `/api/placeholder/40/40?text=${encodeURIComponent(product.name.charAt(0))}`;
														}}
													/>
													<div>
														<div class="text-sm font-medium text-gray-900">{product.name}</div>
														{#if product.brand}
															<div class="text-sm text-gray-500">{product.brand}</div>
														{/if}
													</div>
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-gray-900 font-mono">{product.sku}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm font-bold text-gray-900">{formatPrice(product.price)}</div>
												{#if product.originalPrice && product.originalPrice > product.price}
													<div class="text-xs text-gray-500 line-through">{formatPrice(product.originalPrice)}</div>
												{/if}
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-gray-900">{product.stock}</div>
												{#if product.stock <= 10}
													<div class="text-xs text-red-500">Estoque baixo</div>
												{/if}
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusClass(product.status)}">
													{getStatusLabel(product.status)}
												</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-gray-900">{product.category || 'Sem categoria'}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-gray-500">{formatDate(product.createdAt)}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
												<div class="flex justify-end space-x-2">
													<button
														on:click={() => openEditPanel(product)}
														class="text-blue-600 hover:text-blue-900 transition-colors"
														title="Editar"
													>
														✏️
													</button>
													<button
														on:click={() => deleteProduct(product.id)}
														class="text-red-600 hover:text-red-900 transition-colors"
														title="Excluir"
														disabled={deleting}
													>
														🗑️
													</button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<!-- Paginação -->
						{#if totalPages > 1}
							<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
								<div class="flex-1 flex justify-between sm:hidden">
									<button
										on:click={() => goToPage(currentPage - 1)}
										disabled={currentPage === 1}
										class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
									>
										Anterior
									</button>
									<button
										on:click={() => goToPage(currentPage + 1)}
										disabled={currentPage === totalPages}
										class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
									>
										Próximo
									</button>
								</div>
								<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
									<div>
										<p class="text-sm text-gray-700">
											Mostrando 
											<span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
											a
											<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span>
											de
											<span class="font-medium">{filteredProducts.length}</span>
											resultados
										</p>
									</div>
									<div>
										<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
											<button
												on:click={() => goToPage(currentPage - 1)}
												disabled={currentPage === 1}
												class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
											>
												←
											</button>
											
											{#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
												let page = currentPage - 2 + i;
												if (page < 1) page = i + 1;
												if (page > totalPages) page = totalPages - 4 + i;
												return Math.max(1, Math.min(totalPages, page));
											}) as page}
												<button
													on:click={() => goToPage(page)}
													class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {
														page === currentPage
														? 'z-10 bg-green-50 border-green-500 text-green-600'
														: 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
													}"
												>
													{page}
												</button>
											{/each}
											
											<button
												on:click={() => goToPage(currentPage + 1)}
												disabled={currentPage === totalPages}
												class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
											>
												→
											</button>
										</nav>
									</div>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>

		<!-- Slide Panel -->
		{#if showSlidePanel}
			<div 
				class="fixed right-0 top-0 h-full w-[1000px] bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col"
				transition:fly={{ x: 1000, duration: 300 }}
			>
				<!-- Header do Panel (mantendo o degradê verde) -->
				<div class="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 shadow-lg">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-xl font-bold">
								{editingProduct ? 'Editar Produto' : 'Novo Produto'}
							</h2>
							<p class="text-green-100 mt-1">
								{editingProduct ? `Editando: ${editingProduct.name}` : 'Criar um novo produto'}
							</p>
						</div>
						<button
							on:click={closePanel}
							class="p-2 hover:bg-white/20 rounded-lg transition-colors"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<!-- Navegação por Abas -->
					<div class="mt-6 flex space-x-1 bg-white/10 rounded-lg p-1 overflow-x-auto">
						{#each tabs as tab}
							<button
								on:click={() => activeTab = tab.id}
								class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap {
									activeTab === tab.id
									? 'bg-white text-green-600 shadow'
									: 'text-green-100 hover:bg-white/20'
								}"
							>
								<span>{tab.icon}</span>
								<span>{tab.name}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Conteúdo Scrollável -->
				<div class="flex-1 overflow-y-auto p-8">
					{#if activeTab === 'basic'}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
							
							<!-- Nome -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Nome do Produto *
								</label>
								<input
									type="text"
									bind:value={formData.name}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Digite o nome do produto"
								/>
							</div>

							<!-- SKU -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									SKU *
								</label>
								<input
									type="text"
									bind:value={formData.sku}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Código único do produto"
								/>
							</div>

							<!-- Descrição -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Descrição
								</label>
								<textarea
									bind:value={formData.description}
									rows="4"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Descreva o produto"
								></textarea>
							</div>

							<!-- Marca -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Marca
								</label>
								<input
									type="text"
									bind:value={formData.brand}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Nome da marca"
								/>
							</div>

							<!-- Status -->
							<div>
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={formData.is_active}
										class="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
									/>
									<span class="ml-2 text-sm text-gray-700">Produto ativo</span>
								</label>
							</div>
						</div>

					{:else if activeTab === 'pricing'}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Preços</h3>
							
							<!-- Preço -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Preço de Venda *
								</label>
								<input
									type="number"
									bind:value={formData.price}
									min="0"
									step="0.01"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="0,00"
								/>
							</div>

							<!-- Preço Original -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Preço Original (riscar)
								</label>
								<input
									type="number"
									bind:value={formData.original_price}
									min="0"
									step="0.01"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="0,00"
								/>
							</div>
						</div>

					{:else if activeTab === 'inventory'}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Controle de Estoque</h3>
							
							<!-- Quantidade -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Quantidade em Estoque
								</label>
								<input
									type="number"
									bind:value={formData.quantity}
									min="0"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="0"
								/>
							</div>
						</div>

					{:else if activeTab === 'categories'}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Categorização</h3>
							
							<!-- Categoria -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Categoria Principal
								</label>
								<select
									bind:value={formData.category_id}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
								>
									<option value="">Selecione uma categoria</option>
									{#each categories as category}
										<option value={category.id}>{category.name}</option>
									{/each}
								</select>
							</div>

							<!-- Tags -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Tags
								</label>
								<div class="flex flex-wrap gap-2 mb-2">
									{#each formData.tags as tag}
										<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
											{tag}
											<button
												type="button"
												on:click={() => removeTag(tag)}
												class="ml-2 text-green-600 hover:text-green-800"
											>
												×
											</button>
										</span>
									{/each}
								</div>
								<button
									type="button"
									on:click={addTag}
									class="text-sm text-green-600 hover:text-green-800"
								>
									+ Adicionar tag
								</button>
							</div>
						</div>

					{:else if activeTab === 'images'}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Imagens do Produto</h3>
							
							<div class="space-y-4">
								{#each formData.images as image, index}
									<div class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
										<div class="flex-1">
											<input
												type="url"
												bind:value={image.url}
												placeholder="URL da imagem"
												class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
											/>
										</div>
										<button
											type="button"
											on:click={() => removeImage(index)}
											class="text-red-600 hover:text-red-800"
										>
											🗑️
										</button>
									</div>
								{/each}
								
								<button
									type="button"
									on:click={addImage}
									class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors"
								>
									+ Adicionar Imagem
								</button>
							</div>
						</div>

					{:else if activeTab === 'seo'}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Otimização SEO</h3>
							
							<!-- Título SEO -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Título SEO
								</label>
								<input
									type="text"
									bind:value={formData.meta_title}
									maxlength="60"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Título para mecanismos de busca"
								/>
								<p class="text-xs text-gray-500 mt-1">
									{formData.meta_title.length}/60 caracteres
								</p>
							</div>
							
							<!-- Descrição SEO -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Descrição SEO
								</label>
								<textarea
									bind:value={formData.meta_description}
									maxlength="160"
									rows="3"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Descrição para mecanismos de busca"
								></textarea>
								<p class="text-xs text-gray-500 mt-1">
									{formData.meta_description.length}/160 caracteres
								</p>
							</div>
						</div>

					{:else}
						<div class="text-center py-12">
							<h3 class="text-lg font-medium text-gray-900 mb-2">
								Aba {activeTab}
							</h3>
							<p class="text-gray-500">
								Conteúdo em desenvolvimento...
							</p>
						</div>
					{/if}
				</div>

				<!-- Footer fixo -->
				<div class="bg-gray-50 border-t border-gray-200 p-6">
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							on:click={closePanel}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancelar
						</button>
						<button
							type="button"
							on:click={saveProduct}
							disabled={saving}
							class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if saving}
								Salvando...
							{:else}
								{editingProduct ? 'Atualizar' : 'Criar'} Produto
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Overlay -->
			<div 
				class="fixed inset-0 bg-black bg-opacity-50 z-40"
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
</style> 