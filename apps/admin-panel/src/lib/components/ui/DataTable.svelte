<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import Button from './Button.svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		width?: string;
		align?: 'left' | 'center' | 'right';
		render?: (value: any, row: any) => any;
		hideOnMobile?: boolean;
	}
	
	interface Props {
		columns: Column[];
		data: any[];
		loading?: boolean;
		emptyMessage?: string;
		class?: string;
		// Seleção
		selectable?: boolean;
		selectedIds?: string[];
		onSelectionChange?: (ids: string[]) => void;
		// Paginação
		page?: number;
		pageSize?: number;
		totalItems?: number;
		onPageChange?: (page: number) => void;
		// Ordenação
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
		onSort?: (column: string) => void;
		// Ações
		actions?: (row: any) => Array<{
			label: string;
			icon?: string;
			onclick: () => void;
			variant?: 'primary' | 'secondary' | 'danger';
		}>;
	}
	
	let { 
		columns,
		data,
		loading = false,
		emptyMessage = 'Nenhum registro encontrado',
		class: className = '',
		selectable = false,
		selectedIds = $bindable([]),
		onSelectionChange,
		page = 1,
		pageSize = 20,
		totalItems = 0,
		onPageChange,
		sortBy = '',
		sortOrder = 'asc',
		onSort,
		actions
	} = $props<Props>();
	
	// Estado de seleção
	let allSelected = $derived(
		data.length > 0 && data.every(row => selectedIds.includes(row.id))
	);
	
	function toggleAll() {
		if (allSelected) {
			selectedIds = [];
		} else {
			selectedIds = data.map(row => row.id);
		}
		onSelectionChange?.(selectedIds);
	}
	
	function toggleRow(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter(i => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
		onSelectionChange?.(selectedIds);
	}
	
	// Paginação
	let totalPages = $derived(Math.ceil(totalItems / pageSize));
	let startItem = $derived((page - 1) * pageSize + 1);
	let endItem = $derived(Math.min(page * pageSize, totalItems));
</script>

<div class={cn("w-full", className)}>
	<!-- Tabela com padding e responsividade -->
	<div class="overflow-x-auto border border-gray-200 rounded-lg">
		<div class="min-w-full inline-block align-middle">
			<div class="overflow-hidden">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							{#if selectable}
								<th class="w-12 px-4 py-3 text-left">
									<input
										type="checkbox"
										checked={allSelected}
										onchange={toggleAll}
										class="w-4 h-4 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
									/>
								</th>
							{/if}
							
							{#each columns as column}
								<th
									class={cn(
										"px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
										{
											"cursor-pointer hover:bg-gray-100": column.sortable && onSort,
											"text-center": column.align === 'center',
											"text-right": column.align === 'right',
											"hidden sm:table-cell": column.hideOnMobile
										}
									)}
									style={column.width ? `width: ${column.width}` : ''}
									onclick={() => column.sortable && onSort?.(column.key)}
								>
									<div class="flex items-center gap-1">
										<span class="truncate">{column.label}</span>
										{#if column.sortable && sortBy === column.key}
											<ModernIcon 
												name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'} 
												size={12} 
											/>
										{/if}
									</div>
								</th>
							{/each}
							
							{#if actions}
								<th class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Ações
								</th>
							{/if}
						</tr>
					</thead>
					
					<tbody class="bg-white divide-y divide-gray-200">
						{#if loading}
							<tr>
								<td colspan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} class="px-6 py-12 text-center">
									<div class="flex justify-center">
										<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
									</div>
								</td>
							</tr>
						{:else if data.length === 0}
							<tr>
								<td colspan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} class="px-6 py-12 text-center text-gray-500">
									{emptyMessage}
								</td>
							</tr>
						{:else}
							{#each data as row}
								<tr class="hover:bg-gray-50 transition-colors">
									{#if selectable}
										<td class="px-4 py-4">
											<input
												type="checkbox"
												checked={selectedIds.includes(row.id)}
												onchange={() => toggleRow(row.id)}
												class="w-4 h-4 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
											/>
										</td>
									{/if}
									
									{#each columns as column}
										<td class={cn(
											"px-4 sm:px-6 py-4 text-sm",
											{
												"text-center": column.align === 'center',
												"text-right": column.align === 'right',
												"hidden sm:table-cell": column.hideOnMobile
											}
										)}>
											<div class="truncate max-w-xs">
												{#if column.render}
													{@html column.render(row[column.key], row)}
												{:else}
													{row[column.key] ?? '-'}
												{/if}
											</div>
										</td>
									{/each}
									
									{#if actions}
										<td class="px-4 sm:px-6 py-4 text-right text-sm">
											<div class="flex justify-end gap-1 sm:gap-2">
												{#each actions(row) as action}
													<Button
														size="sm"
														variant={action.variant || 'ghost'}
														icon={action.icon}
														onclick={action.onclick}
														class="text-xs sm:text-sm"
													>
														<span class="hidden sm:inline">{action.label}</span>
														<span class="sm:hidden">
															<ModernIcon name={action.icon} size={16} />
														</span>
													</Button>
												{/each}
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	
	<!-- Paginação com padding -->
	{#if totalPages > 1}
		<div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
			<div class="text-sm text-gray-700 text-center sm:text-left">
				Mostrando {startItem} a {endItem} de {totalItems} resultados
			</div>
			
			<div class="flex items-center gap-2">
				<Button
					size="sm"
					variant="secondary"
					disabled={page === 1}
					onclick={() => onPageChange?.(page - 1)}
					class="text-xs sm:text-sm"
				>
					<span class="hidden sm:inline">Anterior</span>
					<span class="sm:hidden">←</span>
				</Button>
				
				<div class="flex gap-1">
					{#if totalPages <= 5}
						{#each Array(totalPages) as _, i}
							<Button
								size="sm"
								variant={i + 1 === page ? 'primary' : 'ghost'}
								onclick={() => onPageChange?.(i + 1)}
								class="min-w-[32px] text-xs sm:text-sm"
							>
								{i + 1}
							</Button>
						{/each}
					{:else}
						<!-- Lógica para muitas páginas -->
						{#if page > 3}
							<Button size="sm" variant="ghost" onclick={() => onPageChange?.(1)} class="min-w-[32px] text-xs sm:text-sm">1</Button>
							<span class="px-2 text-gray-400">...</span>
						{/if}
						
						{#each Array(Math.min(5, totalPages)) as _, i}
							{@const pageNum = page <= 3 ? i + 1 : page + i - 2}
							{#if pageNum > 0 && pageNum <= totalPages}
								<Button
									size="sm"
									variant={pageNum === page ? 'primary' : 'ghost'}
									onclick={() => onPageChange?.(pageNum)}
									class="min-w-[32px] text-xs sm:text-sm"
								>
									{pageNum}
								</Button>
							{/if}
						{/each}
						
						{#if page < totalPages - 2}
							<span class="px-2 text-gray-400">...</span>
							<Button size="sm" variant="ghost" onclick={() => onPageChange?.(totalPages)} class="min-w-[32px] text-xs sm:text-sm">{totalPages}</Button>
						{/if}
					{/if}
				</div>
				
				<Button
					size="sm"
					variant="secondary"
					disabled={page === totalPages}
					onclick={() => onPageChange?.(page + 1)}
					class="text-xs sm:text-sm"
				>
					<span class="hidden sm:inline">Próximo</span>
					<span class="sm:hidden">→</span>
				</Button>
			</div>
		</div>
	{/if}
</div> 