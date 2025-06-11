<script lang="ts">
	import { AdminPageTemplate } from '$lib/components/ui';
	import type { Category } from '$lib/types';
	
	// Interface para categorias
	interface CategoryWithLevel {
		id: string;
		name: string;
		slug: string;
		description?: string;
		image_url?: string;
		icon?: string;
		parent_id?: string;
		parent_name?: string;
		position: number;
		is_active: boolean;
		product_count: number;
		subcategory_count: number;
		level?: number;
		children?: CategoryWithLevel[];
		created_at: string;
		updated_at: string;
	}
	
	// Configuração das colunas da tabela
	const columns = [
		{
			key: 'name',
			label: 'Categoria',
			sortable: true,
			width: '300px',
			render: (value: string, row: CategoryWithLevel) => {
				const indent = '&nbsp;'.repeat((row.level || 0) * 4);
				const hasChildren = row.subcategory_count > 0;
				
				// Apenas ícone de hierarquia sutil
				const hierarchyIcon = hasChildren 
					? '<svg class="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>'
					: '<svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
				
				return `
					<div class="flex items-center">
						${indent}
						${hierarchyIcon}
						<div>
							<div class="font-medium text-gray-900">${row.name}</div>
							<div class="text-xs text-gray-500">/${row.slug}</div>
						</div>
					</div>
				`;
			}
		},
		{
			key: 'description',
			label: 'Descrição',
			width: '200px',
			render: (value: string) => {
				const description = value || '';
				const truncated = description.length > 60 ? description.substring(0, 60) + '...' : description;
				return `<span class="text-sm text-gray-600">${truncated || '—'}</span>`;
			}
		},
		{
			key: 'parent_name',
			label: 'Categoria Pai',
			width: '150px',
			render: (value: string, row: CategoryWithLevel) => {
				return row.parent_id ? `<span class="text-sm text-gray-600">${value || 'Carregando...'}</span>` : 
					`<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#00BFB3]/10 text-[#00BFB3]">Principal</span>`;
			}
		},
		{
			key: 'product_count',
			label: 'Produtos',
			sortable: true,
			align: 'center' as const,
			width: '100px',
			render: (value: number) => {
				const count = value || 0;
				return `
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${count > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}">
						<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM10 9a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
						</svg>
						${count}
					</span>
				`;
			}
		},
		{
			key: 'subcategory_count',
			label: 'Subcategorias',
			sortable: true,
			align: 'center' as const,
			width: '120px',
			render: (value: number) => {
				const count = value || 0;
				return `
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${count > 0 ? 'bg-[#00BFB3]/10 text-[#00BFB3]' : 'bg-gray-100 text-gray-600'}">
						<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"/>
						</svg>
						${count}
					</span>
				`;
			}
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			width: '100px',
			render: (value: boolean) => {
				return value 
					? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
						<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
						</svg>
						Ativa
					</span>`
					: `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
						</svg>
						Inativa
					</span>`;
			}
		},
		{
			key: 'position',
			label: 'Ordem',
			sortable: true,
			align: 'center' as const,
			width: '80px',
			render: (value: number) => `<span class="text-sm font-mono bg-gray-100 px-2 py-1 rounded">${value || 0}</span>`
		},
		{
			key: 'created_at',
			label: 'Criado em',
			sortable: true,
			width: '120px',
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		}
	];


	// Função para transformar dados recebidos da API
	function transformCategoryData(data: any[]): CategoryWithLevel[] {
		if (!data || !Array.isArray(data)) return [];
		
		// Primeiro, criar um mapa de todas as categorias
		const categoryMap = new Map<string, CategoryWithLevel>();
		const roots: CategoryWithLevel[] = [];
		
		// Mapear todas as categorias
		data.forEach(cat => {
			categoryMap.set(cat.id, { 
				...cat, 
				children: [], 
				level: 0,
				product_count: cat.product_count || 0
			});
		});
		
		// Construir a árvore hierárquica
		data.forEach(cat => {
			const category = categoryMap.get(cat.id)!;
			if (cat.parent_id) {
				const parent = categoryMap.get(cat.parent_id);
				if (parent) {
					parent.children = parent.children || [];
					parent.children.push(category);
					category.level = (parent.level || 0) + 1;
				}
			} else {
				roots.push(category);
			}
		});
		
		// Função para achatar a árvore mantendo a hierarquia visual
		function flattenTree(categories: CategoryWithLevel[], result: CategoryWithLevel[] = []): CategoryWithLevel[] {
			categories.forEach(cat => {
				result.push(cat);
				if (cat.children && cat.children.length > 0) {
					flattenTree(cat.children, result);
	}
			});
			return result;
	}
	
		return flattenTree(roots);
	}



	// Função para transformar estatísticas
	function transformStats(rawStats: any) {
		return {
			total: rawStats.total_categories || rawStats.total || 0,
			active: rawStats.active_categories || rawStats.active || 0,
			pending: rawStats.inactive_categories || rawStats.inactive || 0,
			lowStock: rawStats.empty_categories || rawStats.without_products || 0
		};
	}
	
	// Configuração de ações customizadas para cada linha
	function customActions(row: CategoryWithLevel) {
		const actions = [
			{
				label: 'Ver Produtos',
				icon: 'preview',
				onclick: () => window.location.href = `/produtos?category=${row.id}`
			},
			{
				label: 'Editar',
				icon: 'Edit',
				onclick: () => window.location.href = `/categorias/${row.id}`
			},
			{
				label: 'Adicionar Subcategoria',
				icon: 'Plus',
				onclick: () => window.location.href = `/categorias/nova?parent=${row.id}`
			},
			{
				label: row.is_active ? 'Desativar' : 'Ativar',
				icon: row.is_active ? 'X' : 'Check',
				onclick: () => toggleCategoryStatus(row)
			},
			{
				label: 'Reordenar',
				icon: 'bar-chart',
				onclick: () => openReorderModal(row)
			},
			{
				label: 'Excluir',
				icon: 'Delete',
				onclick: () => deleteCategory(row)
			}
		];

		return actions;
	}

	// Função para alternar status da categoria
	async function toggleCategoryStatus(category: CategoryWithLevel) {
		const action = category.is_active ? 'desativar' : 'ativar';
		const confirmed = confirm(`Tem certeza que deseja ${action} a categoria "${category.name}"?`);
		if (!confirmed) return false;

		try {
			const response = await fetch(`/api/categories`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					id: category.id,
					name: category.name,
					slug: category.slug,
					description: category.description,
					image_url: category.image_url,
					parent_id: category.parent_id,
					position: category.position,
					is_active: !category.is_active
				})
			});
			
			if (response.ok) {
				// A página será recarregada automaticamente pelo AdminPageTemplate
				return true;
			}
		} catch (error) {
			console.error('Erro ao alterar status da categoria:', error);
		}
		return false;
	}

	// Função para abrir modal de reordenação
	function openReorderModal(category: CategoryWithLevel) {
		const newPosition = prompt(`Digite a nova posição para "${category.name}":`, category.position.toString());
		if (newPosition && !isNaN(Number(newPosition))) {
			updateCategoryPosition(category, Number(newPosition));
		}
	}

	// Função para atualizar posição da categoria
	async function updateCategoryPosition(category: CategoryWithLevel, newPosition: number) {
		try {
			const response = await fetch(`/api/categories`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					id: category.id,
					name: category.name,
					slug: category.slug,
					description: category.description,
					image_url: category.image_url,
					parent_id: category.parent_id,
					position: newPosition,
					is_active: category.is_active
				})
			});
			
			if (response.ok) {
				// A página será recarregada automaticamente pelo AdminPageTemplate
				return true;
			}
		} catch (error) {
			console.error('Erro ao atualizar posição da categoria:', error);
		}
		return false;
	}

	// Função para excluir categoria
	async function deleteCategory(category: CategoryWithLevel) {
		// Verificar se tem produtos ou subcategorias
		if (category.product_count > 0) {
			alert(`Não é possível excluir "${category.name}" pois ela contém ${category.product_count} produto(s).`);
			return false;
		}

		if (category.subcategory_count > 0) {
			alert(`Não é possível excluir "${category.name}" pois ela contém ${category.subcategory_count} subcategoria(s).`);
			return false;
		}

		const confirmed = confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?\n\nEsta ação não pode ser desfeita.`);
		if (!confirmed) return false;

		try {
			const response = await fetch(`/api/categories`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: category.id })
			});
			
			if (response.ok) {
				// A página será recarregada automaticamente pelo AdminPageTemplate
				return true;
			} else {
				const data = await response.json();
				alert(`Erro ao excluir categoria: ${data.error || 'Erro desconhecido'}`);
			}
		} catch (error) {
			console.error('Erro ao excluir categoria:', error);
			alert('Erro ao excluir categoria');
		}
		return false;
	}
