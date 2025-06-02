<script lang="ts">
	interface Column {
		key: string;
		label: string;
		mobileHidden?: boolean;
		render?: (value: any, row: any) => any;
		align?: 'left' | 'center' | 'right';
	}
	
	interface Props {
		columns: Column[];
		data: any[];
		keyField?: string;
		selectable?: boolean;
		selectedRows?: Set<string>;
		onRowSelect?: (id: string) => void;
		onSelectAll?: () => void;
		mobileView?: 'cards' | 'stacked';
		loading?: boolean;
		emptyMessage?: string;
		emptyDescription?: string;
	}
	
	let {
		columns,
		data = [],
		keyField = 'id',
		selectable = false,
		selectedRows = new Set(),
		onRowSelect,
		onSelectAll,
		mobileView = 'cards',
		loading = false,
		emptyMessage = 'Nenhum item encontrado',
		emptyDescription = 'Tente ajustar os filtros de busca'
	}: Props = $props();
	
	// Detectar se está em mobile
	let isMobile = $state(false);
	
	$effect(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		
		checkMobile();
		window.addEventListener('resize', checkMobile);
		
		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});
	
	// Colunas visíveis no mobile
	const mobileColumns = $derived(columns.filter(col => !col.mobileHidden));
	
	// Verificar se todos estão selecionados
	const allSelected = $derived(
		data.length > 0 && selectedRows.size === data.length
	);
</script>

{#if loading}
	<div class="card">
		<div class="card-body">
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div class="spinner w-12 h-12 mx-auto mb-4"></div>
					<p class="text-gray-600">Carregando...</p>
				</div>
			</div>
		</div>
	</div>
{:else if data.length === 0}
	<div class="card">
		<div class="card-body py-20 text-center">
			<svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<p class="text-lg font-medium mb-2 text-gray-700">{emptyMessage}</p>
			<p class="text-sm text-gray-500">{emptyDescription}</p>
		</div>
	</div>
{:else if isMobile && mobileView === 'cards'}
	<!-- Mobile Cards View -->
	<div class="space-y-4">
		{#each data as row}
			<div class="card hover:shadow-lg transition-all">
				<div class="card-body">
					{#if selectable}
						<div class="flex items-start justify-between mb-3">
							<input
								type="checkbox"
								checked={selectedRows.has(row[keyField])}
								onchange={() => onRowSelect?.(row[keyField])}
								class="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
							/>
							<slot name="mobile-actions" {row} />
						</div>
					{/if}
					
					<div class="space-y-2">
						{#each mobileColumns as column}
							<div>
								<span class="text-xs font-medium text-gray-500">{column.label}</span>
								<div class="text-sm text-gray-900">
									{#if column.render}
										{@html column.render(row[column.key], row)}
									{:else}
										{row[column.key] || '-'}
									{/if}
								</div>
							</div>
						{/each}
					</div>
					
					{#if $$slots['mobile-card-footer']}
						<div class="mt-4 pt-4 border-t border-gray-100">
							<slot name="mobile-card-footer" {row} />
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<!-- Desktop Table View -->
	<div class="card overflow-hidden">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gradient-to-r from-gray-50 to-gray-100">
					<tr>
						{#if selectable}
							<th class="w-12 px-6 py-3">
								<input
									type="checkbox"
									checked={allSelected}
									onchange={onSelectAll}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
						{/if}
						{#each columns as column}
							<th 
								class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
								class:text-center={column.align === 'center'}
								class:text-right={column.align === 'right'}
								class:hidden={isMobile && column.mobileHidden}
								class:md:table-cell={column.mobileHidden}
							>
								{column.label}
							</th>
						{/each}
						{#if $$slots.actions}
							<th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
								Ações
							</th>
						{/if}
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data as row, i}
						<tr class="hover:bg-gray-50 transition-colors">
							{#if selectable}
								<td class="px-6 py-4 whitespace-nowrap">
									<input
										type="checkbox"
										checked={selectedRows.has(row[keyField])}
										onchange={() => onRowSelect?.(row[keyField])}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
							{/if}
							{#each columns as column}
								<td 
									class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
									class:text-center={column.align === 'center'}
									class:text-right={column.align === 'right'}
									class:hidden={isMobile && column.mobileHidden}
									class:md:table-cell={column.mobileHidden}
								>
									{#if column.render}
										{@html column.render(row[column.key], row)}
									{:else}
										{row[column.key] || '-'}
									{/if}
								</td>
							{/each}
							{#if $$slots.actions}
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm">
									<slot name="actions" {row} />
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}

<style>
	/* Remover scroll horizontal em mobile */
	@media (max-width: 767px) {
		.overflow-x-auto {
			overflow-x: visible;
		}
	}
</style> 