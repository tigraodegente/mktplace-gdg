<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import Button from './Button.svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';

	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		width?: string;
		align?: 'left' | 'center' | 'right';
		render?: (value: any, row: any) => any;
		hideOnMobile?: boolean;
		// Configurações para links automáticos
		linkedEntity?: 'transportadoras' | 'zonas' | 'tarifas' | 'envios' | 'cotacoes';
		linkField?: string; // campo que contém o ID para o link
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
		// Configurações de view
		entityPath?: string; // ex: '/frete', '/transportadoras'
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
		actions,
		entityPath = ''
	} = $props();

	// Estado da view (tabela ou cards)
	let viewMode = $state<'table' | 'cards'>('table');
	
	// Detectar mobile
	let isMobile = $state(false);
	
	// Verificar tamanho da tela
	function checkScreenSize() {
		if (browser) {
			const width = window.innerWidth;
			isMobile = width < 768;
			// No mobile (menos que 768px), sempre mostrar cards
			if (isMobile && viewMode === 'table') {
				viewMode = 'cards';
			}
		}
	}

	// Estado de seleção
	let allSelected = $derived(
		data.length > 0 && data.every((row: any) => selectedIds.includes(row.id))
	);

	function toggleAll() {
		if (allSelected) {
			selectedIds = [];
		} else {
			selectedIds = data.map((row: any) => row.id);
		}
		onSelectionChange?.(selectedIds);
	}

	function toggleRow(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i: string) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
		onSelectionChange?.(selectedIds);
	}

	// Paginação
	let totalPages = $derived(Math.ceil(totalItems / pageSize));
	let startItem = $derived((page - 1) * pageSize + 1);
	let endItem = $derived(Math.min(page * pageSize, totalItems));

	// Função para criar links inteligentes
	function createSmartLink(value: any, column: Column, row: any): string {
		if (!column.linkedEntity || !value) {
			return typeof value === 'string' ? value : String(value);
		}

		const linkId = column.linkField ? row[column.linkField] : row.id;
		const linkPath = `/${column.linkedEntity}/${linkId}`;
		
		return `<a href="${linkPath}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">${value}</a>`;
	}

	// Renderizar célula com suporte a links inteligentes
	function renderCell(column: Column, row: any): string {
		const value = row[column.key];
		
		if (column.render) {
			const rendered = column.render(value, row);
			// Se tem linkedEntity, aplicar link no resultado renderizado
			if (column.linkedEntity) {
				const linkId = column.linkField ? row[column.linkField] : row.id;
				const linkPath = `/${column.linkedEntity}/${linkId}`;
				return `<a href="${linkPath}" class="hover:bg-blue-50 hover:rounded transition-colors block p-1 -m-1">${rendered}</a>`;
			}
			return rendered;
		}
		
		// Se não tem render customizado, aplicar link inteligente
		return createSmartLink(value, column, row);
	}

	// Lifecycle
	import { onMount } from 'svelte';
	
	onMount(() => {
		checkScreenSize();
		const handleResize = () => checkScreenSize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

<div class={cn("w-full", className)}>
	<!-- Toggle de View + Controles -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			{#if !isMobile}
				<!-- Toggle View apenas no desktop -->
				<div class="flex bg-gray-100 rounded-lg p-1">
					<button
						class={cn(
							"px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
							viewMode === 'table' 
								? "bg-white text-gray-900 shadow-sm" 
								: "text-gray-600 hover:text-gray-900"
						)}
						onclick={() => viewMode = 'table'}
					>
						<ModernIcon name="Package" size="sm" />
						Tabela
					</button>
					<button
						class={cn(
							"px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
							viewMode === 'cards' 
								? "bg-white text-gray-900 shadow-sm" 
								: "text-gray-600 hover:text-gray-900"
						)}
						onclick={() => viewMode = 'cards'}
					>
						<ModernIcon name="image" size="sm" />
						Cards
					</button>
				</div>
			{:else}
				<!-- Indicador mobile -->
				<div class="text-sm text-gray-500 flex items-center gap-1.5">
					<ModernIcon name="image" size="sm" />
					Visualização em Cards
				</div>
			{/if}
		</div>
		
		<!-- Info de paginação -->
		{#if totalItems > 0}
			<div class="text-sm text-gray-500 hidden sm:block">
				{startItem} a {endItem} de {totalItems} registros
			</div>
			<div class="text-xs text-gray-500 sm:hidden">
				{endItem}/{totalItems}
			</div>
		{/if}
	</div>

	<!-- Conteúdo baseado na view -->
	{#if viewMode === 'cards' || isMobile}
		<!-- View de Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#if loading}
				{#each Array(6) as _}
					<div class="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
						<div class="h-4 bg-gray-200 rounded mb-2"></div>
						<div class="h-3 bg-gray-200 rounded mb-1"></div>
						<div class="h-3 bg-gray-200 rounded w-3/4"></div>
					</div>
				{/each}
			{:else if data.length === 0}
				<div class="col-span-full text-center py-12">
					<div class="text-gray-500">{emptyMessage}</div>
				</div>
			{:else}
				{#each data as row}
					<div class="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
						<div class="p-4">
							{#if selectable}
								<div class="flex items-start justify-between mb-3">
									<input
										type="checkbox"
										checked={selectedIds.includes(row.id)}
										onchange={() => toggleRow(row.id)}
										class="w-4 h-4 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
									/>
								</div>
							{/if}
							
							<!-- Campos principais -->
							<div class="space-y-3">
								{#each columns.filter(c => !c.hideOnMobile) as column}
									<div>
										<div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
											{column.label}
										</div>
										<div class="text-sm text-gray-900 break-words">
											{@html renderCell(column, row)}
										</div>
									</div>
								{/each}
							</div>
							
							<!-- Ações no card -->
							{#if actions}
								<div class="flex justify-end gap-1 mt-4 pt-4 border-t border-gray-100">
									{#each actions(row) as action}
										<Button
											size="sm"
											variant={action.variant || 'ghost'}
											onclick={action.onclick}
											class="!p-2 !min-w-8 !min-h-8"
											title={action.label}
										>
											<ModernIcon name={action.icon} size="sm" />
										</Button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		<!-- View de Tabela -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
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
											"text-right": column.align === 'right'
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
												size="xs" 
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
												"text-right": column.align === 'right'
											}
										)}>
											<div class="truncate max-w-xs">
												{@html renderCell(column, row)}
											</div>
										</td>
									{/each}
									
									{#if actions}
										<td class="px-4 sm:px-6 py-4 text-right text-sm">
											<div class="flex justify-end gap-1">
												{#each actions(row) as action}
													<Button
														size="sm"
														variant={action.variant || 'ghost'}
														onclick={action.onclick}
														class="!p-2 !min-w-8 !min-h-8"
														title={action.label}
													>
														<ModernIcon name={action.icon} size="sm" />
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
	{/if}

	<!-- Paginação Responsiva -->
	{#if totalPages > 1}
		<div class="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
			<div class="text-sm text-gray-700 order-2 sm:order-1">
				Página {page} de {totalPages}
			</div>
			
			<div class="flex gap-1 order-1 sm:order-2">
				<Button
					size="sm"
					variant="secondary"
					disabled={page <= 1}
					onclick={() => onPageChange?.(page - 1)}
					class="!p-2 !min-w-8"
				>
					<ModernIcon name="ChevronLeft" size="sm" />
				</Button>
				
				<!-- Paginação simplificada no mobile -->
				{#if isMobile}
					<!-- Mobile: apenas 3 páginas visíveis -->
					{@const startPage = Math.max(1, page - 1)}
					{@const endPage = Math.min(totalPages, page + 1)}
					
					{#if page > 2}
						<Button
							size="sm"
							variant="secondary"
							onclick={() => onPageChange?.(1)}
							class="!p-2 !min-w-8"
						>
							1
						</Button>
						{#if page > 3}
							<span class="text-gray-400 px-1">…</span>
						{/if}
					{/if}
					
					{#each Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i) as pageNum}
						<Button
							size="sm"
							variant={pageNum === page ? 'primary' : 'secondary'}
							onclick={() => onPageChange?.(pageNum)}
							class="!p-2 !min-w-8"
						>
							{pageNum}
						</Button>
					{/each}
					
					{#if page < totalPages - 1}
						{#if page < totalPages - 2}
							<span class="text-gray-400 px-1">…</span>
						{/if}
						<Button
							size="sm"
							variant="secondary"
							onclick={() => onPageChange?.(totalPages)}
							class="!p-2 !min-w-8"
						>
							{totalPages}
						</Button>
					{/if}
				{:else}
					<!-- Desktop: 5 páginas visíveis -->
					{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
						return pageNum;
					}) as pageNum}
						{#if pageNum <= totalPages}
							<Button
								size="sm"
								variant={pageNum === page ? 'primary' : 'secondary'}
								onclick={() => onPageChange?.(pageNum)}
								class="!p-2 !min-w-8"
							>
								{pageNum}
							</Button>
						{/if}
					{/each}
				{/if}
				
				<Button
					size="sm"
					variant="secondary"
					disabled={page >= totalPages}
					onclick={() => onPageChange?.(page + 1)}
					class="!p-2 !min-w-8"
				>
					<ModernIcon name="ChevronRight" size="sm" />
				</Button>
			</div>
		</div>
	{/if}
</div> 