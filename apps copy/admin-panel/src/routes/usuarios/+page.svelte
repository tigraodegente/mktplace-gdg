<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import PermissionGate from '$lib/components/PermissionGate.svelte';
	import PermissionSelector from '$lib/components/PermissionSelector.svelte';
	import Icon from '$lib/Icon.svelte';
	
	// Crossfade para transições entre views
	const [send, receive] = crossfade({
		duration: 400,
		fallback(node) {
			return blur(node, { amount: 10, duration: 400 });
		}
	});
	
	// Interfaces seguindo padrão da tela de produtos
	interface User {
		id: string;
		name: string;
		email: string;
		phone?: string;
		avatarUrl?: string;
		role: 'admin' | 'vendor' | 'customer';
		status: 'active' | 'inactive' | 'pending' | 'suspended';
		emailVerified: boolean;
		twoFactorEnabled: boolean;
		permissions: string[];
		customPermissions: string[];
		lastLoginAt?: string;
		lastLoginIp?: string;
		createdAt: string;
		updatedAt: string;
		vendor?: VendorData;
		customer?: CustomerData;
		admin?: AdminData;
	}
	
	interface VendorData {
		sellerId: string;
		companyName: string;
		slug: string;
		description?: string;
		isVerified: boolean;
		isActive: boolean;
		totalSales: number;
		rating: number;
	}
	
	interface CustomerData {
		totalOrders: number;
		totalSpent: number;
		loyaltyPoints: number;
	}
	
	interface AdminData {
		level: 'super' | 'manager' | 'support';
		canCreateAdmins: boolean;
		canManagePermissions: boolean;
	}
	
	interface UserStats {
		total: number;
		byRole: Record<string, number>;
		byStatus: Record<string, number>;
		emailVerified: number;
		twoFactorEnabled: number;
		recentLogins: number;
	}
	
	interface UserFilters {
		search: string;
		role: string;
		status: string;
		emailVerified: string;
		twoFactorEnabled: string;
		dateRange: string;
	}
	
	interface UserFormData {
		name: string;
		email: string;
		phone: string;
		role: 'admin' | 'vendor' | 'customer';
		status: 'active' | 'inactive' | 'suspended' | 'pending';
		password: string;
		confirmPassword: string;
		sendWelcomeEmail: boolean;
		customPermissions: string[];
		emailVerified: boolean;
		twoFactorEnabled: boolean;
		vendorData: {
			companyName: string;
			slug: string;
			description: string;
		};
		adminData: {
			level: 'super' | 'manager' | 'support';
		};
	}
	
	// Estado principal seguindo padrão
	let users = $state<User[]>([]);
	let filteredUsers = $state<User[]>([]);
	let loading = $state(true);
	let selectedUsers = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(false);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Modais
	let showCreateModal = $state(false);
	let showBulkActionsModal = $state(false);
	let editingUser = $state<User | null>(null);
	
	// Abas do modal (seguindo padrão dos produtos)
	let activeTab = $state<'basic' | 'security' | 'permissions' | 'profile'>('basic');
	
	// Filtros seguindo padrão
	let filters = $state<UserFilters>({
		search: '',
		role: 'all',
		status: 'all',
		emailVerified: 'all',
		twoFactorEnabled: 'all',
		dateRange: 'all'
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(20);
	let totalPages = $state(1);
	let totalUsers = $state(0);
	
	// Stats
	let stats = $state<UserStats>({
		total: 0,
		byRole: {},
		byStatus: {},
		emailVerified: 0,
		twoFactorEnabled: 0,
		recentLogins: 0
	});
	
	// Formulário seguindo padrão de produtos
	let formData = $state<UserFormData>({
		name: '',
		email: '',
		phone: '',
		role: 'customer',
		status: 'active',
		password: '',
		confirmPassword: '',
		sendWelcomeEmail: true,
		customPermissions: [],
		emailVerified: false,
		twoFactorEnabled: false,
		vendorData: {
			companyName: '',
			slug: '',
			description: ''
		},
		adminData: {
			level: 'manager',
		}
	});
	
	// Validação de formulário
	let formErrors = $state<Record<string, string>>({});
	
	// Verificar role atual
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
			const searchTerm = filters.search.toLowerCase();
			result = result.filter(user => 
				user.name.toLowerCase().includes(searchTerm) || 
				user.email.toLowerCase().includes(searchTerm) ||
				(user.vendor?.companyName?.toLowerCase().includes(searchTerm))
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
		
		// Email verificado - corrigido para funcionar adequadamente
		if (filters.emailVerified !== 'all') {
			const verified = filters.emailVerified === 'true';
			result = result.filter(user => {
				// Garantir que emailVerified seja tratado como boolean
				const userEmailVerified = Boolean(user.emailVerified);
				return userEmailVerified === verified;
			});
		}
		
		// 2FA
		if (filters.twoFactorEnabled !== 'all') {
			const enabled = filters.twoFactorEnabled === 'true';
			result = result.filter(user => {
				// Garantir que twoFactorEnabled seja tratado como boolean
				const userTwoFactorEnabled = Boolean(user.twoFactorEnabled);
				return userTwoFactorEnabled === enabled;
			});
		}
		
		// Data range
		if (filters.dateRange !== 'all') {
			const now = new Date();
			const dateFilter = new Date();
			
			switch (filters.dateRange) {
				case 'today':
					dateFilter.setHours(0, 0, 0, 0);
					break;
				case 'week':
					dateFilter.setDate(now.getDate() - 7);
					break;
				case 'month':
					dateFilter.setMonth(now.getMonth() - 1);
					break;
				case 'year':
					dateFilter.setFullYear(now.getFullYear() - 1);
					break;
			}
			
			if (filters.dateRange !== 'all') {
				result = result.filter(user => new Date(user.createdAt) >= dateFilter);
			}
		}
		
		filteredUsers = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
	});
	
	// Usuários paginados
	const paginatedUsers = $derived(
		filteredUsers.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	function openCreateModal() {
		formData = {
			name: '',
			email: '',
			phone: '',
			role: 'customer',
			status: 'active',
			password: '',
			confirmPassword: '',
			sendWelcomeEmail: true,
			customPermissions: [],
			emailVerified: false,
			twoFactorEnabled: false,
			vendorData: {
				companyName: '',
				slug: '',
				description: ''
			},
			adminData: {
				level: 'super',
			}
		};
		formErrors = {};
		editingUser = null;
		showCreateModal = true;
	}
	
	function openEditModal(user: User) {
		formData = {
			name: user.name,
			email: user.email,
			phone: user.phone || '',
			role: user.role,
			status: user.status,
			password: '',
			confirmPassword: '',
			sendWelcomeEmail: false,
			customPermissions: [...user.customPermissions],
			emailVerified: user.emailVerified,
			twoFactorEnabled: user.twoFactorEnabled,
			vendorData: {
				companyName: user.vendor?.companyName || '',
				slug: user.vendor?.slug || '',
				description: user.vendor?.description || ''
			},
			adminData: {
				level: user.admin?.level || 'super',
			}
		};
		formErrors = {};
		editingUser = user;
		showCreateModal = true;
	}
	
	function closeModal() {
		showCreateModal = false;
		showBulkActionsModal = false;
		editingUser = null;
		formErrors = {};
	}
	
	async function loadUsers() {
		loading = true;
		
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: itemsPerPage.toString()
			});
			
			// Aplicar filtros na URL
			Object.entries(filters).forEach(([key, value]) => {
				if (value && value !== 'all') {
					params.append(key, value);
				}
			});
			
			const response = await fetch(`/api/users?${params}`);
			const result = await response.json();
			
			if (result.success) {
				users = result.data.users;
				stats = result.data.stats;
				totalUsers = result.data.total;
				totalPages = result.data.totalPages;
			} else {
				console.error('Erro ao carregar usuários:', result.error);
				showNotification('Erro ao carregar usuários', 'error');
			}
		} catch (error) {
			console.error('Erro ao carregar usuários:', error);
			showNotification('Erro de conexão ao carregar usuários', 'error');
			users = [];
		} finally {
			loading = false;
		}
	}
	
	function validateForm(): boolean {
		const errors: Record<string, string> = {};
		
		if (!formData.name.trim()) {
			errors.name = 'Nome é obrigatório';
		}
		
		if (!formData.email.trim()) {
			errors.email = 'Email é obrigatório';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'Email inválido';
		}
		
		if (!editingUser) {
			if (!formData.password) {
				errors.password = 'Senha é obrigatória para novos usuários';
			} else if (formData.password.length < 6) {
				errors.password = 'Senha deve ter pelo menos 6 caracteres';
			}
			
			if (formData.password !== formData.confirmPassword) {
				errors.confirmPassword = 'Senhas não conferem';
			}
		} else if (formData.password && formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Senhas não conferem';
		}
		
		if (formData.role === 'vendor' && !formData.vendorData.companyName.trim()) {
			errors.companyName = 'Nome da empresa é obrigatório para vendedores';
		}
		
		formErrors = errors;
		return Object.keys(errors).length === 0;
	}
	
	async function saveUser() {
		if (!validateForm()) {
			showNotification('Por favor, corrija os erros no formulário', 'error');
			return;
		}
		
		try {
			const url = '/api/users';
			const method = editingUser ? 'PUT' : 'POST';
			
			const payload = {
				...(editingUser && { id: editingUser.id }),
				name: formData.name,
				email: formData.email,
				phone: formData.phone || null,
				role: formData.role,
				status: formData.status,
				customPermissions: formData.customPermissions,
				sendWelcomeEmail: formData.sendWelcomeEmail,
				...(formData.password && { password: formData.password }),
				...(formData.role === 'vendor' && {
					vendorData: formData.vendorData
				}),
				...(formData.role === 'admin' && {
					adminData: formData.adminData
				})
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
				showNotification(
					editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!',
					'success'
				);
				closeModal();
				loadUsers();
			} else {
				showNotification(result.error || 'Erro ao salvar usuário', 'error');
			}
		} catch (error) {
			console.error('Erro ao salvar usuário:', error);
			showNotification('Erro de conexão ao salvar usuário', 'error');
		}
	}
	
	async function deleteUser(id: string, force = false) {
		const message = force 
			? 'Tem certeza que deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.'
			: 'Tem certeza que deseja desativar este usuário?';
			
		if (confirm(message)) {
			try {
				const response = await fetch('/api/users', {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ id, force })
				});
				
				const result = await response.json();
				
				if (result.success) {
					showNotification(result.data.message, 'success');
					loadUsers();
				} else {
					showNotification(result.error || 'Erro ao deletar usuário', 'error');
				}
			} catch (error) {
				console.error('Erro ao deletar usuário:', error);
				showNotification('Erro de conexão ao deletar usuário', 'error');
			}
		}
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
			admin: 'bg-red-100 text-red-800',
			vendor: 'bg-orange-100 text-orange-800',
			customer: 'bg-blue-100 text-blue-800'
		};
		return badges[role as keyof typeof badges] || 'bg-gray-100 text-gray-800';
	}
		
	function getRoleIcon(role: string) {
		const icons = {
			admin: '👨‍💼',
			vendor: '🏪',
			customer: '👤'
		};
		return icons[role as keyof typeof icons] || '👤';
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			active: 'bg-green-100 text-green-800',
			inactive: 'bg-gray-100 text-gray-800',
			pending: 'bg-yellow-100 text-yellow-800',
			suspended: 'bg-red-100 text-red-800'
		};
		return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
	}
		
	function getStatusIcon(status: string) {
		const icons = {
			active: '✅',
			inactive: '⭕',
			pending: '⏳',
			suspended: '🚫'
		};
		return icons[status as keyof typeof icons] || '❓';
	}
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	function formatDateTime(date: string) {
		return new Date(date).toLocaleString('pt-BR');
	}
	
	function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
		// Implementar sistema de notificações (toast)
		alert(`${type.toUpperCase()}: ${message}`);
	}
	
	// Ações em lote seguindo padrão dos produtos
	async function bulkUpdateStatus(status: User['status']) {
		try {
			const ids = Array.from(selectedUsers);
			
			// Atualizar status de múltiplos usuários
			for (const id of ids) {
				await fetch('/api/users', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ id, status })
				});
			}
			
			showNotification(`${ids.length} usuários atualizados`, 'success');
			selectedUsers = new Set();
			loadUsers();
		} catch (error) {
			console.error('Erro ao atualizar usuários:', error);
			showNotification('Erro ao atualizar usuários', 'error');
		}
	}
	
	onMount(() => {
		loadUsers();
	});
