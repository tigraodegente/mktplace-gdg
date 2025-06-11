<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';

	// Interface para usuários com campos adicionais
	interface UserWithDetails {
		id: string;
		name: string;
		email: string;
		phone?: string;
		avatarUrl?: string;
		role: 'admin' | 'seller' | 'customer';
		status: 'active' | 'inactive' | 'pending' | 'suspended';
		emailVerified: boolean;
		twoFactorEnabled: boolean;
		lastLoginAt?: string;
		created_at: string;
		seller?: {
			companyName?: string;
			isVerified?: boolean;
		};
		customer?: {
			totalOrders?: number;
			totalSpent?: number;
		};
	}

	// Configuração das colunas da tabela
	const columns = [
		{
			key: 'avatar',
			label: 'Avatar',
			width: '80px',
			render: (value: string, row: UserWithDetails) => `
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
			render: (value: string, row: UserWithDetails) => `
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
					seller: 'bg-[#00BFB3]/10 text-[#00BFB3]',
					customer: 'bg-green-50 text-green-600'
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
					active: 'bg-green-50 text-green-600',
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
			render: (value: boolean) => value
				? '<span class="text-green-600 text-sm">✓ Verificado</span>'
				: '<span class="text-gray-400 text-sm">Não verificado</span>'
		},
		{
			key: 'twoFactorEnabled',
			label: '2FA',
			align: 'center' as const,
			render: (value: boolean) => value
				? '<span class="text-green-600 text-sm">Ativo</span>'
				: '<span class="text-gray-400 text-sm">Inativo</span>'
		},
		{
			key: 'created_at',
			label: 'Criado em',
			sortable: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		}
	];
	
	// Função para transformar dados recebidos da API
	function transformUserData(data: any[]): UserWithDetails[] {
		if (!data || !Array.isArray(data)) return [];
		
		return data.map((user: any) => ({
			id: user.id,
			name: user.name,
			email: user.email,
			phone: user.phone,
			avatarUrl: user.avatarUrl || user.avatar_url,
			role: user.role,
			status: user.status,
			emailVerified: user.emailVerified || user.email_verified || false,
			twoFactorEnabled: user.twoFactorEnabled || user.two_factor_enabled || false,
			lastLoginAt: user.lastLoginAt || user.last_login_at,
			created_at: user.createdAt || user.created_at,
			seller: user.seller ? {
				companyName: user.seller.companyName || user.seller.company_name,
				isVerified: user.seller.isVerified || user.seller.is_verified
			} : undefined,
			customer: user.customer ? {
				totalOrders: user.customer.totalOrders || user.customer.total_orders,
				totalSpent: user.customer.totalSpent || user.customer.total_spent
			} : undefined
		}));
	}

	// Função para transformar estatísticas
	function transformUserStats(rawStats: any) {
		return {
			total: rawStats.total_users || rawStats.total || 0,
			active: rawStats.active_users || rawStats.active || 0,
			pending: rawStats.pending_users || rawStats.pending || 0,
			lowStock: rawStats.suspended_users || rawStats.suspended || 0
		};
	}

	// Configuração de ações customizadas para cada linha
	function customActions(row: UserWithDetails) {
		return [
			{
				label: 'Ver Perfil',
				icon: 'Eye',
				onclick: () => window.location.href = `/usuarios/${row.id}`
			},
			{
				label: row.status === 'active' ? 'Suspender' : 'Ativar',
				icon: row.status === 'active' ? 'Ban' : 'CheckCircle',
				onclick: () => toggleUserStatus(row)
			}
		];
	}

	// Função para alternar status do usuário
	async function toggleUserStatus(user: UserWithDetails) {
		const newStatus = user.status === 'active' ? 'suspended' : 'active';
		const action = user.status === 'active' ? 'suspender' : 'ativar';
		
		const confirmed = confirm(`Tem certeza que deseja ${action} o usuário ${user.name}?`);
		if (!confirmed) return false;
		
		try {
			const response = await fetch(`/api/users/${user.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			
			if (response.ok) {
				return true;
			}
		} catch (error) {
			console.error('Erro ao alterar status do usuário:', error);
		}
		return false;
	}

	// Função para ação em lote personalizada
	async function bulkUpdateUsers(ids: string[]): Promise<void> {
		const action = prompt('Ação (activate, suspend, delete):');
		if (!action || !['activate', 'suspend', 'delete'].includes(action)) return;
		
		try {
			const endpoint = action === 'delete' ? '/api/users/bulk-delete' : '/api/users/bulk-update';
			const body = action === 'delete' 
				? { ids }
				: { ids, status: action === 'activate' ? 'active' : 'suspended' };
			
			const response = await fetch(endpoint, {
				method: action === 'delete' ? 'DELETE' : 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			
			if (!response.ok) {
				throw new Error(`Erro ao ${action === 'delete' ? 'excluir' : 'atualizar'} usuários`);
			}
		} catch (error) {
			console.error('Erro na ação em lote:', error);
		}
	}
</script>

<AdminPageTemplate
	title="Gestão de Usuários"
	newItemRoute="/usuarios/novo"
	editItemRoute={(id) => `/usuarios/${id}`}
	
	apiEndpoint="/api/users"
	deleteEndpoint="/api/users"
	statsEndpoint="/api/users/stats"
	
	{columns}
	entityName="usuário"
	entityNamePlural="usuários"
	
	searchPlaceholder="Buscar usuários, emails..."
	searchFields={['name', 'email', 'phone']}
	
	statsConfig={{
		total: 'total_users',
		active: 'active_users',
		pending: 'pending_users',
		lowStock: 'suspended_users'
	}}
	
	onDataLoad={transformUserData}
	onStatsLoad={transformUserStats}
	onBulkDelete={bulkUpdateUsers}
	customActions={customActions}
	
	customFilters={[
		{
			key: 'role',
			label: 'Perfil',
			type: 'select',
			options: [
				{ value: '', label: 'Todos os Perfis' },
				{ value: 'admin', label: 'Administradores' },
				{ value: 'seller', label: 'Vendedores' },
				{ value: 'customer', label: 'Clientes' }
			]
		},
		{
			key: 'email_verified',
			label: 'Email Verificado',
			type: 'select',
			options: [
				{ value: '', label: 'Todos' },
				{ value: 'true', label: 'Verificados' },
				{ value: 'false', label: 'Não Verificados' }
			]
		},
		{
			key: 'two_factor',
			label: '2FA',
			type: 'select',
			options: [
				{ value: '', label: 'Todos' },
				{ value: 'true', label: 'Com 2FA' },
				{ value: 'false', label: 'Sem 2FA' }
			]
		}
	]}
/> 