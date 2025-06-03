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
		short_description: string;
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
		// Novos campos de enriquecimento
		technical_specifications?: string;
		materials?: string;
		care_instructions?: string;
		warranty?: string;
		age_group?: string;
		safety_certifications?: string;
	}

	// Campos que podem ser enriquecidos
	interface EnrichableField {
		name: string;
		label: string;
		type: 'text' | 'textarea' | 'json' | 'array' | 'category' | 'image_url' | 'images';
	}

	const enrichableFields: EnrichableField[] = [
		{ name: 'name', label: 'Nome do Produto', type: 'text' },
		{ name: 'description', label: 'Descrição', type: 'textarea' },
		{ name: 'short_description', label: 'Descrição Curta', type: 'textarea' },
		{ name: 'category', label: 'Categoria/Subcategoria', type: 'category' },
		{ name: 'tags', label: 'Tags', type: 'array' },
		{ name: 'variations', label: 'Variações', type: 'json' },
		{ name: 'image_url', label: 'Imagem Principal', type: 'image_url' },
		{ name: 'images', label: 'Múltiplas Imagens', type: 'images' },
		{ name: 'technical_specifications', label: 'Especificações Técnicas', type: 'json' },
		{ name: 'materials', label: 'Materiais', type: 'text' },
		{ name: 'care_instructions', label: 'Instruções de Cuidado', type: 'textarea' },
		{ name: 'warranty', label: 'Garantia', type: 'text' },
		{ name: 'age_group', label: 'Faixa Etária', type: 'text' },
		{ name: 'safety_certifications', label: 'Certificações de Segurança', type: 'text' },
		{ name: 'seo_title', label: 'Título SEO', type: 'text' },
		{ name: 'seo_description', label: 'Descrição SEO', type: 'textarea' },
		{ name: 'seo_keywords', label: 'Palavras-chave SEO', type: 'text' }
	];
	
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

	// Estado do enriquecimento
	let enrichmentLoading = $state<Record<string, boolean>>({});
	let fullEnrichmentLoading = $state(false);
	
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
	let itemsPerPage = $state(20);
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
		short_description: '',
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
		},
		technical_specifications: '',
		materials: '',
		care_instructions: '',
		warranty: '',
		age_group: '',
		safety_certifications: ''
	});
	
	let activeTab = $state<'basic' | 'images' | 'inventory' | 'seo' | 'shipping'>('basic');
	let uploadingImages = $state(false);
	let newTag = $state('');
	let newVariation = $state({ name: '', options: '' });

	// Função para enriquecer campo individual
	async function enrichField(fieldName: string) {
		if (!editingProduct?.id) {
			alert('Produto deve estar salvo antes do enriquecimento');
			return;
		}

		enrichmentLoading[fieldName] = true;

		try {
			const response = await fetch('/api/products/enrich', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					productId: editingProduct.id,
					field: fieldName
				})
			});

			const result = await response.json();

			if (result.success && result.data.enrichmentResults[fieldName]) {
				const enrichedValue = result.data.enrichmentResults[fieldName].value;

				// Atualizar formData com o valor enriquecido
				if (fieldName === 'seo_title') {
					formData.seo.title = enrichedValue;
				} else if (fieldName === 'seo_description') {
					formData.seo.description = enrichedValue;
				} else if (fieldName === 'seo_keywords') {
					formData.seo.keywords = enrichedValue;
				} else if (fieldName === 'category') {
					formData.category = enrichedValue;
				} else if (fieldName === 'tags') {
					// Assumir que tags vem como array ou string separada por vírgula
					if (Array.isArray(enrichedValue)) {
						formData.tags = enrichedValue;
					} else if (typeof enrichedValue === 'string') {
						formData.tags = enrichedValue.split(',').map(tag => tag.trim()).filter(Boolean);
					}
				} else if (fieldName === 'variations') {
					// Assumir que variations vem como array ou objeto JSON
					if (Array.isArray(enrichedValue)) {
						formData.variations = enrichedValue;
					} else if (typeof enrichedValue === 'string') {
						try {
							formData.variations = JSON.parse(enrichedValue);
						} catch {
							formData.variations = [];
						}
					}
				} else if (fieldName === 'image_url') {
					// Adicionar como primeira imagem se não existir
					if (enrichedValue && !formData.images.includes(enrichedValue)) {
						formData.images = [enrichedValue, ...formData.images];
					}
				} else if (fieldName === 'images') {
					// Assumir que images vem como array de URLs
					if (Array.isArray(enrichedValue)) {
						// Mesclar com imagens existentes, evitando duplicatas
						const uniqueImages = [...new Set([...formData.images, ...enrichedValue])];
						formData.images = uniqueImages;
					}
				} else {
					(formData as any)[fieldName] = enrichedValue;
				}

				alert(`Campo ${fieldName} enriquecido com sucesso!`);
			} else {
				alert(result.error || 'Erro ao enriquecer campo');
			}
		} catch (error) {
			console.error('Erro ao enriquecer campo:', error);
			alert('Erro ao enriquecer campo');
		} finally {
			enrichmentLoading[fieldName] = false;
		}
	}

	// Função para enriquecer produto completo
	async function enrichFullProduct() {
		if (!editingProduct?.id) {
			alert('Produto deve estar salvo antes do enriquecimento');
			return;
		}

		fullEnrichmentLoading = true;

		try {
			const response = await fetch('/api/products/enrich', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					productId: editingProduct.id,
					action: 'enrich_all'
				})
			});

			const result = await response.json();

			if (result.success) {
				// Atualizar formData com todos os valores enriquecidos
				const enriched = result.data.enrichmentResults;
				
				Object.keys(enriched).forEach(field => {
					const value = enriched[field].value;
					
					if (field === 'seo_title') {
						formData.seo.title = value;
					} else if (field === 'seo_description') {
						formData.seo.description = value;
					} else if (field === 'seo_keywords') {
						formData.seo.keywords = value;
					} else if (field === 'category') {
						formData.category = value;
					} else if (field === 'tags') {
						if (Array.isArray(value)) {
							formData.tags = value;
						} else if (typeof value === 'string') {
							formData.tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
						}
					} else if (field === 'variations') {
						if (Array.isArray(value)) {
							formData.variations = value;
						} else if (typeof value === 'string') {
							try {
								formData.variations = JSON.parse(value);
							} catch {
								formData.variations = [];
							}
						}
					} else if (field === 'image_url') {
						if (value && !formData.images.includes(value)) {
							formData.images = [value, ...formData.images];
						}
					} else if (field === 'images') {
						if (Array.isArray(value)) {
							const uniqueImages = [...new Set([...formData.images, ...value])];
							formData.images = uniqueImages;
						}
					} else {
						(formData as any)[field] = value;
					}
				});

				alert('Produto enriquecido completamente!');
			} else {
				alert(result.error || 'Erro ao enriquecer produto');
			}
		} catch (error) {
			console.error('Erro ao enriquecer produto:', error);
			alert('Erro ao enriquecer produto');
		} finally {
			fullEnrichmentLoading = false;
		}
	}

	// Componente para botão de enriquecimento
	function createEnrichButton(fieldName: string, label: string) {
		let currentValue;
		
		if (fieldName === 'seo_title') {
			currentValue = formData.seo.title;
		} else if (fieldName === 'seo_description') {
			currentValue = formData.seo.description;
		} else if (fieldName === 'seo_keywords') {
			currentValue = formData.seo.keywords;
		} else if (fieldName === 'category') {
			currentValue = formData.category;
		} else if (fieldName === 'tags') {
			currentValue = formData.tags;
		} else if (fieldName === 'variations') {
			currentValue = formData.variations;
		} else if (fieldName === 'images') {
			currentValue = formData.images;
		} else {
			currentValue = (formData as any)[fieldName];
		}
		
		// Verificar se tem valor baseado no tipo
		let hasValue = false;
		if (Array.isArray(currentValue)) {
			hasValue = currentValue.length > 0;
		} else if (typeof currentValue === 'string') {
			hasValue = currentValue.trim() !== '';
		} else if (currentValue) {
			hasValue = true;
		}
		
		const isLoading = enrichmentLoading[fieldName];

		return {
			hasValue,
			isLoading,
			onClick: () => enrichField(fieldName)
		};
	}
	
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
	});
	
	// Funções do formulário
	function openCreateModal() {
		formData = {
			name: '',
			slug: '',
			description: '',
			short_description: '',
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
			},
			technical_specifications: '',
			materials: '',
			care_instructions: '',
			warranty: '',
			age_group: '',
			safety_certifications: ''
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
			short_description: '',
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
			},
			technical_specifications: '',
			materials: '',
			care_instructions: '',
			warranty: '',
			age_group: '',
			safety_certifications: ''
		};
		editingProduct = product;
		activeTab = 'basic';
		showCreateModal = true;
	}
	
	function closeModal() {
		showCreateModal = false;
		editingProduct = null;
		activeTab = 'basic';
		// Limpar estados de loading
		enrichmentLoading = {};
		fullEnrichmentLoading = false;
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
				short_description: formData.short_description,
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
				barcode: formData.barcode,
				technical_specifications: formData.technical_specifications,
				materials: formData.materials,
				care_instructions: formData.care_instructions,
				warranty: formData.warranty,
				age_group: formData.age_group,
				safety_certifications: formData.safety_certifications
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
				
				// Se criou produto novo, atualizar editingProduct com o ID retornado
				if (!editingProduct && result.data.id) {
					editingProduct = { 
						id: result.data.id,
						name: formData.name,
						price: formData.price,
						sku: formData.sku,
						stock: formData.stock,
						category: formData.category || 'Sem categoria',
						image: formData.images[0] || '',
						status: formData.status as any,
						createdAt: new Date().toISOString(),
						sales: 0
					};
				}
				
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
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-4">
				<p class="text-sm text-gray-600">
					Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length} produtos
				</p>
				<div class="flex items-center gap-2">
					<label for="itemsPerPage" class="text-sm text-gray-600">Itens por página:</label>
					<select 
						id="itemsPerPage"
						bind:value={itemsPerPage}
						onchange={() => {
							currentPage = 1; // Reset para primeira página ao mudar quantidade
							loadProducts();
						}}
						class="select select-sm select-bordered"
					>
						<option value={10}>10</option>
						<option value={20}>20</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={() => {
						currentPage = Math.max(1, currentPage - 1);
						loadProducts();
					}}
					disabled={currentPage === 1}
					class="btn btn-ghost btn-sm"
				>
					Anterior
				</button>
				{#each Array(totalPages) as _, i}
					{#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
						<button
							onclick={() => {
								currentPage = i + 1;
								loadProducts();
							}}
							class="btn btn-sm {currentPage === i + 1 ? 'btn-primary' : 'btn-ghost'}"
						>
							{i + 1}
						</button>
					{:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
						<span class="text-gray-400">...</span>
					{/if}
				{/each}
				<button
					onclick={() => {
						currentPage = Math.min(totalPages, currentPage + 1);
						loadProducts();
					}}
					disabled={currentPage === totalPages}
					class="btn btn-ghost btn-sm"
				>
					Próximo
				</button>
			</div>
		</div>
	{:else if filteredProducts.length > 0}
		<!-- Mostrar seletor mesmo quando só tem 1 página -->
		<div class="flex items-center gap-4">
			<p class="text-sm text-gray-600">
				Mostrando todos os {filteredProducts.length} produtos
			</p>
			<div class="flex items-center gap-2">
				<label for="itemsPerPage" class="text-sm text-gray-600">Itens por página:</label>
				<select 
					id="itemsPerPage"
					bind:value={itemsPerPage}
					onchange={() => {
						currentPage = 1;
						loadProducts();
					}}
					class="select select-sm select-bordered"
				>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={50}>50</option>
					<option value={100}>100</option>
				</select>
			</div>
		</div>
	{/if}
</div>

<!-- Modal de Criar/Editar Produto -->
{#if showCreateModal}
	<div 
		class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 300 }}
		onclick={closeModal}
	>
		<div 
			class="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden relative"
			transition:scale={{ duration: 400, easing: backOut, start: 0.9 }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Background Pattern -->
			<div class="absolute inset-0 opacity-5">
				<svg class="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
							<path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5"/>
						</pattern>
					</defs>
					<rect width="100" height="100" fill="url(#grid)" />
				</svg>
			</div>

			<!-- Header Moderno -->
			<div class="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
				<!-- Padrão de fundo sutil -->
				<div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
				<div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
				<div class="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
				
				<div class="relative flex items-center justify-between">
					<div class="flex items-center space-x-4">
						<div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
							<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
							</svg>
						</div>
						<div>
							<h2 class="text-3xl font-bold tracking-tight">
								{editingProduct ? 'Editar Produto' : 'Novo Produto'}
							</h2>
							<p class="text-white/80 mt-1">
								{editingProduct ? 'Atualize as informações do produto' : 'Adicione um novo produto ao catálogo'}
							</p>
						</div>
					</div>
					
					<button 
						onclick={closeModal}
						class="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Status do produto se estiver editando -->
				{#if editingProduct}
					<div class="relative mt-6 flex items-center space-x-4">
						<div class="flex items-center space-x-2">
							<div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
							<span class="text-sm text-white/90">ID: {editingProduct.id}</span>
						</div>
						<div class="flex items-center space-x-2">
							<svg class="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
							</svg>
							<span class="text-sm text-white/90">SKU: {editingProduct.sku}</span>
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Tabs Redesenhadas -->
			<div class="relative border-b border-gray-100">
				<div class="flex overflow-x-auto scrollbar-hide">
					{#each [
						{ id: 'basic', label: 'Informações', icon: '📋', color: 'from-blue-500 to-cyan-500' },
						{ id: 'images', label: 'Mídia', icon: '🎨', color: 'from-purple-500 to-pink-500' },
						{ id: 'inventory', label: 'Estoque', icon: '📦', color: 'from-green-500 to-emerald-500' },
						{ id: 'seo', label: 'SEO', icon: '🔍', color: 'from-orange-500 to-red-500' },
						{ id: 'shipping', label: 'Frete', icon: '🚚', color: 'from-indigo-500 to-purple-500' }
					] as tab}
						<button
							onclick={() => activeTab = tab.id as typeof activeTab}
							class="group relative flex-shrink-0 px-6 py-4 font-medium text-sm transition-all duration-300 {
								activeTab === tab.id 
									? 'text-gray-900' 
									: 'text-gray-500 hover:text-gray-700'
							}"
						>
							<!-- Background ativo -->
							{#if activeTab === tab.id}
								<div class="absolute inset-0 bg-gradient-to-r {tab.color} opacity-10 rounded-t-2xl" 
									transition:scale={{ duration: 200 }}></div>
								<div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r {tab.color} rounded-full" 
									transition:scale={{ duration: 200 }}></div>
							{/if}
							
							<div class="relative flex items-center space-x-3">
								<span class="text-xl transition-transform duration-200 {
									activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
								}">{tab.icon}</span>
								<span class="font-medium">{tab.label}</span>
								
								<!-- Indicador de status -->
								{#if tab.id === 'basic' && (formData.name || formData.description)}
									<div class="w-2 h-2 bg-green-400 rounded-full"></div>
								{:else if tab.id === 'images' && formData.images.length > 0}
									<div class="w-2 h-2 bg-green-400 rounded-full"></div>
								{:else if tab.id === 'seo' && (formData.seo.title || formData.seo.description)}
									<div class="w-2 h-2 bg-green-400 rounded-full"></div>
								{:else}
									<div class="w-2 h-2 bg-gray-300 rounded-full opacity-50"></div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
			
			<!-- Content -->
			<div class="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
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
						
						<!-- Enriquecimento com IA - VERSÃO ULTRA RICA -->
						{#if editingProduct}
							<div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-purple-200/50 shadow-xl">
								<!-- Background decorativo -->
								<div class="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5"></div>
								<div class="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
								<div class="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
								
								<div class="relative p-8">
									<!-- Header da seção -->
									<div class="text-center mb-8">
										<div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-lg mb-4">
											<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
											</svg>
										</div>
										<h3 class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
											Enriquecimento com IA
										</h3>
										<p class="text-gray-600 mt-2 max-w-2xl mx-auto">
											Use inteligência artificial para gerar automaticamente conteúdo de qualidade profissional para todos os campos do produto
										</p>
									</div>

									<!-- Botão Principal Mega Estilizado -->
									<div class="text-center mb-10">
										<button
											onclick={enrichFullProduct}
											disabled={fullEnrichmentLoading}
											class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
										>
											<!-- Background animado -->
											<div class="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
											
											<div class="relative flex items-center space-x-3">
												{#if fullEnrichmentLoading}
													<div class="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
													<span>Enriquecendo produto...</span>
												{:else}
													<svg class="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
													</svg>
													<span>🎯 Enriquecer Produto Completo</span>
													<svg class="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
													</svg>
												{/if}
											</div>
										</button>
									</div>

									<!-- Grid de Campos Individuais - SUPER ESTILIZADO -->
									<div class="space-y-6">
										<h4 class="text-lg font-semibold text-gray-800 text-center">Ou enriqueça campos específicos</h4>
										
										<!-- Campos Básicos -->
										<div class="space-y-4">
											<h5 class="text-sm font-medium text-gray-600 uppercase tracking-wider flex items-center">
												<div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
													<span class="text-xs">📋</span>
												</div>
												Informações Básicas
											</h5>
											<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
												<!-- Nome -->
												<div class="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300">
													<div class="flex items-center justify-between mb-3">
														<div class="flex items-center space-x-3">
															{#if formData.name}
																<div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
																	</svg>
																</div>
															{:else}
																<div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
																	</svg>
																</div>
															{/if}
															<div>
																<span class="text-sm font-medium text-gray-800">Nome</span>
																<div class="text-xs text-gray-500">Título do produto</div>
															</div>
														</div>
													</div>
													<button
														onclick={() => enrichField('name')}
														disabled={enrichmentLoading['name']}
														class="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
													>
														{#if enrichmentLoading['name']}
															<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
														{:else}
															✨ Enriquecer
														{/if}
													</button>
												</div>

												<!-- Descrição -->
												<div class="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300">
													<div class="flex items-center justify-between mb-3">
														<div class="flex items-center space-x-3">
															{#if formData.description}
																<div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
																	</svg>
																</div>
															{:else}
																<div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
																	</svg>
																</div>
															{/if}
															<div>
																<span class="text-sm font-medium text-gray-800">Descrição</span>
																<div class="text-xs text-gray-500">Detalhes completos</div>
															</div>
														</div>
													</div>
													<button
														onclick={() => enrichField('description')}
														disabled={enrichmentLoading['description']}
														class="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
													>
														{#if enrichmentLoading['description']}
															<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
														{:else}
															✨ Enriquecer
														{/if}
													</button>
												</div>

												<!-- Categoria -->
												<div class="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300">
													<div class="flex items-center justify-between mb-3">
														<div class="flex items-center space-x-3">
															{#if formData.category}
																<div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
																	</svg>
																</div>
															{:else}
																<div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
																	</svg>
																</div>
															{/if}
															<div>
																<span class="text-sm font-medium text-gray-800">Categoria</span>
																<div class="text-xs text-gray-500">Classificação</div>
															</div>
														</div>
													</div>
													<button
														onclick={() => enrichField('category')}
														disabled={enrichmentLoading['category']}
														class="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
													>
														{#if enrichmentLoading['category']}
															<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
														{:else}
															✨ Enriquecer
														{/if}
													</button>
												</div>
											</div>
										</div>

										<!-- Campos de Organização -->
										<div class="space-y-4">
											<h5 class="text-sm font-medium text-gray-600 uppercase tracking-wider flex items-center">
												<div class="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2">
													<span class="text-xs">🏷️</span>
												</div>
												Organização
											</h5>
											<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
												<!-- Tags -->
												<div class="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300">
													<div class="flex items-center justify-between mb-3">
														<div class="flex items-center space-x-3">
															{#if formData.tags && formData.tags.length > 0}
																<div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
																	</svg>
																</div>
															{:else}
																<div class="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
																	</svg>
																</div>
															{/if}
															<div>
																<span class="text-sm font-medium text-gray-800">Tags</span>
																<div class="text-xs text-gray-500">Palavras-chave</div>
															</div>
														</div>
													</div>
													<button
														onclick={() => enrichField('tags')}
														disabled={enrichmentLoading['tags']}
														class="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
													>
														{#if enrichmentLoading['tags']}
															<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
														{:else}
															✨ Enriquecer
														{/if}
													</button>
												</div>

												<!-- Variações -->
												<div class="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300">
													<div class="flex items-center justify-between mb-3">
														<div class="flex items-center space-x-3">
															{#if formData.variations && formData.variations.length > 0}
																<div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
																	</svg>
																</div>
															{:else}
																<div class="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
																	</svg>
																</div>
															{/if}
															<div>
																<span class="text-sm font-medium text-gray-800">Variações</span>
																<div class="text-xs text-gray-500">Opções do produto</div>
															</div>
														</div>
													</div>
													<button
														onclick={() => enrichField('variations')}
														disabled={enrichmentLoading['variations']}
														class="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
													>
														{#if enrichmentLoading['variations']}
															<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
														{:else}
															✨ Enriquecer
														{/if}
													</button>
												</div>

												<!-- Imagens -->
												<div class="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300">
													<div class="flex items-center justify-between mb-3">
														<div class="flex items-center space-x-3">
															{#if formData.images && formData.images.length > 0}
																<div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
																	</svg>
																</div>
															{:else}
																<div class="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
																	<svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
																	</svg>
																</div>
															{/if}
															<div>
																<span class="text-sm font-medium text-gray-800">Imagens</span>
																<div class="text-xs text-gray-500">Fotos do produto</div>
															</div>
														</div>
													</div>
													<button
														onclick={() => enrichField('images')}
														disabled={enrichmentLoading['images']}
														class="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
													>
														{#if enrichmentLoading['images']}
															<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
														{:else}
															✨ Enriquecer
														{/if}
													</button>
												</div>
											</div>
										</div>

										<!-- Info Box -->
										<div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
											<div class="flex items-start space-x-4">
												<div class="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
													<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</div>
												<div class="flex-1">
													<h4 class="text-lg font-semibold text-blue-900 mb-2">Como funciona o enriquecimento?</h4>
													<div class="text-sm text-blue-800 space-y-2">
														<p>• <strong>MongoDB primeiro:</strong> Busca dados existentes da migração (prioridade alta)</p>
														<p>• <strong>IA como backup:</strong> Gera conteúdo contextual quando necessário</p>
														<p>• <strong>Tipos inteligentes:</strong> Processa strings, arrays e objetos automaticamente</p>
														<p>• <strong>Salva no PostgreSQL:</strong> Todos os dados são persistidos na base principal</p>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						{/if}
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
					<div class="space-y-6">
						{#if editingProduct}
							<div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
								<p class="text-sm text-purple-800">
									🎯 <strong>SEO Inteligente:</strong> Use a IA para gerar títulos, descrições e palavras-chave otimizadas para SEO.
								</p>
							</div>
						{/if}

						<!-- Título SEO -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-medium text-gray-700">
									Título SEO
								</label>
								{#if editingProduct}
									<button
										onclick={() => enrichField('seo_title')}
										disabled={enrichmentLoading['seo_title']}
										class="btn btn-xs btn-secondary flex items-center gap-1"
									>
										{#if enrichmentLoading['seo_title']}
											<div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
										{:else if formData.seo.title}
											<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2m-15.356-2H9" />
											</svg>
											Atualizar
										{:else}
											<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
											</svg>
											Enriquecer
										{/if}
									</button>
								{/if}
							</div>
							<input
								type="text"
								bind:value={formData.seo.title}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Título otimizado para SEO (máximo 60 caracteres)"
								maxlength="60"
							/>
							<p class="text-xs text-gray-500 mt-1">
								{formData.seo.title.length}/60 caracteres
							</p>
						</div>

						<!-- Descrição SEO -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-medium text-gray-700">
									Meta Descrição
								</label>
								{#if editingProduct}
									<button
										onclick={() => enrichField('seo_description')}
										disabled={enrichmentLoading['seo_description']}
										class="btn btn-xs btn-secondary flex items-center gap-1"
									>
										{#if enrichmentLoading['seo_description']}
											<div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
										{:else if formData.seo.description}
											<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2m-15.356-2H9" />
											</svg>
											Atualizar
										{:else}
											<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
											</svg>
											Enriquecer
										{/if}
									</button>
								{/if}
							</div>
							<textarea
								bind:value={formData.seo.description}
								rows="4"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Descrição que aparece nos resultados de busca (máximo 160 caracteres)"
								maxlength="160"
							></textarea>
							<p class="text-xs text-gray-500 mt-1">
								{formData.seo.description.length}/160 caracteres
							</p>
						</div>

						<!-- Palavras-chave SEO -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-medium text-gray-700">
									Palavras-chave
								</label>
								{#if editingProduct}
									<button
										onclick={() => enrichField('seo_keywords')}
										disabled={enrichmentLoading['seo_keywords']}
										class="btn btn-xs btn-secondary flex items-center gap-1"
									>
										{#if enrichmentLoading['seo_keywords']}
											<div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
										{:else if formData.seo.keywords}
											<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2m-15.356-2H9" />
											</svg>
											Atualizar
										{:else}
											<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
											</svg>
											Enriquecer
										{/if}
									</button>
								{/if}
							</div>
							<input
								type="text"
								bind:value={formData.seo.keywords}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								placeholder="Palavras-chave separadas por vírgula"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Exemplo: produto infantil, brinquedo educativo, seguro
							</p>
						</div>

						<!-- Preview do SEO -->
						{#if formData.seo.title || formData.seo.description}
							<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<h4 class="text-sm font-medium text-gray-700 mb-2">📱 Preview nos Resultados de Busca:</h4>
								<div class="bg-white p-4 rounded border">
									<h3 class="text-lg text-blue-600 underline cursor-pointer">
										{formData.seo.title || formData.name || 'Título do produto'}
									</h3>
									<p class="text-xs text-green-600 mt-1">
										marketplace.com › produto › {formData.slug || 'produto'}
									</p>
									<p class="text-sm text-gray-600 mt-2">
										{formData.seo.description || 'Meta descrição do produto aparecerá aqui...'}
									</p>
								</div>
							</div>
						{/if}
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
			
			<!-- Footer Redesenhado e Moderno -->
			<div class="relative bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-8">
				<!-- Background decorativo sutil -->
				<div class="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-white/50"></div>
				
				<div class="relative flex flex-col sm:flex-row items-center justify-between gap-6">
					<!-- Status do produto -->
					<div class="flex items-center space-x-6">
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