<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import Button from './Button.svelte';

	// Props específicas para produtos
	interface Props {
		data: any[];
		columns: any[];
		loading?: boolean;
		hasMore?: boolean;
		onLoadMore?: () => void;
		onRetry?: () => void;
		error?: string | null;
		getTableActions?: (row: any) => any[];
		selectedIds?: string[];
		onSelectionChange?: (ids: string[]) => void;
		emptyMessage?: string;
		containerClass?: string;
	}

	let {
		data = [],
		columns = [],
		loading = false,
		hasMore = true,
		onLoadMore,
		onRetry,
		error = null,
		getTableActions,
		selectedIds = [],
		onSelectionChange,
		emptyMessage = 'Nenhum produto encontrado',
		containerClass = ''
	}: Props = $props();

	let scrollContainer: HTMLDivElement;
	let sentinelElement: HTMLDivElement;
	let observer: IntersectionObserver;
	let isLoadingMore = $state(false);

	// Configurar Intersection Observer
	onMount(() => {
		if (!sentinelElement) return;

		observer = new IntersectionObserver(
			async (entries) => {
				const entry = entries[0];
				if (entry.isIntersecting && hasMore && !loading && !error && !isLoadingMore) {
					isLoadingMore = true;
					try {
						await onLoadMore?.();
					} finally {
						isLoadingMore = false;
					}
				}
			},
			{
				root: null,
				rootMargin: '100px',
				threshold: 0.1
			}
		);

		observer.observe(sentinelElement);

		return () => {
			observer?.disconnect();
		};
	});

	// Função para toggle seleção
	function toggleSelection(id: string) {
		const newSelection = selectedIds.includes(id)
			? selectedIds.filter(item => item !== id)
			: [...selectedIds, id];
		onSelectionChange?.(newSelection);
	}

	// Função para selecionar todos
	function toggleSelectAll() {
		const allIds = data.map(item => item.id);
		const newSelection = selectedIds.length === data.length ? [] : allIds;
		onSelectionChange?.(newSelection);
	}

	// Scroll para o topo
	function scrollToTop() {
		scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<div class={cn("relative bg-white rounded-lg border border-gray-200", containerClass)}>
	<!-- Tabela Desktop -->
	<div class="hidden lg:block overflow-x-auto" bind:this={scrollContainer}>
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<!-- Checkbox para selecionar todos -->
					<th class="px-6 py-3 text-left">
						<input
							type="checkbox"
							checked={selectedIds.length === data.length && data.length > 0}
							indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
							onchange={toggleSelectAll}
							class="rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
					</th>
					<!-- Cabeçalhos das colunas -->
					{#each columns as column}
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							{column.label}
						</th>
					{/each}
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
						Ações
					</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each data as row}
					<tr class="hover:bg-gray-50">
						<!-- Checkbox da linha -->
						<td class="px-6 py-4">
							<input
								type="checkbox"
								checked={selectedIds.includes(row.id)}
								onchange={() => toggleSelection(row.id)}
								class="rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							/>
						</td>
						<!-- Células das colunas -->
						{#each columns as column}
							<td class="px-6 py-4 text-sm text-gray-900">
								{#if column.render}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html column.render(row[column.key], row)}
								{:else}
									{row[column.key] || '-'}
								{/if}
							</td>
						{/each}
						<!-- Ações -->
						<td class="px-6 py-4 text-right text-sm">
							{#if getTableActions}
								<div class="flex justify-end gap-1">
									{#each getTableActions(row) as action}
										<Button
											size="sm"
											variant={action.variant || 'ghost'}
											onclick={action.onclick}
											title={action.label}
										>
											{action.label}
										</Button>
									{/each}
								</div>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Cards Mobile -->
	<div class="lg:hidden">
		{#if data.length === 0 && !loading}
			<div class="text-center py-12">
				<div class="text-gray-400 mb-4">📦</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
				<p class="text-gray-500">Não há dados para exibir no momento.</p>
			</div>
		{:else}
			<div class="divide-y divide-gray-200">
				{#each data as row}
					<div class="p-4 hover:bg-gray-50">
						<div class="flex items-center justify-between mb-2">
							<input
								type="checkbox"
								checked={selectedIds.includes(row.id)}
								onchange={() => toggleSelection(row.id)}
								class="rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							/>
							{#if getTableActions}
								<div class="flex gap-1">
									{#each getTableActions(row) as action}
										<Button
											size="sm"
											variant={action.variant || 'ghost'}
											onclick={action.onclick}
											title={action.label}
										>
											{action.label}
										</Button>
									{/each}
								</div>
							{/if}
						</div>
						
						<!-- Conteúdo do card baseado na primeira coluna (produto) -->
						{#if columns[0]?.render}
							{@html columns[0].render(row[columns[0].key], row)}
						{:else}
							<div class="font-medium text-gray-900">{row[columns[0]?.key] || row.name}</div>
						{/if}
						
						<!-- Informações adicionais em formato compacto -->
						<div class="mt-2 text-sm text-gray-500 space-y-1">
							{#each columns.slice(1, 4) as column}
								{#if row[column.key]}
									<div class="flex justify-between">
										<span>{column.label}:</span>
										<span class="font-medium">
											{#if column.render}
												{@html column.render(row[column.key], row)}
											{:else}
												{row[column.key]}
											{/if}
										</span>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Loading State -->
	{#if loading || isLoadingMore}
		<div class="flex items-center justify-center py-8">
			<div class="flex items-center gap-3">
				<div class="w-5 h-5 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
				<span class="text-sm text-gray-600">
					{loading ? 'Carregando produtos...' : 'Carregando mais produtos...'}
				</span>
			</div>
		</div>
	{/if}

	<!-- Error State -->
	{#if error && !loading}
		<div class="flex flex-col items-center justify-center py-8">
			<div class="text-red-400 mb-3 text-2xl">⚠️</div>
			<p class="text-sm text-gray-600 mb-4">Erro ao carregar mais produtos</p>
			<Button size="sm" variant="outline" onclick={onRetry}>
				🔄 Tentar Novamente
			</Button>
		</div>
	{/if}

	<!-- End State -->
	{#if !hasMore && !loading && !error && data.length > 0}
		<div class="text-center py-8">
			<div class="text-gray-300 mb-2 text-xl">✅</div>
			<p class="text-sm text-gray-500">Todos os produtos foram carregados</p>
		</div>
	{/if}

	<!-- Intersection Observer Sentinel -->
	{#if hasMore && !loading && !error}
		<div bind:this={sentinelElement} class="h-4 opacity-0"></div>
	{/if}

	<!-- Scroll to Top Button -->
	{#if data.length > 10}
		<button
			onclick={scrollToTop}
			class="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#00BFB3] text-white rounded-full shadow-lg hover:bg-[#00A89D] transition-all duration-200 hover:scale-105 flex items-center justify-center"
			title="Voltar ao topo"
		>
			⬆️
		</button>
	{/if}
</div> 