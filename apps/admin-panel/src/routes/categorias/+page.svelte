<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	
	// Crossfade para transições entre views
	const [send, receive] = crossfade({
		duration: 400,
		fallback(node) {
			return blur(node, { amount: 10, duration: 400 });
		}
	});
	
	// Interfaces
	interface Category {
		id: string;
		name: string;
		slug: string;
		description?: string;
		parent_id?: string | null;
		image?: string;
		icon?: string;
		product_count: number;
		is_active: boolean;
		order: number;
		children?: Category[];
		level?: number;
		expanded?: boolean;
	}
	
	interface StatCard {
		title: string;
		value: string | number;
		change?: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
	}
	
	// Estado
	let categories = $state<Category[]>([]);
	let flatCategories = $state<Category[]>([]);
	let loading = $state(true);
	let selectedCategories = $state<Set<string>>(new Set());
	let expandedCategories = $state<Set<string>>(new Set());
	let draggedCategory = $state<Category | null>(null);
	let dragOverCategory = $state<string | null>(null);
	let userRole = $state<'admin' | 'vendor'>('admin');
	let searchQuery = $state('');
	let showInactive = $state(false);
	
	// Stats
	let stats = $state<StatCard[]>([]);
	
	// Modal states
	let showCreateModal = $state(false);
	let editingCategory = $state<Category | null>(null);
	let formData = $state({
		name: '',
		slug: '',
		description: '',
		parentId: null as string | null,
		icon: '📁',
		color: '#3B82F6',
		isActive: true,
		seo: {
			title: '',
			description: '',
			keywords: ''
		}
	});
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadCategories();
	});
	
	onMount(() => {
		loadCategories();
	});
	
	async function loadCategories() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock com hierarquia
			const mockCategories: Category[] = [
				{
					id: 'cat-1',
					name: 'Eletrônicos',
					slug: 'eletronicos',
					icon: '📱',
					product_count: 1234,
					is_active: true,
					order: 1,
					children: [
						{
							id: 'cat-1-1',
							name: 'Smartphones',
							slug: 'smartphones',
							parent_id: 'cat-1',
							icon: '📱',
							product_count: 456,
							is_active: true,
							order: 1
						},
						{
							id: 'cat-1-2',
							name: 'Notebooks',
							slug: 'notebooks',
							parent_id: 'cat-1',
							icon: '💻',
							product_count: 234,
							is_active: true,
							order: 2
						},
						{
							id: 'cat-1-3',
							name: 'Acessórios',
							slug: 'acessorios-eletronicos',
							parent_id: 'cat-1',
							icon: '🎧',
							product_count: 544,
							is_active: true,
							order: 3
						}
					]
				},
				{
					id: 'cat-2',
					name: 'Moda',
					slug: 'moda',
					icon: '👕',
					product_count: 2345,
					is_active: true,
					order: 2,
					children: [
						{
							id: 'cat-2-1',
							name: 'Masculino',
							slug: 'moda-masculina',
							parent_id: 'cat-2',
							icon: '👔',
							product_count: 890,
							is_active: true,
							order: 1
						},
						{
							id: 'cat-2-2',
							name: 'Feminino',
							slug: 'moda-feminina',
							parent_id: 'cat-2',
							icon: '👗',
							product_count: 1455,
							is_active: true,
							order: 2
						}
					]
				},
				{
					id: 'cat-3',
					name: 'Casa e Decoração',
					slug: 'casa-decoracao',
					icon: '🏠',
					product_count: 987,
					is_active: true,
					order: 3
				},
				{
					id: 'cat-4',
					name: 'Esportes',
					slug: 'esportes',
					icon: '⚽',
					product_count: 567,
					is_active: false,
					order: 4
				}
			];
			
			categories = buildCategoryTree(mockCategories);
			updateStats();
			loading = false;
		}, 1000);
	}
	
	function buildCategoryTree(cats: Category[]): Category[] {
		const categoryMap = new Map<string, Category>();
		const roots: Category[] = [];
		
		// Primeiro, mapear todas as categorias
		cats.forEach(cat => {
			categoryMap.set(cat.id, { ...cat, children: [], expanded: true, level: 0 });
		});
		
		// Construir a árvore
		cats.forEach(cat => {
			const category = categoryMap.get(cat.id)!;
			if (cat.parent_id) {
				const parent = categoryMap.get(cat.parent_id);
				if (parent) {
					parent.children = parent.children || [];
					parent.children.push(category);
					category.level = (parent.level || 0) + 1;
				}
			} else {
				roots.push(category);
			}
		});
		
		// Ordenar por order
		const sortCategories = (cats: Category[]) => {
			cats.sort((a, b) => a.order - b.order);
			cats.forEach(cat => {
				if (cat.children?.length) {
					sortCategories(cat.children);
				}
			});
		};
		
		sortCategories(roots);
		
		// Criar lista flat para facilitar busca
		flatCategories = [];
		const flatten = (cats: Category[]) => {
			cats.forEach(cat => {
				flatCategories.push(cat);
				if (cat.children?.length) {
					flatten(cat.children);
				}
			});
		};
		flatten(roots);
		
		return roots;
	}
	
	function updateStats() {
		const totalCategories = flatCategories.length;
		const activeCategories = flatCategories.filter(c => c.is_active).length;
		const totalProducts = flatCategories.reduce((sum, c) => sum + c.product_count, 0);
		const topCategory = flatCategories.reduce((max, c) => c.product_count > max.product_count ? c : max, flatCategories[0]);
		
		stats = [
			{
				title: 'Total de Categorias',
				value: totalCategories,
				change: 5,
				icon: '📁',
				color: 'primary'
			},
			{
				title: 'Categorias Ativas',
				value: activeCategories,
				change: 2,
				icon: '✅',
				color: 'success'
			},
			{
				title: 'Total de Produtos',
				value: totalProducts.toLocaleString('pt-BR'),
				change: 15,
				icon: '📦',
				color: 'info'
			},
			{
				title: 'Categoria Popular',
				value: topCategory?.name || '-',
				icon: '🏆',
				color: 'warning'
			}
		];
	}
	
	function toggleCategory(category: Category) {
		category.expanded = !category.expanded;
		categories = [...categories];
	}
	
	function toggleCategorySelection(id: string) {
		const newSet = new Set(selectedCategories);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedCategories = newSet;
	}
	
	// Drag & Drop
	function handleDragStart(event: DragEvent, category: Category) {
		draggedCategory = category;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}
	
	function handleDragOver(event: DragEvent, category: Category) {
		event.preventDefault();
		dragOverCategory = category.id;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}
	
	function handleDragLeave() {
		dragOverCategory = null;
	}
	
	function handleDrop(event: DragEvent, targetCategory: Category) {
		event.preventDefault();
		
		if (draggedCategory && draggedCategory.id !== targetCategory.id) {
			console.log(`Movendo ${draggedCategory.name} para ${targetCategory.name}`);
			// Implementar lógica de reordenação
		}
		
		draggedCategory = null;
		dragOverCategory = null;
	}
	
	function getColorClasses(color: string) {
		const colors = {
			primary: 'from-cyan-500 to-cyan-600',
			success: 'from-green-500 to-green-600',
			warning: 'from-yellow-500 to-yellow-600',
			danger: 'from-red-500 to-red-600',
			info: 'from-blue-500 to-blue-600'
		};
		return colors[color as keyof typeof colors] || colors.primary;
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
	
	function openCreateModal(parent?: Category) {
		formData = {
			name: '',
			slug: '',
			description: '',
			parentId: parent?.id || null,
			icon: '📁',
			color: '#3B82F6',
			isActive: true,
			seo: {
				title: '',
				description: '',
				keywords: ''
			}
		};
		editingCategory = null;
		showCreateModal = true;
	}
	
	function openEditModal(category: Category) {
		formData = {
			name: category.name,
			slug: category.slug,
			description: category.description || '',
			parentId: category.parent_id || null,
			icon: category.icon || '📁',
			color: '#3B82F6',
			isActive: category.is_active,
			seo: {
				title: '',
				description: '',
				keywords: ''
			}
		};
		editingCategory = category;
		showCreateModal = true;
	}
	
	function closeModal() {
		showCreateModal = false;
		editingCategory = null;
		// Reset form
		formData = {
			name: '',
			slug: '',
			description: '',
			parentId: null,
			icon: '📁',
			color: '#3B82F6',
			isActive: true,
			seo: {
				title: '',
				description: '',
				keywords: ''
			}
		};
	}
	
	async function saveCategory() {
		// Validações
		if (!formData.name.trim() || !formData.slug.trim()) {
			alert('Nome e slug são obrigatórios');
			return;
		}
		
		console.log('Salvando categoria:', formData);
		// Simular salvamento
		setTimeout(() => {
			alert(editingCategory ? 'Categoria atualizada!' : 'Categoria criada!');
			loadCategories();
			closeModal();
		}, 500);
	}
	
	function getCategoryIcon(category: Category): string {
		// Mapa de ícones por categoria
		const iconMap: Record<string, string> = {
			'Eletrônicos': '📱',
			'Smartphones': '📱', 
			'Notebooks': '💻',
			'Tablets': '📱',
			'Acessórios': '🎧',
			'Fones de Ouvido': '🎧',
			'Capas': '📱',
			'Cabos': '🔌',
			'Casa e Decoração': '🏠',
			'Móveis': '🪑',
			'Sofás': '🛋️',
			'Mesas': '🪑',
			'Cadeiras': '🪑',
			'Decoração': '🖼️',
			'Quadros': '🖼️',
			'Vasos': '🏺',
			'Luminárias': '💡',
			'Moda': '👕',
			'Roupas': '👔',
			'Masculino': '👔',
			'Feminino': '👗',
			'Infantil': '👶',
			'Calçados': '👟',
			'Tênis': '👟',
			'Sapatos': '👞',
			'Sandálias': '🩴',
			'Beleza e Saúde': '💄',
			'Maquiagem': '💄',
			'Perfumes': '🌸',
			'Cuidados': '🧴'
		};
		
		return category.icon || iconMap[category.name] || '📁';
	}
	
	async function deleteCategory(category: Category) {
		if (category.children?.length) {
			alert('Não é possível excluir uma categoria que possui subcategorias.');
			return;
		}
		
		if (category.product_count > 0) {
			alert('Não é possível excluir uma categoria que possui produtos.');
			return;
		}
		
		if (confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
			console.log('Excluindo categoria:', category);
			loadCategories();
		}
	}
	
	async function toggleCategoryStatus(category: Category) {
		category.is_active = !category.is_active;
		console.log('Alterando status da categoria:', category);
		categories = [...categories];
	}
	
	// Categorias filtradas
	const filteredCategories = $derived(() => {
		if (!searchQuery && showInactive) return categories;
		
		const filterTree = (cats: Category[]): Category[] => {
			return cats.filter(cat => {
				const matchesSearch = !searchQuery || 
					cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					cat.slug.toLowerCase().includes(searchQuery.toLowerCase());
				
				const matchesStatus = showInactive || cat.is_active;
				
				// Se tem filhos, filtrar recursivamente
				if (cat.children?.length) {
					const filteredChildren = filterTree(cat.children);
					if (filteredChildren.length > 0) {
						cat.children = filteredChildren;
						return true;
					}
				}
				
				return matchesSearch && matchesStatus;
			});
		};
		
		return filterTree([...categories]);
	});
	
	// Componente recursivo para renderizar categorias
	function CategoryTree({ categories: cats, level = 0 }: { categories: Category[], level?: number }) {
		return {
			// Implementado inline no template
		};
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Gestão de Categorias</h1>
			<p class="text-gray-600 mt-1">Organize a estrutura de categorias do marketplace</p>
		</div>
		
		<div class="flex items-center gap-3">
			<button 
				onclick={() => openCreateModal()}
				class="btn btn-primary"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Nova Categoria
			</button>
		</div>
	</div>
	
	<!-- Stats Cards -->
	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each Array(4) as _, i}
				<div class="stat-card animate-pulse">
					<div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
					<div class="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
					<div class="h-3 bg-gray-200 rounded w-1/3"></div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each stats as stat, i (stat.title)}
				<div 
					class="stat-card group"
					in:fly={{ y: 50, duration: 500, delay: 200 + i * 100, easing: backOut }}
					out:scale={{ duration: 200 }}
				>
					<div class="relative z-10">
						<div class="flex items-center justify-between mb-4">
							<div class="text-2xl transform group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
							{#if stat.change}
								<div class="flex items-center gap-1" in:fade={{ duration: 300, delay: 400 + i * 100 }}>
									{#if stat.change > 0}
										<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										<span class="text-sm font-semibold text-green-500">+{stat.change}%</span>
									{:else}
										<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
										</svg>
										<span class="text-sm font-semibold text-red-500">{stat.change}%</span>
									{/if}
								</div>
							{/if}
						</div>
						<h3 class="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
						<p class="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:scale-105">{stat.value}</p>
					</div>
					
					<!-- Background decoration -->
					<div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br {getColorClasses(stat.color)} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500"></div>
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Search and Filters -->
	<div class="card">
		<div class="card-body">
			<div class="flex flex-col md:flex-row gap-4">
				<div class="flex-1">
					<div class="relative">
						<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Buscar categorias..."
							class="input pl-10"
						/>
					</div>
				</div>
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={showInactive}
						class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
					/>
					<span class="text-sm font-medium text-gray-700">Mostrar categorias inativas</span>
				</label>
			</div>
		</div>
	</div>
	
	<!-- Categories Tree -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando categorias...</p>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="card">
			<div class="card-body">
				<div class="space-y-1">
					{#each filteredCategories() as category (category.id)}
						<div animate:flip={{ duration: 300 }}>
							<div
								class="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 {dragOverCategory === category.id ? 'bg-cyan-50 ring-2 ring-cyan-500' : ''}"
								draggable="true"
								ondragstart={(e) => handleDragStart(e, category)}
								ondragover={(e) => handleDragOver(e, category)}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, category)}
							>
								<!-- Expand/Collapse -->
								{#if category.children?.length}
									<button
										onclick={() => toggleCategory(category)}
										class="p-1 hover:bg-gray-200 rounded transition-all duration-200"
									>
										<svg 
											class="w-4 h-4 transition-transform duration-200 {category.expanded ? 'rotate-90' : ''}" 
											fill="none" 
											stroke="currentColor" 
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</button>
								{:else}
									<div class="w-6"></div>
								{/if}
								
								<!-- Checkbox -->
								<input
									type="checkbox"
									checked={selectedCategories.has(category.id)}
									onchange={() => toggleCategorySelection(category.id)}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
								
								<!-- Icon -->
								<div class="text-2xl">{category.icon || '📁'}</div>
								
								<!-- Name and Info -->
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<h3 class="font-medium text-gray-900">{category.name}</h3>
										{#if !category.is_active}
											<span class="badge badge-danger badge-sm">Inativa</span>
										{/if}
									</div>
									<p class="text-sm text-gray-500">
										/{category.slug} • {category.product_count} produtos
									</p>
								</div>
								
								<!-- Actions -->
								<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										onclick={() => openCreateModal(category)}
										class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
										title="Adicionar subcategoria"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
									</button>
									<button
										onclick={() => openEditModal(category)}
										class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
										title="Editar"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									<button
										onclick={() => toggleCategoryStatus(category)}
										class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
										title={category.is_active ? 'Desativar' : 'Ativar'}
									>
										<svg class="w-4 h-4 {category.is_active ? 'text-green-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</button>
									<button
										onclick={() => deleteCategory(category)}
										class="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-105 text-red-600"
										title="Excluir"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							</div>
							
							<!-- Children -->
							{#if category.expanded && category.children?.length}
								<div class="ml-8" transition:slide={{ duration: 200 }}>
									{#each category.children as child (child.id)}
										<div
											class="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 ml-{(child.level || 0) * 8}"
											draggable="true"
											ondragstart={(e) => handleDragStart(e, child)}
											ondragover={(e) => handleDragOver(e, child)}
											ondragleave={handleDragLeave}
											ondrop={(e) => handleDrop(e, child)}
										>
											<!-- Spacer para subcategorias sem filhos -->
											<div class="w-6"></div>
											
											<!-- Checkbox -->
											<input
												type="checkbox"
												checked={selectedCategories.has(child.id)}
												onchange={() => toggleCategorySelection(child.id)}
												class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
											/>
											
											<!-- Icon -->
											<div class="text-xl">{child.icon || '📄'}</div>
											
											<!-- Name and Info -->
											<div class="flex-1">
												<div class="flex items-center gap-2">
													<h3 class="font-medium text-gray-900">{child.name}</h3>
													{#if !child.is_active}
														<span class="badge badge-danger badge-sm">Inativa</span>
													{/if}
												</div>
												<p class="text-sm text-gray-500">
													/{child.slug} • {child.product_count} produtos
												</p>
											</div>
											
											<!-- Actions -->
											<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<button
													onclick={() => openEditModal(child)}
													class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
													title="Editar"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
												</button>
												<button
													onclick={() => toggleCategoryStatus(child)}
													class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
													title={child.is_active ? 'Desativar' : 'Ativar'}
												>
													<svg class="w-4 h-4 {child.is_active ? 'text-green-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</button>
												<button
													onclick={() => deleteCategory(child)}
													class="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-105 text-red-600"
													title="Excluir"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Dica de Drag & Drop -->
	<div class="card bg-cyan-50 border-cyan-200">
		<div class="card-body py-4">
			<div class="flex items-center gap-3">
				<svg class="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-sm text-cyan-800">
					<strong>Dica:</strong> Você pode arrastar e soltar categorias para reorganizá-las ou movê-las para outras categorias pai.
				</p>
			</div>
		</div>
	</div>
</div>

<!-- Modal de Criar/Editar Categoria -->
{#if showCreateModal}
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		onclick={closeModal}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
			transition:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold flex items-center gap-3">
						📁 {editingCategory ? 'Editar' : 'Nova'} Categoria
					</h2>
					<button 
						onclick={closeModal}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						✕
					</button>
				</div>
			</div>
			
			<!-- Content -->
			<div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
				<!-- Informações Básicas -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
						📋 Informações Básicas
					</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Nome da Categoria *
							</label>
							<input
								type="text"
								bind:value={formData.name}
								onblur={generateSlug}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
								placeholder="Ex: Eletrônicos"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Slug (URL) *
							</label>
							<input
								type="text"
								bind:value={formData.slug}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
								placeholder="eletronicos"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Categoria Pai
							</label>
							<select
								bind:value={formData.parentId}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							>
								<option value={null}>Nenhuma (categoria principal)</option>
								{#each flatCategories as cat}
									{#if cat.id !== editingCategory?.id}
										<option value={cat.id}>
											{cat.parent_id ? '└─ ' : ''}{cat.name}
										</option>
									{/if}
								{/each}
							</select>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Status
							</label>
							<div class="flex items-center gap-4">
								<label class="flex items-center gap-2">
									<input
										type="radio"
										bind:group={formData.isActive}
										value={true}
										class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
									/>
									<span class="text-sm font-medium text-gray-700">Ativa</span>
								</label>
								<label class="flex items-center gap-2">
									<input
										type="radio"
										bind:group={formData.isActive}
										value={false}
										class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
									/>
									<span class="text-sm font-medium text-gray-700">Inativa</span>
								</label>
							</div>
						</div>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Descrição
						</label>
						<textarea
							bind:value={formData.description}
							rows="3"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							placeholder="Descreva a categoria..."
						></textarea>
					</div>
				</div>
				
				<!-- Visual -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
						�� Aparência
					</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Ícone
							</label>
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={formData.icon}
									class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
									placeholder="📁"
								/>
								<div class="flex gap-1">
									{#each ['📁', '📱', '💻', '🏠', '👕', '🎮', '📚', '🍔', '🏃', '🎨'] as emoji}
										<button
											onclick={() => formData.icon = emoji}
											class="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors {formData.icon === emoji ? 'bg-green-100 border-green-500' : ''}"
										>
											{emoji}
										</button>
									{/each}
								</div>
							</div>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Cor de Destaque
							</label>
							<div class="flex gap-2 items-center">
								<input
									type="color"
									bind:value={formData.color}
									class="w-20 h-10 border border-gray-300 rounded-lg cursor-pointer"
								/>
								<input
									type="text"
									bind:value={formData.color}
									class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
									placeholder="#3B82F6"
								/>
							</div>
						</div>
					</div>
					
					<!-- Preview -->
					<div class="bg-gray-50 rounded-lg p-4">
						<p class="text-sm text-gray-600 mb-2">Preview:</p>
						<div class="flex items-center gap-3">
							<div 
								class="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
								style="background-color: {formData.color}20; color: {formData.color}"
							>
								{formData.icon || '📁'}
							</div>
							<div>
								<p class="font-medium text-gray-900">{formData.name || 'Nome da Categoria'}</p>
								<p class="text-sm text-gray-500">/{formData.slug || 'slug-da-categoria'}</p>
							</div>
						</div>
					</div>
				</div>
				
				<!-- SEO -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
						🔍 Otimização para Buscadores (SEO)
					</h3>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Título SEO
						</label>
						<input
							type="text"
							bind:value={formData.seo.title}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							placeholder="Deixe em branco para usar o nome da categoria"
						/>
						<p class="text-xs text-gray-500 mt-1">
							{formData.seo.title.length}/60 caracteres
						</p>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Descrição SEO
						</label>
						<textarea
							bind:value={formData.seo.description}
							rows="2"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							placeholder="Descrição para mecanismos de busca"
						></textarea>
						<p class="text-xs text-gray-500 mt-1">
							{formData.seo.description.length}/160 caracteres
						</p>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Palavras-chave
						</label>
						<input
							type="text"
							bind:value={formData.seo.keywords}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							placeholder="palavra1, palavra2, palavra3"
						/>
					</div>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="border-t border-gray-200 p-6">
				<div class="flex items-center justify-between">
					<button
						onclick={closeModal}
						class="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						Cancelar
					</button>
					<button
						onclick={saveCategory}
						class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
					>
						{editingCategory ? 'Atualizar' : 'Criar'} Categoria
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Animações customizadas para os cards */
	:global(.stat-card) {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	:global(.stat-card:hover) {
		transform: translateY(-4px) scale(1.02);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}
</style> 