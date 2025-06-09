<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';

	// Interface para cupons com campos adicionais
	interface CouponWithDetails {
		id: string;
		code: string;
		description: string;
		type: 'percentage' | 'fixed' | 'free_shipping';
		value: number;
		min_purchase?: number;
		max_discount?: number;
		usage_limit?: number;
		usage_count: number;
		user_limit?: number;
		start_date: string;
		end_date: string;
		is_active: boolean;
		created_at: string;
		status?: string;
	}

	// Configuração das colunas da tabela
	const columns = [
		{
			key: 'code',
			label: 'Código',
			sortable: true,
			render: (value: string, row: CouponWithDetails) => `
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
						${getTypeIcon(row.type)}
					</div>
					<div>
						<div class="font-medium text-gray-900">${row.code}</div>
						<div class="text-sm text-gray-500">${getTypeLabel(row.type)}</div>
					</div>
				</div>
			`
		},
		{
			key: 'description',
			label: 'Descrição',
			sortable: true,
			render: (value: string) => `
				<div class="max-w-xs truncate">
					<div class="font-medium text-gray-900">${value}</div>
				</div>
			`
		},
		{
			key: 'value',
			label: 'Valor',
			sortable: true,
			align: 'center' as const,
			render: (value: number, row: CouponWithDetails) => {
				if (row.type === 'percentage') {
					return `<span class="font-medium text-green-600">${value}%</span>`;
				} else if (row.type === 'fixed') {
					return `<span class="font-medium text-green-600">R$ ${value.toFixed(2)}</span>`;
				} else {
					return `<span class="font-medium text-blue-600">Frete Grátis</span>`;
				}
			}
		},
		{
			key: 'usage_stats',
			label: 'Uso',
			align: 'center' as const,
			render: (value: any, row: CouponWithDetails) => {
				const percentage = row.usage_limit ? (row.usage_count / row.usage_limit) * 100 : 0;
				const usageText = row.usage_limit ? `${row.usage_count}/${row.usage_limit}` : `${row.usage_count}`;
				return `
					<div class="text-center">
						<div class="font-medium text-gray-900">${usageText}</div>
						${row.usage_limit ? `<div class="text-xs text-gray-500">${percentage.toFixed(0)}%</div>` : ''}
					</div>
				`;
			}
		},
		{
			key: 'validity',
			label: 'Validade',
			render: (value: any, row: CouponWithDetails) => {
				const startDate = new Date(row.start_date);
				const endDate = new Date(row.end_date);
				return `
					<div class="text-sm">
						<div class="text-gray-600">Início: ${startDate.toLocaleDateString('pt-BR')}</div>
						<div class="text-gray-600">Fim: ${endDate.toLocaleDateString('pt-BR')}</div>
					</div>
				`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: string, row: CouponWithDetails) => {
				const status = getCouponStatus(row);
				const statusMap = {
					active: { color: 'green', label: 'Ativo' },
					scheduled: { color: 'blue', label: 'Agendado' },
					expired: { color: 'yellow', label: 'Expirado' },
					exhausted: { color: 'red', label: 'Esgotado' },
					inactive: { color: 'gray', label: 'Inativo' }
				};
				const statusConfig = statusMap[status as keyof typeof statusMap] || statusMap.inactive;
				return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${statusConfig.color}-100 text-${statusConfig.color}-800">${statusConfig.label}</span>`;
			}
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

	// Função auxiliar para obter ícone do tipo
	function getTypeIcon(type: string): string {
		const icons = {
			percentage: '%',
			fixed: 'R$',
			free_shipping: '🚚'
		};
		return icons[type as keyof typeof icons] || '🎟️';
	}

	// Função auxiliar para obter label do tipo
	function getTypeLabel(type: string): string {
		const labels = {
			percentage: 'Percentual',
			fixed: 'Valor Fixo',
			free_shipping: 'Frete Grátis'
		};
		return labels[type as keyof typeof labels] || type;
	}

	// Função auxiliar para obter status do cupom
	function getCouponStatus(coupon: CouponWithDetails): string {
		if (!coupon.is_active) return 'inactive';
		const now = new Date();
		const start = new Date(coupon.start_date);
		const end = new Date(coupon.end_date);
		
		if (now < start) return 'scheduled';
		if (now > end) return 'expired';
		if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return 'exhausted';
		return 'active';
	}

	// Configuração dos filtros de status específicos para cupons
	const statusOptions = [
		{ value: 'all', label: 'Todos os Status' },
		{ value: 'active', label: 'Ativos' },
		{ value: 'scheduled', label: 'Agendados' },
		{ value: 'expired', label: 'Expirados' },
		{ value: 'exhausted', label: 'Esgotados' },
		{ value: 'inactive', label: 'Inativos' }
	];

	// Função para transformar dados recebidos da API
	function transformCouponData(data: any[]): CouponWithDetails[] {
		if (!data || !Array.isArray(data)) return [];
		
		return data.map((coupon: any) => ({
			id: coupon.id,
			code: coupon.code,
			description: coupon.description,
			type: coupon.type,
			value: Number(coupon.value || 0),
			min_purchase: coupon.min_purchase ? Number(coupon.min_purchase) : undefined,
			max_discount: coupon.max_discount ? Number(coupon.max_discount) : undefined,
			usage_limit: coupon.usage_limit ? Number(coupon.usage_limit) : undefined,
			usage_count: Number(coupon.usage_count || 0),
			user_limit: coupon.user_limit ? Number(coupon.user_limit) : undefined,
			start_date: coupon.start_date || coupon.valid_from,
			end_date: coupon.end_date || coupon.valid_until,
			is_active: coupon.is_active !== false,
			created_at: coupon.created_at,
			status: getCouponStatus(coupon)
		}));
	}

	// Função para transformar estatísticas
	function transformCouponStats(rawStats: any) {
		return {
			total: rawStats.total_coupons || rawStats.total || 0,
			active: rawStats.active_coupons || rawStats.active || 0,
			pending: rawStats.scheduled_coupons || rawStats.scheduled || 0,
			lowStock: rawStats.expired_coupons || rawStats.expired || 0
		};
	}

	// Configuração de ações customizadas para cada linha
	function customActions(row: CouponWithDetails) {
		return [
			{
				label: 'Duplicar',
				icon: 'Copy',
				onclick: () => duplicateCoupon(row)
			},
			{
				label: row.is_active ? 'Desativar' : 'Ativar',
				icon: row.is_active ? 'EyeOff' : 'Eye',
				onclick: () => toggleCouponStatus(row)
			},
			{
				label: 'Ver Estatísticas',
				icon: 'BarChart',
				onclick: () => window.location.href = `/cupons/${row.id}/stats`
			}
		];
	}

	// Função para duplicar cupom
	function duplicateCoupon(coupon: CouponWithDetails) {
		const newCode = prompt(`Novo código para o cupom duplicado:`, `${coupon.code}_COPY`);
		if (!newCode) return;
		
		// Redirecionar para página de criação com dados preenchidos
		const params = new URLSearchParams({
			duplicate: coupon.id,
			code: newCode
		});
		window.location.href = `/cupons/novo?${params}`;
	}

	// Função para alternar status do cupom
	async function toggleCouponStatus(coupon: CouponWithDetails) {
		const action = coupon.is_active ? 'desativar' : 'ativar';
		
		const confirmed = confirm(`Tem certeza que deseja ${action} o cupom ${coupon.code}?`);
		if (!confirmed) return false;
		
		try {
			const response = await fetch(`/api/coupons/${coupon.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: !coupon.is_active })
			});
			
			if (response.ok) {
				return true; // AdminPageTemplate irá recarregar automaticamente
			}
		} catch (error) {
			console.error('Erro ao alterar status do cupom:', error);
		}
		return false;
	}

	// Função para ação em lote personalizada
	async function bulkUpdateCoupons(ids: string[]): Promise<void> {
		const action = prompt('Ação (activate, deactivate, delete):');
		if (!action || !['activate', 'deactivate', 'delete'].includes(action)) return;
		
		const confirmMsg = action === 'delete' 
			? `Tem certeza que deseja EXCLUIR ${ids.length} cupom(ns)? Esta ação é irreversível!`
			: `Tem certeza que deseja ${action === 'activate' ? 'ativar' : 'desativar'} ${ids.length} cupom(ns)?`;
		
		const confirmed = confirm(confirmMsg);
		if (!confirmed) return;
		
		try {
			const endpoint = action === 'delete' ? '/api/coupons/bulk-delete' : '/api/coupons/bulk-update';
			const body = action === 'delete' 
				? { ids }
				: { ids, is_active: action === 'activate' };
			
			const response = await fetch(endpoint, {
				method: action === 'delete' ? 'DELETE' : 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			
			if (!response.ok) {
				throw new Error(`Erro ao ${action === 'delete' ? 'excluir' : 'atualizar'} cupons`);
			}
		} catch (error) {
			console.error('Erro na ação em lote:', error);
		}
	}
</script>

<AdminPageTemplate
	title="Gestão de Cupons"
	newItemRoute="/cupons/novo"
	editItemRoute={(id) => `/cupons/${id}`}
	
	apiEndpoint="/api/coupons"
	deleteEndpoint="/api/coupons"
	statsEndpoint="/api/coupons/stats"
	
	{columns}
	entityName="cupom"
	entityNamePlural="cupons"
	
	searchPlaceholder="Buscar cupons..."
	searchFields={['code', 'description']}
	
	statsConfig={{
		total: 'total_coupons',
		active: 'active_coupons',
		pending: 'scheduled_coupons',
		lowStock: 'expired_coupons'
	}}
	
	onDataLoad={transformCouponData}
	onStatsLoad={transformCouponStats}
	onBulkDelete={bulkUpdateCoupons}
	customActions={customActions}
	
	customFilters={[
		{
			key: 'type',
			label: 'Tipo de Cupom',
			type: 'select',
			options: [
				{ value: '', label: 'Todos os Tipos' },
				{ value: 'percentage', label: 'Percentual' },
				{ value: 'fixed', label: 'Valor Fixo' },
				{ value: 'free_shipping', label: 'Frete Grátis' }
			]
		},
		{
			key: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ value: '', label: 'Todos' },
				{ value: 'active', label: 'Ativos' },
				{ value: 'scheduled', label: 'Agendados' },
				{ value: 'expired', label: 'Expirados' },
				{ value: 'exhausted', label: 'Esgotados' },
				{ value: 'inactive', label: 'Inativos' }
			]
		},
		{
			key: 'usage_rate',
			label: 'Taxa de Uso',
			type: 'select',
			options: [
				{ value: '', label: 'Todas' },
				{ value: 'low', label: 'Baixa (0-25%)' },
				{ value: 'medium', label: 'Média (26-75%)' },
				{ value: 'high', label: 'Alta (76-100%)' }
			]
		},
		{
			key: 'min_value',
			label: 'Valor Mínimo',
			type: 'number',
			placeholder: 'Ex: 10'
		},
		{
			key: 'max_value',
			label: 'Valor Máximo',
			type: 'number',
			placeholder: 'Ex: 100'
		}
	]}
/> 