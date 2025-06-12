<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { PageConfigs } from '$lib/config/pageConfigs';
	
	// Configuração para banners (exemplo do sistema universal)
	const config = {
		title: 'Gestão de Banners',
		entityName: 'banner',
		entityNamePlural: 'banners',
		newItemRoute: '/banners/novo',
		editItemRoute: (id: string) => `/banners/${id}`,
		
		// API endpoints
		apiEndpoint: '/api/banners',
		deleteEndpoint: '/api/banners',
		statsEndpoint: '/api/banners/stats',
		
		// Colunas específicas de banners
		columns: [
			{
				key: 'title',
				label: 'Banner',
				sortable: true,
				width: '300px',
				render: (value: string, row: any) => {
					const imageUrl = row.image || '/api/placeholder/200/100?text=Banner';
					return `
						<div class="flex items-center space-x-3">
							<img src="${imageUrl}" 
								alt="${row.title}" 
								class="w-16 h-10 rounded object-cover flex-shrink-0 shadow-sm"
								onerror="this.src='/api/placeholder/200/100?text=Banner'"
							/>
							<div class="min-w-0 flex-1">
								<div class="font-medium text-gray-900 text-sm truncate">${row.title}</div>
								${row.subtitle ? `<div class="text-xs text-gray-500 truncate">${row.subtitle}</div>` : ''}
							</div>
						</div>
					`;
				}
			},
			{
				key: 'link',
				label: 'Link',
				sortable: false,
				hideOnMobile: true,
				render: (value: string) => {
					if (!value) return '<span class="text-gray-400">Sem link</span>';
					const shortUrl = value.length > 40 ? value.substring(0, 40) + '...' : value;
					return `<a href="${value}" target="_blank" class="text-blue-600 hover:text-blue-800 underline text-sm">${shortUrl}</a>`;
				}
			},
			{
				key: 'order',
				label: 'Ordem',
				sortable: true,
				align: 'center',
				render: (value: number) => {
					return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${value}</span>`;
				}
			},
			{
				key: 'is_active',
				label: 'Status',
				sortable: true,
				align: 'center',
				render: (value: boolean, row: any) => {
					const isActive = Boolean(value);
					let status = 'Inativo';
					let bgClass = 'bg-gray-100 text-gray-800';
					
					if (isActive) {
						// Verificar se tem datas de agendamento
						const now = new Date();
						const startDate = row.start_date ? new Date(row.start_date) : null;
						const endDate = row.end_date ? new Date(row.end_date) : null;
						
						if (startDate && startDate > now) {
							status = 'Agendado';
							bgClass = 'bg-yellow-100 text-yellow-800';
						} else if (endDate && endDate < now) {
							status = 'Expirado';
							bgClass = 'bg-red-100 text-red-800';
						} else {
							status = 'Ativo';
							bgClass = 'bg-green-100 text-green-800';
						}
					}
					
					return `
						<div class="text-center">
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass}">
								${status}
							</span>
						</div>
					`;
				}
			},
			{
				key: 'created_at',
				label: 'Criado em',
				sortable: true,
				hideOnMobile: true,
				render: (value: string) => {
					const date = new Date(value);
					return `
						<div>
							<div class="text-sm text-gray-900">${date.toLocaleDateString('pt-BR')}</div>
							<div class="text-xs text-gray-500">${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
						</div>
					`;
				}
			}
		],
		
		// Estatísticas de banners
		statsConfig: {
			total: 'total',
			active: 'active',
			pending: 'scheduled',
			lowStock: 'expired'
		},
		
		searchPlaceholder: 'Buscar banners...',
		searchFields: ['title', 'subtitle', 'link'],
		
		// Filtros customizados específicos para banners
		customFilters: [
			{
				key: 'scheduled',
				label: 'Agendamento',
				type: 'select',
				options: [
					{ value: '', label: 'Todos os banners' },
					{ value: 'active', label: 'Ativos agora' },
					{ value: 'scheduled', label: 'Agendados' },
					{ value: 'expired', label: 'Expirados' }
				]
			}
		],
		
		// Transformação de dados recebidos da API
		onDataLoad: (data: any[]) => {
			if (!data || !Array.isArray(data)) return [];
			
			return data.map((banner: any) => ({
				id: banner.id,
				title: banner.title,
				subtitle: banner.subtitle,
				image: banner.image,
				link: banner.link,
				order: Number(banner.order || 0),
				is_active: banner.is_active !== false,
				start_date: banner.start_date,
				end_date: banner.end_date,
				target: banner.target || '_self',
				created_at: banner.created_at,
				updated_at: banner.updated_at
			}));
		},
		
		// Transformação de estatísticas da API
		onStatsLoad: (rawStats: any) => {
			return {
				total: rawStats.total || 0,
				active: rawStats.active || 0,
				scheduled: rawStats.scheduled || 0,
				expired: rawStats.expired || 0
			};
		},
		
		// Ações customizadas para banners
		customActions: (row: any) => {
			return [
				{
					label: 'Editar',
					icon: 'edit',
					onclick: () => {
						if (typeof window !== 'undefined') {
							window.location.href = `/banners/${row.id}`;
						}
					}
				},
				{
					label: 'Duplicar',
					icon: 'copy',
					onclick: async () => {
						if (typeof window === 'undefined') return;
						
						const confirmed = confirm(`Deseja duplicar o banner "${row.title}"?`);
						if (!confirmed) return;
						
						try {
							const response = await fetch(`/api/banners/${row.id}/duplicate`, {
								method: 'POST',
								headers: {
									'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									title: `${row.title} - Cópia`,
									order: row.order + 1
								})
							});
							
							const result = await response.json();
							
							if (response.ok && result.success) {
								alert('Banner duplicado com sucesso!');
								window.location.reload();
							} else {
								throw new Error(result.error || 'Erro ao duplicar banner');
							}
						} catch (error) {
							console.error('Erro ao duplicar banner:', error);
							alert('Erro ao duplicar banner. Tente novamente.');
						}
					}
				},
				{
					label: 'Histórico',
					icon: 'history',
					onclick: () => {
						if (typeof window !== 'undefined') {
							window.location.href = `/banners/${row.id}?tab=history`;
						}
					}
				},
				{
					label: 'Preview',
					icon: 'preview',
					onclick: () => {
						if (typeof window !== 'undefined') {
							window.open(`/preview/banner/${row.id}`, '_blank');
						}
					}
				},
				{
					label: 'Excluir',
					icon: 'trash',
					onclick: async () => {
						if (typeof window === 'undefined') return;
						
						const confirmed = confirm(`Tem certeza que deseja excluir o banner "${row.title}"?`);
						if (!confirmed) return;
						
						try {
							const response = await fetch(`/api/banners/${row.id}`, {
								method: 'DELETE',
								headers: {
									'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
									'Content-Type': 'application/json'
								}
							});
							
							if (!response.ok) {
								throw new Error('Erro ao excluir banner');
							}
							
							window.location.reload();
						} catch (error) {
							console.error('Erro ao excluir banner:', error);
							alert('Erro ao excluir banner. Tente novamente.');
						}
					}
				}
			];
		},
		
		// Ação em lote para banners
		onBulkDelete: async (ids: string[]) => {
			if (typeof window === 'undefined') return;
			
			const confirmed = confirm(`Tem certeza que deseja excluir ${ids.length} banner(s)?`);
			if (!confirmed) return;
			
			try {
				const response = await fetch('/api/banners', {
					method: 'DELETE',
					headers: { 
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${localStorage.getItem('access_token')}`
					},
					body: JSON.stringify({ ids })
				});
				
				if (!response.ok) {
					throw new Error('Erro ao excluir banners');
				}
			} catch (error) {
				console.error('Erro na ação em lote:', error);
				throw error;
			}
		}
	};
</script>

<!-- Página de banners usando sistema universal -->
<AdminPageTemplate
	title={config.title}
	entityName={config.entityName}
	entityNamePlural={config.entityNamePlural}
	newItemRoute={config.newItemRoute}
	editItemRoute={config.editItemRoute}
	apiEndpoint={config.apiEndpoint}
	deleteEndpoint={config.deleteEndpoint}
	statsEndpoint={config.statsEndpoint}
	columns={config.columns}
	statsConfig={config.statsConfig}
	searchPlaceholder={config.searchPlaceholder}
	searchFields={config.searchFields}
	customFilters={config.customFilters}
	onDataLoad={config.onDataLoad}
	onStatsLoad={config.onStatsLoad}
	customActions={config.customActions}
	onBulkDelete={config.onBulkDelete}
/>