</script>

<div class="space-y-6">
	<!-- Header seguindo padrão dos produtos -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" 
		in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão de Usuários' : 'Meus Clientes'}
			</h1>
			<p class="text-gray-600 mt-1">
				Gerencie usuários, permissões e perfis da plataforma
			</p>
		</div>
		
		<div class="flex items-center gap-3">
			<!-- View Mode seguindo padrão -->
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
				onclick={() => openCreateModal()}
				class="btn btn-primary group hover:scale-105 transition-all duration-300"
			>
				<svg class="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				Novo Usuário
			</button>
		</div>
	</div>
	
	<!-- Stats Cards seguindo padrão dos produtos -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4" in:fly={{ y: 20, duration: 500, delay: 100 }}>
		<div class="stat-card" in:fly={{ y: 30, duration: 500, delay: 200, easing: backOut }}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total de Usuários</p>
					<p class="text-2xl font-bold text-gray-900 transition-all duration-300">{stats.total}</p>
				</div>
				<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
					</svg>
				</div>
			</div>
		</div>
		
		<div class="stat-card" in:fly={{ y: 30, duration: 500, delay: 300, easing: backOut }}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Usuários Ativos</p>
					<p class="text-2xl font-bold text-green-600 transition-all duration-300">{stats.byStatus.active || 0}</p>
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
					<p class="text-sm font-medium text-gray-600">Email Verificado</p>
					<p class="text-2xl font-bold text-blue-600 transition-all duration-300">{stats.emailVerified}</p>
				</div>
				<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
				</div>
			</div>
		</div>

		<div class="stat-card" in:fly={{ y: 30, duration: 500, delay: 500, easing: backOut }}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Com 2FA</p>
					<p class="text-2xl font-bold text-purple-600 transition-all duration-300">{stats.twoFactorEnabled}</p>
				</div>
				<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110">
					<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Filters seguindo padrão -->
	{#if showFilters}
		<div class="card" transition:slide={{ duration: 300 }}>
			<div class="card-body">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
					<!-- Search -->
					<div class="lg:col-span-2">
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="Nome, email ou empresa..."
							class="input"
						/>
					</div>
					
					<!-- Role -->
					<div>
						<label class="label">Perfil</label>
						<select bind:value={filters.role} class="input">
							<option value="all">Todos</option>
							<option value="admin">Administrador</option>
							<option value="vendor">Vendedor</option>
							<option value="customer">Cliente</option>
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
							<option value="suspended">Suspenso</option>
						</select>
					</div>
					
					<!-- Email Verificado -->
					<div>
						<label class="label">Email</label>
						<select bind:value={filters.emailVerified} class="input">
							<option value="all">Todos</option>
							<option value="true">Verificado</option>
							<option value="false">Não Verificado</option>
						</select>
					</div>
					
					<!-- Data -->
					<div>
						<label class="label">Criado</label>
						<select bind:value={filters.dateRange} class="input">
							<option value="all">Todos</option>
							<option value="today">Hoje</option>
							<option value="week">Última semana</option>
							<option value="month">Último mês</option>
							<option value="year">Último ano</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Actions seguindo padrão -->
	{#if selectedUsers.size > 0}
		<div class="card bg-green-50 border-green-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-green-900">
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
							onclick={() => bulkUpdateStatus('suspended')}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Suspender
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
</div>

<!-- Seção da Tabela/Grid com espaçamento adequado -->
<div class="mt-8">

<!-- Users Table/Grid seguindo padrão dos produtos -->
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
								class="rounded border-gray-300 text-green-600 focus:ring-green-500"
							/>
						</th>
						<th>Usuário</th>
						<th>Email</th>
						<th>Perfil</th>
						<th>Status</th>
						<th>Verificação</th>
						<th>Último Login</th>
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
									class="rounded border-gray-300 text-green-600 focus:ring-green-500"
								/>
							</td>
							<td>
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
										{getRoleIcon(user.role)}
									</div>
									<div>
										<p class="font-medium text-gray-900">{user.name}</p>
										<p class="text-sm text-gray-500">{user.vendor?.companyName || user.phone || ''}</p>
									</div>
								</div>
							</td>
							<td class="text-gray-600">
								<div>
									{user.email}
									{#if user.emailVerified}
										<span class="text-green-500 text-xs">✓</span>
									{/if}
								</div>
							</td>
							<td>
								<span class="badge {getRoleBadge(user.role)}">
									{getRoleIcon(user.role)} {user.role === 'admin' ? 'Admin' : user.role === 'vendor' ? 'Vendedor' : 'Cliente'}
								</span>
							</td>
							<td>
								<span class="badge {getStatusBadge(user.status)}">
									{getStatusIcon(user.status)} {user.status === 'active' ? 'Ativo' : user.status === 'inactive' ? 'Inativo' : user.status === 'pending' ? 'Pendente' : 'Suspenso'}
								</span>
							</td>
							<td>
								<div class="flex items-center gap-2">
									{#if user.emailVerified}
										<span class="text-green-500 text-xs">📧 ✓</span>
									{/if}
									{#if user.twoFactorEnabled}
										<span class="text-purple-500 text-xs">🔐</span>
									{/if}
								</div>
							</td>
							<td class="text-gray-600 text-sm">
								{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
								<div class="flex items-center justify-end gap-2">
									<button
										onclick={() => openEditModal(user)}
										class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
										title="Editar"
									>
										✏️ Editar
									</button>
									<PermissionGate permission="users.delete">
										<button 
											onclick={() => deleteUser(user.id)}
											class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											title="Excluir"
										>
											🗑️ Excluir
										</button>
									</PermissionGate>
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
		{#each paginatedUsers as user, i (user.id)}
			<div 
				class="card group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
				in:scale={{ duration: 400, delay: i * 50, easing: elasticOut, start: 0.8 }}
				out:fade={{ duration: 200 }}
			>
				<div class="relative overflow-hidden p-6">
					<div class="flex items-center justify-between mb-4">
						<div class="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-xl">
							{getRoleIcon(user.role)}
						</div>
						<span class="badge {getStatusBadge(user.status)}">
							{getStatusIcon(user.status)}
						</span>
					</div>
					
					<h3 class="font-bold text-gray-900 mb-1">{user.name}</h3>
					<p class="text-sm text-gray-600 mb-2">{user.email}</p>
					
					{#if user.vendor}
						<p class="text-xs text-gray-500 mb-2">🏪 {user.vendor.companyName}</p>
					{/if}
					
					<div class="flex items-center gap-2 mb-4">
						{#if user.emailVerified}
							<span class="text-green-500 text-xs">📧</span>
						{/if}
						{#if user.twoFactorEnabled}
							<span class="text-purple-500 text-xs">🔐</span>
						{/if}
					</div>
					
					<div class="flex items-center justify-between">
						<span class="badge {getRoleBadge(user.role)} text-xs">
							{user.role === 'admin' ? 'Admin' : user.role === 'vendor' ? 'Vendedor' : 'Cliente'}
						</span>
						<div class="flex gap-1">
							<button
								onclick={() => openEditModal(user)}
								class="p-1 text-green-600 hover:text-green-700 transition-colors"
								title="Editar"
							>
								✏️
							</button>
							<PermissionGate permission="users.delete">
								<button
									onclick={() => deleteUser(user.id)}
									class="p-1 text-red-600 hover:text-red-700 transition-colors"
									title="Excluir"
								>
									🗑️
								</button>
							</PermissionGate>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
</div>

<!-- Modal de Criar/Editar Usuário seguindo padrão dos produtos -->
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
			<!-- Header seguindo padrão -->
			<div class="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold flex items-center gap-3">
						👤 {editingUser ? 'Editar' : 'Novo'} Usuário
					</h2>
					<button 
						onclick={closeModal}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						✕
					</button>
				</div>
			</div>
			
			<!-- Tabs seguindo padrão dos produtos -->
			<div class="border-b border-gray-200 bg-gray-50">
				<nav class="flex space-x-8 px-6">
					<button
						onclick={() => activeTab = 'basic'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'basic' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						📋 Informações Básicas
					</button>
					<button
						onclick={() => activeTab = 'security'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'security' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						🔐 Segurança
					</button>
					<button
						onclick={() => activeTab = 'permissions'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'permissions' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						🛡️ Permissões
					</button>
					<button
						onclick={() => activeTab = 'profile'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'profile' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						👨‍💼 Perfil
					</button>
				</nav>
			</div>
			
			<!-- Content seguindo padrão -->
			<div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-280px)]">
				{#if activeTab === 'basic'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="label">Nome Completo *</label>
								<input
									type="text"
									bind:value={formData.name}
									class="input"
									placeholder="João Silva"
								/>
								{#if formErrors.name}
									<p class="text-red-500 text-sm mt-1">{formErrors.name}</p>
								{/if}
							</div>
							
							<div>
								<label class="label">Email *</label>
								<input
									type="email"
									bind:value={formData.email}
									class="input"
									placeholder="joao@email.com"
								/>
								{#if formErrors.email}
									<p class="text-red-500 text-sm mt-1">{formErrors.email}</p>
								{/if}
							</div>
							
							<div>
								<label class="label">Telefone</label>
								<input
									type="tel"
									bind:value={formData.phone}
									class="input"
									placeholder="(11) 98765-4321"
								/>
							</div>
							
							<div>
								<label class="label">Status</label>
								<select bind:value={formData.status} class="input">
									<option value="active">Ativo</option>
									<option value="inactive">Inativo</option>
									<option value="pending">Pendente</option>
									<option value="suspended">Suspenso</option>
								</select>
							</div>
						</div>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="label">Perfil *</label>
								<select bind:value={formData.role} class="input">
									<option value="customer">Cliente</option>
									<option value="vendor">Vendedor</option>
									<option value="admin">Administrador</option>
								</select>
							</div>
							
							{#if !editingUser}
								<div class="flex items-center">
									<input
										type="checkbox"
										bind:checked={formData.sendWelcomeEmail}
										id="welcome-email"
										class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
									/>
									<label for="welcome-email" class="ml-2 text-sm font-medium text-gray-700">
										Enviar email de boas-vindas
									</label>
								</div>
							{/if}
						</div>
					</div>
				{:else if activeTab === 'security'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="label">
									{editingUser ? 'Nova Senha (deixe vazio para manter atual)' : 'Senha *'}
								</label>
								<input
									type="password"
									bind:value={formData.password}
									class="input"
									placeholder="••••••••"
								/>
								{#if formErrors.password}
									<p class="text-red-500 text-sm mt-1">{formErrors.password}</p>
								{/if}
							</div>
							
							<div>
								<label class="label">Confirmar Senha</label>
								<input
									type="password"
									bind:value={formData.confirmPassword}
									class="input"
									placeholder="••••••••"
								/>
								{#if formErrors.confirmPassword}
									<p class="text-red-500 text-sm mt-1">{formErrors.confirmPassword}</p>
								{/if}
							</div>
						</div>
						
						<div class="space-y-4">
							<div class="flex items-center">
								<input
									type="checkbox"
									bind:checked={formData.emailVerified}
									id="email-verified"
									class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
								/>
								<label for="email-verified" class="ml-2 text-sm font-medium text-gray-700">
									Email verificado
								</label>
							</div>
							
							<div class="flex items-center">
								<input
									type="checkbox"
									bind:checked={formData.twoFactorEnabled}
									id="two-factor"
									class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
								/>
								<label for="two-factor" class="ml-2 text-sm font-medium text-gray-700">
									Autenticação de dois fatores habilitada
								</label>
							</div>
						</div>
					</div>
				{:else if activeTab === 'permissions'}
					<div class="space-y-6">
						<div>
							<h3 class="text-lg font-semibold text-gray-900 mb-4">Permissões Customizadas</h3>
							<p class="text-sm text-gray-600 mb-4">
								Selecione permissões específicas além das padrão do perfil do usuário.
							</p>
							
							<PermissionSelector
								selectedPermissions={formData.customPermissions}
								onSelectionChange={(permissions) => {
									formData.customPermissions = permissions;
								}}
							/>
						</div>
					</div>
				{:else if activeTab === 'profile'}
					<div class="space-y-6">
						{#if formData.role === 'vendor'}
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Dados do Vendedor</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label class="label">Nome da Empresa *</label>
										<input
											type="text"
											bind:value={formData.vendorData.companyName}
											class="input"
											placeholder="Minha Empresa Ltda"
										/>
										{#if formErrors.companyName}
											<p class="text-red-500 text-sm mt-1">{formErrors.companyName}</p>
										{/if}
									</div>
									
									<div>
										<label class="label">Slug da Loja</label>
										<input
											type="text"
											bind:value={formData.vendorData.slug}
											class="input"
											placeholder="minha-empresa"
										/>
									</div>
									
									<div class="md:col-span-2">
										<label class="label">Descrição da Empresa</label>
										<textarea
											bind:value={formData.vendorData.description}
											rows="4"
											class="input"
											placeholder="Descrição da sua empresa..."
										></textarea>
									</div>
								</div>
							</div>
						{:else if formData.role === 'admin'}
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Dados do Administrador</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label class="label">Nível de Administrador</label>
										<select bind:value={formData.adminData.level} class="input">
											<option value="support">Suporte</option>
											<option value="manager">Gerente</option>
											<option value="super">Super Admin</option>
										</select>
									</div>
								</div>
							</div>
						{:else}
							<div class="text-center py-8">
								<div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<span class="text-2xl">👤</span>
								</div>
								<h3 class="text-lg font-medium text-gray-900 mb-2">Cliente</h3>
								<p class="text-gray-600">
									Perfil básico de cliente. Dados adicionais podem ser configurados após o cadastro.
								</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Footer seguindo padrão -->
			<div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
					<div class="flex items-center space-x-4 text-sm text-gray-600">
						{#if editingUser}
							<div class="flex items-center space-x-2">
								<div class="w-2 h-2 bg-green-400 rounded-full"></div>
								<span>Usuário existente</span>
							</div>
						{:else}
							<div class="flex items-center space-x-2">
								<div class="w-2 h-2 bg-blue-400 rounded-full"></div>
								<span>Novo usuário</span>
							</div>
						{/if}
					</div>
					
					<div class="flex items-center space-x-3">
						<button 
							onclick={closeModal}
							class="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancelar
						</button>
						<button 
							onclick={saveUser}
							class="px-8 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
						>
							{editingUser ? 'Atualizar' : 'Criar'} Usuário
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Animações customizadas para os cards seguindo padrão dos produtos */
	:global(.stat-card) {
		@apply bg-white rounded-lg border border-gray-200 p-6 transition-all duration-300;
	}
	
	:global(.stat-card:hover) {
		transform: translateY(-4px) scale(1.02);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}
	
	/* Estilos para botões seguindo padrão */
	:global(.btn) {
		@apply px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2;
	}
	
	:global(.btn-primary) {
		@apply bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transform hover:scale-105;
	}
	
	:global(.btn-ghost) {
		@apply bg-gray-100 hover:bg-gray-200 text-gray-700;
	}
	
	:global(.btn-sm) {
		@apply px-3 py-1 text-sm;
	}
	
	/* Estilos para cards seguindo padrão */
	:global(.card) {
		@apply bg-white rounded-lg border border-gray-200 shadow-sm;
	}
	
	:global(.card-body) {
		@apply p-6;
	}
	
	/* Estilos para inputs seguindo padrão */
	:global(.input) {
		@apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors;
	}
	
	:global(.label) {
		@apply block text-sm font-medium text-gray-700 mb-2;
	}
	
	/* Estilos para badges seguindo padrão */
	:global(.badge) {
		@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
	}
	
	:global(.badge-success) {
		@apply bg-green-100 text-green-800;
	}
	
	:global(.badge-danger) {
		@apply bg-red-100 text-red-800;
	}
	
	:global(.badge-warning) {
		@apply bg-yellow-100 text-yellow-800;
	}
	
	:global(.badge-info) {
		@apply bg-blue-100 text-blue-800;
	}
	
	/* Estilos para tabela seguindo padrão */
	:global(.table-modern) {
		@apply w-full divide-y divide-gray-200;
	}
	
	:global(.table-modern thead th) {
		@apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50;
	}
	
	:global(.table-modern tbody td) {
		@apply px-6 py-4 whitespace-nowrap text-sm text-gray-900;
	}
	
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
		background: #10B981;
		transform: translateX(-100%);
		transition: transform 0.3s ease;
	}
	
	:global(.table-modern tbody tr:hover::before) {
		transform: translateX(0);
	}
	
	/* Spinner seguindo padrão */
	:global(.spinner) {
		@apply border-4 border-gray-200 border-t-green-600 rounded-full animate-spin;
	}
	
	/* Melhora nas imagens */
	img {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style> 