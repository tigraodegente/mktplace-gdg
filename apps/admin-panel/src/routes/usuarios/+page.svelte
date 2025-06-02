<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import Icon from '$lib/Icon.svelte';
	
	// Interface
	interface User {
		id: string;
		name: string;
		email: string;
		role: 'customer' | 'vendor' | 'admin';
		status: 'active' | 'inactive';
		created: string;
		avatar: string;
		lastLogin?: string;
		orders?: number;
	}
	
	// Estado
	let users = $state<User[]>([]);
	let loading = $state(true);
	let searchTerm = $state('');
	let selectedRole = $state('');
	let selectedStatus = $state('');
	let selectedUsers = $state(new Set<string>());
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Stats
	let stats = $state([
		{ 
			title: 'Total de Usuários',
			value: '1.2k',
			change: 12,
			changeType: 'increase' as const,
			icon: '👥',
			iconBg: 'from-cyan-500 to-cyan-600',
			subtitle: 'vs. mês anterior'
		},
		{ 
			title: 'Usuários Ativos',
			value: '1.1k',
			change: 5,
			changeType: 'increase' as const,
			icon: '✅',
			iconBg: 'from-green-500 to-green-600',
			subtitle: 'vs. mês anterior'
		},
		{ 
			title: 'Vendedores',
			value: 89,
			change: 2,
			changeType: 'increase' as const,
			icon: '🏪',
			iconBg: 'from-yellow-500 to-yellow-600',
			subtitle: 'vs. mês anterior'
		},
		{
			title: 'Novos Hoje',
			value: 23,
			change: 15,
			changeType: 'increase' as const,
			icon: '🆕',
			iconBg: 'from-purple-500 to-purple-600',
			subtitle: 'vs. ontem'
		}
	]);
	
	// Filtros reativos
	const filteredUsers = $derived(
		users.filter(user => {
			return (
				(searchTerm === '' || 
				 user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
				 user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
				(selectedRole === '' || user.role === selectedRole) &&
				(selectedStatus === '' || user.status === selectedStatus)
			);
		})
	);
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
	});
	
	onMount(() => {
		loadUsers();
	});
	
	async function loadUsers() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			const baseUsers = [
				{ 
					id: '1',
					name: 'João Silva',
					email: 'joao@email.com',
					role: 'customer' as const,
					status: 'active' as const,
					created: '2024-01-15',
					avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=João',
					lastLogin: '2024-01-20',
					orders: 15
				},
				{ 
					id: '2',
					name: 'Maria Santos',
					email: 'maria@email.com',
					role: 'vendor' as const,
					status: 'active' as const,
					created: '2024-01-10',
					avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
					lastLogin: '2024-01-19',
					orders: 0
				},
				{ 
					id: '3',
					name: 'Pedro Costa',
					email: 'pedro@email.com',
					role: 'admin' as const,
					status: 'inactive' as const,
					created: '2024-01-05',
					avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro',
					lastLogin: '2024-01-10',
					orders: 0
				}
			];
			
			// Adicionar mais usuários mock
			users = [...baseUsers];
			for (let i = 4; i <= 30; i++) {
				const roles: Array<'customer' | 'vendor' | 'admin'> = ['customer', 'vendor', 'admin'];
				const statuses: Array<'active' | 'inactive'> = ['active', 'inactive'];
				
				users.push({
					id: i.toString(),
					name: `Usuário ${i}`,
					email: `usuario${i}@email.com`,
					role: roles[Math.floor(Math.random() * roles.length)],
					status: statuses[Math.floor(Math.random() * statuses.length)],
					created: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`,
					lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					orders: Math.floor(Math.random() * 50)
				});
			}
			
			loading = false;
		}, 1000);
	}
	
	// Formatadores
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('pt-BR');
	}
	
	// Badges
	function getRoleBadge(role: string) {
		const badges: Record<string, string> = {
			admin: 'badge-danger',
			vendor: 'badge-warning',
			customer: 'badge-info'
		};
		
		const labels: Record<string, string> = {
			admin: 'Admin',
			vendor: 'Vendedor',
			customer: 'Cliente'
		};
		
		return `<span class="badge ${badges[role]}">${labels[role]}</span>`;
	}
	
	function getStatusBadge(status: string) {
		const badges: Record<string, string> = {
			active: 'badge-success',
			inactive: 'badge-danger'
		};
		
		const labels: Record<string, string> = {
			active: 'Ativo',
			inactive: 'Inativo'
		};
		
		return `<span class="badge ${badges[status]}">${labels[status]}</span>`;
	}
	
	// Colunas da tabela
	const columns = [
		{
			key: 'name',
			label: 'Usuário',
			render: (value: string, row: User) => `
				<div class="flex items-center gap-3">
					<img src="${row.avatar}" alt="${value}" class="w-10 h-10 rounded-full ring-2 ring-gray-100">
					<div>
						<div class="font-medium text-gray-900">${value}</div>
						<div class="text-sm text-gray-500">${row.email}</div>
					</div>
				</div>
			`
		},
		{
			key: 'role',
			label: 'Função',
			render: (value: string) => getRoleBadge(value)
		},
		{
			key: 'status',
			label: 'Status',
			render: (value: string) => getStatusBadge(value)
		},
		{
			key: 'orders',
			label: 'Pedidos',
			render: (value: number) => `<span class="text-gray-600">${value || 0}</span>`
		},
		{
			key: 'lastLogin',
			label: 'Último Login',
			render: (value: string) => `<span class="text-sm text-gray-600">${value ? formatDate(value) : 'Nunca'}</span>`
		},
		{
			key: 'created',
			label: 'Criado em',
			render: (value: string) => `<span class="text-sm text-gray-600">${formatDate(value)}</span>`
		}
	];
	
	// Handlers
	function handleEditUser(user: User) {
		console.log('Editar usuário', user);
	}
	
	function handleDeleteUser(user: User) {
		if (confirm(`Tem certeza que deseja excluir ${user.name}?`)) {
			console.log('Excluir usuário', user);
		}
	}
	
	function handleCreateUser() {
		console.log('Criar novo usuário');
	}
	
	function handleBulkAction(action: string) {
		console.log('Ação em lote:', action, selectedUsers.size, 'usuários');
		selectedUsers = new Set();
	}
	
	function handleExport() {
		console.log('Exportar dados');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<PageHeader
		title="Gestão de Usuários"
		description="Gerencie todos os usuários da plataforma"
		breadcrumbs={[
			{ label: 'Dashboard', href: '/' },
			{ label: 'Usuários' }
		]}
	>
		{#snippet actions()}
			<button 
				onclick={handleExport}
				class="btn btn-ghost"
			>
				<Icon name="download" size={20} class="mr-2" />
				Exportar
			</button>
			<button 
				onclick={handleCreateUser}
				class="btn btn-primary"
			>
				<Icon name="plus" size={20} class="mr-2" />
				Novo Usuário
			</button>
		{/snippet}
	</PageHeader>
	
	<!-- Stats -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		{#each stats as stat, i}
			<StatCard {...stat} delay={200 + i * 100} />
		{/each}
	</div>
	
	<!-- Tabela de Usuários -->
	<DataTable
		title="Lista de Usuários"
		description="Todos os usuários cadastrados na plataforma"
		{columns}
		data={filteredUsers}
		{loading}
		bind:selectedRows={selectedUsers}
	>
		{#snippet filters()}
			<FilterBar
				bind:searchValue={searchTerm}
				searchPlaceholder="Buscar usuários..."
				filters={[
					{
						label: 'Todas as Funções',
						value: selectedRole,
						options: [
							{ label: 'Cliente', value: 'customer' },
							{ label: 'Vendedor', value: 'vendor' },
							{ label: 'Admin', value: 'admin' }
						],
						onChange: (value) => selectedRole = value
					},
					{
						label: 'Todos os Status',
						value: selectedStatus,
						options: [
							{ label: 'Ativo', value: 'active' },
							{ label: 'Inativo', value: 'inactive' }
						],
						onChange: (value) => selectedStatus = value
					}
				]}
			/>
		{/snippet}
		
		{#snippet bulkActions()}
			<button 
				onclick={() => handleBulkAction('activate')}
				class="btn btn-sm btn-ghost text-green-600"
			>
				Ativar
			</button>
			<button 
				onclick={() => handleBulkAction('deactivate')}
				class="btn btn-sm btn-ghost text-yellow-600"
			>
				Desativar
			</button>
			<button 
				onclick={() => handleBulkAction('delete')}
				class="btn btn-sm btn-ghost text-red-600"
			>
				Excluir
			</button>
			<button 
				onclick={() => selectedUsers = new Set()}
				class="btn btn-sm btn-ghost"
			>
				Limpar Seleção
			</button>
		{/snippet}
		
		{#snippet actions(row)}
			<div class="flex items-center gap-1">
				<button
					onclick={() => handleEditUser(row)}
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					title="Editar usuário"
				>
					<Icon name="edit" size={16} />
				</button>
				<button
					onclick={() => handleDeleteUser(row)}
					class="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
					title="Excluir usuário"
				>
					<Icon name="trash" size={16} />
				</button>
			</div>
		{/snippet}
	</DataTable>
</div> 