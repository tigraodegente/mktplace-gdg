<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { api } from '$lib/services/api';
	import { toast } from '$lib/stores/toast';
	import { DataTable, Input, Select, Button } from '$lib/components/ui';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import PermissionGate from '$lib/components/PermissionGate.svelte';
	import PermissionSelector from '$lib/components/PermissionSelector.svelte';
	import { useDebounce } from '$lib/hooks/useDebounce';
	
	// Interfaces seguindo padrão da tela de produtos
	interface User {
		id: string;
		name: string;
		email: string;
		phone?: string;
		avatarUrl?: string;
		role: 'admin' | 'seller' | 'customer';
		status: 'active' | 'inactive' | 'pending' | 'suspended';
		emailVerified: boolean;
		twoFactorEnabled: boolean;
		permissions: string[];
		customPermissions: string[];
		lastLoginAt?: string;
		lastLoginIp?: string;
		createdAt: string;
		updatedAt: string;
		seller?: {
		sellerId: string;
		companyName: string;
		slug: string;
		description?: string;
		isVerified: boolean;
		isActive: boolean;
		totalSales: number;
		rating: number;
		};
		customer?: {
		totalOrders: number;
		totalSpent: number;
		loyaltyPoints: number;
		};
		admin?: {
		level: 'super' | 'manager' | 'support';
		canCreateAdmins: boolean;
		canManagePermissions: boolean;
		};
	}
	
	interface UserFormData {
		name: string;
		email: string;
		phone: string;
		role: 'admin' | 'seller' | 'customer';
		status: 'active' | 'inactive' | 'suspended' | 'pending';
		password: string;
		confirmPassword: string;
		sendWelcomeEmail: boolean;
		customPermissions: string[];
		emailVerified: boolean;
		twoFactorEnabled: boolean;
		sellerData: {
			companyName: string;
			slug: string;
			description: string;
		};
		adminData: {
			level: 'super' | 'manager' | 'support';
		};
	}
	
	// Estados principais
	let users = $state<User[]>([]);
	let loading = $state(true);
	let search = $state('');
	let roleFilter = $state('all');
	let statusFilter = $state('all');
	let selectedIds = $state<string[]>([]);
	
	// Estados do modal
	let showCreateModal = $state(false);
	let showConfirmDialog = $state(false);
	let editingUser = $state<User | null>(null);
	let activeTab = $state<'basic' | 'security' | 'permissions' | 'profile'>('basic');
	
	// Paginação
	let currentPage = $state(1);
	let pageSize = $state(20);
	let totalItems = $state(0);
	
	// Ordenação
	let sortBy = $state('created_at');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	
	// Estatísticas
	let stats = $state({
		total: 0,
		admins: 0,
		sellers: 0,
		customers: 0,
		active: 0,
		emailVerified: 0,
		twoFactorEnabled: 0
	});
	
	// Dialog de confirmação
	let confirmDialogConfig = $state({
		title: '',
		message: '',
		variant: 'danger' as 'danger' | 'warning' | 'info',
		onConfirm: () => {}
	});
	
	// Formulário
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
		sellerData: {
			companyName: '',
			slug: '',
			description: ''
		},
		adminData: {
			level: 'manager'
		}
	});
	
	let formErrors = $state<Record<string, string>>({});
	
	// Opções de filtros
	const roleOptions = [
		{ value: 'all', label: 'Todos os Perfis' },
		{ value: 'admin', label: 'Administradores' },
		{ value: 'seller', label: 'Vendedores' },
		{ value: 'customer', label: 'Clientes' }
	];
	
	const statusOptions = [
		{ value: 'all', label: 'Todos os Status' },
		{ value: 'active', label: 'Ativos' },
		{ value: 'inactive', label: 'Inativos' },
		{ value: 'pending', label: 'Pendentes' },
		{ value: 'suspended', label: 'Suspensos' }
	];
	
	// Colunas da tabela
	const columns = [
		{
			key: 'avatar',
			label: 'Avatar',
			width: '80px',
			render: (value: string, row: User) => `
				<div class="flex items-center justify-center">
					${row.avatarUrl 
						? `<img src="${row.avatarUrl}" alt="${row.name}" class="w-10 h-10 rounded-full object-cover" />`
						: `<div class="w-10 h-10 rounded-full bg-[#00BFB3] flex items-center justify-center text-white font-medium">
							${row.name.charAt(0).toUpperCase()}
						   </div>`
					}
				</div>
			`
		},
		{
			key: 'name',
			label: 'Usuário',
			sortable: true,
			render: (value: string, row: User) => `
				<div>
					<div class="font-medium text-gray-900">${row.name}</div>
					<div class="text-sm text-gray-500">${row.email}</div>
					${row.phone ? `<div class="text-xs text-gray-400">${row.phone}</div>` : ''}
				</div>
			`
		},
		{
			key: 'role',
			label: 'Perfil',
			sortable: true,
			align: 'center' as const,
			render: (value: string) => {
				const badges = {
					admin: 'bg-red-100 text-red-800',
					seller: 'bg-blue-100 text-blue-800',
					customer: 'bg-green-100 text-green-800'
				};
				const labels = {
					admin: 'Admin',
					seller: 'Vendedor',
					customer: 'Cliente'
				};
				return `<span class="px-2 py-1 text-xs font-medium rounded-full ${badges[value as keyof typeof badges]}">${labels[value as keyof typeof labels]}</span>`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: string) => {
				const badges = {
					active: 'bg-green-100 text-green-800',
					inactive: 'bg-gray-100 text-gray-800',
					pending: 'bg-yellow-100 text-yellow-800',
					suspended: 'bg-red-100 text-red-800'
				};
				const labels = {
					active: 'Ativo',
					inactive: 'Inativo',
					pending: 'Pendente',
					suspended: 'Suspenso'
				};
				return `<span class="px-2 py-1 text-xs font-medium rounded-full ${badges[value as keyof typeof badges]}">${labels[value as keyof typeof labels]}</span>`;
			}
		},
		{
			key: 'emailVerified',
			label: 'Email',
			align: 'center' as const,
			hideOnMobile: true,
			render: (value: boolean) => value
				? '<span class="text-green-600">✓ Verificado</span>'
				: '<span class="text-gray-400">Não verificado</span>'
		},
		{
			key: 'twoFactorEnabled',
			label: '2FA',
			align: 'center' as const,
			hideOnMobile: true,
			render: (value: boolean) => value
				? '<span class="text-green-600">Ativo</span>'
				: '<span class="text-gray-400">Inativo</span>'
		},
		{
			key: 'lastLoginAt',
			label: 'Último Login',
			sortable: true,
			hideOnMobile: true,
			render: (value: string) => {
				if (!value) return '<span class="text-gray-400">Nunca</span>';
				const date = new Date(value);
				return `<span class="text-sm text-gray-600">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		},
		{
			key: 'createdAt',
			label: 'Criado em',
			sortable: true,
			hideOnMobile: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		}
	];
	
	// Tabs do modal
	const tabs = [
		{ id: 'basic', label: 'Informações Básicas', icon: 'seller' },
		{ id: 'security', label: 'Segurança', icon: 'active' },
		{ id: 'permissions', label: 'Permissões', icon: 'Settings' },
		{ id: 'profile', label: 'Perfil', icon: 'Settings' }
	];
	
	// Buscar usuários
	async function loadUsers() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: pageSize.toString(),
				search,
				role: roleFilter,
				status: statusFilter,
				sortBy,
				sortOrder
			});
			
			const response = await api.get(`/users?${params}`);
			
			if (response.success) {
				users = response.data.users || [];
				totalItems = response.data.pagination?.total || 0;
				stats = response.data.stats || stats;
			}
		} catch (error) {
			console.error('Erro ao carregar usuários:', error);
			toast.error('Erro ao carregar usuários');
		} finally {
			loading = false;
		}
	}
	
	// Debounce da busca
	const debouncedSearch = useDebounce(() => {
		currentPage = 1;
		loadUsers();
	}, 500);
	
	// Handle ordenação
	function handleSort(column: string) {
		if (sortBy === column) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortOrder = 'asc';
		}
		currentPage = 1;
		loadUsers();
	}
	
	// Watchers
	$effect(() => {
		if (search !== undefined) debouncedSearch();
	});
	
	$effect(() => {
		if (roleFilter || statusFilter || currentPage) {
			loadUsers();
		}
	});
	
	// Ações da tabela
	function getTableActions(row: User) {
		return [
			{
				label: 'Editar',
				icon: 'edit',
				onclick: () => openEditModal(row)
			},
			{
				label: 'Excluir',
				icon: 'delete',
				onclick: () => deleteUser(row)
			}
		];
	}
	
	// Abrir modal de criação
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
			sellerData: {
				companyName: '',
				slug: '',
				description: ''
			},
			adminData: {
				level: 'manager'
			}
		};
		formErrors = {};
		editingUser = null;
		activeTab = 'basic';
		showCreateModal = true;
	}
	
	// Abrir modal de edição
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
			sellerData: {
				companyName: user.seller?.companyName || '',
				slug: user.seller?.slug || '',
				description: user.seller?.description || ''
			},
			adminData: {
				level: user.admin?.level || 'manager'
			}
		};
		formErrors = {};
		editingUser = user;
		activeTab = 'basic';
		showCreateModal = true;
	}
	
	// Fechar modal
	function closeModal() {
		showCreateModal = false;
		editingUser = null;
		formErrors = {};
	}
	
	// Validar formulário
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
		
		if (formData.role === 'seller' && !formData.sellerData.companyName.trim()) {
			errors.companyName = 'Nome da empresa é obrigatório para vendedores';
		}
		
		formErrors = errors;
		return Object.keys(errors).length === 0;
	}
	
	// Salvar usuário
	async function saveUser() {
		if (!validateForm()) {
			toast.error('Por favor, corrija os erros no formulário');
			return;
		}
		
		try {
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
				...(formData.role === 'seller' && {
					sellerData: formData.sellerData
				}),
				...(formData.role === 'admin' && {
					adminData: formData.adminData
				})
			};
			
			const method = editingUser ? 'PUT' : 'POST';
			await api[method.toLowerCase() as 'put' | 'post']('/users', payload, {
				showSuccess: true,
				successMessage: editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!'
			});
			
				closeModal();
				loadUsers();
		} catch (error) {
			console.error('Erro ao salvar usuário:', error);
		}
	}
	
	// Excluir usuário individual
	async function deleteUser(user: User) {
		confirmDialogConfig = {
			title: 'Excluir Usuário',
			message: `Tem certeza que deseja excluir o usuário "${user.name}"? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					await api.delete(`/users/${user.id}`, {
						showSuccess: true,
						successMessage: 'Usuário excluído com sucesso!'
					});
					
					loadUsers();
			} catch (error) {
					console.error('Erro ao excluir usuário:', error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Excluir usuários selecionados
	async function deleteSelected() {
		if (selectedIds.length === 0) return;
		
		confirmDialogConfig = {
			title: 'Excluir Usuários',
			message: `Tem certeza que deseja excluir ${selectedIds.length} usuário(s)? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					await api.delete('/users', {
						body: JSON.stringify({ ids: selectedIds }),
						showSuccess: true,
						successMessage: `${selectedIds.length} usuário(s) excluído(s) com sucesso!`
					});
					
					selectedIds = [];
			loadUsers();
		} catch (error) {
					console.error('Erro ao excluir usuários:', error);
		}
			}
		};
		showConfirmDialog = true;
	}
	
	// Lifecycle
	onMount(() => {
		loadUsers();
	});
</script>

<!-- Dialog de Confirmação -->
<ConfirmDialog
	show={showConfirmDialog}
	title={confirmDialogConfig.title}
	message={confirmDialogConfig.message}
	variant={confirmDialogConfig.variant}
	confirmText="Excluir"
	cancelText="Cancelar"
	onConfirm={() => {
		confirmDialogConfig.onConfirm();
		showConfirmDialog = false;
	}}
	onCancel={() => showConfirmDialog = false}
/>

<!-- Modal de Criação/Edição -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
		<div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
			<!-- Header do Modal -->
			<div class="bg-[#00BFB3] text-white p-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">
							{editingUser ? 'Editar Usuário' : 'Novo Usuário'}
						</h2>
						<p class="text-cyan-100 mt-1">
							{editingUser ? `Editando: ${editingUser.name}` : 'Criar um novo usuário no sistema'}
						</p>
					</div>
									<button
						onclick={closeModal}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
									>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
									</button>
								</div>
					</div>
					
			<!-- Tabs -->
			<div class="bg-gray-50 border-b px-6">
				<div class="flex gap-4 overflow-x-auto">
					{#each tabs as tab}
							<button
							onclick={() => activeTab = tab.id}
							class="py-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap {
								activeTab === tab.id 
									? 'border-[#00BFB3] text-[#00BFB3]' 
									: 'border-transparent text-gray-600 hover:text-gray-900'
							}"
						>
							<ModernIcon name={tab.icon} size={16} />
							{tab.label}
							</button>
		{/each}
	</div>
</div>

			<!-- Content -->
			<div class="p-6 overflow-y-auto max-h-[60vh]">
				{#if activeTab === 'basic'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Nome *
								</label>
								<Input
									bind:value={formData.name}
									placeholder="Nome completo"
									error={formErrors.name}
								/>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Email *
								</label>
								<Input
									type="email"
									bind:value={formData.email}
									placeholder="email@exemplo.com"
									error={formErrors.email}
								/>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Telefone
								</label>
								<Input
									bind:value={formData.phone}
									placeholder="(11) 99999-9999"
								/>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Perfil *
								</label>
								<Select
									bind:value={formData.role}
									options={roleOptions.slice(1)}
								/>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Status *
								</label>
								<Select
									bind:value={formData.status}
									options={statusOptions.slice(1)}
								/>
							</div>
						</div>
						
						{#if formData.role === 'seller'}
							<div class="border-t pt-6">
								<h3 class="text-lg font-medium text-gray-900 mb-4">Dados do Vendedor</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Nome da Empresa *
										</label>
										<Input
											bind:value={formData.sellerData.companyName}
											placeholder="Empresa Ltda"
											error={formErrors.companyName}
										/>
							</div>
							
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Slug da Loja
										</label>
										<Input
											bind:value={formData.sellerData.slug}
											placeholder="minha-loja"
										/>
									</div>
									
									<div class="md:col-span-2">
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Descrição
									</label>
										<textarea
											bind:value={formData.sellerData.description}
											placeholder="Descrição da empresa..."
											rows="3"
											class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
										></textarea>
								</div>
						</div>
							</div>
						{/if}
					</div>
				{:else if activeTab === 'security'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									{editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
								</label>
								<Input
									type="password"
									bind:value={formData.password}
									placeholder="••••••••"
									error={formErrors.password}
								/>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Confirmar Senha
								</label>
								<Input
									type="password"
									bind:value={formData.confirmPassword}
									placeholder="••••••••"
									error={formErrors.confirmPassword}
								/>
							</div>
						</div>
						
						<div class="space-y-4">
							<label class="flex items-center gap-3">
								<input
									type="checkbox"
									bind:checked={formData.emailVerified}
									class="w-4 h-4 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
								/>
								<span class="text-sm font-medium text-gray-700">Email verificado</span>
								</label>
							
							<label class="flex items-center gap-3">
								<input
									type="checkbox"
									bind:checked={formData.twoFactorEnabled}
									class="w-4 h-4 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
								/>
								<span class="text-sm font-medium text-gray-700">Autenticação de dois fatores</span>
								</label>
							
							{#if !editingUser}
								<label class="flex items-center gap-3">
									<input
										type="checkbox"
										bind:checked={formData.sendWelcomeEmail}
										class="w-4 h-4 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
									/>
									<span class="text-sm font-medium text-gray-700">Enviar email de boas-vindas</span>
								</label>
							{/if}
						</div>
					</div>
				{:else if activeTab === 'permissions'}
					<div class="space-y-6">
						<div class="bg-gray-50 p-4 rounded-lg">
							<p class="text-sm text-gray-600">
								Gerenciar permissões específicas do usuário. As permissões básicas são definidas automaticamente pelo perfil.
							</p>
						</div>
						
						<PermissionGate permission="users.manage_permissions">
							<PermissionSelector bind:selectedPermissions={formData.customPermissions} />
						</PermissionGate>
					</div>
				{:else if activeTab === 'profile'}
					<div class="space-y-6">
						{#if formData.role === 'admin'}
							<div>
								<h3 class="text-lg font-medium text-gray-900 mb-4">Configurações de Administrador</h3>
									<div>
									<label class="block text-sm font-medium text-gray-700 mb-2">
										Nível de Acesso
									</label>
									<Select
										bind:value={formData.adminData.level}
										options={[
											{ value: 'super', label: 'Super Admin' },
											{ value: 'manager', label: 'Gerente' },
											{ value: 'support', label: 'Suporte' }
										]}
									/>
								</div>
							</div>
						{:else}
							<div class="text-center py-8 text-gray-500">
								<ModernIcon name="seller" size={48} />
								<p>Configurações de perfil específicas aparecerão aqui conforme o tipo de usuário.</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Footer -->
			<div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
						<button 
							onclick={closeModal}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancelar
						</button>
						<button 
							onclick={saveUser}
					class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors flex items-center gap-2"
						>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
							{editingUser ? 'Atualizar' : 'Criar'} Usuário
						</button>
					</div>
				</div>
			</div>
{/if}

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">Usuários</h1>
				<PermissionGate permission="users.create">
					<button
						onclick={openCreateModal}
						class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Novo Usuário
					</button>
				</PermissionGate>
		</div>
	</div>
	</div>
	
	<!-- Content -->
	<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
		<!-- Cards de Estatísticas -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Total de Usuários</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
					</div>
					<div class="p-3 bg-[#00BFB3]/10 rounded-lg">
						<ModernIcon name="seller" size={24} color="#00BFB3" />
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Administradores</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.admins}</p>
					</div>
					<div class="p-3 bg-red-100 rounded-lg">
						<ModernIcon name="active" size={24} color="#DC2626" />
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Vendedores</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.sellers}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-lg">
						<ModernIcon name="seller" size={24} color="#2563EB" />
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Clientes</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.customers}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-lg">
						<ModernIcon name="seller" size={24} color="#16A34A" />
					</div>
				</div>
			</div>
		</div>
		
		<!-- Filtros -->
		<div class="bg-white rounded-lg p-4 mb-6 border border-gray-200">
			<div class="flex flex-col gap-4">
				<!-- Primeira linha: Busca e ações -->
				<div class="flex flex-col md:flex-row gap-4">
					<div class="flex-1">
						<Input
							type="search"
							placeholder="Buscar usuários..."
							bind:value={search}
						/>
					</div>
					
					{#if selectedIds.length > 0}
						<PermissionGate permission="users.delete">
							<button
								onclick={deleteSelected}
								class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
							>
								Excluir ({selectedIds.length})
							</button>
						</PermissionGate>
					{/if}
				</div>
				
				<!-- Segunda linha: Filtros -->
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
					<Select
						bind:value={roleFilter}
						options={roleOptions}
						label="Perfil"
					/>
					
					<Select
						bind:value={statusFilter}
						options={statusOptions}
						label="Status"
					/>
					
					<div class="flex items-end">
						<button
							onclick={loadUsers}
							class="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							Atualizar
						</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Tabela -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<div class="p-4">
				<DataTable
					{columns}
					data={users}
					{loading}
					selectable={true}
					bind:selectedIds
					page={currentPage}
					{pageSize}
					{totalItems}
					onPageChange={(p) => currentPage = p}
					{sortBy}
					{sortOrder}
					onSort={handleSort}
					actions={getTableActions}
				/>
			</div>
		</div>
	</div>
</div> 