</script>

<AdminPageTemplate
	title="Gestão de Categorias"
	newItemRoute="/categorias/nova"
	editItemRoute={(id) => `/categorias/${id}`}
	
	apiEndpoint="/api/categories"
	deleteEndpoint="/api/categories"
	statsEndpoint="/api/categories/stats"
	
	{columns}
	entityName="categoria"
	entityNamePlural="categorias"
	
	searchPlaceholder="Buscar categorias..."
	searchFields={['name', 'slug', 'description']}
	
	statsConfig={{
		total: 'total_categories',
		active: 'active_categories', 
		pending: 'inactive_categories',
		lowStock: 'without_products'
	}}
	
	onDataLoad={transformCategoryData}
	onStatsLoad={transformStats}
	customActions={customActions}
	
	customFilters={[
		{
			key: 'status',
			label: 'Status da Categoria',
			type: 'select',
			options: [
				{ value: '', label: 'Todas as Categorias' },
				{ value: 'active', label: 'Ativas' },
				{ value: 'inactive', label: 'Inativas' },
				{ value: 'with_products', label: 'Com Produtos' },
				{ value: 'without_products', label: 'Sem Produtos' }
			]
		},
		{
			key: 'has_parent',
			label: 'Tipo de Categoria',
			type: 'select',
			options: [
				{ value: '', label: 'Todas' },
				{ value: 'true', label: 'Subcategorias' },
				{ value: 'false', label: 'Principais' }
			]
		},
		{
			key: 'min_products',
			label: 'Mínimo de Produtos',
			type: 'number',
			placeholder: 'Ex: 5'
		}
	]}
/> 