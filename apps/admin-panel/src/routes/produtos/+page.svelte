<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { goto } from '$app/navigation';

	// Interface para produtos com campos adicionais
	interface ProductWithDetails {
		id: string;
		name: string;
		sku: string;
		description?: string;
		price: number;
		original_price?: number;
		cost?: number;
		quantity: number;
		category?: string;
		category_id?: string;
		brand?: string;
		brand_id?: string;
		images?: string[];
		image?: string;
		is_active: boolean;
		featured?: boolean;
		created_at: string;
		updated_at?: string;
	}

	// Configuração das colunas da tabela - responsiva e moderna
	const columns = [
		{
			key: 'image',
			label: 'Produto',
			width: '250px',
			render: (value: string, row: ProductWithDetails) => {
				const imageUrl = row.images?.[0] || row.image || `/api/placeholder/80/80?text=${encodeURIComponent(row.name)}`;
				return `
					<div class="flex items-center space-x-3">
					<img src="${imageUrl}" 
						alt="${row.name}" 
							class="w-12 h-12 lg:w-16 lg:h-16 rounded-lg object-cover flex-shrink-0 shadow-sm"
							onerror="this.src='/api/placeholder/80/80?text=${encodeURIComponent(row.name)}'"
					/>
						<div class="min-w-0 flex-1">
							<div class="font-medium text-gray-900 text-sm lg:text-base truncate">${row.name}</div>
							<div class="text-xs lg:text-sm text-gray-500 mt-1">SKU: ${row.sku}</div>
							<div class="text-xs text-gray-400 lg:hidden">${row.category || 'Sem categoria'}</div>
						</div>
					</div>
				`;
			}
		},
		{
			key: 'category',
			label: 'Categoria',
			sortable: true,
			hideOnMobile: true,
			render: (value: string, row: ProductWithDetails) => {
				return `<span class="text-sm text-gray-600">${row.category || 'Sem categoria'}</span>`;
			}
		},
		{
			key: 'price',
			label: 'Preço',
			sortable: true,
			align: 'right' as const,
			render: (value: number, row: ProductWithDetails) => {
				const hasDiscount = row.original_price && row.original_price > value;
				return `
					<div class="text-right">
						<div class="font-semibold text-gray-900 text-sm lg:text-base">R$ ${value.toFixed(2)}</div>
						${hasDiscount ? `<div class="text-xs text-gray-500 line-through">R$ ${row.original_price!.toFixed(2)}</div>` : ''}
					</div>
				`;
			}
		},
		{
			key: 'quantity',
			label: 'Estoque',
			sortable: true,
			align: 'center' as const,
			render: (value: number) => {
				const color = value === 0 ? 'red' : value < 10 ? 'yellow' : 'green';
				const bgColor = value === 0 ? 'bg-red-100 text-red-800' : value < 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
				return `
					<div class="text-center">
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}">
							${value}
						</span>
					</div>
				`;
			}
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: any, row: any) => {
				const isActive = Boolean(row.is_active);
				const bgClass = isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
				const status = isActive ? 'Ativo' : 'Inativo';
				return `
					<div class="text-center">
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass}">
							${status}
						</span>
					</div>
				`;
			}
		}
	];

	// Função para transformar dados recebidos da API
	function transformProductData(data: any[]): ProductWithDetails[] {
		if (!data || !Array.isArray(data)) return [];
		
		return data.map((product: any) => ({
			id: product.id,
			name: product.name,
			sku: product.sku,
			description: product.description,
			price: Number(product.price || 0),
			original_price: product.originalPrice ? Number(product.originalPrice) : undefined,
			cost: product.cost ? Number(product.cost) : undefined,
			quantity: Number(product.stock || product.quantity || 0),
			category: product.category || product.category_name,
			category_id: product.category_id,
			brand: product.brand || product.brand_name,
			brand_id: product.brand_id,
			images: product.images || (product.image ? [product.image] : []),
			image: product.image,
			is_active: product.is_active !== false,
			featured: product.featured || false,
			created_at: product.createdAt || product.created_at,
			updated_at: product.updatedAt || product.updated_at
		}));
	}

	// Configuração de ações corrigidas
	function customActions(row: ProductWithDetails) {
		return [
			{
				label: 'Editar',
				icon: 'edit',
				onclick: () => goto(`/produtos/${row.id}`)
			},
			{
				label: 'Ver na Loja',
				icon: 'preview',
				onclick: () => window.open(`${window.location.origin.replace(':5174', ':5173')}/produtos/${row.id}`, '_blank')
			},
			{
				label: 'Excluir',
				icon: 'trash',
				onclick: async () => {
					const confirmed = confirm(`Tem certeza que deseja EXCLUIR o produto "${row.name}"? Esta ação é irreversível!`);
					if (!confirmed) return;
					
					try {
						const response = await fetch(`/api/products/${row.id}`, {
							method: 'DELETE',
							headers: {
								'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
								'Content-Type': 'application/json'
							}
						});
						
						if (!response.ok) {
							throw new Error('Erro ao excluir produto');
						}
						
						// Recarregar a página para atualizar a lista
						window.location.reload();
					} catch (error) {
						console.error('Erro ao excluir produto:', error);
						alert('Erro ao excluir produto. Tente novamente.');
					}
				}
			}
		];
	}

	// Função para transformar estatísticas da API
	function transformStats(rawStats: any) {
		return {
			total: rawStats.total || 0,
			active: rawStats.active || 0,
			inactive: rawStats.inactive || 0,
			low_stock: rawStats.low_stock || 0
		};
	}

	// Função para ação em lote (apenas delete)
	async function bulkDeleteProducts(ids: string[]): Promise<void> {
		const confirmed = confirm(`Tem certeza que deseja EXCLUIR ${ids.length} produto(s)? Esta ação é irreversível!`);
		if (!confirmed) return;
		
		try {
			const response = await fetch('/api/products/bulk-delete', {
				method: 'DELETE',
				headers: { 
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`
				},
				body: JSON.stringify({ ids })
			});
			
			if (!response.ok) {
				throw new Error('Erro ao excluir produtos');
			}
		} catch (error) {
			console.error('Erro na ação em lote:', error);
			throw error;
		}
	}
</script>

<AdminPageTemplate
	title="Gestão de Produtos"
	newItemRoute="/produtos/novo"
	editItemRoute={(id) => `/produtos/${id}`}
	
	apiEndpoint="/api/products"
	deleteEndpoint="/api/products"
	statsEndpoint="/api/products/stats"
	categoriesEndpoint="/api/categories"
	brandsEndpoint="/api/brands"
	
	{columns}
	entityName="produto"
	entityNamePlural="produtos"
	
	searchPlaceholder="Buscar produtos, SKUs, descrições..."
	searchFields={['name', 'sku', 'description']}
	
	statsConfig={{
		total: 'total',
		active: 'active', 
		pending: 'inactive',
		lowStock: 'low_stock'
	}}
	
	onDataLoad={transformProductData}
	onStatsLoad={transformStats}
	onBulkDelete={bulkDeleteProducts}
	customActions={customActions}
	
	customFilters={[
		{
			key: 'featured',
			label: 'Produtos em Destaque',
			type: 'select',
			options: [
				{ value: '', label: 'Todos os produtos' },
				{ value: 'true', label: 'Em destaque' },
				{ value: 'false', label: 'Não destacados' }
			]
		},
		{
			key: 'stock_status',
			label: 'Status do Estoque',
			type: 'select',
			options: [
				{ value: '', label: 'Todos os estoques' },
				{ value: 'in_stock', label: 'Em estoque' },
				{ value: 'low_stock', label: 'Estoque baixo' },
				{ value: 'out_of_stock', label: 'Sem estoque' }
			]
		},
		{
			key: 'has_images',
			label: 'Produtos com Imagens',
			type: 'select',
			options: [
				{ value: '', label: 'Todos os produtos' },
				{ value: 'true', label: 'Com imagens' },
				{ value: 'false', label: 'Sem imagens' }
			]
		}
	]}
/> 