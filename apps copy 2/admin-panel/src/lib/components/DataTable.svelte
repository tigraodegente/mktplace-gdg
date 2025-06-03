<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	
	// Props
	let {
		title,
		description,
		columns,
		data = [],
		loading = false,
		filters,
		actions,
		bulkActions,
		selectedRows = new Set(),
		onRowClick = () => {},
		showPagination = true,
		currentPage = 1,
		itemsPerPage = 10,
		totalItems = 0
	} = $props<{
		title?: string;
		description?: string;
		columns: Array<{
			key: string;
			label: string;
			sortable?: boolean;
			render?: (value: any, row: any) => string;
			class?: string;
		}>;
		data?: any[];
		loading?: boolean;
		filters?: any;
		actions?: (row: any) => any;
		bulkActions?: any;
		selectedRows?: Set<string>;
		onRowClick?: (row: any) => void;
		showPagination?: boolean;
		currentPage?: number;
		itemsPerPage?: number;
		totalItems?: number;
	}>();
	
	// Paginação
	const totalPages = Math.ceil((totalItems || data.length) / itemsPerPage);
	const paginatedData = data.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);
	
	// Seleção
	function toggleSelectAll() {
		if (selectedRows.size === paginatedData.length) {
			selectedRows.clear();
		} else {
			paginatedData.forEach((row: any) => selectedRows.add(row.id || row));
		}
		selectedRows = selectedRows;
	}
	
	function toggleSelectRow(rowId: string) {
		if (selectedRows.has(rowId)) {
			selectedRows.delete(rowId);
		} else {
			selectedRows.add(rowId);
		}
		selectedRows = selectedRows;
	}
</script>

<div class="card overflow-hidden">
	<!-- Header -->
	{#if title || description}
		<div class="card-header">
			{#if title}
				<h2 class="text-lg font-semibold text-gray-900">{title}</h2>
			{/if}
			{#if description}
				<p class="text-sm text-gray-600 mt-1">{description}</p>
			{/if}
		</div>
	{/if}
	
	<!-- Filters -->
	{#if filters}
		<div class="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
			{@render filters()}
		</div>
	{/if}
	
	<!-- Bulk Actions -->
	{#if selectedRows.size > 0 && bulkActions}
		<div class="px-6 py-3 bg-cyan-50 border-b border-cyan-100" transition:slide={{ duration: 300 }}>
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-cyan-900">
					{selectedRows.size} {selectedRows.size === 1 ? 'item selecionado' : 'itens selecionados'}
				</p>
				<div class="flex items-center gap-2">
					{@render bulkActions()}
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Table -->
	<div class="overflow-x-auto">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div class="spinner w-12 h-12 mx-auto mb-4"></div>
					<p class="text-gray-600">Carregando...</p>
				</div>
			</div>
		{:else if data.length === 0}
			<div class="text-center py-12">
				<svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<p class="text-gray-600">Nenhum dado encontrado</p>
			</div>
		{:else}
			<table class="table-modern">
				<thead>
					<tr>
						{#if bulkActions}
							<th class="w-12">
								<input
									type="checkbox"
									checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
									onchange={toggleSelectAll}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
						{/if}
						{#each columns as column}
							<th class={column.class || ''}>
								{column.label}
								{#if column.sortable}
									<button class="ml-1 text-gray-400 hover:text-gray-600">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
										</svg>
									</button>
								{/if}
							</th>
						{/each}
						{#if actions}
							<th class="text-right">Ações</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each paginatedData as row, i}
						<tr 
							class="hover:bg-gray-50 transition-colors cursor-pointer"
							onclick={() => onRowClick(row)}
							in:fly={{ x: -20, duration: 400, delay: i * 50 }}
						>
							{#if bulkActions}
								<td onclick={(e) => e.stopPropagation()}>
									<input
										type="checkbox"
										checked={selectedRows.has(row.id || row)}
										onchange={() => toggleSelectRow(row.id || row)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
							{/if}
							{#each columns as column}
								<td class={column.class || ''}>
									{#if column.render}
										{@html column.render(row[column.key], row)}
									{:else}
										{row[column.key]}
									{/if}
								</td>
							{/each}
							{#if actions}
								<td class="text-right" onclick={(e) => e.stopPropagation()}>
									{@render actions(row)}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
	
	<!-- Pagination -->
	{#if showPagination && totalPages > 1}
		<div class="px-6 py-4 bg-gray-50/30 border-t border-gray-100">
			<div class="flex items-center justify-between">
				<p class="text-sm text-gray-600">
					Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, data.length)} de {data.length} itens
				</p>
				<div class="flex items-center gap-2">
					<button
						onclick={() => currentPage = Math.max(1, currentPage - 1)}
						disabled={currentPage === 1}
						class="btn btn-sm btn-ghost"
					>
						Anterior
					</button>
					{#each Array(totalPages) as _, i}
						{#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
							<button
								onclick={() => currentPage = i + 1}
								class="btn btn-sm {currentPage === i + 1 ? 'btn-primary' : 'btn-ghost'}"
							>
								{i + 1}
							</button>
						{:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
							<span class="text-gray-400">...</span>
						{/if}
					{/each}
					<button
						onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
						disabled={currentPage === totalPages}
						class="btn btn-sm btn-ghost"
					>
						Próximo
					</button>
				</div>
			</div>
		</div>
	{/if}
</div> 