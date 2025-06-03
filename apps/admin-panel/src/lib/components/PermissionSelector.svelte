<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	
	interface Permission {
		id: string;
		name: string;
		description: string;
		category: string;
	}
	
	interface PermissionCategory {
		key: string;
		name: string;
		permissions: Permission[];
	}
	
	interface Props {
		selectedPermissions?: string[];
		disabled?: boolean;
		onSelectionChange?: (permissions: string[]) => void;
	}
	
	let { 
		selectedPermissions = [], 
		disabled = false,
		onSelectionChange 
	}: Props = $props();
	
	let permissionCategories = $state<PermissionCategory[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let expandedCategories = $state<Set<string>>(new Set());
	let searchTerm = $state('');
	
	// Permissões selecionadas (cópia local para reatividade)
	let internalSelection = $state<string[]>([...selectedPermissions]);
	
	// Sincronizar com prop externa
	$effect(() => {
		internalSelection = [...selectedPermissions];
	});
	
	// Filtrar permissões baseado na busca
	const filteredCategories = $derived(() => {
		if (!searchTerm) return permissionCategories;
		
		return permissionCategories.map(category => ({
			...category,
			permissions: category.permissions.filter(permission =>
				permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				permission.description.toLowerCase().includes(searchTerm.toLowerCase())
			)
		})).filter(category => category.permissions.length > 0);
	});
	
	async function loadPermissions() {
		try {
			loading = true;
			error = null;
			
			const response = await fetch('/api/permissions?grouped=true');
			const result = await response.json();
			
			if (result.success) {
				permissionCategories = result.data;
				// Expandir primeira categoria por padrão
				if (permissionCategories.length > 0) {
					expandedCategories.add(permissionCategories[0].key);
				}
			} else {
				error = result.error || 'Erro ao carregar permissões';
			}
		} catch (err) {
			error = 'Erro de conexão ao carregar permissões';
			console.error('Erro ao carregar permissões:', err);
		} finally {
			loading = false;
		}
	}
	
	function toggleCategory(categoryKey: string) {
		if (expandedCategories.has(categoryKey)) {
			expandedCategories.delete(categoryKey);
		} else {
			expandedCategories.add(categoryKey);
		}
		expandedCategories = new Set(expandedCategories);
	}
	
	function togglePermission(permissionName: string) {
		if (disabled) return;
		
		if (internalSelection.includes(permissionName)) {
			internalSelection = internalSelection.filter(p => p !== permissionName);
		} else {
			internalSelection = [...internalSelection, permissionName];
		}
		
		onSelectionChange?.(internalSelection);
	}
	
	function toggleCategoryPermissions(category: PermissionCategory) {
		if (disabled) return;
		
		const categoryPermissions = category.permissions.map(p => p.name);
		const allSelected = categoryPermissions.every(p => internalSelection.includes(p));
		
		if (allSelected) {
			// Remover todas as permissões da categoria
			internalSelection = internalSelection.filter(p => !categoryPermissions.includes(p));
		} else {
			// Adicionar todas as permissões da categoria
			const newPermissions = categoryPermissions.filter(p => !internalSelection.includes(p));
			internalSelection = [...internalSelection, ...newPermissions];
		}
		
		onSelectionChange?.(internalSelection);
	}
	
	function selectAll() {
		if (disabled) return;
		
		const allPermissions = permissionCategories.flatMap(cat => cat.permissions.map(p => p.name));
		internalSelection = [...allPermissions];
		onSelectionChange?.(internalSelection);
	}
	
	function clearAll() {
		if (disabled) return;
		
		internalSelection = [];
		onSelectionChange?.(internalSelection);
	}
	
	function getCategoryStats(category: PermissionCategory) {
		const categoryPermissions = category.permissions.map(p => p.name);
		const selectedCount = categoryPermissions.filter(p => internalSelection.includes(p)).length;
		const totalCount = categoryPermissions.length;
		
		return {
			selectedCount,
			totalCount,
			allSelected: selectedCount === totalCount,
			partialSelected: selectedCount > 0 && selectedCount < totalCount
		};
	}
	
	onMount(() => {
		loadPermissions();
	});
</script>

<div class="space-y-4">
	<!-- Header com busca e ações -->
	<div class="flex items-center justify-between gap-4">
		<div class="flex-1">
			<div class="relative">
				<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					placeholder="Buscar permissões..."
					bind:value={searchTerm}
					class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={disabled}
				/>
			</div>
		</div>
		
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={selectAll}
				disabled={disabled || loading}
				class="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Selecionar Todas
			</button>
			<button
				type="button"
				onclick={clearAll}
				disabled={disabled || loading}
				class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Limpar
			</button>
		</div>
	</div>
	
	<!-- Loading state -->
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-2 text-gray-600">Carregando permissões...</span>
		</div>
	{/if}
	
	<!-- Error state -->
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex">
				<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Erro ao carregar permissões</h3>
					<p class="text-sm text-red-700 mt-1">{error}</p>
					<button
						type="button"
						onclick={loadPermissions}
						class="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
					>
						Tentar novamente
					</button>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Categorias de permissões -->
	{#if !loading && !error}
		<div class="space-y-3">
			{#each filteredCategories() as category (category.key)}
				{@const stats = getCategoryStats(category)}
				<div 
					class="border border-gray-200 rounded-lg overflow-hidden"
					in:fade={{ duration: 200 }}
				>
					<!-- Header da categoria -->
					<button
						type="button"
						onclick={() => toggleCategory(category.key)}
						disabled={disabled}
						class="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<div class="flex items-center gap-3">
							<div class="flex items-center">
								<!-- Checkbox da categoria -->
								<input
									type="checkbox"
									checked={stats.allSelected}
									indeterminate={stats.partialSelected}
									onchange={() => toggleCategoryPermissions(category)}
									disabled={disabled}
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
							</div>
							
							<div>
								<h4 class="font-medium text-gray-900">{category.name}</h4>
								<p class="text-sm text-gray-500">
									{stats.selectedCount} de {stats.totalCount} selecionadas
								</p>
							</div>
						</div>
						
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform duration-200 {expandedCategories.has(category.key) ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					<!-- Permissões da categoria -->
					{#if expandedCategories.has(category.key)}
						<div 
							class="p-4 space-y-3 bg-white"
							in:slide={{ duration: 300, easing: cubicOut }}
						>
							{#each category.permissions as permission (permission.id)}
								<label 
									class="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
									for="perm-{permission.id}"
								>
									<input
										id="perm-{permission.id}"
										type="checkbox"
										checked={internalSelection.includes(permission.name)}
										onchange={() => togglePermission(permission.name)}
										disabled={disabled}
										class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
									/>
									
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-medium text-gray-900 text-sm">
												{permission.name}
											</span>
											<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
												{permission.category}
											</span>
										</div>
										<p class="text-sm text-gray-500 mt-0.5">
											{permission.description}
										</p>
									</div>
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
			
			{#if filteredCategories().length === 0 && searchTerm}
				<div class="text-center py-8 text-gray-500">
					<svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<p class="text-sm">Nenhuma permissão encontrada para "{searchTerm}"</p>
				</div>
			{/if}
		</div>
		
		<!-- Resumo da seleção -->
		{#if internalSelection.length > 0}
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4" in:fade={{ duration: 200 }}>
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span class="text-sm font-medium text-blue-900">
						{internalSelection.length} permissão{internalSelection.length !== 1 ? 'ões' : ''} selecionada{internalSelection.length !== 1 ? 's' : ''}
					</span>
				</div>
			</div>
		{/if}
	{/if}
</div> 