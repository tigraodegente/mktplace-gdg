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
	interface Page {
		id: string;
		title: string;
		slug: string;
		content: string;
		meta_title?: string;
		meta_description?: string;
		is_published: boolean;
		type: 'page' | 'blog';
		created_at: string;
		updated_at: string;
		views?: number;
	}
	
	interface StatCard {
		title: string;
		value: string | number;
		change?: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
	}
	
	interface Filter {
		search: string;
		type: string;
		status: string;
	}
	
	// Estado
	let pages = $state<Page[]>([]);
	let filteredPages = $state<Page[]>([]);
	let loading = $state(true);
	let selectedPages = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(true);
	let showCreateModal = $state(false);
	let editingPage = $state<Page | null>(null);
	let userRole = $state<'admin' | 'vendor'>('admin');
	let activeTab = $state<'pages' | 'blog'>('pages');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		type: 'all',
		status: 'all'
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	
	// Stats
	let stats = $state<StatCard[]>([]);
	
	// Formulário
	let form = $state({
		title: '',
		slug: '',
		content: '',
		meta_title: '',
		meta_description: '',
		is_published: false,
		type: 'page' as 'page' | 'blog'
	});
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadPages();
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...pages];
		
		// Busca
		if (filters.search) {
			result = result.filter(page => 
				page.title.toLowerCase().includes(filters.search.toLowerCase()) || 
				page.slug.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Tipo
		if (filters.type !== 'all') {
			result = result.filter(page => page.type === filters.type);
		}
		
		// Status
		if (filters.status === 'published') {
			result = result.filter(page => page.is_published);
		} else if (filters.status === 'draft') {
			result = result.filter(page => !page.is_published);
		}
		
		filteredPages = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		// Atualizar estatísticas
		updateStats(result);
	});
	
	onMount(() => {
		loadPages();
	});
	
	async function loadPages() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock
			pages = Array.from({ length: 20 }, (_, i) => ({
				id: `page-${i + 1}`,
				title: i < 5 ? `Página ${i + 1}` : `Post do Blog ${i - 4}`,
				slug: i < 5 ? `pagina-${i + 1}` : `post-${i - 4}`,
				content: '<p>Conteúdo da página...</p>',
				meta_title: `Meta Title ${i + 1}`,
				meta_description: `Meta description da página ${i + 1}`,
				is_published: Math.random() > 0.3,
				type: i < 5 ? 'page' : 'blog',
				created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
				views: Math.floor(Math.random() * 5000)
			}));
			
			loading = false;
		}, 1000);
	}
	
	function updateStats(pgs: Page[]) {
		const totalPages = pgs.filter(p => p.type === 'page').length;
		const totalBlogPosts = pgs.filter(p => p.type === 'blog').length;
		const publishedPages = pgs.filter(p => p.is_published).length;
		const totalViews = pgs.reduce((sum, p) => sum + (p.views || 0), 0);
		
		stats = [
			{
				title: 'Total de Páginas',
				value: totalPages,
				change: 5,
				icon: '📄',
				color: 'primary'
			},
			{
				title: 'Posts do Blog',
				value: totalBlogPosts,
				change: 12,
				icon: '📝',
				color: 'info'
			},
			{
				title: 'Publicadas',
				value: publishedPages,
				change: 8,
				icon: '✅',
				color: 'success'
			},
			{
				title: 'Visualizações',
				value: totalViews.toLocaleString('pt-BR'),
				change: 15,
				icon: '👁️',
				color: 'warning'
			}
		];
	}
	
	function togglePageSelection(id: string) {
		const newSet = new Set(selectedPages);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedPages = newSet;
	}
	
	function toggleAllPages() {
		if (selectedPages.size === paginatedPages.length) {
			selectedPages = new Set();
		} else {
			selectedPages = new Set(paginatedPages.map(p => p.id));
		}
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
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	function formatDateTime(date: string) {
		return new Date(date).toLocaleString('pt-BR');
	}
	
	// Páginas paginadas
	const paginatedPages = $derived(
		filteredPages.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Modal functions
	function openCreateModal(type: 'page' | 'blog' = 'page') {
		form = {
			title: '',
			slug: type === 'blog' ? 'blog/' : '',
			content: '',
			meta_title: '',
			meta_description: '',
			is_published: false,
			type
		};
		editingPage = null;
		showCreateModal = true;
	}
	
	function openEditModal(pageToEdit: Page) {
		form = { 
			title: pageToEdit.title,
			slug: pageToEdit.slug,
			content: pageToEdit.content,
			meta_title: pageToEdit.meta_title || '',
			meta_description: pageToEdit.meta_description || '',
			is_published: pageToEdit.is_published,
			type: pageToEdit.type
		};
		editingPage = pageToEdit;
		showCreateModal = true;
	}
	
	function closeModal() {
		showCreateModal = false;
		editingPage = null;
	}
	
	function generateSlug() {
		if (!form.title) return;
		
		const baseSlug = form.title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove acentos
			.replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
			.replace(/\s+/g, '-') // Substitui espaços por hifens
			.replace(/-+/g, '-') // Remove hifens duplicados
			.trim();
		
		form.slug = form.type === 'blog' ? `blog/${baseSlug}` : baseSlug;
	}
	
	async function savePage() {
		console.log('Salvando página:', form);
		// Implementar salvamento
		loadPages();
		closeModal();
	}
	
	async function deletePage(pageToDelete: Page) {
		if (confirm(`Tem certeza que deseja excluir "${pageToDelete.title}"?`)) {
			console.log('Excluindo página:', pageToDelete);
			// Implementar exclusão
			loadPages();
		}
	}
	
	async function bulkPublish() {
		console.log('Publicando', selectedPages.size, 'páginas');
		selectedPages = new Set();
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedPages.size} páginas?`)) {
			console.log('Excluindo', selectedPages.size, 'páginas');
			selectedPages = new Set();
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão de Páginas' : 'Minhas Páginas'}
			</h1>
			<p class="text-gray-600 mt-1">Gerencie as páginas estáticas e posts do blog</p>
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
			
			<!-- Add Page -->
			<button 
				onclick={() => openCreateModal('page')}
				class="btn btn-primary"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Nova Página
			</button>
			
			<!-- Add Blog Post -->
			<button 
				onclick={() => openCreateModal('blog')}
				class="btn btn-success"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Novo Post
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
	
	<!-- Filters -->
	{#if showFilters}
		<div class="card" transition:slide={{ duration: 300 }}>
			<div class="card-body">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<!-- Search -->
					<div>
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="Título ou slug..."
							class="input"
						/>
					</div>
					
					<!-- Type -->
					<div>
						<label class="label">Tipo</label>
						<select bind:value={filters.type} class="input">
							<option value="all">Todos</option>
							<option value="page">Páginas</option>
							<option value="blog">Blog</option>
						</select>
					</div>
					
					<!-- Status -->
					<div>
						<label class="label">Status</label>
						<select bind:value={filters.status} class="input">
							<option value="all">Todos</option>
							<option value="published">Publicado</option>
							<option value="draft">Rascunho</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Actions -->
	{#if selectedPages.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedPages.size} {selectedPages.size === 1 ? 'página selecionada' : 'páginas selecionadas'}
					</p>
					<div class="flex items-center gap-2">
						<button 
							onclick={bulkPublish}
							class="btn btn-sm btn-ghost text-green-600"
						>
							Publicar
						</button>
						<button 
							onclick={bulkDelete}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Excluir
						</button>
						<button 
							onclick={() => selectedPages = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Pages Table/Grid -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando páginas...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if filteredPages.length === 0}
		<div class="card">
			<div class="card-body text-center py-12">
				<div class="text-4xl mb-4">📄</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma página encontrada</h3>
				<p class="text-gray-600 mb-4">Crie sua primeira página estática ou post do blog.</p>
				<div class="flex items-center justify-center gap-3">
					<button 
						onclick={() => openCreateModal('page')}
						class="btn btn-primary"
					>
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Criar Página
					</button>
					<button 
						onclick={() => openCreateModal('blog')}
						class="btn btn-success"
					>
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Criar Post
					</button>
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
									checked={selectedPages.size === paginatedPages.length && paginatedPages.length > 0}
									onchange={toggleAllPages}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
							<th>Título</th>
							<th>Tipo</th>
							<th>Status</th>
							<th>Visualizações</th>
							<th>Atualizado</th>
							<th class="text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedPages as page, i}
							<tr 
								class="hover:bg-gray-50 transition-colors"
								in:fly={{ x: -20, duration: 400, delay: i * 50 }}
							>
								<td>
									<input
										type="checkbox"
										checked={selectedPages.has(page.id)}
										onchange={() => togglePageSelection(page.id)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 bg-gradient-to-br {page.type === 'page' ? 'from-cyan-500 to-cyan-600' : 'from-green-500 to-green-600'} rounded-lg flex items-center justify-center text-white">
											{page.type === 'page' ? '📄' : '📝'}
										</div>
										<div>
											<p class="font-medium text-gray-900">{page.title}</p>
											<p class="text-sm text-gray-500">/{page.slug}</p>
										</div>
									</div>
								</td>
								<td>
									<span class="badge {page.type === 'page' ? 'badge-info' : 'badge-success'}">
										{page.type === 'page' ? 'Página' : 'Blog'}
									</span>
								</td>
								<td>
									<span class="badge {page.is_published ? 'badge-success' : 'badge-warning'}">
										{page.is_published ? 'Publicado' : 'Rascunho'}
									</span>
								</td>
								<td class="text-gray-600">{page.views?.toLocaleString('pt-BR') || 0}</td>
								<td class="text-sm text-gray-600">{formatDate(page.updated_at)}</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										{#if page.is_published}
											<a 
												href="/{page.slug}" 
												target="_blank"
												class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
												title="Ver página"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
												</svg>
											</a>
										{/if}
										<button
											onclick={() => openEditModal(page)}
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Editar"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											onclick={() => deletePage(page)}
											class="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-105 text-red-600"
											title="Excluir"
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
			
			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="px-6 py-4 border-t border-gray-200">
					<div class="flex items-center justify-between">
						<p class="text-sm text-gray-700">
							Mostrando <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até 
							<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredPages.length)}</span> de 
							<span class="font-medium">{filteredPages.length}</span> resultados
						</p>
						<div class="flex items-center gap-2">
							<button
								onclick={() => currentPage = Math.max(1, currentPage - 1)}
								disabled={currentPage === 1}
								class="btn btn-sm btn-ghost"
							>
								Anterior
							</button>
							<div class="flex gap-1">
								{#each Array(Math.min(5, totalPages)) as _, i}
									<button
										onclick={() => currentPage = i + 1}
										class="w-8 h-8 rounded {currentPage === i + 1 ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'} transition-all"
									>
										{i + 1}
									</button>
								{/each}
							</div>
							<button
								onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
								disabled={currentPage === totalPages}
								class="btn btn-sm btn-ghost"
							>
								Próximo
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Grid View -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each paginatedPages as page, i}
				<div 
					class="card hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
					in:scale={{ duration: 400, delay: i * 50, easing: backOut }}
				>
					<div class="card-body">
						<div class="flex items-start justify-between mb-4">
							<div class="w-12 h-12 bg-gradient-to-br {page.type === 'page' ? 'from-cyan-500 to-cyan-600' : 'from-green-500 to-green-600'} rounded-lg flex items-center justify-center text-white text-2xl">
								{page.type === 'page' ? '📄' : '📝'}
							</div>
							<span class="badge {page.is_published ? 'badge-success' : 'badge-warning'}">
								{page.is_published ? 'Publicado' : 'Rascunho'}
							</span>
						</div>
						
						<h3 class="font-semibold text-gray-900 mb-1">{page.title}</h3>
						<p class="text-sm text-gray-500 mb-4">/{page.slug}</p>
						
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">Tipo:</span>
								<span class="font-medium">{page.type === 'page' ? 'Página' : 'Blog'}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Visualizações:</span>
								<span class="font-medium">{page.views?.toLocaleString('pt-BR') || 0}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Atualizado:</span>
								<span class="font-medium">{formatDate(page.updated_at)}</span>
							</div>
						</div>
						
						<div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
							<button onclick={() => openEditModal(page)} class="btn btn-sm btn-ghost flex-1">
								Editar
							</button>
							{#if page.is_published}
								<a href="/{page.slug}" target="_blank" class="btn btn-sm btn-primary flex-1">
									Visualizar
								</a>
							{:else}
								<button class="btn btn-sm btn-primary flex-1">
									Publicar
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal de criar/editar -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 200 }}>
		<div 
			class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
			in:scale={{ duration: 300, easing: backOut }}
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900">
						{editingPage ? 'Editar' : 'Nova'} {form.type === 'page' ? 'Página' : 'Post do Blog'}
					</h2>
					<button 
						onclick={closeModal}
						class="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<form onsubmit={(e) => { e.preventDefault(); savePage(); }} class="space-y-6">
					<!-- Título -->
					<div>
						<label class="label">Título *</label>
						<input 
							type="text" 
							bind:value={form.title}
							onblur={generateSlug}
							class="input"
							required
						/>
					</div>
					
					<!-- Slug -->
					<div>
						<label class="label">URL (Slug) *</label>
						<div class="flex">
							<span class="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
								/
							</span>
							<input 
								type="text" 
								bind:value={form.slug}
								class="flex-1 rounded-l-none input"
								required
							/>
						</div>
					</div>
					
					<!-- Meta Title -->
					<div>
						<label class="label">Meta Title (SEO)</label>
						<input 
							type="text" 
							bind:value={form.meta_title}
							class="input"
							placeholder="Se vazio, será usado o título da página"
						/>
					</div>
					
					<!-- Meta Description -->
					<div>
						<label class="label">Meta Description (SEO)</label>
						<textarea 
							bind:value={form.meta_description}
							rows="3"
							class="input"
							placeholder="Descrição para aparecer nos resultados de busca"
						></textarea>
					</div>
					
					<!-- Conteúdo -->
					<div>
						<label class="label">Conteúdo (HTML) *</label>
						<textarea 
							bind:value={form.content}
							rows="15"
							class="input font-mono text-sm"
							placeholder="Cole aqui o conteúdo HTML da página..."
							required
						></textarea>
						<p class="help-text">
							Você pode usar HTML completo. Use classes do Tailwind CSS para estilização.
						</p>
					</div>
					
					<!-- Publicado -->
					<div class="flex items-center">
						<input 
							type="checkbox" 
							bind:checked={form.is_published}
							id="is_published"
							class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
						/>
						<label for="is_published" class="ml-2 text-sm font-medium text-gray-700">
							Publicar página (tornar visível no site)
						</label>
					</div>
					
					<!-- Botões -->
					<div class="flex justify-end gap-3 pt-6">
						<button 
							type="button"
							onclick={closeModal}
							class="btn btn-ghost"
						>
							Cancelar
						</button>
						<button 
							type="submit"
							class="btn btn-primary"
						>
							{editingPage ? 'Atualizar' : 'Criar'} {form.type === 'page' ? 'Página' : 'Post'}
						</button>
					</div>
				</form>
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