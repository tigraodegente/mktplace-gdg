<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import Icon from '$lib/Icon.svelte';
	
	// Interface
	interface Order {
		id: string;
		customer: string;
		email: string;
		status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
		total: number;
		items: number;
		created: string;
		payment: string;
	}
	
	// Estado
	let orders = $state<Order[]>([]);
	let loading = $state(true);
	let searchTerm = $state('');
	let selectedStatus = $state('');
	let selectedPayment = $state('');
	let selectedOrders = $state(new Set<string>());
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Stats
	let stats = $state([
		{ 
			title: 'Pedidos Hoje',
			value: 89,
			change: 25,
			changeType: 'increase' as const,
			icon: '📋',
			iconBg: 'from-cyan-500 to-cyan-600',
			subtitle: 'vs. ontem'
		},
		{ 
			title: 'Processando',
			value: 156,
			icon: '⏳',
			iconBg: 'from-yellow-500 to-yellow-600',
			subtitle: 'Requer atenção'
		},
		{ 
			title: 'Entregues',
			value: '1.5k',
			change: 12,
			changeType: 'increase' as const,
			icon: '✅',
			iconBg: 'from-green-500 to-green-600',
			subtitle: 'este mês'
		},
		{
			title: 'Faturamento',
			value: 'R$ 124.5k',
			change: 32,
			changeType: 'increase' as const,
			icon: '💰',
			iconBg: 'from-purple-500 to-purple-600',
			subtitle: 'este mês'
		}
	]);
	
	// Filtros reativos
	const filteredOrders = $derived(
		orders.filter(order => {
			return (
				(searchTerm === '' || 
				 order.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
				 order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
				 order.id.includes(searchTerm)) &&
				(selectedStatus === '' || order.status === selectedStatus) &&
				(selectedPayment === '' || order.payment === selectedPayment)
			);
		})
	);
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
	});
	
	onMount(() => {
		loadOrders();
	});
	
	async function loadOrders() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			orders = [
				{ 
					id: '12345',
					customer: 'João Silva',
					email: 'joao@email.com',
					status: 'processing',
					total: 2999.99,
					items: 2,
					created: '2024-01-15',
					payment: 'Cartão de Crédito'
				},
				{ 
					id: '12346',
					customer: 'Maria Santos',
					email: 'maria@email.com',
					status: 'shipped',
					total: 1299.99,
					items: 1,
					created: '2024-01-14',
					payment: 'PIX'
				},
				{ 
					id: '12347',
					customer: 'Pedro Costa',
					email: 'pedro@email.com',
					status: 'delivered',
					total: 849.99,
					items: 3,
					created: '2024-01-12',
					payment: 'Boleto'
				},
				{ 
					id: '12348',
					customer: 'Ana Oliveira',
					email: 'ana@email.com',
					status: 'cancelled',
					total: 599.99,
					items: 1,
					created: '2024-01-10',
					payment: 'Cartão de Débito'
				}
			];
			
			// Adicionar mais dados mock
			for (let i = 0; i < 20; i++) {
				orders.push({
					id: `${12349 + i}`,
					customer: `Cliente ${i + 1}`,
					email: `cliente${i + 1}@email.com`,
					status: ['processing', 'shipped', 'delivered', 'cancelled'][Math.floor(Math.random() * 4)] as any,
					total: Math.floor(Math.random() * 5000) + 100,
					items: Math.floor(Math.random() * 5) + 1,
					created: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					payment: ['Cartão de Crédito', 'PIX', 'Boleto', 'Cartão de Débito'][Math.floor(Math.random() * 4)]
				});
			}
			
			if (userRole === 'vendor') {
				// Filtrar apenas pedidos do vendedor
				orders = orders.slice(0, 10);
			}
			
			loading = false;
		}, 1000);
	}
	
	// Formatadores
	function formatPrice(price: number): string {
		return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('pt-BR');
	}
	
	// Badges de status
	function getStatusBadge(status: string) {
		const badges: Record<string, string> = {
			processing: 'badge-warning',
			shipped: 'badge-info',
			delivered: 'badge-success',
			cancelled: 'badge-danger'
		};
		
		const labels: Record<string, string> = {
			processing: 'Processando',
			shipped: 'Enviado',
			delivered: 'Entregue',
			cancelled: 'Cancelado'
		};
		
		return `<span class="badge ${badges[status]}">${labels[status]}</span>`;
	}
	
	// Colunas da tabela
	const columns = [
		{
			key: 'id',
			label: 'Pedido',
			render: (value: string, row: Order) => `
				<div>
					<div class="font-medium text-gray-900">#${value}</div>
					<div class="text-sm text-gray-500">${row.items} ${row.items > 1 ? 'itens' : 'item'}</div>
				</div>
			`
		},
		{
			key: 'customer',
			label: 'Cliente',
			render: (value: string, row: Order) => `
				<div>
					<div class="font-medium text-gray-900">${value}</div>
					<div class="text-sm text-gray-500">${row.email}</div>
				</div>
			`
		},
		{
			key: 'status',
			label: 'Status',
			render: (value: string) => getStatusBadge(value)
		},
		{
			key: 'total',
			label: 'Total',
			render: (value: number) => `<span class="font-medium">${formatPrice(value)}</span>`
		},
		{
			key: 'payment',
			label: 'Pagamento'
		},
		{
			key: 'created',
			label: 'Data',
			render: (value: string) => formatDate(value)
		}
	];
	
	// Handlers
	function handleViewOrder(order: Order) {
		console.log('Ver detalhes', order);
	}
	
	function handleEditOrder(order: Order) {
		console.log('Editar', order);
	}
	
	function handleCancelOrder(order: Order) {
		console.log('Cancelar', order);
	}
	
	function handleBulkUpdateStatus(status: string) {
		console.log('Atualizar status de', selectedOrders.size, 'pedidos para', status);
		selectedOrders = new Set();
	}
	
	function handleExport() {
		console.log('Exportar dados');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<PageHeader
		title={userRole === 'admin' ? 'Gestão de Pedidos' : 'Meus Pedidos'}
		description="Monitore e processe todos os pedidos do marketplace"
		breadcrumbs={[
			{ label: 'Dashboard', href: '/' },
			{ label: 'Pedidos' }
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
			<button class="btn btn-primary">
				<Icon name="chevronDown" size={20} class="mr-2" />
				Atualizar
			</button>
		{/snippet}
	</PageHeader>
	
	<!-- Stats -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		{#each stats as stat, i}
			<StatCard {...stat} delay={200 + i * 100} />
		{/each}
	</div>
	
	<!-- Tabela de Pedidos -->
	<DataTable
		title="Lista de Pedidos"
		description="Todos os pedidos realizados na plataforma"
		{columns}
		data={filteredOrders}
		{loading}
		bind:selectedRows={selectedOrders}
	>
		{#snippet filters()}
			<FilterBar
				bind:searchValue={searchTerm}
				searchPlaceholder="Buscar pedidos..."
				filters={[
					{
						label: 'Todos os Status',
						value: selectedStatus,
						options: [
							{ label: 'Processando', value: 'processing' },
							{ label: 'Enviado', value: 'shipped' },
							{ label: 'Entregue', value: 'delivered' },
							{ label: 'Cancelado', value: 'cancelled' }
						],
						onChange: (value) => selectedStatus = value
					},
					{
						label: 'Todas as Formas',
						value: selectedPayment,
						options: [
							{ label: 'Cartão de Crédito', value: 'Cartão de Crédito' },
							{ label: 'Cartão de Débito', value: 'Cartão de Débito' },
							{ label: 'PIX', value: 'PIX' },
							{ label: 'Boleto', value: 'Boleto' }
						],
						onChange: (value) => selectedPayment = value
					}
				]}
			/>
		{/snippet}
		
		{#snippet bulkActions()}
			<button 
				onclick={() => handleBulkUpdateStatus('shipped')}
				class="btn btn-sm btn-ghost text-blue-600"
			>
				Marcar como Enviado
			</button>
			<button 
				onclick={() => handleBulkUpdateStatus('cancelled')}
				class="btn btn-sm btn-ghost text-red-600"
			>
				Cancelar
			</button>
			<button 
				onclick={() => selectedOrders = new Set()}
				class="btn btn-sm btn-ghost"
			>
				Limpar Seleção
			</button>
		{/snippet}
		
		{#snippet actions(row)}
			<div class="flex items-center gap-1">
				<button
					onclick={() => handleViewOrder(row)}
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					title="Ver detalhes"
				>
					<Icon name="eye" size={16} />
				</button>
				<button
					onclick={() => handleEditOrder(row)}
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					title="Editar"
				>
					<Icon name="edit" size={16} />
				</button>
				{#if row.status !== 'cancelled' && row.status !== 'delivered'}
					<button
						onclick={() => handleCancelOrder(row)}
						class="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
						title="Cancelar"
					>
						<Icon name="x" size={16} />
					</button>
				{/if}
			</div>
		{/snippet}
	</DataTable>
</div> 