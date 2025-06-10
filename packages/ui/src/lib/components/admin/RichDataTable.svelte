<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ComponentProps } from 'svelte';
	
	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		width?: string;
		align?: 'left' | 'center' | 'right';
		render?: (value: any, row: any) => string;
	}
	
	interface TableAction {
		label: string;
		icon?: string;
		variant?: 'primary' | 'secondary' | 'danger';
		action: (row: any) => void;
	}
	
	interface Props {
		data?: any[];
		columns?: Column[];
		actions?: TableAction[];
		loading?: boolean;
		searchable?: boolean;
		filterable?: boolean;
		pagination?: boolean;
		pageSize?: number;
		title?: string;
		subtitle?: string;
		createAction?: (() => void) | null;
		createLabel?: string;
	}
	
	let {
		data = [],
		columns = [],
		actions = [],
		loading = false,
		searchable = true,
		filterable = true,
		pagination = true,
		pageSize = 10,
		title = '',
		subtitle = '',
		createAction = null,
		createLabel = 'Novo'
	}: Props = $props();
	
	const dispatch = createEventDispatcher();
	
	let searchTerm = $state('');
	let currentPage = $state(1);
	let sortColumn = $state('');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let filters = $state<Record<string, string>>({});
	
	const filteredData = $derived(data.filter(row => {
		// Busca
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch = columns.some(col => {
				const value = row[col.key]?.toString()?.toLowerCase() || '';
				return value.includes(searchLower);
			});
			if (!matchesSearch) return false;
		}
		
		// Filtros
		for (const [key, value] of Object.entries(filters)) {
			if (value && row[key] !== value) return false;
		}
		
		return true;
	}));
	
	const sortedData = $derived([...filteredData].sort((a, b) => {
		if (!sortColumn) return 0;
		
		const aVal = a[sortColumn];
		const bVal = b[sortColumn];
		
		if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
		if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
		return 0;
	}));
	
	const paginatedData = $derived(pagination ? 
		sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize) : 
		sortedData);
	
	const totalPages = $derived(Math.ceil(sortedData.length / pageSize));
	
	function handleSort(column: Column) {
		if (!column.sortable) return;
		
		if (sortColumn === column.key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column.key;
			sortDirection = 'asc';
		}
	}
	
	function getUniqueValues(key: string) {
		return [...new Set(data.map(row => row[key]).filter(Boolean))];
	}
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
	<!-- Header -->
	<div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
		<div class="flex items-center justify-between">
			<div>
				{#if title}
					<h3 class="text-xl font-semibold text-gray-900">{title}</h3>
				{/if}
				{#if subtitle}
					<p class="text-sm text-gray-600 mt-1">{subtitle}</p>
				{/if}
			</div>
			
			{#if createAction}
				<button 
					onclick={createAction}
					class="btn btn-primary flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					{createLabel}
				</button>
			{/if}
		</div>
	</div>
	
	<!-- Filters & Search -->
	{#if searchable || filterable}
		<div class="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
			<div class="flex flex-col md:flex-row gap-4">
				<!-- Search -->
				{#if searchable}
					<div class="flex-1">
						<div class="relative">
							<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
							</svg>
							<input 
								type="text" 
								bind:value={searchTerm}
								placeholder="Buscar..."
								class="input pl-10 w-full"
							/>
						</div>
					</div>
				{/if}
				
				<!-- Filters -->
				{#if filterable}
					<div class="flex gap-3">
						{#each columns.filter(col => col.key !== 'actions') as column}
							{@const uniqueValues = getUniqueValues(column.key)}
							{#if uniqueValues.length > 1 && uniqueValues.length < 20}
								<select 
									bind:value={filters[column.key]}
									class="input min-w-[150px]"
								>
									<option value="">Todos {column.label}</option>
									{#each uniqueValues as value}
										<option value={value}>{value}</option>
									{/each}
								</select>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
	
	<!-- Table -->
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead class="bg-gray-50/50">
				<tr>
					{#each columns as column}
						<th 
							class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
								{column.sortable ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}
								{column.width ? `w-${column.width}` : ''}"
							style={column.width ? `width: ${column.width}` : ''}
							onclick={() => handleSort(column)}
						>
							<div class="flex items-center gap-2">
								{column.label}
								{#if column.sortable}
									<div class="flex flex-col">
										<svg class="w-3 h-3 {sortColumn === column.key && sortDirection === 'asc' ? 'text-primary-500' : 'text-gray-300'}" 
											fill="currentColor" viewBox="0 0 20 20">
											<path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
										</svg>
									</div>
								{/if}
							</div>
						</th>
					{/each}
					{#if actions.length > 0}
						<th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
							Ações
						</th>
					{/if}
				</tr>
			</thead>
			
			<tbody class="divide-y divide-gray-100">
				{#if loading}
					{#each Array(pageSize) as _, i}
						<tr>
							{#each columns as column}
								<td class="px-6 py-4">
									<div class="h-4 bg-gray-200 rounded animate-pulse"></div>
								</td>
							{/each}
							{#if actions.length > 0}
								<td class="px-6 py-4">
									<div class="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto"></div>
								</td>
							{/if}
						</tr>
					{/each}
				{:else if paginatedData.length === 0}
					<tr>
						<td colspan={columns.length + (actions.length > 0 ? 1 : 0)} class="px-6 py-12 text-center">
							<div class="text-gray-400">
								<svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
								</svg>
								<p class="text-lg font-medium text-gray-900 mb-1">Nenhum resultado encontrado</p>
								<p class="text-gray-500">Tente ajustar os filtros ou a busca</p>
							</div>
						</td>
					</tr>
				{:else}
					{#each paginatedData as row, i}
						<tr class="hover:bg-gray-50 transition-colors">
							{#each columns as column}
								<td class="px-6 py-4 whitespace-nowrap text-sm
									{column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}">
									{#if column.render}
										{@html column.render(row[column.key], row)}
									{:else}
										<span class="text-gray-900">{row[column.key] || '-'}</span>
									{/if}
								</td>
							{/each}
							
							{#if actions.length > 0}
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm">
									<div class="flex items-center justify-end gap-2">
										{#each actions as action}
											<div class="relative group">
												<button 
													onclick={() => action.action(row)}
													class="btn btn-{action.variant || 'secondary'} btn-sm"
												>
													{#if action.icon}
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={action.icon}/>
														</svg>
													{:else}
														{action.label}
													{/if}
												</button>
												<!-- Tooltip customizado sem delay -->
												<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10">
													{action.label}
												</div>
											</div>
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
	
	<!-- Pagination -->
	{#if pagination && totalPages > 1}
		<div class="px-6 py-4 bg-gray-50/30 border-t border-gray-100">
			<div class="flex items-center justify-between">
				<div class="text-sm text-gray-600">
					Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} resultados
				</div>
				
				<div class="flex items-center gap-2">
					<button 
						onclick={() => currentPage = Math.max(1, currentPage - 1)}
						disabled={currentPage === 1}
						class="btn btn-secondary btn-sm"
					>
						Anterior
					</button>
					
					<div class="flex items-center gap-1">
						{#each Array(Math.min(5, totalPages)) as _, i}
							{@const page = i + 1}
							<button 
								onclick={() => currentPage = page}
								class="btn btn-sm {currentPage === page ? 'btn-primary' : 'btn-secondary'}"
							>
								{page}
							</button>
						{/each}
					</div>
					
					<button 
						onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
						disabled={currentPage === totalPages}
						class="btn btn-secondary btn-sm"
					>
						Próximo
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.btn {
		@apply inline-flex items-center justify-center px-3 py-1.5 border border-transparent rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm;
	}
	
	.btn-primary {
		@apply bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm;
	}
	
	.btn-secondary {
		@apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border-gray-200;
	}
	
	.btn-danger {
		@apply bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm;
	}
	
	.btn-sm {
		@apply text-xs px-2 py-1;
	}
	
	.input {
		@apply appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200;
	}
</style> 