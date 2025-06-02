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
	interface GiftList {
		id: string;
		title: string;
		type: 'baby_shower' | 'wedding' | 'birthday' | 'custom';
		status: 'active' | 'completed' | 'expired' | 'cancelled';
		owner_name: string;
		owner_email: string;
		event_date: string;
		created_at: string;
		total_items: number;
		completed_items: number;
		contribution_count: number;
		contribution_total: number;
		completion_percentage: number;
		visibility: 'public' | 'private';
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
		dateRange: string;
	}
	
	// Estado
	let lists = $state<GiftList[]>([]);
	let filteredLists = $state<GiftList[]>([]);
	let loading = $state(true);
	let selectedLists = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(true);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		type: 'all',
		status: 'all',
		dateRange: 'month'
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	
	// Stats
	let stats = $state<StatCard[]>([]);
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadLists();
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...lists];
		
		// Busca
		if (filters.search) {
			result = result.filter(list => 
				list.title.toLowerCase().includes(filters.search.toLowerCase()) || 
				list.owner_name.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Tipo
		if (filters.type !== 'all') {
			result = result.filter(list => list.type === filters.type);
		}
		
		// Status
		if (filters.status !== 'all') {
			result = result.filter(list => list.status === filters.status);
		}
		
		filteredLists = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		// Atualizar estatísticas
		updateStats(result);
	});
	
	onMount(() => {
		loadLists();
	});
	
	async function loadLists() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock
			lists = Array.from({ length: 30 }, (_, i) => ({
				id: `list-${i + 1}`,
				title: ['Chá de Bebê da Maria', 'Casamento João e Ana', 'Aniversário Pedro', 'Lista Personalizada'][i % 4],
				type: ['baby_shower', 'wedding', 'birthday', 'custom'][i % 4] as any,
				status: ['active', 'completed', 'expired', 'cancelled'][Math.floor(Math.random() * 4)] as any,
				owner_name: `Usuário ${i + 1}`,
				owner_email: `usuario${i + 1}@email.com`,
				event_date: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
				created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				total_items: Math.floor(Math.random() * 50) + 10,
				completed_items: Math.floor(Math.random() * 30),
				contribution_count: Math.floor(Math.random() * 20),
				contribution_total: Math.floor(Math.random() * 5000) + 500,
				completion_percentage: Math.floor(Math.random() * 100),
				visibility: Math.random() > 0.3 ? 'public' : 'private'
			}));
			
			loading = false;
		}, 1000);
	}
	
	function updateStats(lsts: GiftList[]) {
		const totalLists = lsts.length;
		const activeLists = lsts.filter(l => l.status === 'active').length;
		const completedLists = lsts.filter(l => l.status === 'completed').length;
		const totalContributions = lsts.reduce((sum, l) => sum + l.contribution_total, 0);
		
		stats = [
			{
				title: 'Total de Listas',
				value: totalLists,
				change: 5,
				icon: '🎁',
				color: 'primary'
			},
			{
				title: 'Listas Ativas',
				value: activeLists,
				change: 12,
				icon: '✅',
				color: 'success'
			},
			{
				title: 'Listas Completas',
				value: completedLists,
				change: 8,
				icon: '🎉',
				color: 'info'
			},
			{
				title: 'Total Contribuições',
				value: formatPrice(totalContributions),
				change: 25,
				icon: '💰',
				color: 'warning'
			}
		];
	}
	
	function toggleListSelection(id: string) {
		const newSet = new Set(selectedLists);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedLists = newSet;
	}
	
	function toggleAllLists() {
		if (selectedLists.size === paginatedLists.length) {
			selectedLists = new Set();
		} else {
			selectedLists = new Set(paginatedLists.map(l => l.id));
		}
	}
	
	function getTypeIcon(type: string) {
		const icons = {
			baby_shower: '👶',
			wedding: '💒',
			birthday: '🎂',
			custom: '🎁'
		};
		return icons[type as keyof typeof icons] || '🎁';
	}
	
	function getTypeLabel(type: string) {
		const labels = {
			baby_shower: 'Chá de Bebê',
			wedding: 'Casamento',
			birthday: 'Aniversário',
			custom: 'Personalizado'
		};
		return labels[type as keyof typeof labels] || type;
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			active: 'badge-success',
			completed: 'badge-info',
			expired: 'badge-warning',
			cancelled: 'badge-danger'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			active: 'Ativa',
			completed: 'Completa',
			expired: 'Expirada',
			cancelled: 'Cancelada'
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
	
	// Listas paginadas
	const paginatedLists = $derived(
		filteredLists.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Ações
	async function viewList(list: GiftList) {
		console.log('Ver lista:', list);
		// Implementar visualização
	}
	
	async function suspendList(list: GiftList) {
		if (confirm(`Tem certeza que deseja suspender a lista "${list.title}"?`)) {
			console.log('Suspender lista:', list);
			// Implementar suspensão
		}
	}
	
	async function bulkSuspend() {
		console.log('Suspendendo', selectedLists.size, 'listas');
		selectedLists = new Set();
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedLists.size} listas?`)) {
			console.log('Excluindo', selectedLists.size, 'listas');
			selectedLists = new Set();
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão de Listas de Presentes' : 'Listas de Presentes'}
			</h1>
			<p class="text-gray-600 mt-1">Gerencie todas as listas de presentes da plataforma</p>
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
			
			<!-- Export -->
			<button class="btn btn-primary">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				Exportar
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
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Search -->
					<div>
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="Título ou proprietário..."
							class="input"
						/>
					</div>
					
					<!-- Type -->
					<div>
						<label class="label">Tipo</label>
						<select bind:value={filters.type} class="input">
							<option value="all">Todos os tipos</option>
							<option value="baby_shower">Chá de Bebê</option>
							<option value="wedding">Casamento</option>
							<option value="birthday">Aniversário</option>
							<option value="custom">Personalizado</option>
						</select>
					</div>
					
					<!-- Status -->
					<div>
						<label class="label">Status</label>
						<select bind:value={filters.status} class="input">
							<option value="all">Todos os status</option>
							<option value="active">Ativa</option>
							<option value="completed">Completa</option>
							<option value="expired">Expirada</option>
							<option value="cancelled">Cancelada</option>
						</select>
					</div>
					
					<!-- Date Range -->
					<div>
						<label class="label">Período</label>
						<select bind:value={filters.dateRange} class="input">
							<option value="today">Hoje</option>
							<option value="week">Esta Semana</option>
							<option value="month">Este Mês</option>
							<option value="year">Este Ano</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Actions -->
	{#if selectedLists.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedLists.size} {selectedLists.size === 1 ? 'lista selecionada' : 'listas selecionadas'}
					</p>
					<div class="flex items-center gap-2">
						<button 
							onclick={bulkSuspend}
							class="btn btn-sm btn-ghost text-yellow-600"
						>
							Suspender
						</button>
						<button 
							onclick={bulkDelete}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Excluir
						</button>
						<button 
							onclick={() => selectedLists = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Lists Table/Grid -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando listas...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if filteredLists.length === 0}
		<div class="card">
			<div class="card-body text-center py-12">
				<div class="text-4xl mb-4">🎁</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma lista encontrada</h3>
				<p class="text-gray-600">As listas de presentes aparecerão aqui quando forem criadas.</p>
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
									checked={selectedLists.size === paginatedLists.length && paginatedLists.length > 0}
									onchange={toggleAllLists}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
							<th>Lista</th>
							<th>Tipo</th>
							<th>Status</th>
							<th>Progresso</th>
							<th>Contribuições</th>
							<th>Proprietário</th>
							<th>Data do Evento</th>
							<th class="text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedLists as list, i}
							<tr 
								class="hover:bg-gray-50 transition-colors"
								in:fly={{ x: -20, duration: 400, delay: i * 50 }}
							>
								<td>
									<input
										type="checkbox"
										checked={selectedLists.has(list.id)}
										onchange={() => toggleListSelection(list.id)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
											{getTypeIcon(list.type)}
										</div>
										<div>
											<p class="font-medium text-gray-900">{list.title}</p>
											<p class="text-sm text-gray-500">{list.total_items} itens</p>
										</div>
									</div>
								</td>
								<td>
									<span class="badge badge-primary">
										{getTypeLabel(list.type)}
									</span>
								</td>
								<td>
									<span class="badge {getStatusBadge(list.status)}">
										{getStatusLabel(list.status)}
									</span>
								</td>
								<td>
									<div class="flex items-center gap-2">
										<div class="flex-1 bg-gray-200 rounded-full h-2">
											<div 
												class="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
												style="width: {list.completion_percentage}%"
											></div>
										</div>
										<span class="text-sm font-medium text-gray-700">{list.completion_percentage}%</span>
									</div>
								</td>
								<td>
									<div>
										<p class="font-medium text-gray-900">{formatPrice(list.contribution_total)}</p>
										<p class="text-sm text-gray-500">{list.contribution_count} contribuições</p>
									</div>
								</td>
								<td>
									<div>
										<p class="font-medium text-gray-900">{list.owner_name}</p>
										<p class="text-sm text-gray-500">{list.owner_email}</p>
									</div>
								</td>
								<td class="text-sm text-gray-600">{formatDate(list.event_date)}</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => viewList(list)}
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Ver detalhes"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										</button>
										<button
											onclick={() => suspendList(list)}
											class="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-105 text-red-600"
											title="Suspender"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
							<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredLists.length)}</span> de 
							<span class="font-medium">{filteredLists.length}</span> resultados
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
			{#each paginatedLists as list, i}
				<div 
					class="card hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
					in:scale={{ duration: 400, delay: i * 50, easing: backOut }}
				>
					<div class="card-body">
						<div class="flex items-start justify-between mb-4">
							<div class="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-2xl">
								{getTypeIcon(list.type)}
							</div>
							<span class="badge {getStatusBadge(list.status)}">
								{getStatusLabel(list.status)}
							</span>
						</div>
						
						<h3 class="font-semibold text-gray-900 mb-1">{list.title}</h3>
						<p class="text-sm text-gray-500 mb-4">{getTypeLabel(list.type)} • {list.total_items} itens</p>
						
						<div class="mb-4">
							<div class="flex items-center justify-between text-sm mb-1">
								<span class="text-gray-600">Progresso</span>
								<span class="font-medium">{list.completion_percentage}%</span>
							</div>
							<div class="bg-gray-200 rounded-full h-2">
								<div 
									class="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
									style="width: {list.completion_percentage}%"
								></div>
							</div>
						</div>
						
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">Contribuições:</span>
								<span class="font-medium">{formatPrice(list.contribution_total)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Proprietário:</span>
								<span class="font-medium">{list.owner_name}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Data do Evento:</span>
								<span class="font-medium">{formatDate(list.event_date)}</span>
							</div>
						</div>
						
						<div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
							<button onclick={() => viewList(list)} class="btn btn-sm btn-ghost flex-1">
								Ver Detalhes
							</button>
							<button onclick={() => suspendList(list)} class="btn btn-sm btn-danger flex-1">
								Suspender
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

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