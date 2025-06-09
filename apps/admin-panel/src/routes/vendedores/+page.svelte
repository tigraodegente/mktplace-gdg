<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';

	// Interface para vendedores com campos adicionais  
	interface SellerWithDetails {
		id: string;
		user_id: string;
		company_name: string;
		slug: string;
		description?: string;
		logo_url?: string;
		banner_url?: string;
		user_email: string;
		user_name: string;
		state?: string;
		city?: string;
		rating_average: number;
		rating_count: number;
		is_verified: boolean;
		is_active: boolean;
		product_count: number;
		total_sales: number;
		company_document: string;
		created_at: string;
		updated_at: string;
	}

	// Configuração das colunas da tabela
	const columns = [
		{
			key: 'company_info',
			label: 'Loja',
			width: '280px',
			render: (value: string, row: SellerWithDetails) => {
				const logoUrl = row.logo_url || `/api/placeholder/60/60?text=${encodeURIComponent(row.company_name.substring(0, 2))}`;
				return `
					<div class="flex items-center gap-4">
						<img src="${logoUrl}" 
							alt="${row.company_name}" 
							class="w-12 h-12 lg:w-16 lg:h-16 rounded-xl object-cover flex-shrink-0 shadow-sm border border-gray-200"
							onerror="this.src='/api/placeholder/60/60?text=${encodeURIComponent(row.company_name.substring(0, 2))}'"
						/>
						<div class="min-w-0 flex-1">
							<div class="font-semibold text-gray-900 text-sm lg:text-base truncate">${row.company_name}</div>
							<div class="text-xs lg:text-sm text-gray-500 truncate">/${row.slug}</div>
							<div class="text-xs text-gray-400 lg:hidden">${row.user_email}</div>
							${row.state && row.city ? `<div class="text-xs text-gray-400">${row.city}, ${row.state}</div>` : ''}
						</div>
					</div>
				`;
			}
		},
		{
			key: 'user_email',
			label: 'Contato',
			sortable: true,
			hideOnMobile: true,
			render: (value: string, row: SellerWithDetails) => {
				return `
					<div>
						<div class="font-medium text-gray-900">${row.user_name}</div>
						<div class="text-sm text-gray-500">${row.user_email}</div>
						${row.company_document ? `<div class="text-xs text-gray-400">CNPJ: ${row.company_document}</div>` : ''}
					</div>
				`;
			}
		},
		{
			key: 'stats',
			label: 'Estatísticas',
			align: 'center' as const,
			hideOnMobile: true,
			render: (value: any, row: SellerWithDetails) => {
				return `
					<div class="text-center space-y-1">
						<div class="text-sm font-medium text-gray-900">${row.product_count} produtos</div>
						<div class="text-xs text-gray-500">R$ ${row.total_sales.toLocaleString('pt-BR')}</div>
						${row.rating_count > 0 ? 
							`<div class="text-xs text-yellow-600">⭐ ${row.rating_average.toFixed(1)} (${row.rating_count})</div>` :
							`<div class="text-xs text-gray-400">Sem avaliações</div>`
						}
					</div>
				`;
			}
		},
		{
			key: 'verification_status',
			label: 'Verificação',
			sortable: true,
			align: 'center' as const,
			render: (value: any, row: SellerWithDetails) => {
				const isVerified = row.is_verified;
				const isActive = row.is_active;
				
				let statusBadge = '';
				if (isVerified && isActive) {
					statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Verificado</span>';
				} else if (isActive && !isVerified) {
					statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pendente</span>';
				} else {
					statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">❌ Inativo</span>';
				}
				
				return `<div class="text-center">${statusBadge}</div>`;
			}
		},
		{
			key: 'created_at',
			label: 'Cadastro',
			sortable: true,
			hideOnMobile: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		}
	];

	// Função para transformar dados recebidos da API
	function transformSellerData(data: any[]): SellerWithDetails[] {
		if (!data || !Array.isArray(data)) return [];
		
		return data.map((seller: any) => ({
			id: seller.id,
			user_id: seller.user_id,
			company_name: seller.company_name || seller.store_name,
			slug: seller.slug || seller.store_slug,
			description: seller.description,
			logo_url: seller.logo_url,
			banner_url: seller.banner_url,
			user_email: seller.user_email || seller.email,
			user_name: seller.user_name || seller.name,
			state: seller.state,
			city: seller.city,
			rating_average: Number(seller.rating_average || 0),
			rating_count: Number(seller.rating_count || 0),
			is_verified: Boolean(seller.is_verified),
			is_active: Boolean(seller.is_active),
			product_count: Number(seller.product_count || 0),
			total_sales: Number(seller.total_sales || 0),
			company_document: seller.company_document,
			created_at: seller.created_at,
			updated_at: seller.updated_at
		}));
	}

	// Função para transformar estatísticas
	function transformSellerStats(rawStats: any) {
		return {
			total: rawStats.total_sellers || rawStats.total || 0,
			active: rawStats.active_sellers || rawStats.active || 0,
			pending: rawStats.pending_sellers || rawStats.pending || 0,
			lowStock: rawStats.inactive_sellers || rawStats.inactive || 0
		};
	}

	// Configuração de ações customizadas para cada linha
	function customActions(row: SellerWithDetails) {
		return [
			{
				label: 'Ver Produtos',
				icon: 'Package',
				onclick: () => window.location.href = `/produtos?seller=${row.id}`
			},
			{
				label: 'Ver Loja',
				icon: 'ExternalLink',
				onclick: () => window.open(`${window.location.origin.replace(':5174', ':5173')}/loja/${row.slug}`, '_blank')
			},
			{
				label: row.is_verified ? 'Remover Verificação' : 'Verificar',
				icon: row.is_verified ? 'ShieldOff' : 'ShieldCheck',
				onclick: () => toggleVerification(row)
			},
			{
				label: row.is_active ? 'Suspender' : 'Ativar',
				icon: row.is_active ? 'UserX' : 'UserCheck',
				onclick: () => toggleSellerStatus(row)
			}
		];
	}

	// Função para alternar verificação do vendedor
	async function toggleVerification(seller: SellerWithDetails) {
		const action = seller.is_verified ? 'remover a verificação' : 'verificar';
		
		const confirmed = confirm(`Tem certeza que deseja ${action} do vendedor "${seller.company_name}"?`);
		if (!confirmed) return false;
		
		try {
			const response = await fetch(`/api/sellers/${seller.id}/verification`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_verified: !seller.is_verified })
			});
			
			if (response.ok) {
				return true; // AdminPageTemplate irá recarregar automaticamente
			}
		} catch (error) {
			console.error('Erro ao alterar verificação do vendedor:', error);
		}
		return false;
	}

	// Função para alternar status do vendedor
	async function toggleSellerStatus(seller: SellerWithDetails) {
		const action = seller.is_active ? 'suspender' : 'ativar';
		
		const confirmed = confirm(`Tem certeza que deseja ${action} o vendedor "${seller.company_name}"?`);
		if (!confirmed) return false;
		
		try {
			const response = await fetch(`/api/sellers/${seller.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: !seller.is_active })
			});
			
			if (response.ok) {
				return true; // AdminPageTemplate irá recarregar automaticamente
			}
		} catch (error) {
			console.error('Erro ao alterar status do vendedor:', error);
		}
		return false;
	}

	// Função para ação em lote personalizada
	async function bulkUpdateSellers(ids: string[]): Promise<void> {
		const action = prompt('Ação (activate, suspend, verify, unverify, delete):');
		if (!action || !['activate', 'suspend', 'verify', 'unverify', 'delete'].includes(action)) return;
		
		const confirmMsg = action === 'delete' 
			? `Tem certeza que deseja EXCLUIR ${ids.length} vendedor(es)? Esta ação é irreversível!`
			: `Tem certeza que deseja aplicar a ação "${action}" em ${ids.length} vendedor(es)?`;
		
		const confirmed = confirm(confirmMsg);
		if (!confirmed) return;
		
		try {
			const endpoint = action === 'delete' ? '/api/sellers/bulk-delete' : '/api/sellers/bulk-update';
			
			let body: any = { ids };
			if (action === 'activate' || action === 'suspend') {
				body.is_active = action === 'activate';
			} else if (action === 'verify' || action === 'unverify') {
				body.is_verified = action === 'verify';
			}
			
			const response = await fetch(endpoint, {
				method: action === 'delete' ? 'DELETE' : 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			
			if (!response.ok) {
				throw new Error(`Erro ao ${action === 'delete' ? 'excluir' : 'atualizar'} vendedores`);
			}
		} catch (error) {
			console.error('Erro na ação em lote:', error);
		}
	}
</script>

<AdminPageTemplate
	title="Gestão de Vendedores"
	newItemRoute="/vendedores/novo"
	editItemRoute={(id) => `/vendedores/${id}`}
	
	apiEndpoint="/api/sellers"
	deleteEndpoint="/api/sellers"
	statsEndpoint="/api/sellers/stats"
	
	{columns}
	entityName="vendedor"
	entityNamePlural="vendedores"
	
	searchPlaceholder="Buscar vendedores, lojas, emails..."
	searchFields={['company_name', 'slug', 'user_email', 'user_name', 'company_document']}
	
	statsConfig={{
		total: 'total_sellers',
		active: 'active_sellers',
		pending: 'pending_sellers',
		lowStock: 'inactive_sellers'
	}}
	
	onDataLoad={transformSellerData}
	onStatsLoad={transformSellerStats}
	onBulkDelete={bulkUpdateSellers}
	customActions={customActions}
	
	customFilters={[
		{
			key: 'verification_status',
			label: 'Status de Verificação',
			type: 'select',
			options: [
				{ value: '', label: 'Todos' },
				{ value: 'verified', label: 'Verificados' },
				{ value: 'pending', label: 'Pendentes' },
				{ value: 'unverified', label: 'Não Verificados' }
			]
		},
		{
			key: 'rating_min',
			label: 'Avaliação Mínima',
			type: 'select',
			options: [
				{ value: '', label: 'Qualquer' },
				{ value: '4.5', label: '4.5+ estrelas' },
				{ value: '4.0', label: '4.0+ estrelas' },
				{ value: '3.5', label: '3.5+ estrelas' },
				{ value: '3.0', label: '3.0+ estrelas' }
			]
		},
		{
			key: 'location',
			label: 'Localização',
			type: 'select',
			options: [
				{ value: '', label: 'Todos os Estados' },
				{ value: 'SP', label: 'São Paulo' },
				{ value: 'RJ', label: 'Rio de Janeiro' },
				{ value: 'MG', label: 'Minas Gerais' },
				{ value: 'RS', label: 'Rio Grande do Sul' },
				{ value: 'PR', label: 'Paraná' },
				{ value: 'SC', label: 'Santa Catarina' }
			]
		},
		{
			key: 'min_products',
			label: 'Mínimo de Produtos',
			type: 'number',
			placeholder: 'Ex: 10'
		},
		{
			key: 'min_sales',
			label: 'Vendas Mínimas (R$)',
			type: 'number',
			placeholder: 'Ex: 1000'
		}
	]}
/> 