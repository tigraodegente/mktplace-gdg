<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import type { Order } from '$lib/types';

	// Interface para pedidos com campos adicionais
	interface OrderWithDetails extends Order {
		customer_name?: string;
		customer_email?: string;
		items_count?: number;
		seller_name?: string;
		payment_method?: string;
	}

	// Configuração das colunas da tabela
	const columns = [
		{
			key: 'order_number',
			label: 'Pedido',
			width: '140px',
			render: (value: string, row: OrderWithDetails) => `
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-lg flex items-center justify-center text-white font-semibold text-sm">
						#${value.slice(-3)}
					</div>
					<div>
						<div class="font-medium text-gray-900">#${value}</div>
						<div class="text-sm text-gray-500">${row.items_count || 0} ${(row.items_count || 0) > 1 ? 'itens' : 'item'}</div>
					</div>
				</div>
			`
		},
		{
			key: 'customer_name',
			label: 'Cliente',
			sortable: true,
			render: (value: string, row: OrderWithDetails) => {
				const customerName = row.customer_name || 'Cliente não identificado';
				const customerEmail = row.customer_email || '';
				return `
					<div>
						<div class="font-medium text-gray-900">${customerName}</div>
						${customerEmail ? `<div class="text-sm text-gray-500">${customerEmail}</div>` : ''}
					</div>
				`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: string) => {
				const statusMap = {
					pending: { color: 'amber', label: 'Pendente' },
					processing: { color: '[#00BFB3]', label: 'Processando' },
					shipped: { color: '[#00BFB3]', label: 'Enviado' },
					delivered: { color: 'green', label: 'Entregue' },
					cancelled: { color: 'red', label: 'Cancelado' },
					refunded: { color: 'gray', label: 'Reembolsado' }
				};
				const status = statusMap[value as keyof typeof statusMap] || { color: 'gray', label: value };
				return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-800">${status.label}</span>`;
			}
		},
		{
			key: 'payment_status',
			label: 'Pagamento',
			sortable: true,
			align: 'center' as const,
			render: (value: string) => {
				const paymentMap = {
					pending: { color: 'amber', label: 'Pendente' },
					paid: { color: 'green', label: 'Pago' },
					failed: { color: 'red', label: 'Falhou' },
					refunded: { color: 'gray', label: 'Reembolsado' }
				};
				const payment = paymentMap[value as keyof typeof paymentMap] || { color: 'gray', label: value };
				return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${payment.color}-100 text-${payment.color}-800">${payment.label}</span>`;
			}
		},
		{
			key: 'total',
			label: 'Total',
			sortable: true,
			align: 'right' as const,
			render: (value: number) => `
				<div class="text-right">
					<div class="font-medium text-gray-900">R$ ${(value || 0).toFixed(2)}</div>
				</div>
			`
		},
		{
			key: 'payment_method',
			label: 'Pagamento',
			render: (value: string) => {
				const methodMap = {
					credit_card: 'Cartão de Crédito',
					debit_card: 'Cartão de Débito',
					pix: 'PIX',
					bank_slip: 'Boleto',
					wallet: 'Carteira Digital'
				};
				const method = methodMap[value as keyof typeof methodMap] || value || 'N/A';
				return `<span class="text-sm text-gray-600">${method}</span>`;
			}
		},
		{
			key: 'seller_name',
			label: 'Vendedor',
			render: (value: string) => {
				const sellerName = value || 'Marketplace';
				return `<span class="text-sm text-gray-600">${sellerName}</span>`;
			}
		},
		{
			key: 'created_at',
			label: 'Data do Pedido',
			sortable: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
			}
		}
	];

	// Configuração dos filtros de status específicos para pedidos
	const statusOptions = [
		{ value: 'all', label: 'Todos os Status' },
		{ value: 'pending', label: 'Pendente' },
		{ value: 'processing', label: 'Processando' },
		{ value: 'shipped', label: 'Enviado' },
		{ value: 'delivered', label: 'Entregue' },
		{ value: 'cancelled', label: 'Cancelado' },
		{ value: 'refunded', label: 'Reembolsado' }
	];

	// Função para transformar dados recebidos da API
	function transformOrderData(data: any[]): OrderWithDetails[] {
		if (!data || !Array.isArray(data)) return [];
		
		return data.map((order: any) => ({
					id: order.id,
			user_id: order.user_id || order.customer?.id || '',
			order_number: order.orderNumber || order.order_number,
			customer_name: order.customer?.name || order.customer_name || 'N/A',
			customer_email: order.customer?.email || order.customer_email || '',
					status: order.status,
			payment_status: order.paymentStatus || order.payment_status,
			payment_method: order.paymentMethod || order.payment_method,
					subtotal: Number(order.subtotal || 0),
			shipping: Number(order.shippingCost || order.shipping || 0),
					discount: Number(order.discount || 0),
			tax: Number(order.tax || 0),
					total: Number(order.total || 0),
			items: order.items || [],
			items_count: order.itemCount || order.items_count || 0,
			seller_name: order.seller?.name || order.seller_name || 'Marketplace',
			created_at: order.createdAt || order.created_at,
			updated_at: order.updatedAt || order.updated_at
		}));
	}

	// Função para transformar estatísticas
	function transformOrderStats(rawStats: any) {
		return {
			total: rawStats.total_orders || rawStats.total || 0,
			active: rawStats.pending_orders || rawStats.pending || 0,
			pending: rawStats.processing_orders || rawStats.processing || 0,
			lowStock: rawStats.cancelled_orders || rawStats.cancelled || 0
		};
	}

	// Configuração de ações customizadas para cada linha
	function customActions(row: OrderWithDetails) {
		return [
			{
				label: 'Ver Detalhes',
				icon: 'Eye',
				onclick: () => window.location.href = `/pedidos/${row.id}`
			},
			{
				label: 'Atualizar Status',
				icon: 'Edit',
				onclick: () => updateOrderStatus(row)
			},
			{
				label: row.status !== 'cancelled' ? 'Cancelar' : 'Reativar',
				icon: row.status !== 'cancelled' ? 'X' : 'RefreshCw',
				onclick: () => toggleOrderStatus(row)
			}
		];
	}

	// Função para atualizar status do pedido
	async function updateOrderStatus(order: OrderWithDetails) {
		// Redirecionar para página de edição ou abrir modal
		window.location.href = `/pedidos/${order.id}/edit`;
	}

	// Função para alternar status do pedido (cancelar/reativar)
	async function toggleOrderStatus(order: OrderWithDetails) {
		const newStatus = order.status === 'cancelled' ? 'pending' : 'cancelled';
		const action = order.status === 'cancelled' ? 'reativar' : 'cancelar';
		
		const confirmed = confirm(`Tem certeza que deseja ${action} o pedido #${order.order_number}?`);
		if (!confirmed) return false;
		
		try {
			const response = await fetch(`/api/orders/${order.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			
			if (response.ok) {
				return true; // AdminPageTemplate irá recarregar automaticamente
			}
		} catch (error) {
			console.error('Erro ao alterar status do pedido:', error);
		}
		return false;
	}

	// Função para ação em lote personalizada
	async function bulkUpdateStatus(ids: string[]): Promise<void> {
		const newStatus = prompt('Novo status (pending, processing, shipped, delivered, cancelled):');
		if (!newStatus) return;
		
		try {
			const response = await fetch('/api/orders/bulk-update', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids, status: newStatus })
			});
			
			if (!response.ok) {
				throw new Error('Erro ao atualizar status dos pedidos');
			}
		} catch (error) {
			console.error('Erro ao atualizar pedidos em lote:', error);
		}
	}
</script>

<AdminPageTemplate
	title="Gestão de Pedidos"
	newItemRoute="/pedidos/novo"
	editItemRoute={(id) => `/pedidos/${id}`}
	
	apiEndpoint="/api/orders"
	deleteEndpoint="/api/orders"
	statsEndpoint="/api/orders/stats"
	
	{columns}
	entityName="pedido"
	entityNamePlural="pedidos"
	
	searchPlaceholder="Buscar pedidos, clientes..."
	searchFields={['order_number', 'customer_name', 'customer_email']}
	
	statsConfig={{
		total: 'total_orders',
		active: 'pending_orders',
		pending: 'processing_orders', 
		lowStock: 'cancelled_orders'
	}}
	
	onDataLoad={transformOrderData}
	onStatsLoad={transformOrderStats}
	onBulkDelete={bulkUpdateStatus}
	customActions={customActions}
	
	customFilters={[
		{
			key: 'payment_status',
			label: 'Status do Pagamento',
			type: 'select',
			options: [
				{ value: '', label: 'Todos' },
				{ value: 'pending', label: 'Pendente' },
				{ value: 'paid', label: 'Pago' },
				{ value: 'failed', label: 'Falhou' },
				{ value: 'refunded', label: 'Reembolsado' }
			]
		},
		{
			key: 'payment_method',
			label: 'Método de Pagamento',
			type: 'select',
			options: [
				{ value: '', label: 'Todos' },
				{ value: 'credit_card', label: 'Cartão de Crédito' },
				{ value: 'debit_card', label: 'Cartão de Débito' },
				{ value: 'pix', label: 'PIX' },
				{ value: 'bank_slip', label: 'Boleto' },
				{ value: 'wallet', label: 'Carteira Digital' }
			]
		},
		{
			key: 'date_range',
			label: 'Período',
			type: 'select',
			options: [
				{ value: '', label: 'Todo período' },
				{ value: 'today', label: 'Hoje' },
				{ value: 'yesterday', label: 'Ontem' },
				{ value: 'week', label: 'Esta semana' },
				{ value: 'month', label: 'Este mês' },
				{ value: 'quarter', label: 'Este trimestre' }
			]
		},
		{
			key: 'min_total',
			label: 'Valor Mínimo',
			type: 'number',
			placeholder: 'Ex: 50.00'
		},
		{
			key: 'max_total',
			label: 'Valor Máximo', 
			type: 'number',
			placeholder: 'Ex: 500.00'
		}
	]}
/>