<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import Icon from '$lib/Icon.svelte';
	
	// Crossfade para transições entre views
	const [send, receive] = crossfade({
		duration: 400,
		fallback(node) {
			return blur(node, { amount: 10, duration: 400 });
		}
	});
	
	// Interface
	interface User {
		id: string;
		name: string;
		email: string;
		role: 'customer' | 'vendor' | 'admin';
		status: 'active' | 'inactive' | 'pending';
		created: string;
		avatar: string;
		lastLogin?: string;
		orders?: number;
		revenue?: number;
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
		role: string;
		status: string;
		dateRange: string;
	}
	
	// Estado
	let users = $state<User[]>([]);
	let filteredUsers = $state<User[]>([]);
	let loading = $state(true);
	let selectedUsers = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(true);
	let showAddModal = $state(false);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		role: 'all',
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
		loadUsers();
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...users];
		
		// Busca
		if (filters.search) {
			result = result.filter(user => 
				user.name.toLowerCase().includes(filters.search.toLowerCase()) || 
				user.email.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Role
		if (filters.role !== 'all') {
			result = result.filter(user => user.role === filters.role);
		}
		
		// Status
		if (filters.status !== 'all') {
			result = result.filter(user => user.status === filters.status);
		}
		
		filteredUsers = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		// Atualizar estatísticas
		updateStats(result);
	});
	
	onMount(() => {
		loadUsers();
	});
	
	async function loadUsers() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock
			users = Array.from({ length: 50 }, (_, i) => ({
				id: `user-${i + 1}`,
				name: `Usuário ${i + 1}`,
				email: `usuario${i + 1}@email.com`,
				role: ['customer', 'vendor', 'admin'][Math.floor(Math.random() * 3)] as any,
				status: ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)] as any,
				created: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
				avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`,
				lastLogin: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
				orders: Math.floor(Math.random() * 50),
				revenue: Math.floor(Math.random() * 10000)
			}));
			
			loading = false;
		}, 1000);
	}
	
	function updateStats(usrs: User[]) {
		const totalUsers = usrs.length;
		const activeUsers = usrs.filter(u => u.status === 'active').length;
		const vendors = usrs.filter(u => u.role === 'vendor').length;
		const newToday = usrs.filter(u => {
			const today = new Date().setHours(0, 0, 0, 0);
			return new Date(u.created).setHours(0, 0, 0, 0) === today;
		}).length;
		
		stats = [
			{
				title: 'Total de Usuários',
				value: totalUsers.toLocaleString('pt-BR'),
				change: 12,
				icon: '👥',
				color: 'primary'
			},
			{
				title: 'Usuários Ativos',
				value: activeUsers.toLocaleString('pt-BR'),
				change: 5,
				icon: '✅',
				color: 'success'
			},
			{
				title: 'Vendedores',
				value: vendors,
				change: 2,
				icon: '🏪',
				color: 'warning'
			},
			{
				title: 'Novos Hoje',
				value: newToday,
				change: 15,
				icon: '🆕',
				color: 'info'
			}
		];
	}
	
	function toggleUserSelection(id: string) {
		const newSet = new Set(selectedUsers);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedUsers = newSet;
	}
	
	function toggleAllUsers() {
		if (selectedUsers.size === paginatedUsers.length) {
			selectedUsers = new Set();
		} else {
			selectedUsers = new Set(paginatedUsers.map(u => u.id));
		}
	}
	
	function getRoleBadge(role: string) {
		const badges = {
			admin: 'badge-danger',
			vendor: 'badge-warning',
			customer: 'badge-info'
		};
		return badges[role as keyof typeof badges] || 'badge';
	}
	
	function getRoleLabel(role: string) {
		const labels = {
			admin: 'Admin',
			vendor: 'Vendedor',
			customer: 'Cliente'
		};
		return labels[role as keyof typeof labels] || role;
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			active: 'badge-success',
			inactive: 'badge-danger',
			pending: 'badge-warning'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			active: 'Ativo',
			inactive: 'Inativo',
			pending: 'Pendente'
		};
		return labels[status as keyof typeof labels] || status;
	}
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	function formatDateTime(date: string) {
		return new Date(date).toLocaleString('pt-BR');
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
	
	// Usuários paginados
	const paginatedUsers = $derived(
		filteredUsers.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Ações em lote
	async function bulkUpdateStatus(status: User['status']) {
		console.log('Atualizando status de', selectedUsers.size, 'usuários para', status);
		selectedUsers = new Set();
	}
	
	async function bulkUpdateRole(role: User['role']) {
		console.log('Atualizando função de', selectedUsers.size, 'usuários para', role);
		selectedUsers = new Set();
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedUsers.size} usuários?`)) {
			console.log('Excluindo', selectedUsers.size, 'usuários');
			selectedUsers = new Set();
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão de Usuários' : 'Meus Clientes'}
			</h1>
			<p class="text-gray-600 mt-1">Gerencie todos os usuários da plataforma</p>
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
			
			<!-- Add User -->
			<button 
				onclick={() => showAddModal = true}
				class="btn btn-primary"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Novo Usuário
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
					<div class="lg:col-span-1">
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="Nome ou email..."
							class="input"
						/>
					</div>
					
					<!-- Role -->
					<div>
						<label class="label">Função</label>
						<select bind:value={filters.role} class="input">
							<option value="all">Todas</option>
							<option value="customer">Cliente</option>
							<option value="vendor">Vendedor</option>
							<option value="admin">Admin</option>
						</select>
					</div>
					
					<!-- Status -->
					<div>
						<label class="label">Status</label>
						<select bind:value={filters.status} class="input">
							<option value="all">Todos</option>
							<option value="active">Ativo</option>
							<option value="inactive">Inativo</option>
							<option value="pending">Pendente</option>
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
	{#if selectedUsers.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedUsers.size} {selectedUsers.size === 1 ? 'usuário selecionado' : 'usuários selecionados'}
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
							onclick={() => selectedUsers = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Users Table/Grid -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando usuários...</p>
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
									checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
									onchange={toggleAllUsers}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
							<th>Usuário</th>
							<th>Função</th>
							<th>Status</th>
							<th>Pedidos</th>
							<th>Último Login</th>
							<th>Criado em</th>
							<th class="text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedUsers as user, i}
							<tr 
								class="hover:bg-gray-50 transition-colors"
								in:fly={{ x: -20, duration: 400, delay: i * 50 }}
							>
								<td>
									<input
										type="checkbox"
										checked={selectedUsers.has(user.id)}
										onchange={() => toggleUserSelection(user.id)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<img 
											src={user.avatar} 
											alt={user.name} 
											class="w-10 h-10 rounded-full ring-2 ring-gray-100 group-hover:ring-cyan-500 transition-all"
										/>
										<div>
											<p class="font-medium text-gray-900">{user.name}</p>
											<p class="text-sm text-gray-500">{user.email}</p>
										</div>
									</div>
								</td>
								<td>
									<span class="badge {getRoleBadge(user.role)}">
										{getRoleLabel(user.role)}
									</span>
								</td>
								<td>
									<span class="badge {getStatusBadge(user.status)}">
										{getStatusLabel(user.status)}
									</span>
								</td>
								<td class="text-gray-600">{user.orders || 0}</td>
								<td class="text-sm text-gray-600">
									{user.lastLogin ? formatDateTime(user.lastLogin) : 'Nunca'}
								</td>
								<td class="text-sm text-gray-600">{formatDate(user.created)}</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										<button
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Ver perfil"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										</button>
										<button
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Editar"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
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
							<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> de 
							<span class="font-medium">{filteredUsers.length}</span> resultados
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
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each paginatedUsers as user, i}
				<div 
					class="card hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
					in:scale={{ duration: 400, delay: i * 50, easing: backOut }}
				>
					<div class="card-body text-center">
						<img 
							src={user.avatar} 
							alt={user.name} 
							class="w-20 h-20 rounded-full mx-auto mb-4 ring-4 ring-gray-100 group-hover:ring-cyan-500 transition-all"
						/>
						<h3 class="font-semibold text-gray-900">{user.name}</h3>
						<p class="text-sm text-gray-500 mb-3">{user.email}</p>
						
						<div class="flex items-center justify-center gap-2 mb-4">
							<span class="badge {getRoleBadge(user.role)}">
								{getRoleLabel(user.role)}
							</span>
							<span class="badge {getStatusBadge(user.status)}">
								{getStatusLabel(user.status)}
							</span>
						</div>
						
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">Pedidos:</span>
								<span class="font-medium">{user.orders || 0}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Membro desde:</span>
								<span class="font-medium">{formatDate(user.created)}</span>
							</div>
						</div>
						
						<div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
							<button class="btn btn-sm btn-ghost flex-1">
								Ver Perfil
							</button>
							<button class="btn btn-sm btn-primary flex-1">
								Editar
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