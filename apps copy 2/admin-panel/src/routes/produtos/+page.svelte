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
		slug?: string;
		description: string;
		short_description?: string;
		price: number;
		original_price?: number;
		cost?: number;
		currency?: string;
		quantity: number;
		is_active: boolean;
		status?: string;
		condition?: 'new' | 'used' | 'refurbished';
		model?: string;
		barcode?: string;
		featured?: boolean;
		published_at?: string;
		
		// Dimensões e peso
		weight?: number;
		height?: number;
		width?: number;
		length?: number;
		
		// Estoque avançado
		stock_location?: string;
		track_inventory?: boolean;
		allow_backorder?: boolean;
		
		// Logística
		delivery_days?: number;
		delivery_days_min?: number;
		delivery_days_max?: number;
		has_free_shipping?: boolean;
		seller_state?: string;
		seller_city?: string;
		
		// Categorização
		category_id: string;
		brand: string;
		brand_id?: string;
		seller_id?: string;
		tags: string[];
		
		// SEO
		meta_title: string;
		meta_description: string;
		meta_keywords: string[];
		
		// Estruturados (JSONB)
		attributes?: Record<string, any>;
		specifications?: Record<string, any>;
		
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
	let viewMode = 'list'; // PADRÃO É LISTA CONFORME SOLICITADO
	let showFilters = false;

	// Estados para IA
	let enrichingField = '';
	let aiProcessing = false;

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

	// Funções de Enriquecimento com IA
	async function enrichWithAI(field: string, prompt: string) {
		if (aiProcessing) return;
		
		enrichingField = field;
		aiProcessing = true;
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					field,
					prompt,
					currentData: formData,
					category: categories.find(c => c.id === formData.category_id)?.name
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Aplicar o resultado ao campo específico
				switch (field) {
					case 'name':
						formData.name = result.data.enhanced_name || result.data;
						break;
					case 'description':
						formData.description = result.data.description || result.data;
						break;
					case 'meta_title':
						formData.meta_title = result.data.meta_title || result.data;
						break;
					case 'meta_description':
						formData.meta_description = result.data.meta_description || result.data;
						break;
					case 'tags':
						if (Array.isArray(result.data)) {
							formData.tags = [...formData.tags, ...result.data];
						}
						break;
					case 'sku':
						formData.sku = result.data.sku || result.data;
						break;
				}
				
				// Forçar reatividade
				formData = { ...formData };
			} else {
				alert('Erro ao enriquecer com IA: ' + (result.error || 'Erro desconhecido'));
			}
		} catch (error) {
			console.error('Erro ao enriquecer com IA:', error);
			alert('Erro ao conectar com o serviço de IA');
		} finally {
			aiProcessing = false;
			enrichingField = '';
		}
	}

	// Funções específicas de enriquecimento
	function enrichName() {
		const prompt = `Melhore este nome de produto para ser mais atrativo e descritivo: "${formData.name}". Categoria: ${categories.find(c => c.id === formData.category_id)?.name || 'Geral'}`;
		enrichWithAI('name', prompt);
	}

	function enrichDescription() {
		const prompt = `Crie uma descrição completa e persuasiva para este produto: "${formData.name}". Categoria: ${categories.find(c => c.id === formData.category_id)?.name || 'Geral'}. Marca: ${formData.brand || 'N/A'}`;
		enrichWithAI('description', prompt);
	}

	function enrichSEOTitle() {
		const prompt = `Crie um título SEO otimizado (máximo 60 caracteres) para: "${formData.name}"`;
		enrichWithAI('meta_title', prompt);
	}

	function enrichSEODescription() {
		const prompt = `Crie uma meta descrição SEO (máximo 160 caracteres) para: "${formData.name}". Descrição: ${formData.description}`;
		enrichWithAI('meta_description', prompt);
	}

	function enrichTags() {
		const prompt = `Sugira 5-10 tags relevantes para este produto: "${formData.name}". Categoria: ${categories.find(c => c.id === formData.category_id)?.name || 'Geral'}`;
		enrichWithAI('tags', prompt);
	}

	function generateSKU() {
		const prompt = `Gere um SKU único e profissional para: "${formData.name}". Categoria: ${categories.find(c => c.id === formData.category_id)?.name || 'Geral'}`;
		enrichWithAI('sku', prompt);
	}

	// Função de enriquecimento completo
	async function enrichCompleteProduct() {
		if (aiProcessing || !formData.name.trim()) return;
		
		enrichingField = 'complete';
		aiProcessing = true;
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'enrich_all',
					currentData: formData,
					category: categories.find(c => c.id === formData.category_id)?.name
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				const data = result.data;
				
				// Aplicar todos os campos enriquecidos
				formData = {
					...formData,
					// Básicos
					name: data.enhanced_name || formData.name,
					slug: data.slug || formData.slug,
					sku: data.sku || formData.sku,
					description: data.description || formData.description,
					short_description: data.short_description || formData.short_description,
					condition: data.condition || 'new',
					model: data.model || formData.model,
					barcode: data.barcode || formData.barcode,
					featured: data.featured || false,
					
					// Custos
					cost: data.cost || formData.cost,
					
					// Dimensões
					weight: data.weight || formData.weight,
					height: data.dimensions?.height || formData.height,
					width: data.dimensions?.width || formData.width,
					length: data.dimensions?.length || formData.length,
					
					// Logística
					delivery_days: data.delivery_days || formData.delivery_days,
					delivery_days_min: data.delivery_days_min || formData.delivery_days_min,
					delivery_days_max: data.delivery_days_max || formData.delivery_days_max,
					has_free_shipping: data.has_free_shipping || false,
					
					// Estoque
					stock_location: data.stock_location || formData.stock_location,
					track_inventory: data.track_inventory !== undefined ? data.track_inventory : true,
					allow_backorder: data.allow_backorder || false,
					
					// Marca e categorização
					brand: data.brand_suggestion || formData.brand,
					tags: data.tags || formData.tags,
					
					// SEO
					meta_title: data.meta_title || formData.meta_title,
					meta_description: data.meta_description || formData.meta_description,
					meta_keywords: data.meta_keywords || formData.meta_keywords,
					
					// Estruturados
					attributes: data.attributes || formData.attributes,
					specifications: data.specifications || formData.specifications
				};
				
				// Notificar sucesso
				alert('🚀 Produto enriquecido com sucesso! Verifique todas as abas para ver as melhorias.');
				
			} else {
				alert('Erro ao enriquecer produto completo: ' + (result.error || 'Erro desconhecido'));
			}
		} catch (error) {
			console.error('Erro ao enriquecer produto completo:', error);
			alert('Erro ao conectar com o serviço de IA');
		} finally {
			aiProcessing = false;
			enrichingField = '';
		}
	}

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
			// Básico
			name: '',
			sku: '',
			slug: '',
			description: '',
			short_description: '',
			price: 0,
			original_price: undefined,
			cost: undefined,
			currency: 'BRL',
			quantity: 0,
			is_active: true,
			status: 'active',
			condition: 'new',
			model: '',
			barcode: '',
			featured: false,
			published_at: '',
			
			// Dimensões e peso
			weight: undefined,
			height: undefined,
			width: undefined,
			length: undefined,
			
			// Estoque avançado
			stock_location: '',
			track_inventory: true,
			allow_backorder: false,
			
			// Logística
			delivery_days: 7,
			delivery_days_min: 3,
			delivery_days_max: 15,
			has_free_shipping: false,
			seller_state: '',
			seller_city: '',
			
			// Categorização
			category_id: '',
			brand: '',
			brand_id: '',
			seller_id: '',
			tags: [],
			
			// SEO
			meta_title: '',
			meta_description: '',
			meta_keywords: [],
			
			// Estruturados
			attributes: {},
			specifications: {},
			
			// Relacionamentos
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
						class="bg-cyan-500 hover:bg-cyan-600 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
						disabled={saving}
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

	<!-- Container principal responsivo -->
	<div class="relative">
		<!-- Conteúdo principal -->
		<div class="min-h-[calc(100vh-140px)] transition-all duration-300 {showSlidePanel ? 'lg:pr-[1000px]' : ''}">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				
				<!-- Estatísticas modernas - responsivas -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-3 sm:gap-4">
							<div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
								<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-slate-600">Total</p>
								<p class="text-xl sm:text-2xl font-bold text-slate-900 truncate">{stats.total.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-3 sm:gap-4">
							<div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
								<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-slate-600">Ativos</p>
								<p class="text-xl sm:text-2xl font-bold text-slate-900 truncate">{stats.active.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-3 sm:gap-4">
							<div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
								<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-slate-600">Inativos</p>
								<p class="text-xl sm:text-2xl font-bold text-slate-900 truncate">{stats.inactive.toLocaleString()}</p>
							</div>
						</div>
					</div>
					
					<div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div class="flex items-center gap-3 sm:gap-4">
							<div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
								<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-slate-600">Estoque Baixo</p>
								<p class="text-xl sm:text-2xl font-bold text-slate-900 truncate">{stats.lowStock.toLocaleString()}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Filtros e busca avançados -->
				<div class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
					<div class="p-4 sm:p-6">
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
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 {showFilters ? 'block' : 'hidden lg:grid'}">
							<!-- Status -->
							<select
								bind:value={selectedStatus}
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm"
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
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm"
							>
								<option value="all">Todas as categorias</option>
								{#each categories as category}
									<option value={category.name}>{category.name}</option>
								{/each}
							</select>
							
							<!-- Marca -->
							<select
								bind:value={selectedBrand}
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm"
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
								class="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm"
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
								class="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
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
				<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
					{#if loading}
						<div class="h-64 flex items-center justify-center">
							<div class="text-center">
								<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
								<p class="text-slate-600">Carregando produtos...</p>
							</div>
						</div>
					{:else if paginatedProducts.length === 0}
						<div class="h-64 flex items-center justify-center">
							<div class="text-center px-4">
								<div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
									<svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
									</svg>
								</div>
								<h3 class="text-xl font-semibold text-slate-900 mb-2">Nenhum produto encontrado</h3>
								<p class="text-slate-600 mb-4 text-sm">
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
						<!-- Grid/Lista responsiva -->
						<div class="min-h-[400px]">
							{#if viewMode === 'grid'}
								<!-- Grid totalmente elástico - sem larguras fixas -->
								<div class="p-4 sm:p-6">
									<div class="grid gap-4 auto-fit-grid">
										{#each paginatedProducts as product, i}
											<div 
												class="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-cyan-300 w-full"
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
													<div class="absolute top-2 left-2">
														<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusClass(product.status)}">
															{getStatusLabel(product.status)}
														</span>
													</div>
													<!-- Ações rápidas -->
													<div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
														<div class="flex gap-1">
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
													<div class="mb-3">
														<h3 class="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
														{#if product.brand}
															<p class="text-xs text-slate-500 truncate">{product.brand}</p>
														{/if}
													</div>
													
													<div class="flex items-center justify-between text-xs mb-3">
														<span class="font-mono text-slate-600 truncate">#{product.sku}</span>
														<span class="text-slate-500 truncate ml-2">{product.category || 'Sem categoria'}</span>
													</div>
													
													<div class="flex items-end justify-between">
														<div class="min-w-0 flex-1 mr-2">
															<div class="font-bold text-slate-900 text-sm truncate">{formatPrice(product.price)}</div>
															{#if product.originalPrice && product.originalPrice > product.price}
																<div class="text-xs text-slate-500 line-through truncate">{formatPrice(product.originalPrice)}</div>
															{/if}
														</div>
														<div class="text-right flex-shrink-0">
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
								</div>
							{:else}
								<!-- Lista/Tabela responsiva -->
								<div class="overflow-x-auto">
									<table class="min-w-full divide-y divide-slate-200">
										<thead class="bg-slate-50">
											<tr>
												<th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produto</th>
												<th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">SKU</th>
												<th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Preço</th>
												<th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Estoque</th>
												<th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
												<th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Categoria</th>
												<th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden xl:table-cell">Data</th>
												<th class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
											</tr>
										</thead>
										<tbody class="bg-white divide-y divide-slate-200">
											{#each paginatedProducts as product, i}
												<tr 
													class="hover:bg-slate-50 transition-colors"
													in:fly={{ y: 20, duration: 300, delay: i * 50 }}
												>
													<td class="px-4 sm:px-6 py-4">
														<div class="flex items-center gap-3">
															<img
																src={product.image}
																alt={product.name}
																class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
																on:error={(e) => {
																	e.currentTarget.src = `/api/placeholder/48/48?text=${encodeURIComponent(product.name.charAt(0))}`;
																}}
															/>
															<div class="min-w-0 flex-1">
																<div class="text-sm font-medium text-slate-900 truncate">{product.name}</div>
																{#if product.brand}
																	<div class="text-sm text-slate-500 truncate">{product.brand}</div>
																{/if}
																<!-- SKU no mobile -->
																<div class="text-xs text-slate-400 sm:hidden font-mono truncate">#{product.sku}</div>
															</div>
														</div>
													</td>
													<td class="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
														<span class="text-sm font-mono text-slate-900">{product.sku}</span>
													</td>
													<td class="px-4 sm:px-6 py-4 whitespace-nowrap">
														<div>
															<div class="text-sm font-bold text-slate-900">{formatPrice(product.price)}</div>
															{#if product.originalPrice && product.originalPrice > product.price}
																<div class="text-xs text-slate-500 line-through">{formatPrice(product.originalPrice)}</div>
															{/if}
														</div>
													</td>
													<td class="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
														<div>
															<div class="text-sm text-slate-900">{product.stock}</div>
															{#if product.stock <= 10}
																<div class="text-xs text-amber-600">Estoque baixo</div>
															{/if}
														</div>
													</td>
													<td class="px-4 sm:px-6 py-4 whitespace-nowrap">
														<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusClass(product.status)}">
															{getStatusLabel(product.status)}
														</span>
													</td>
													<td class="px-4 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
														<span class="text-sm text-slate-900 truncate">{product.category || 'Sem categoria'}</span>
													</td>
													<td class="px-4 sm:px-6 py-4 whitespace-nowrap hidden xl:table-cell">
														<span class="text-sm text-slate-500">{formatDate(product.createdAt)}</span>
													</td>
													<td class="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
														<div class="flex justify-end gap-1 sm:gap-2">
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
							<div class="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4">
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
					{/if}
				</div>
			</div>
		</div>

		<!-- Slide Panel Responsivo -->
		{#if showSlidePanel}
			<div 
				class="fixed inset-y-0 right-0 z-50 w-full lg:w-[1000px] bg-white shadow-2xl transform transition-transform duration-300 overflow-hidden flex flex-col"
				transition:fly={{ x: 400, duration: 300 }}
			>
				<!-- Header com gradiente animado -->
				<div class="modern-header-gradient text-white p-6 border-b border-white/20 flex-shrink-0">
					<div class="flex items-center justify-between mb-4">
						<div>
							<h2 class="text-2xl font-bold">
								{editingProduct ? 'Editar Produto' : 'Novo Produto'}
							</h2>
							<p class="text-white/80 mt-1">
								{editingProduct ? 'Atualize as informações do produto' : 'Adicione um novo produto ao catálogo'}
							</p>
						</div>
						<button
							on:click={closePanel}
							class="p-2 hover:bg-white/20 rounded-xl transition-colors"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					
					<!-- Botão Enriquecer Produto Completo -->
					{#if formData.name && formData.name.trim()}
						<button
							type="button"
							on:click={enrichCompleteProduct}
							disabled={aiProcessing || !formData.name.trim()}
							class="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 shadow-lg"
							title="Enriquecer todo o produto com IA"
						>
							{#if enrichingField === 'complete'}
								<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								Enriquecendo produto completo...
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
								🚀 Enriquecer Produto Completo com IA
							{/if}
						</button>
					{:else}
						<div class="w-full px-4 py-3 bg-white/10 text-white/60 rounded-xl text-center border border-white/20">
							💡 Digite um nome do produto para usar o enriquecimento automático
						</div>
					{/if}
				</div>

				<!-- Navegação de abas responsiva -->
				<div class="bg-slate-50 border-b border-slate-200 px-4 lg:px-6 flex-shrink-0">
					<div class="overflow-x-auto">
						<nav class="flex gap-1 py-3 min-w-max">
							{#each tabs as tab}
								<button
									on:click={() => activeTab = tab.id}
									class="flex items-center gap-2 px-3 lg:px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap {
										activeTab === tab.id
										? 'bg-white text-cyan-600 shadow-sm border border-cyan-200'
										: 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
									}"
								>
									<span class="text-base">{tab.icon}</span>
									<span class="hidden sm:inline">{tab.name}</span>
								</button>
							{/each}
						</nav>
					</div>
				</div>

				<!-- Conteúdo das abas - scrollável -->
				<div class="flex-1 overflow-y-auto">
					<div class="p-4 lg:p-6">
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
									<div class="flex gap-2">
										<input
											type="text"
											bind:value={formData.name}
											class="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
											placeholder="Digite o nome do produto"
										/>
										<button
											type="button"
											on:click={enrichName}
											disabled={aiProcessing || !formData.name.trim()}
											class="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
											title="Enriquecer com IA"
										>
											{#if enrichingField === 'name'}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
												</svg>
											{/if}
											<span class="hidden sm:inline">IA</span>
										</button>
									</div>
								</div>

								<!-- SKU -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										SKU *
									</label>
									<div class="flex gap-2">
										<input
											type="text"
											bind:value={formData.sku}
											class="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors font-mono"
											placeholder="Código único do produto"
										/>
										<button
											type="button"
											on:click={generateSKU}
											disabled={aiProcessing || !formData.name.trim()}
											class="px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
											title="Gerar SKU com IA"
										>
											{#if enrichingField === 'sku'}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
												</svg>
											{/if}
											<span class="hidden sm:inline">Gerar</span>
										</button>
									</div>
								</div>

								<!-- Descrição -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										Descrição
									</label>
									<div class="space-y-2">
										<textarea
											bind:value={formData.description}
											rows="4"
											class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
											placeholder="Descreva o produto detalhadamente"
										></textarea>
										<button
											type="button"
											on:click={enrichDescription}
											disabled={aiProcessing || !formData.name.trim()}
											class="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
											title="Enriquecer descrição com IA"
										>
											{#if enrichingField === 'description'}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
												Gerando descrição...
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
												Gerar descrição com IA
											{/if}
										</button>
									</div>
								</div>

								<!-- Descrição Curta -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										Descrição Curta
									</label>
									<div class="flex gap-2">
										<textarea
											bind:value={formData.short_description}
											rows="2"
											maxlength="150"
											class="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
											placeholder="Resumo atrativo do produto (máx. 150 caracteres)"
										></textarea>
										<button
											type="button"
											on:click={() => enrichWithAI('short_description', `Crie uma descrição curta (máx 150 chars) para: "${formData.name}"`)}
											disabled={aiProcessing || !formData.name.trim()}
											class="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
											title="Gerar descrição curta com IA"
										>
											{#if enrichingField === 'short_description'}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
											</svg>
										{/if}
										<span class="hidden sm:inline">IA</span>
									</button>
								</div>
								<div class="flex justify-between text-xs mt-1">
									<span class="text-slate-500">Texto para prévia do produto</span>
									<span class="text-slate-400">{(formData.short_description || '').length}/150</span>
								</div>
							</div>

						{:else if activeTab === 'pricing'}
							<div class="space-y-6">
								<div class="mb-6">
									<h3 class="text-xl font-semibold text-slate-900 mb-2">Preços e Custos</h3>
									<p class="text-slate-600">Configure os valores de venda e custo do produto</p>
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

								<!-- Custo -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										Custo do Produto
									</label>
									<div class="relative">
										<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
										<input
											type="number"
											bind:value={formData.cost}
											min="0"
											step="0.01"
											class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
											placeholder="0,00"
										/>
									</div>
									<p class="text-xs text-slate-500 mt-1">Custo de aquisição/produção (para cálculos de margem)</p>
									{#if formData.price && formData.cost}
										<div class="mt-2 p-3 bg-slate-50 rounded-lg">
											<div class="text-sm text-slate-700">
												<div class="flex justify-between">
													<span>Margem bruta:</span>
													<span class="font-medium">R$ {(formData.price - formData.cost).toFixed(2)}</span>
												</div>
												<div class="flex justify-between mt-1">
													<span>Margem (%):</span>
													<span class="font-medium">{(((formData.price - formData.cost) / formData.price) * 100).toFixed(1)}%</span>
												</div>
											</div>
										</div>
									{/if}
								</div>

								<!-- Moeda -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										Moeda
									</label>
									<select
										bind:value={formData.currency}
										class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
									>
										<option value="BRL">Real Brasileiro (BRL)</option>
										<option value="USD">Dólar Americano (USD)</option>
										<option value="EUR">Euro (EUR)</option>
									</select>
								</div>
							</div>

						{:else if activeTab === 'inventory'}
							<div class="space-y-6">
								<div class="mb-6">
									<h3 class="text-xl font-semibold text-slate-900 mb-2">Controle de Estoque Avançado</h3>
									<p class="text-slate-600">Gerencie estoque, localização e políticas de venda</p>
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

								<!-- Local do Estoque -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										Local do Estoque
									</label>
									<input
										type="text"
										bind:value={formData.stock_location}
										class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
										placeholder="Ex: Depósito A - Prateleira 15, Seção B"
									/>
									<p class="text-xs text-slate-500 mt-1">Localização física do produto no estoque</p>
								</div>

								<!-- Código de Barras -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										Código de Barras (EAN/UPC)
									</label>
									<input
										type="text"
										bind:value={formData.barcode}
										class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors font-mono"
										placeholder="7891234567890"
									/>
									<p class="text-xs text-slate-500 mt-1">Código de barras para leitura óptica</p>
								</div>

								<!-- Configurações de Controle -->
								<div class="space-y-4">
									<h4 class="text-lg font-medium text-slate-900">Políticas de Estoque</h4>
									
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div class="bg-cyan-50 rounded-xl p-4">
											<label class="flex items-center gap-3">
												<input
													type="checkbox"
													bind:checked={formData.track_inventory}
													class="w-5 h-5 rounded border-cyan-300 text-cyan-600 shadow-sm focus:border-cyan-300 focus:ring focus:ring-cyan-200 focus:ring-opacity-50"
												/>
												<div>
													<span class="text-sm font-medium text-slate-900">Rastrear Inventário</span>
													<p class="text-xs text-slate-600">Controlar automaticamente a quantidade</p>
												</div>
											</label>
										</div>
										
										<div class="bg-amber-50 rounded-xl p-4">
											<label class="flex items-center gap-3">
												<input
													type="checkbox"
													bind:checked={formData.allow_backorder}
													class="w-5 h-5 rounded border-amber-300 text-amber-600 shadow-sm focus:border-amber-300 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
												/>
												<div>
													<span class="text-sm font-medium text-slate-900">Permitir Pré-venda</span>
													<p class="text-xs text-slate-600">Vender mesmo sem estoque</p>
												</div>
											</label>
										</div>
									</div>
								</div>

								<!-- Alertas de Estoque -->
								<div class="bg-slate-50 rounded-xl p-4">
									<h4 class="text-sm font-medium text-slate-900 mb-3">Status do Estoque</h4>
									<div class="space-y-2 text-sm">
										{#if formData.quantity === 0}
											<div class="flex items-center gap-2 text-red-600">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
												</svg>
												<span>Produto sem estoque</span>
											</div>
										{:else if formData.quantity <= 5}
											<div class="flex items-center gap-2 text-amber-600">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
												</svg>
												<span>Estoque crítico - {formData.quantity} unidades</span>
											</div>
										{:else if formData.quantity <= 20}
											<div class="flex items-center gap-2 text-yellow-600">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												<span>Estoque baixo - {formData.quantity} unidades</span>
											</div>
										{:else}
											<div class="flex items-center gap-2 text-green-600">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												<span>Estoque adequado - {formData.quantity} unidades</span>
											</div>
										{/if}
									</div>
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
									<div class="flex gap-2">
										<button
											type="button"
											on:click={addTag}
											class="flex-1 text-sm text-cyan-600 hover:text-cyan-800 font-medium px-4 py-2 border border-cyan-300 rounded-xl hover:bg-cyan-50 transition-colors flex items-center justify-center gap-1"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
											</svg>
											Adicionar tag
										</button>
										<button
											type="button"
											on:click={enrichTags}
											disabled={aiProcessing || !formData.name.trim()}
											class="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
											title="Sugerir tags com IA"
										>
											{#if enrichingField === 'tags'}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
												</svg>
											{/if}
											<span class="hidden sm:inline">IA</span>
										</button>
									</div>
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
									<div class="space-y-2">
										<div class="flex gap-2">
											<input
												type="text"
												bind:value={formData.meta_title}
												maxlength="60"
												class="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="Título para mecanismos de busca"
											/>
											<button
												type="button"
												on:click={enrichSEOTitle}
												disabled={aiProcessing || !formData.name.trim()}
												class="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
												title="Otimizar título SEO com IA"
											>
												{#if enrichingField === 'meta_title'}
													<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
												{:else}
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
													</svg>
												{/if}
												<span class="hidden sm:inline">SEO</span>
											</button>
										</div>
										<div class="flex justify-between text-xs">
											<span class="text-slate-500">Título para Google, Bing, etc.</span>
											<span class="text-slate-400">{formData.meta_title.length}/60</span>
										</div>
									</div>
								</div>
								
								<!-- Descrição SEO -->
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-2">
										Descrição SEO
									</label>
									<div class="space-y-2">
										<textarea
											bind:value={formData.meta_description}
											maxlength="160"
											rows="3"
											class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
											placeholder="Descrição para mecanismos de busca"
										></textarea>
										<button
											type="button"
											on:click={enrichSEODescription}
											disabled={aiProcessing || !formData.name.trim()}
											class="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
											title="Otimizar descrição SEO com IA"
										>
											{#if enrichingField === 'meta_description'}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
												Otimizando descrição SEO...
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
											</svg>
											Otimizar descrição SEO com IA
										{/if}
									</button>
									<div class="flex justify-between text-xs">
										<span class="text-slate-500">Resumo para resultados de busca</span>
										<span class="text-slate-400">{formData.meta_description.length}/160</span>
									</div>
								</div>
							</div>

						{:else}
							<div class="space-y-6">
								<div class="mb-6">
									<h3 class="text-xl font-semibold text-slate-900 mb-2">Configurações Avançadas</h3>
									<p class="text-slate-600">Dimensões, peso, logística e atributos técnicos</p>
								</div>

								<!-- Dimensões e Peso -->
								<div class="space-y-4">
									<h4 class="text-lg font-medium text-slate-900">Dimensões e Peso</h4>
									
									<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Peso (kg)
											</label>
											<input
												type="number"
												bind:value={formData.weight}
												min="0"
												step="0.01"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="1.5"
											/>
										</div>
										
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Altura (cm)
											</label>
											<input
												type="number"
												bind:value={formData.height}
												min="0"
												step="0.1"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="15.0"
											/>
										</div>
										
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Largura (cm)
											</label>
											<input
												type="number"
												bind:value={formData.width}
												min="0"
												step="0.1"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="10.0"
											/>
										</div>
										
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Comprimento (cm)
											</label>
											<input
												type="number"
												bind:value={formData.length}
												min="0"
												step="0.1"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="20.0"
											/>
										</div>
									</div>
									
									<p class="text-xs text-slate-500">Dimensões necessárias para cálculo de frete</p>
								</div>

								<!-- Logística -->
								<div class="space-y-4">
									<h4 class="text-lg font-medium text-slate-900">Logística e Entrega</h4>
									
									<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Prazo Mínimo (dias)
											</label>
											<input
												type="number"
												bind:value={formData.delivery_days_min}
												min="1"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="3"
											/>
										</div>
										
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Prazo Médio (dias)
											</label>
											<input
												type="number"
												bind:value={formData.delivery_days}
												min="1"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="7"
											/>
										</div>
										
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Prazo Máximo (dias)
											</label>
											<input
												type="number"
												bind:value={formData.delivery_days_max}
												min="1"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="15"
											/>
										</div>
									</div>

									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Estado do Vendedor
											</label>
											<input
												type="text"
												bind:value={formData.seller_state}
												maxlength="2"
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors uppercase"
												placeholder="SP"
											/>
										</div>
										
										<div>
											<label class="block text-sm font-medium text-slate-700 mb-2">
												Cidade do Vendedor
											</label>
											<input
												type="text"
												bind:value={formData.seller_city}
												class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
												placeholder="São Paulo"
											/>
										</div>
									</div>

									<div class="bg-green-50 rounded-xl p-4">
										<label class="flex items-center gap-3">
											<input
												type="checkbox"
												bind:checked={formData.has_free_shipping}
												class="w-5 h-5 rounded border-green-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
											/>
											<div>
												<span class="text-sm font-medium text-slate-900">Frete Grátis</span>
												<p class="text-xs text-slate-600">Produto com frete gratuito</p>
											</div>
										</label>
									</div>
								</div>

								<!-- Atributos Personalizados -->
								<div class="space-y-4">
									<h4 class="text-lg font-medium text-slate-900">Atributos do Produto</h4>
									
									<div class="bg-slate-50 rounded-xl p-4">
										<div class="space-y-3">
											{#if formData.attributes && Object.keys(formData.attributes).length > 0}
												{#each Object.entries(formData.attributes) as [key, value], index}
													<div class="flex gap-3">
														<input
															type="text"
															bind:value={key}
															on:input={(e) => {
																const oldKey = Object.keys(formData.attributes)[index];
																const newKey = e.currentTarget.value;
																if (oldKey !== newKey) {
																	delete formData.attributes[oldKey];
																	formData.attributes[newKey] = value;
																	formData.attributes = {...formData.attributes};
																}
															}}
															placeholder="Nome do atributo"
															class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm"
														/>
														<input
															type="text"
															bind:value={formData.attributes[key]}
															placeholder="Valor"
															class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm"
														/>
														<button
															type="button"
															on:click={() => {
																delete formData.attributes[key];
																formData.attributes = {...formData.attributes};
															}}
															class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
														>
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
															</svg>
														</button>
													</div>
												{/each}
											{:else}
												<p class="text-sm text-slate-500 text-center py-4">Nenhum atributo adicionado</p>
											{/if}
											
											<button
												type="button"
												on:click={() => {
													if (!formData.attributes) formData.attributes = {};
													formData.attributes[`Atributo ${Object.keys(formData.attributes).length + 1}`] = '';
													formData.attributes = {...formData.attributes};
												}}
												class="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-cyan-500 hover:text-cyan-600 transition-colors flex items-center justify-center gap-2 text-sm"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
												</svg>
												Adicionar Atributo
											</button>
										</div>
									</div>
									<p class="text-xs text-slate-500">Ex: Cor, Material, Voltagem, etc.</p>
								</div>

								<!-- Especificações Técnicas -->
								<div class="space-y-4">
									<h4 class="text-lg font-medium text-slate-900">Especificações Técnicas</h4>
									
									<div class="bg-slate-50 rounded-xl p-4">
										<div class="space-y-3">
											{#if formData.specifications && Object.keys(formData.specifications).length > 0}
												{#each Object.entries(formData.specifications) as [key, value], index}
													<div class="flex gap-3">
														<input
															type="text"
															bind:value={key}
															on:input={(e) => {
																const oldKey = Object.keys(formData.specifications)[index];
																const newKey = e.currentTarget.value;
																if (oldKey !== newKey) {
																	delete formData.specifications[oldKey];
																	formData.specifications[newKey] = value;
																	formData.specifications = {...formData.specifications};
																}
															}}
															placeholder="Especificação"
															class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm"
														/>
														<textarea
															bind:value={formData.specifications[key]}
															placeholder="Detalhes técnicos"
															rows="2"
															class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-sm resize-none"
														></textarea>
														<button
															type="button"
															on:click={() => {
																delete formData.specifications[key];
																formData.specifications = {...formData.specifications};
															}}
															class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
														>
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
															</svg>
														</button>
													</div>
												{/each}
											{:else}
												<p class="text-sm text-slate-500 text-center py-4">Nenhuma especificação adicionada</p>
											{/if}
											
											<button
												type="button"
												on:click={() => {
													if (!formData.specifications) formData.specifications = {};
													formData.specifications[`Especificação ${Object.keys(formData.specifications).length + 1}`] = '';
													formData.specifications = {...formData.specifications};
												}}
												class="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-cyan-500 hover:text-cyan-600 transition-colors flex items-center justify-center gap-2 text-sm"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
												</svg>
												Adicionar Especificação
											</button>
										</div>
									</div>
									<p class="text-xs text-slate-500">Ex: Potência, Dimensões da embalagem, Compatibilidade, etc.</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Footer responsivo - sempre visível -->
					<div class="bg-slate-50 border-t border-slate-200 p-4 lg:p-6 flex-shrink-0">
						<div class="flex flex-col sm:flex-row justify-end gap-3">
							<button
								type="button"
								on:click={closePanel}
								class="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors order-2 sm:order-1"
							>
								Cancelar
							</button>
							<button
								type="button"
								on:click={saveProduct}
								disabled={saving}
								class="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
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
			</div>

			<!-- Overlay responsivo -->
			<div 
				class="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm lg:backdrop-blur-none"
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

	/* Grid elástico que se adapta automaticamente */
	.auto-fit-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
		gap: 1rem;
		width: 100%;
	}

	/* Mobile: cards ainda menores para caber bem */
	@media (max-width: 480px) {
		.auto-fit-grid {
			grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
			gap: 0.75rem;
		}
	}

	/* Mobile médio */
	@media (min-width: 481px) and (max-width: 640px) {
		.auto-fit-grid {
			grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
			gap: 0.875rem;
		}
	}

	/* Tablet */
	@media (min-width: 641px) and (max-width: 1023px) {
		.auto-fit-grid {
			grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
			gap: 1rem;
		}
	}

	/* Desktop */
	@media (min-width: 1024px) and (max-width: 1279px) {
		.auto-fit-grid {
			grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
			gap: 1.25rem;
		}
	}

	/* Extra large: otimizado para telas grandes */
	@media (min-width: 1280px) {
		.auto-fit-grid {
			grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
			gap: 1.5rem;
		}
	}

	/* Garantir que os cards nunca quebrem o layout */
	.auto-fit-grid > * {
		min-width: 0;
		width: 100%;
		overflow: hidden;
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